// utils/journalist-csv.js
//
// Maps the Journalist model to and from CSV. Pure functions only — no database,
// no express, no I/O — so the import rules can be tested without standing up MySQL.
// The routes in controllers/api/journalists-routes.js are thin wrappers over this.

const { toCSV, parseCSVToObjects } = require("./csv");

// The canonical export shape. `created_at` is export-only: it is set by the
// database, so accepting it on import would let a caller forge the audit date.
const COLUMNS = [
  { key: "first_name", header: "First Name" },
  { key: "last_name", header: "Last Name" },
  { key: "company", header: "Company" },
  { key: "email", header: "Email" },
  { key: "city", header: "City" },
  { key: "created_at", header: "Date Added", exportOnly: true },
];

const IMPORT_COLUMNS = COLUMNS.filter((c) => !c.exportOnly);

// Fields a caller may write. Anything else in the CSV is reported and ignored —
// never silently passed through to Journalist.create/update.
const WRITABLE_FIELDS = IMPORT_COLUMNS.map((c) => c.key);
const REQUIRED_FIELDS = ["first_name", "last_name", "email"];

// Header aliases, normalised. "Outlet" and "Publication" are what press lists
// exported from other tools actually call the company column.
const HEADER_ALIASES = {
  firstname: "first_name",
  first: "first_name",
  givenname: "first_name",
  lastname: "last_name",
  last: "last_name",
  surname: "last_name",
  familyname: "last_name",
  company: "company",
  outlet: "company",
  publication: "company",
  organisation: "company",
  organization: "company",
  email: "email",
  emailaddress: "email",
  city: "city",
  location: "city",
  town: "city",
};

const MAX_IMPORT_ROWS = 5000;

// Matches Sequelize's isEmail closely enough to reject the things people
// actually paste in (blanks, names, "n/a", missing @) without inventing a
// stricter rule than the model itself will apply.
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;

/**
 * Normalise a CSV header cell to a model field name, or null if unrecognised.
 * @param {string} header
 * @returns {string|null}
 */
function normalizeHeader(header) {
  const key = String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (!key) return null;
  if (HEADER_ALIASES[key]) return HEADER_ALIASES[key];
  return null;
}

/**
 * Serialize journalist records to CSV.
 * Accepts Sequelize instances or plain objects.
 * @param {Array<Object>} journalists
 * @returns {string}
 */
function journalistsToCSV(journalists) {
  const rows = (journalists || []).map((j) =>
    typeof j.get === "function" ? j.get({ plain: true }) : j
  );
  return toCSV(rows, COLUMNS);
}

/**
 * A filename that sorts chronologically and is safe on every OS.
 * @param {Date} [now]
 * @returns {string}
 */
