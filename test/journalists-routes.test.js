// test/journalists-routes.test.js — run with `npm test`
//
// Exercises the real Express router against an in-memory stand-in for the
// Journalist model, so route wiring is covered without a MySQL instance.
// The model is stubbed in the module cache *before* the router is required,
// which also keeps config/connection.js (and therefore Sequelize) out of it.

const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const Module = require("node:module");

// --- stub the model ---------------------------------------------------------

const db = { rows: [], nextId: 1, failOn: null };

const FakeJournalist = {
  findAll: async ({ where = {} } = {}) => {
    return db.rows.filter((row) =>
      Object.entries(where).every(([key, value]) =>
        Array.isArray(value)
          ? value.includes(row[key])
          : String(row[key]) === String(value)
      )
    );
  },
  findOne: async ({ where = {} } = {}) =>
    db.rows.find((row) =>
      Object.entries(where).every(([k, v]) => String(row[k]) === String(v))
    ) || null,
  create: async (data) => {
    if (db.failOn && data.email === db.failOn) {
      throw new Error("Validation error: simulated database failure");
    }
    // The real column has a unique index. Matching is exact here on purpose:
    // it stands in for a case-SENSITIVE collation, which is the environment the
    // import has to survive without relying on MySQL's default being lenient.
    if (db.rows.some((r) => r.email === data.email)) {
      const err = new Error("Validation error");
      err.name = "SequelizeUniqueConstraintError";
      throw err;
    }
    const row = { id: db.nextId++, created_at: new Date("2026-08-05"), ...data };
    db.rows.push(row);
    return row;
  },
  update: async (data, { where }) => {
    const matches = db.rows.filter((row) =>
      Object.entries(where).every(([k, v]) => String(row[k]) === String(v))
    );
    matches.forEach((row) => Object.assign(row, data));
    return [matches.length];
  },
  destroy: async ({ where }) => {
    const before = db.rows.length;
    db.rows = db.rows.filter((r) => String(r.id) !== String(where.id));
    return before - db.rows.length;
  },
};

const modelPath = require.resolve("../models/Journalist");
const stubModule = new Module(modelPath);
stubModule.exports = FakeJournalist;
stubModule.loaded = true;
Module._cache[modelPath] = stubModule;

// --- app --------------------------------------------------------------------

const express = require("express");
const journalistRoutes = require("../controllers/api/journalists-routes");

let authenticated = true;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  req.session = authenticated ? { user_id: 1 } : {};
  next();
});
app.use("/api/journalists", journalistRoutes);

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test.beforeEach(() => {
  db.rows = [];
  db.nextId = 1;
  db.failOn = null;
  authenticated = true;
});

function request(pathname, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, baseUrl);
    const req = http.request(
      url,
      { method: options.method || "GET", headers: options.headers || {} },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () =>
          resolve({ status: res.statusCode, headers: res.headers, body })
        );
      }
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function postCSV(pathname, csv) {
  return request(pathname, {
    method: "POST",
    headers: { "Content-Type": "text/csv" },
    body: csv,
  });
}

function seed(rows) {
  rows.forEach((r) =>
    db.rows.push({ id: db.nextId++, created_at: new Date("2026-08-05"), ...r })
  );
}

const HEADER = "First Name,Last Name,Company,Email,City\n";

// --- export -----------------------------------------------------------------

test("GET /export.csv returns a CSV attachment", async () => {
  seed([
    {
      first_name: "Ada",
      last_name: "Lovelace",
      company: "Analytical Weekly",
      email: "ada@x.co",
      city: "London",
    },
  ]);

  const res = await request("/api/journalists/export.csv");
  assert.strictEqual(res.status, 200);
  assert.match(res.headers["content-type"], /text\/csv/);
  assert.match(res.headers["content-disposition"], /attachment; filename="press-list-\d{4}-\d{2}-\d{2}\.csv"/);
  assert.ok(res.body.includes("First Name,Last Name,Company,Email,City,Date Added"));
  assert.ok(res.body.includes("Ada,Lovelace,Analytical Weekly,ada@x.co,London"));
});

