// utils/csv.js
//
// Zero-dependency RFC 4180 CSV serializer + parser.
//
// Deliberately no npm dependency: this repo's package.json has not been touched
// since 2022 and adding a parser (csv-parse, papaparse, fast-csv) would drag in a
// dependency tree that nobody here is going to audit. CSV is small enough to own.
//
// Handles: quoted fields, embedded commas / quotes / newlines, "" escapes,
// CRLF + LF + bare-CR line endings, a leading UTF-8 BOM, and trailing newlines.

// Excel, Numbers and Google Sheets all evaluate a cell whose text starts with one
// of these. A journalist whose display name is `=HYPERLINK("http://evil","click")`
// would otherwise become a live link in the exported press list.
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Render a single value as a CSV field.
 * @param {*} value
 * @returns {string}
 */
function escapeField(value) {
  if (value === null || value === undefined) return "";

  let str;
  if (value instanceof Date) {
    str = Number.isNaN(value.getTime()) ? "" : value.toISOString();
  } else {
    str = String(value);
  }

  // Neutralise spreadsheet formula injection without losing the original text.
  if (str.length && FORMULA_PREFIXES.includes(str[0])) {
    str = `'${str}`;
  }

  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serialize rows to a CSV document.
 * @param {Array<Object>} rows
 * @param {Array<{key: string, header: string}>} columns
 * @param {{ eol?: string, bom?: boolean }} [options]
 * @returns {string}
 */
function toCSV(rows, columns, options = {}) {
  const eol = options.eol || "\r\n"; // RFC 4180; also what Excel expects
  const lines = [columns.map((c) => escapeField(c.header)).join(",")];

  for (const row of rows || []) {
    lines.push(columns.map((c) => escapeField(row[c.key])).join(","));
  }

  const body = lines.join(eol) + eol;
  // A BOM makes Excel on Windows read the file as UTF-8 instead of the local
  // codepage, which is the difference between "Muñoz" and "MuÃ±oz".
  return options.bom === false ? body : `﻿${body}`;
}

/**
 * Parse a CSV document into an array of string arrays.
 * @param {string} text
 * @returns {string[][]}
 */
function parseCSV(text) {
  if (typeof text !== "string") return [];

  // Strip UTF-8 BOM if present.
  let input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (input === "") return [];

  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let fieldWasQuoted = false;

  const endField = () => {
    row.push(field);
    field = "";
    fieldWasQuoted = false;
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field === "" && !fieldWasQuoted) {
      inQuotes = true;
      fieldWasQuoted = true;
    } else if (char === ",") {
      endField();
    } else if (char === "\n") {
      endRow();
    } else if (char === "\r") {
      if (input[i + 1] === "\n") i += 1; // CRLF
      endRow();
    } else {
      field += char;
    }
  }

  // Flush the last field/row unless the file ended on a clean line break.
  if (field !== "" || row.length > 0 || fieldWasQuoted) {
    endRow();
  }

  // Drop entirely blank trailing lines (a single empty field and nothing else).
  return rows.filter(
    (r) => !(r.length === 1 && r[0].trim() === "")
  );
}

/**
 * Parse a CSV document into objects keyed by its header row.
 * Preserves the source line number so errors can point at a row in the file.
 * @param {string} text
 * @returns {{ headers: string[], rows: Array<{ lineNumber: number, values: string[], record: Object }> }}
 */
function parseCSVToObjects(text) {
  const grid = parseCSV(text);
  if (grid.length === 0) return { headers: [], rows: [] };

  const headers = grid[0].map((h) => h.trim());
  const rows = grid.slice(1).map((values, index) => {
    const record = {};
    headers.forEach((header, i) => {
      record[header] = values[i] === undefined ? "" : values[i];
    });
    // +2: one for the header row, one because humans count from 1.
    return { lineNumber: index + 2, values, record };
  });

  return { headers, rows };
}

module.exports = { toCSV, parseCSV, parseCSVToObjects, escapeField };
