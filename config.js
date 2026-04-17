// ============================================================
//  CONFIG — Rajnandini Fashion Sales Dashboard
// ============================================================

const CONFIG = {

  // Google Sheet "Publish to web" CSV link
  // To get Sale Data sheet specifically, open it and publish just that sheet
  CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR0PM8E19RcHN-f2EJ9yYkeAl003PVuldrSd8IsvJb93EEhMRrwA55niJpxAMToc8iEFtB_LUpJLz6s/pub?output=csv",

  TITLE: "Rajnandini Fashion — Sales Dashboard",

  // ── Exact column names from your Google Sheet ──
  MONTH_COL:    "MONTH",
  DATE_COL:     "DATE",
  CHANNEL_COL:  "Channel Name",
  CATEGORY_COL: "Category",
  CHAN_SKU_COL: "Channel SKU",
  UNI_SKU_COL:  "Uniwere SKU",
  SALE_COL:     "SALE",
  RETURN_COL:   "RETURN",
  LAST30_COL:   "LAST 30 DAYS",
  MASTER_COL:   "MASTER Channel Name",

  // ── Display ──
  TOP_N:          10,
  MAX_TABLE_ROWS: 2000,
};
