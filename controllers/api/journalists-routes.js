const express = require("express");
const router = express.Router();
const Journalist = require("../../models/Journalist");
const withAuth = require("../../utils/auth");
const {
  COLUMNS,
  journalistsToCSV,
  exportFilename,
  parseJournalistCSV,
  partitionAgainstExisting,
} = require("../../utils/journalist-csv");
// /api/journalists routes

const JOURNALIST_ATTRIBUTES = [
  "id",
  "first_name",
  "last_name",
  "company",
  "city",
  "created_at",
  "email",
];

// Columns the export may be filtered on. Passing req.query straight into a
// Sequelize `where` lets a caller filter on anything the model exposes; this
// keeps it to the five fields the search UI actually offers.
const FILTERABLE_FIELDS = ["first_name", "last_name", "company", "city", "email"];

// A duplicate email on import means "already on the list", not "import failed".
function isUniqueViolation(err) {
  return Boolean(
    err &&
      (err.name === "SequelizeUniqueConstraintError" ||
        err.original?.code === "ER_DUP_ENTRY" ||
        /unique/i.test(err.message || ""))
  );
}

// ---------------------------------------------------------------------------
// CSV export / import
//
// ORDER MATTERS: these must be registered BEFORE `GET /:id`. Express matches in
// registration order and `:id` will happily match the literal segment
// "export.csv", which would send the string "export.csv" to MySQL as a primary
// key and 500. Do not move these below the /:id handler.
// ---------------------------------------------------------------------------

// Download the press list as CSV. Accepts the same filters as /search.
router.get("/export.csv", withAuth, (req, res) => {
  const where = {};
  FILTERABLE_FIELDS.forEach((field) => {
    if (req.query[field]) where[field] = req.query[field];
  });

  Journalist.findAll({
    where,
    attributes: JOURNALIST_ATTRIBUTES,
    order: ["last_name", "first_name"],
  })
    .then((dbJournalistData) => {
      const csv = journalistsToCSV(dbJournalistData);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${exportFilename()}"`
      );
      res.send(csv);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: "Could not export the press list." });
    });
});

// An empty CSV with just the headers, so there's something to fill in and
// re-upload rather than guessing at the column names.
router.get("/import-template.csv", withAuth, (req, res) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="press-list-import-template.csv"'
  );
  res.send(journalistsToCSV([]));
});

// Upload a CSV.
//   Body: raw text/csv, or JSON { csv: "..." }.
//   ?dryRun=1  -> validate and report, write nothing.
//   ?mode=update -> refresh journalists whose email is already on the list.
//                   Default 'skip' leaves existing records untouched.
//
// The global express.json() in server.js caps bodies at 100kb, which a real
// press list will exceed, so these two parsers are mounted on this route only.
router.post(
  "/import",
  withAuth,
  express.text({ type: ["text/csv", "text/plain"], limit: "5mb" }),
  express.json({ limit: "5mb" }),
  async (req, res) => {
    const dryRun = req.query.dryRun === "1" || req.query.dryRun === "true";
    const mode = req.query.mode === "update" ? "update" : "skip";

    let text = "";
    if (typeof req.body === "string") {
      text = req.body;
    } else if (req.body && typeof req.body.csv === "string") {
      text = req.body.csv;
    }

    const parsed = parseJournalistCSV(text);
    if (!parsed.ok) {
      res.status(400).json({ message: parsed.error });
      return;
    }

    const report = {
      dryRun,
      mode,
      totalRows: parsed.totalRows,
      created: 0,
      updated: 0,
      skipped: 0,
      unknownColumns: parsed.unknownColumns,
      invalid: parsed.invalid,
      duplicatesInFile: parsed.duplicatesInFile,
      failed: [],
    };

    try {
      // Look up on the literal, lowercased and uppercased forms rather than
      // trusting the column's collation to be case-insensitive. MySQL's default
      // collation is, but that is a property of the schema, not of this code —
      // under utf8mb4_bin the lookup would miss and every re-import would try to
      // insert a duplicate. Still an indexed IN, so it costs nothing.
      // partitionAgainstExisting does the authoritative comparison in JS.
      const emailVariants = [
        ...new Set(
          parsed.valid.flatMap((row) => [
            row.data.email,
            row.data.email.toLowerCase(),
            row.data.email.toUpperCase(),
          ])
        ),
      ];
      const existing = emailVariants.length
        ? await Journalist.findAll({
            where: { email: emailVariants },
            attributes: ["id", "email"],
          })
        : [];

      const { toCreate, toUpdate } = partitionAgainstExisting(
        parsed.valid,
        existing
      );

      if (dryRun) {
        report.created = toCreate.length;
        report.updated = mode === "update" ? toUpdate.length : 0;
        report.skipped = mode === "update" ? 0 : toUpdate.length;
        res.status(200).json(report);
        return;
      }

      // One row at a time rather than bulkCreate: a single bad row in a bulk
      // insert rolls back the whole file, and the point of the report is to
      // import the 199 good rows and tell you about the one that failed.
      for (const row of toCreate) {
        try {
          await Journalist.create(row.data);
          report.created += 1;
        } catch (err) {
          if (isUniqueViolation(err)) {
            // The email is on the list after all. That is not a failure — it is
            // the skip/update path, reached late. Backstop for any case or
            // whitespace difference the lookup above did not catch.
            if (mode === "update") {
              try {
                await Journalist.update(row.data, {
                  where: { email: row.data.email },
                });
                report.updated += 1;
              } catch (updateErr) {
                report.failed.push({
                  lineNumber: row.lineNumber,
                  email: row.data.email,
                  error: updateErr.message,
                });
              }
            } else {
              report.skipped += 1;
            }
            continue;
          }
          report.failed.push({
            lineNumber: row.lineNumber,
            email: row.data.email,
            error: err.message,
          });
        }
      }

      for (const row of toUpdate) {
        if (mode !== "update") {
          report.skipped += 1;
          continue;
        }
        try {
          await Journalist.update(row.data, { where: { id: row.id } });
          report.updated += 1;
        } catch (err) {
          report.failed.push({
            lineNumber: row.lineNumber,
            email: row.data.email,
            error: err.message,
          });
        }
      }

      res.status(200).json(report);
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "The import could not be completed." });
    }
  }
);

