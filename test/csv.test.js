// test/csv.test.js — run with `npm test`
const test = require("node:test");
const assert = require("node:assert");

const { toCSV, parseCSV, parseCSVToObjects, escapeField } = require("../utils/csv");

const COLS = [
  { key: "a", header: "A" },
  { key: "b", header: "B" },
];

test("escapeField quotes fields containing a comma, quote or newline", () => {
  assert.strictEqual(escapeField("plain"), "plain");
  assert.strictEqual(escapeField("has,comma"), '"has,comma"');
  assert.strictEqual(escapeField('has"quote'), '"has""quote"');
  assert.strictEqual(escapeField("has\nnewline"), '"has\nnewline"');
});

test("escapeField renders null and undefined as empty, not as the words", () => {
  assert.strictEqual(escapeField(null), "");
  assert.strictEqual(escapeField(undefined), "");
  assert.strictEqual(escapeField(0), "0");
  assert.strictEqual(escapeField(""), "");
});

test("escapeField neutralises spreadsheet formula injection", () => {
  // A display name starting with = would otherwise execute on open.
  assert.strictEqual(
    escapeField('=HYPERLINK("http://evil.example","click")'),
    `"'=HYPERLINK(""http://evil.example"",""click"")"`
  );
  assert.strictEqual(escapeField("+1 555 0100"), "'+1 555 0100");
  assert.strictEqual(escapeField("-5"), "'-5");
  assert.strictEqual(escapeField("@handle"), "'@handle");
  // Ordinary text is left completely alone.
  assert.strictEqual(escapeField("Ada Lovelace"), "Ada Lovelace");
});

test("toCSV writes a header row, CRLF endings and a UTF-8 BOM", () => {
  const csv = toCSV([{ a: "1", b: "2" }], COLS);
  assert.ok(csv.startsWith("﻿"), "expected a BOM so Excel reads UTF-8");
  assert.strictEqual(csv.slice(1), "A,B\r\n1,2\r\n");
});

test("toCSV tolerates an empty row set and missing keys", () => {
  assert.strictEqual(toCSV([], COLS, { bom: false }), "A,B\r\n");
  assert.strictEqual(toCSV(null, COLS, { bom: false }), "A,B\r\n");
  assert.strictEqual(toCSV([{ a: "1" }], COLS, { bom: false }), "A,B\r\n1,\r\n");
});

test("parseCSV handles quotes, embedded commas and embedded newlines", () => {
  const grid = parseCSV('a,b\r\n"x,1","y\nz"\r\n');
  assert.deepStrictEqual(grid, [
    ["a", "b"],
    ["x,1", "y\nz"],
  ]);
});

test("parseCSV understands the doubled-quote escape", () => {
  assert.deepStrictEqual(parseCSV('a\n"say ""hi"""'), [["a"], ['say "hi"']]);
});

test("parseCSV accepts CRLF, LF and bare CR line endings", () => {
  assert.deepStrictEqual(parseCSV("a\r\nb\r\n"), [["a"], ["b"]]);
  assert.deepStrictEqual(parseCSV("a\nb\n"), [["a"], ["b"]]);
  assert.deepStrictEqual(parseCSV("a\rb\r"), [["a"], ["b"]]);
});

test("parseCSV strips a leading BOM so the first header still matches", () => {
  const grid = parseCSV("﻿Email\nsam@example.com\n");
  assert.strictEqual(grid[0][0], "Email");
});

test("parseCSV drops blank trailing lines but keeps genuinely empty fields", () => {
  assert.deepStrictEqual(parseCSV("a,b\n1,\n\n"), [
    ["a", "b"],
    ["1", ""],
  ]);
});

test("parseCSV round-trips whatever toCSV produced", () => {
  const rows = [
    { a: 'quote " and , comma', b: "line\nbreak" },
    { a: "=formula", b: null },
  ];
  const grid = parseCSV(toCSV(rows, COLS));
  assert.deepStrictEqual(grid[1], ['quote " and , comma', "line\nbreak"]);
  assert.deepStrictEqual(grid[2], ["'=formula", ""]);
});

test("parseCSV returns nothing for empty or non-string input", () => {
  assert.deepStrictEqual(parseCSV(""), []);
  assert.deepStrictEqual(parseCSV(undefined), []);
  assert.deepStrictEqual(parseCSV(null), []);
});

test("parseCSVToObjects keys rows by header and reports the source line", () => {
  const { headers, rows } = parseCSVToObjects("Email,City\nsam@x.com,LA\na@b.co,NY\n");
  assert.deepStrictEqual(headers, ["Email", "City"]);
  assert.strictEqual(rows.length, 2);
  // Line 2 is the first data row: humans count the header as line 1.
  assert.strictEqual(rows[0].lineNumber, 2);
  assert.deepStrictEqual(rows[0].record, { Email: "sam@x.com", City: "LA" });
  assert.strictEqual(rows[1].lineNumber, 3);
});

test("parseCSVToObjects fills short rows rather than leaving fields undefined", () => {
  const { rows } = parseCSVToObjects("A,B,C\n1\n");
  assert.deepStrictEqual(rows[0].record, { A: "1", B: "", C: "" });
});
