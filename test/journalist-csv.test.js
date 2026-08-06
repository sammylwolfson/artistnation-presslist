// test/journalist-csv.test.js — run with `npm test`
const test = require("node:test");
const assert = require("node:assert");

const {
  normalizeHeader,
  journalistsToCSV,
  exportFilename,
  parseJournalistCSV,
  partitionAgainstExisting,
  MAX_IMPORT_ROWS,
} = require("../utils/journalist-csv");

const HEADER = "First Name,Last Name,Company,Email,City\n";

test("normalizeHeader maps the canonical headers", () => {
  assert.strictEqual(normalizeHeader("First Name"), "first_name");
  assert.strictEqual(normalizeHeader("Last Name"), "last_name");
  assert.strictEqual(normalizeHeader("Email"), "email");
  assert.strictEqual(normalizeHeader("Company"), "company");
  assert.strictEqual(normalizeHeader("City"), "city");
});

test("normalizeHeader is tolerant of case, spacing and punctuation", () => {
  assert.strictEqual(normalizeHeader("  first_name "), "first_name");
  assert.strictEqual(normalizeHeader("FIRSTNAME"), "first_name");
  assert.strictEqual(normalizeHeader("E-Mail Address"), "email");
});

test("normalizeHeader accepts the names other press tools use for company", () => {
  assert.strictEqual(normalizeHeader("Outlet"), "company");
  assert.strictEqual(normalizeHeader("Publication"), "company");
  assert.strictEqual(normalizeHeader("Organization"), "company");
});

test("normalizeHeader returns null for columns we do not import", () => {
  assert.strictEqual(normalizeHeader("Beat"), null);
  assert.strictEqual(normalizeHeader("id"), null);
  assert.strictEqual(normalizeHeader(""), null);
  assert.strictEqual(normalizeHeader(undefined), null);
});

test("journalistsToCSV accepts Sequelize instances as well as plain objects", () => {
  const instance = {
    get: () => ({ first_name: "Ada", last_name: "L", email: "a@b.co" }),
  };
  const csv = journalistsToCSV([instance]);
  assert.ok(csv.includes("Ada,L,,a@b.co"));
});

test("journalistsToCSV emits the documented header row", () => {
  assert.ok(
    journalistsToCSV([]).includes("First Name,Last Name,Company,Email,City,Date Added")
  );
});

test("exportFilename is date-stamped and filesystem-safe", () => {
  assert.strictEqual(
    exportFilename(new Date(2026, 7, 5)),
    "press-list-2026-08-05.csv"
  );
  assert.ok(!/[/\\:]/.test(exportFilename()));
});

test("a clean file imports every row", () => {
  const result = parseJournalistCSV(
    HEADER + "Ada,Lovelace,Analytical Weekly,ada@analytical.co,London\n"
  );
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.totalRows, 1);
  assert.strictEqual(result.valid.length, 1);
  assert.deepStrictEqual(result.valid[0].data, {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@analytical.co",
    company: "Analytical Weekly",
    city: "London",
  });
});

test("optional fields become null rather than empty strings", () => {
  const result = parseJournalistCSV(HEADER + "Ada,Lovelace,,ada@x.co,\n");
  assert.strictEqual(result.valid[0].data.company, null);
  assert.strictEqual(result.valid[0].data.city, null);
});

test("values are trimmed", () => {
  const result = parseJournalistCSV(HEADER + "  Ada , Lovelace ,, ada@x.co ,\n");
  assert.strictEqual(result.valid[0].data.first_name, "Ada");
  assert.strictEqual(result.valid[0].data.email, "ada@x.co");
});

test("a missing required column is rejected before anything is imported", () => {
  const result = parseJournalistCSV("First Name,Last Name,City\nAda,Lovelace,LA\n");
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /missing a required column: email/i);
  assert.strictEqual(result.valid.length, 0);
});

test("rows missing a required value are reported with their line number", () => {
  const result = parseJournalistCSV(
    HEADER +
      "Ada,Lovelace,,ada@x.co,\n" +
      ",Babbage,,charles@x.co,\n" +
      "Grace,,,grace@x.co,\n"
  );
  assert.strictEqual(result.valid.length, 1);
  assert.strictEqual(result.invalid.length, 2);
  assert.strictEqual(result.invalid[0].lineNumber, 3);
  assert.match(result.invalid[0].errors[0], /First Name is required/);
  assert.strictEqual(result.invalid[1].lineNumber, 4);
  assert.match(result.invalid[1].errors[0], /Last Name is required/);
});

test("malformed email addresses are rejected, not sent to the database", () => {
  const result = parseJournalistCSV(
    HEADER +
      "Ada,Lovelace,,not-an-email,\n" +
      "Grace,Hopper,,grace@,\n" +
      "Alan,Turing,,alan@x.co,\n"
  );
  assert.strictEqual(result.valid.length, 1);
  assert.strictEqual(result.invalid.length, 2);
  assert.match(result.invalid[0].errors[0], /not a valid email/);
});