// get all journalists
router.get("/", withAuth, (req, res) => {
  Journalist.findAll({
    attributes: [
      "id",
      "first_name",
      "last_name",
      "company",
      "city",
      "created_at",
      "email",
    ],
  })
    .then((dbJournalistData) => res.json(dbJournalistData))
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

// get journalist by id???
router.get("/:id", withAuth, (req, res) => {
  Journalist.findOne({
    where: {
      id: req.params.id,
    },
    attributes: [
      "id",
      "first_name",
      "last_name",
      "company",
      "city",
      "created_at",
      "email",
    ],
  })
    .then((dbJournalistData) => {
      if (!dbJournalistData) {
        res.status(404).json({ message: "No journalist found with that id" });
        return;
      }
      res.json(dbJournalistData);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});


// get journalists by search for: first name, last name, city, email, company, date added
router.post("/search", withAuth, (req, res) => {
  // logic to omit from where if null
  let body = {};
  //if parameter is not null, add property to body object (may need to be !=" ")
  if (req.body.first_name) {
    body.first_name = req.body.first_name;
  }
  if (req.body.last_name) {
    body.last_name = req.body.last_name;
  }
  if (req.body.city) {
    body.city = req.body.city;
  }
  if (req.body.email) {
    body.email = req.body.email;
  }
  if (req.body.company) {
    body.company = req.body.company;
  }
  if (req.body.date_added) {
    body.date_added = req.body.date_added;
  }
  Journalist.findAll({
    where: body,
    attributes: [
      "id",
      "first_name",
      "last_name",
      "email",
      "city",
      "company",
      "created_at",
    ],
  })
    .then((dbJournalistData) => {
      if (!dbJournalistData) {
        res
          .status(404)
          .json({ message: "No journalist found matching this criteria" });
        return;
      }
      res.status(200).json(dbJournalistData);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

// create new journalist
router.post("/", withAuth, (req, res) => {
  Journalist.create({
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    company: req.body.company,
    email: req.body.email,
    city: req.body.city
  })
    .then((dbJournalistData) => res.json(dbJournalistData))
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});
// update journalist
// withAuth was missing here — every other write on this router had it, so any
// unauthenticated caller could edit any journalist. Added while working on the
// import, which writes through the same model.
router.put("/:id", withAuth, (req, res) => {
  Journalist.update(req.body, {
    where: {
      id: req.params.id
    },
  })
    .then((dbJournalistData) => {
      if (!dbJournalistData) {
        res.status(404).json({ message: "No journalist found with that id" });
        return;
      }
      res.json(dbJournalistData);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

// delete journalist
router.delete("/:id", withAuth, (req, res) =>{
  Journalist.destroy({
    where: {
      id: req.params.id
    },
  })
    .then((dbJournalistData) => {
      if (!dbJournalistData) {
        res.status(404).json({ message: "No journalist found with that id" });
        return;
      }
      res.json(dbJournalistData);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

module.exports = router;
