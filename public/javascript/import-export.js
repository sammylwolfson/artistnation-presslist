// public/javascript/import-export.js
// CSV export + import for the journalists page.

(function () {
  const exportLink = document.querySelector("#export-csv");
  const importForm = document.querySelector("#import-form");
  const importFile = document.querySelector("#import-file");
  const importMode = document.querySelector("#import-mode");
  const importDryRun = document.querySelector("#import-dry-run");
  const importStatus = document.querySelector("#import-status");

  // Carry whatever filter the page is currently showing into the export, so
  // "Export CSV" exports the list you are looking at, not always the whole table.
  if (exportLink) {
    const search = window.location.search || "";
    exportLink.href = `/api/journalists/export.csv${search}`;
  }

  function renderReport(report) {
    const lines = [];
    const verb = report.dryRun ? "would be" : "were";

    lines.push(`<strong>${report.totalRows}</strong> rows read.`);
    lines.push(
      `<strong>${report.created}</strong> ${verb} added` +
        (report.updated ? `, <strong>${report.updated}</strong> updated` : "") +
        (report.skipped
          ? `, <strong>${report.skipped}</strong> skipped (already on the list)`
          : "") +
        "."
    );

    if (report.duplicatesInFile.length) {
      lines.push(
        `<strong>${report.duplicatesInFile.length}</strong> duplicate email(s) inside the file were ignored: ` +
          report.duplicatesInFile
            .slice(0, 10)
            .map((d) => `line ${d.lineNumber} (${d.email})`)
            .join(", ")
      );
    }

    if (report.unknownColumns.length) {
      lines.push(
        `Ignored unrecognised column(s): ${report.unknownColumns.join(", ")}`
      );
    }

    if (report.invalid.length) {
      lines.push(
        `<strong>${report.invalid.length}</strong> row(s) had problems:<ul>` +
          report.invalid
            .slice(0, 25)
            .map((r) => `<li>Line ${r.lineNumber}: ${r.errors.join("; ")}</li>`)
            .join("") +
          "</ul>"
      );
    }

    if (report.failed.length) {
      lines.push(
        `<strong>${report.failed.length}</strong> row(s) failed to save:<ul>` +
          report.failed
            .slice(0, 25)
            .map((r) => `<li>Line ${r.lineNumber} (${r.email}): ${r.error}</li>`)
            .join("") +
          "</ul>"
      );
    }

    if (report.dryRun) {
      lines.push(
        "<em>Preview only — nothing was saved. Untick “Preview only” to import.</em>"
      );
    }

    importStatus.innerHTML = lines.map((l) => `<p class="mb-1">${l}</p>`).join("");
    importStatus.hidden = false;
  }

  async function importHandler(event) {
    event.preventDefault();

    const file = importFile.files[0];
    if (!file) {
      importStatus.textContent = "Choose a CSV file first.";
      importStatus.hidden = false;
      return;
    }

    const dryRun = importDryRun.checked;
    const mode = importMode.value;

    importStatus.textContent = dryRun ? "Checking file…" : "Importing…";
    importStatus.hidden = false;

    try {
      const csv = await file.text();
      const response = await fetch(
        `/api/journalists/import?mode=${encodeURIComponent(mode)}${
          dryRun ? "&dryRun=1" : ""
        }`,
        {
          method: "POST",
          headers: { "Content-Type": "text/csv" },
          body: csv,
        }
      );

      const report = await response.json();

      if (!response.ok) {
        importStatus.innerHTML = `<p class="mb-1">${
          report.message || response.statusText
        }</p>`;
        return;
      }

      renderReport(report);

      // Only reload once something actually changed, so the report stays readable.
      if (!dryRun && (report.created > 0 || report.updated > 0)) {
        setTimeout(() => document.location.reload(), 2500);
      }
    } catch (err) {
      importStatus.textContent = `Could not read that file: ${err.message}`;
    }
  }

  if (importForm) {
    importForm.addEventListener("submit", importHandler);
  }
})();
