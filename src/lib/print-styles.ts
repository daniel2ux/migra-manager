export const printStyles = `
@media print {
  @page {
    size: A4 portrait;
    margin: 20mm 15mm 22mm 15mm;

    @top-left   { content: ""; }
    @top-center { content: ""; }
    @top-right  { content: ""; }

    @bottom-left {
      content: "MIGRA DATA CORE V2.1.LE  ·  AUDIT-PASS: YES";
      font-size: 6.5pt;
      font-family: ui-monospace, "Courier New", monospace;
      font-weight: 900;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.3em;
      border-top: 0.5pt solid #e2e8f0;
      padding-top: 3mm;
      vertical-align: top;
    }

    @bottom-right {
      content: "PAGE REF. " counter(page, decimal-leading-zero) "/" counter(pages, decimal-leading-zero) "-A";
      font-size: 6.5pt;
      font-family: ui-monospace, "Courier New", monospace;
      font-weight: 900;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3em;
      border-top: 0.5pt solid #e2e8f0;
      padding-top: 3mm;
      vertical-align: top;
    }
  }

  html, body {
    background: white !important;
    overflow: visible !important;
    height: auto !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* Reset shell layout */
  .dashboard-shell-root,
  main,
  .overflow-y-auto {
    overflow: visible !important;
    height: auto !important;
    position: static !important;
    display: block !important;
    min-height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
  }

  .md\\:ml-64,
  .print\\:ml-0 {
    margin-left: 0 !important;
  }

  /* Hide all UI chrome */
  .print\\:hidden {
    display: none !important;
  }

  /* HTML footer hidden in print — @page margin boxes handle it */
  .report-print-footer-group {
    display: none !important;
  }

  /* Report wrapper — centered on page */
  .report-print-wrapper {
    display: block !important;
    border: none !important;
    padding: 0 !important;
    margin: 0 auto !important;
    width: 100% !important;
    max-width: 100% !important;
    box-shadow: none !important;
    outline: none !important;
    overflow: visible !important;
  }

  /* Remove shadcn Table overflow-auto wrapper constraint so thead repeats on page break */
  .overflow-auto,
  div:has(> table) {
    overflow: visible !important;
  }

  /* Keep report header flex layout */
  .report-print-header {
    display: flex !important;
    justify-content: space-between !important;
    align-items: flex-start !important;
    gap: 2rem !important;
  }

  /* Prevent right column from overflowing page margins */
  .report-print-header > *:last-child {
    min-width: 0 !important;
    shrink: 1 !important;
    max-width: 42% !important;
  }

  /* Hide Radix UI portals and overlays */
  [data-radix-popper-content-wrapper],
  [data-radix-toast-viewport],
  [role="tooltip"],
  [data-radix-select-viewport] {
    display: none !important;
  }

  /* Data tables */
  table {
    width: 100% !important;
    page-break-inside: auto !important;
    border-collapse: collapse !important;
    display: table !important;
  }

  tr {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    display: table-row !important;
  }

  td, th {
    page-break-inside: avoid !important;
  }

  thead {
    display: table-header-group !important;
  }
}
`;