function exportFilename(now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}`;
  return `press-list-${stamp}.csv`;
}

/**
 * Parse and validate an uploaded CSV against the Journalist model.
 *
 * Never throws on bad input — malformed rows come back in `invalid` with the
 * source line number, so the caller can report every problem at once instead of
 * failing on the first one.
 *
 * @param {string} text
 * @returns {{
 *   ok: boolean,
 *   error: string|null,
 *   mappedColumns: Object,
 *   unknownColumns: string[],
 *   totalRows: number,
 *   valid: Array<{ lineNumber: number, data: Object }>,
 *   invalid: Array<{ lineNumber: number, errors: string[], record: Object }>,
 *   duplicatesInFile: Array<{ lineNumber: number, email: string, firstSeenOnLine: number }>
 * }}
 */
function parseJournalistCSV(text) {
  const result = {
    ok: false,
    error: null,
    mappedColumns: {},
    unknownColumns: [],
    totalRows: 0,
    valid: [],
    invalid: [],
    duplicatesInFile: [],
  };

  if (typeof text !== "string" || text.trim() === "") {
    result.error = "The uploaded file is empty.";
    return result;
  }

  const { headers, rows } = parseCSVToObjects(text);
  if (headers.length === 0) {
    result.error = "The uploaded file has no header row.";
    return result;
  }

  // Map header cells -> model fields, by COLUMN POSITION rather than by header
  // text. Two columns can legitimately carry the same header ("Email,Email"),
  // and keying on the text alone would silently let the rightmost one win.
  const columnMap = []; // [{ index, header, field }]
  const claimedFields = new Set();
  headers.forEach((header, index) => {
    const field = normalizeHeader(header);
    if (field && !claimedFields.has(field)) {
      // First occurrence of a field wins; a repeated column is reported, not merged.
      claimedFields.add(field);
      columnMap.push({ index, header, field });
    } else if (header !== "") {
      result.unknownColumns.push(header);
    }
  });
  result.mappedColumns = columnMap.reduce((acc, c) => {
    acc[c.header] = c.field;
    return acc;
  }, {});

  const missingRequired = REQUIRED_FIELDS.filter((f) => !claimedFields.has(f));
  if (missingRequired.length) {
    result.error = `The file is missing a required column: ${missingRequired.join(
      ", "
    )}. Expected headers: ${IMPORT_COLUMNS.map((c) => c.header).join(", ")}.`;
    return result;
  }

  if (rows.length === 0) {
    result.error = "The file has a header row but no journalists in it.";
    return result;
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    result.error = `The file has ${rows.length} rows; the limit is ${MAX_IMPORT_ROWS} per import. Split it and run it again.`;
    return result;
  }

  result.totalRows = rows.length;
  const seenEmails = new Map(); // lowercased email -> line number

  rows.forEach(({ lineNumber, values }) => {
    const data = {};
    columnMap.forEach(({ index, field }) => {
      const raw = values[index];
      data[field] = String(raw === undefined ? "" : raw).trim();
    });

    // Only ever hand the model fields we chose to allow.
    WRITABLE_FIELDS.forEach((f) => {
      if (data[f] === undefined) data[f] = "";
    });

    const errors = [];
    REQUIRED_FIELDS.forEach((f) => {
      if (!data[f]) {
        const col = IMPORT_COLUMNS.find((c) => c.key === f);
        errors.push(`${col ? col.header : f} is required`);
      }
    });

    if (data.email && !EMAIL_RE.test(data.email)) {
      errors.push(`"${data.email}" is not a valid email address`);
    }

    if (errors.length) {
      result.invalid.push({ lineNumber, errors, record: data });
      return;
    }

    const emailKey = data.email.toLowerCase();
    if (seenEmails.has(emailKey)) {
      result.duplicatesInFile.push({
        lineNumber,
        email: data.email,
        firstSeenOnLine: seenEmails.get(emailKey),
      });
      return;
    }
    seenEmails.set(emailKey, lineNumber);

    // Optional fields normalise empty string -> null so the column stays NULL
    // rather than holding an empty string.
    result.valid.push({
      lineNumber,
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        company: data.company || null,
        city: data.city || null,
      },
    });
  });

  result.ok = true;
  return result;
}

/**
 * Split parsed rows into creates and updates against the emails already stored.
 * Comparison is case-insensitive: "Sam@Outlet.com" and "sam@outlet.com" are the
 * same journalist, even though the database's unique index may disagree.
 *
 * @param {Array<{lineNumber: number, data: Object}>} validRows
 * @param {Array<Object>} existing records with at least { id, email }
 * @returns {{ toCreate: Array, toUpdate: Array }}
 */
function partitionAgainstExisting(validRows, existing) {
  const byEmail = new Map();
  (existing || []).forEach((row) => {
    const plain = typeof row.get === "function" ? row.get({ plain: true }) : row;
    if (plain && plain.email) byEmail.set(String(plain.email).toLowerCase(), plain);
  });

  const toCreate = [];
  const toUpdate = [];

  validRows.forEach((row) => {
    const match = byEmail.get(row.data.email.toLowerCase());
    if (match) {
      toUpdate.push({ ...row, id: match.id, existing: match });
    } else {
      toCreate.push(row);
    }
  });

  return { toCreate, toUpdate };
}

module.exports = {
  COLUMNS,
  IMPORT_COLUMNS,
  WRITABLE_FIELDS,
  REQUIRED_FIELDS,
  MAX_IMPORT_ROWS,
  normalizeHeader,
  journalistsToCSV,
  exportFilename,
  parseJournalistCSV,
  partitionAgainstExisting,
};