test("REGRESSION: /export.csv is not shadowed by GET /:id", async () => {
  // `router.get("/:id")` matches the literal segment "export.csv" if it is
  // registered first. The symptom would be a 404 or a 500, never a CSV.
  const res = await request("/api/journalists/export.csv");
  assert.strictEqual(res.status, 200);
  assert.match(res.headers["content-type"], /text\/csv/);
  assert.ok(!res.body.includes("No journalist found with that id"));
});

test("GET /export.csv applies the same filters as the search UI", async () => {
  seed([
    { first_name: "Ada", last_name: "L", email: "ada@x.co", city: "London" },
    { first_name: "Grace", last_name: "H", email: "grace@x.co", city: "NYC" },
  ]);

  const res = await request("/api/journalists/export.csv?city=London");
  assert.ok(res.body.includes("ada@x.co"));
  assert.ok(!res.body.includes("grace@x.co"));
});

test("GET /export.csv ignores query params that are not filterable columns", async () => {
  seed([{ first_name: "Ada", last_name: "L", email: "ada@x.co" }]);
  // `id` is deliberately not in the whitelist; passing it must not narrow
  // the export, and must not reach Sequelize as a where clause.
  const res = await request("/api/journalists/export.csv?id=99999&nonsense=1");
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.includes("ada@x.co"));
});

test("GET /export.csv on an empty list still returns the header row", async () => {
  const res = await request("/api/journalists/export.csv");
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.includes("First Name,Last Name,Company,Email,City,Date Added"));
});

test("GET /import-template.csv returns headers and no data", async () => {
  seed([{ first_name: "Ada", last_name: "L", email: "ada@x.co" }]);
  const res = await request("/api/journalists/import-template.csv");
  assert.strictEqual(res.status, 200);
  assert.match(res.headers["content-disposition"], /press-list-import-template\.csv/);
  assert.ok(!res.body.includes("ada@x.co"));
});

// --- import -----------------------------------------------------------------

test("POST /import creates journalists from a CSV body", async () => {
  const res = await postCSV(
    "/api/journalists/import",
    HEADER + "Ada,Lovelace,Analytical Weekly,ada@x.co,London\n"
  );
  const report = JSON.parse(res.body);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(report.created, 1);
  assert.strictEqual(db.rows.length, 1);
  assert.strictEqual(db.rows[0].company, "Analytical Weekly");
});

test("POST /import accepts a JSON body as well as raw text/csv", async () => {
  const res = await request("/api/journalists/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csv: HEADER + "Ada,Lovelace,,ada@x.co,\n" }),
  });
  assert.strictEqual(JSON.parse(res.body).created, 1);
});

test("POST /import?dryRun=1 reports what would happen and writes nothing", async () => {
  const res = await postCSV(
    "/api/journalists/import?dryRun=1",
    HEADER + "Ada,Lovelace,,ada@x.co,\nGrace,Hopper,,grace@x.co,\n"
  );
  const report = JSON.parse(res.body);

  assert.strictEqual(report.dryRun, true);
  assert.strictEqual(report.created, 2);
  assert.strictEqual(db.rows.length, 0, "dry run must not touch the database");
});

test("POST /import skips emails already on the list by default", async () => {
  seed([{ first_name: "Old", last_name: "Name", email: "ada@x.co" }]);

  const res = await postCSV(
    "/api/journalists/import",
    HEADER + "Ada,Lovelace,New Outlet,ada@x.co,\n"
  );
  const report = JSON.parse(res.body);

  assert.strictEqual(report.skipped, 1);
  assert.strictEqual(report.created, 0);
  assert.strictEqual(db.rows[0].first_name, "Old", "skip must not overwrite");
});

test("POST /import?mode=update refreshes existing journalists", async () => {
  seed([{ first_name: "Old", last_name: "Name", email: "ada@x.co" }]);

  const res = await postCSV(
    "/api/journalists/import?mode=update",
    HEADER + "Ada,Lovelace,New Outlet,ada@x.co,London\n"
  );
  const report = JSON.parse(res.body);

  assert.strictEqual(report.updated, 1);
  assert.strictEqual(report.created, 0);
  assert.strictEqual(db.rows[0].first_name, "Ada");
  assert.strictEqual(db.rows[0].company, "New Outlet");
});