test("one bad row does not stop the good rows around it", () => {
  const result = parseJournalistCSV(
    HEADER +
      "A,One,,a@x.co,\n" +
      ",,,,\n" +
      "B,Two,,b@x.co,\n"
  );
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(
    result.valid.map((r) => r.data.email),
    ["a@x.co", "b@x.co"]
  );
});

test("duplicate emails inside the file are collapsed, keeping the first", () => {
  const result = parseJournalistCSV(
    HEADER +
      "Ada,Lovelace,First Outlet,ada@x.co,\n" +
      "Ada,Lovelace,Second Outlet,ADA@X.CO,\n"
  );
  assert.strictEqual(result.valid.length, 1);
  assert.strictEqual(result.valid[0].data.company, "First Outlet");
  assert.strictEqual(result.duplicatesInFile.length, 1);
  assert.strictEqual(result.duplicatesInFile[0].lineNumber, 3);
  assert.strictEqual(result.duplicatesInFile[0].firstSeenOnLine, 2);
});

test("unrecognised columns are reported and ignored, never written", () => {
  const result = parseJournalistCSV(
    "First Name,Last Name,Email,Beat,id\nAda,Lovelace,ada@x.co,Tech,999\n"
  );
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(result.unknownColumns, ["Beat", "id"]);
  // Mass assignment guard: nothing outside the whitelist survives the parse.
  assert.deepStrictEqual(Object.keys(result.valid[0].data).sort(), [
    "city",
    "company",
    "email",
    "first_name",
    "last_name",
  ]);
  assert.strictEqual(result.valid[0].data.id, undefined);
});

test("a repeated column is reported rather than silently merged", () => {
  const result = parseJournalistCSV(
    "First Name,Last Name,Email,Email\nAda,Lovelace,first@x.co,second@x.co\n"
  );
  assert.strictEqual(result.valid[0].data.email, "first@x.co");
  assert.strictEqual(result.unknownColumns.length, 1);
});

test("quoted commas and newlines survive the import", () => {
  const result = parseJournalistCSV(
    HEADER + '"Ada","Lovelace","Analytical, Weekly","ada@x.co","London"\n'
  );
  assert.strictEqual(result.valid[0].data.company, "Analytical, Weekly");
});

test("an empty file, a header-only file and junk are all rejected clearly", () => {
  assert.match(parseJournalistCSV("").error, /empty/i);
  assert.match(parseJournalistCSV("   ").error, /empty/i);
  assert.match(parseJournalistCSV(HEADER).error, /no journalists/i);
  assert.match(parseJournalistCSV("nonsense\n").error, /missing a required column/i);
  assert.match(parseJournalistCSV(undefined).error, /empty/i);
});

test("files over the row cap are refused rather than half-imported", () => {
  const rows = Array.from(
    { length: MAX_IMPORT_ROWS + 1 },
    (_, i) => `A,B,,user${i}@x.co,\n`
  ).join("");
  const result = parseJournalistCSV(HEADER + rows);
  assert.strictEqual(result.ok, false);
  assert.match(result.error, new RegExp(String(MAX_IMPORT_ROWS)));
});

test("a file exactly at the cap is accepted", () => {
  const rows = Array.from(
    { length: MAX_IMPORT_ROWS },
    (_, i) => `A,B,,user${i}@x.co,\n`
  ).join("");
  const result = parseJournalistCSV(HEADER + rows);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.valid.length, MAX_IMPORT_ROWS);
});

test("partitionAgainstExisting matches stored emails case-insensitively", () => {
  const rows = [
    { lineNumber: 2, data: { email: "ADA@x.co" } },
    { lineNumber: 3, data: { email: "new@x.co" } },
  ];
  const { toCreate, toUpdate } = partitionAgainstExisting(rows, [
    { id: 7, email: "ada@X.CO" },
  ]);
  assert.strictEqual(toUpdate.length, 1);
  assert.strictEqual(toUpdate[0].id, 7);
  assert.strictEqual(toCreate.length, 1);
  assert.strictEqual(toCreate[0].data.email, "new@x.co");
});

test("partitionAgainstExisting accepts Sequelize instances and an empty table", () => {
  const rows = [{ lineNumber: 2, data: { email: "a@x.co" } }];
  const asInstance = [{ get: () => ({ id: 3, email: "a@x.co" }) }];
  assert.strictEqual(partitionAgainstExisting(rows, asInstance).toUpdate.length, 1);
  assert.strictEqual(partitionAgainstExisting(rows, []).toCreate.length, 1);
  assert.strictEqual(partitionAgainstExisting(rows, null).toCreate.length, 1);
});

test("export output can be re-imported unchanged (round trip)", () => {
  const csv = journalistsToCSV([
    {
      first_name: "Ada",
      last_name: "Lovelace",
      company: "Analytical, Weekly",
      email: "ada@x.co",
      city: "London",
      created_at: new Date("2026-08-05T00:00:00Z"),
    },
  ]);
  const result = parseJournalistCSV(csv);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.valid.length, 1);
  assert.strictEqual(result.valid[0].data.company, "Analytical, Weekly");
  // "Date Added" is export-only and must not come back in as a writable field.
  assert.ok(result.unknownColumns.includes("Date Added"));
});
