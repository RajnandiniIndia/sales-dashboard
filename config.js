// ============================================================
//  CONFIG — Edit this file to connect your Google Sheet
// ============================================================

const CONFIG = {

  // Paste your "Publish to the web" CSV link here:
  CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR0PM8E19RcHN-f2EJ9yYkeAl003PVuldrSd8IsvJb93EEhMRrwA55niJpxAMToc8iEFtB_LUpJLz6s/pub?output=csv",

  // Dashboard title shown in the browser tab & header
  TITLE: "Sales Dashboard",

  // ---- Column mapping ----
  // Set the EXACT header names from your Google Sheet.
  // If a column doesn't exist in your sheet, set it to null.

  DATE_COL:     null,   // e.g. "Date" or "Order Date"
  REVENUE_COL:  null,   // e.g. "Revenue" or "Sales"
  CATEGORY_COL: null,   // e.g. "Category" or "Product"
  NAME_COL:     null,   // e.g. "Product Name" or "Item"
  QUANTITY_COL: null,   // e.g. "Quantity" or "Units"

  // ---- Auto-detect (leave true) ----
  // When column names above are null, the dashboard will
  // try to auto-detect numeric/date/category columns.
  AUTO_DETECT: true,

  // ---- Display ----
  CURRENCY: "₹",          // Currency symbol
  DATE_FORMAT: "MMM YYYY", // How dates appear on charts
  MAX_TABLE_ROWS: 500,     // Max rows shown in the table
  TOP_N: 8,                // How many items in "Top Performers"
};