test("POST /import matches existing emails regardless of case", async () => {
  seed([{ first_name: "Old", last_name: "Name", email: "ada@x.co" }]);
  const res = await postCSV(
    "/api/journalists/import",
    HEADER + "Ada,Lovelace,,ADA@X.CO,\n"
  );
  assert.strictEqual(JSON.parse(res.body).skipped, 1);
  assert.strictEqual(db.rows.length, 1);
});

test("a unique-constraint collision counts as skipped, not as a failure", async () => {
  // Backstop path: the pre-flight lookup missed it (case-sensitive collation,
  // stray whitespace) and the insert is what discovers the duplicate.
  seed([{ first_name: "Old", last_name: "Name", email: "ada@x.co" }]);
  const res = await postCSV(
    "/api/journalists/import",
    HEADER + "Ada,Lovelace,,ada@x.co,\n"
  );
  const report = JSON.parse(res.body);
  assert.strictEqual(report.failed.length, 0, "a duplicate is not an error");
  assert.strictEqual(report.skipped, 1);
});

test("POST /import imports the good rows and reports the bad ones", async () => {
  const res = await postCSV(
    "/api/journalists/import",
    HEADER +
      "Ada,Lovelace,,ada@x.co,\n" +
      ",Babbage,,charles@x.co,\n" +
      "Grace,Hopper,,not-an-email,\n" +
      "Alan,Turing,,alan@x.co,\n"
  );
  const report = JSON.parse(res.body);

  assert.strictEqual(report.created, 2);
  assert.strictEqual(report.invalid.length, 2);
  assert.deepStrictEqual(
    report.invalid.map((r) => r.lineNumber),
    [3, 4]
  );
  assert.strictEqual(db.rows.length, 2);
});

test("POST /import keeps going when a single row fails to save", async () => {
  db.failOn = "grace@x.co";

  const res = await postCSV(
    "/api/journalists/import",
    HEADER +
      "Ada,Lovelace,,ada@x.co,\n" +
      "Grace,Hopper,,grace@x.co,\n" +
      "Alan,Turing,,alan@x.co,\n"
  );
  const report = JSON.parse(res.body);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(report.created, 2);
  assert.strictEqual(report.failed.length, 1);
  assert.strictEqual(report.failed[0].email, "grace@x.co");
  assert.strictEqual(db.rows.length, 2, "the other two rows still landed");
});

test("POST /import rejects a file with no email column", async () => {
  const res = await postCSV(
    "/api/journalists/import",
    "First Name,Last Name\nAda,Lovelace\n"
  );
  assert.strictEqual(res.status, 400);
  assert.match(JSON.parse(res.body).message, /missing a required column/i);
  assert.strictEqual(db.rows.length, 0);
});

test("POST /import rejects an empty body", async () => {
  const res = await postCSV("/api/journalists/import", "");
  assert.strictEqual(res.status, 400);
});

test("POST /import never writes a column outside the whitelist", async () => {
  await postCSV(
    "/api/journalists/import",
    "First Name,Last Name,Email,id\nAda,Lovelace,ada@x.co,4242\n"
  );
  // The row gets its id from the database, not from the uploaded file.
  assert.strictEqual(db.rows[0].id, 1);
});

// --- auth -------------------------------------------------------------------

test("export and import both require a session", async () => {
  authenticated = false;

  const exportRes = await request("/api/journalists/export.csv");
  assert.strictEqual(exportRes.status, 302);
  assert.strictEqual(exportRes.headers.location, "/login");

  const importRes = await postCSV(
    "/api/journalists/import",
    HEADER + "Ada,Lovelace,,ada@x.co,\n"
  );
  assert.strictEqual(importRes.status, 302);
  assert.strictEqual(db.rows.length, 0);
});

test("REGRESSION: PUT /:id requires a session", async () => {
  // This route shipped without withAuth while every other write on the router
  // had it, so anyone who could reach the port could edit any journalist.
  seed([{ first_name: "Ada", last_name: "L", email: "ada@x.co" }]);
  authenticated = false;

  const res = await request("/api/journalists/1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ first_name: "Hacked" }),
  });

  assert.strictEqual(res.status, 302);
  assert.strictEqual(db.rows[0].first_name, "Ada");
});
