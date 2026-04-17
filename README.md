# 📊 Sales Dashboard — GitHub Pages Setup

Live dashboard that reads data directly from your Google Sheet (no backend needed).

---

## 🚀 Deploy in 5 Steps

### Step 1 — Create a GitHub Repository
1. Go to [github.com](https://github.com) → click **New repository**
2. Name it anything (e.g. `sales-dashboard`)
3. Set it to **Public** (required for free GitHub Pages)
4. Click **Create repository**

---

### Step 2 — Upload the Dashboard Files
Upload all 4 files to your repository:
- `index.html`
- `style.css`
- `dashboard.js`
- `config.js`

You can drag & drop them on the GitHub web interface.

---

### Step 3 — Enable GitHub Pages
1. In your repo, go to **Settings → Pages**
2. Under **Source**, select **Deploy from a branch**
3. Choose branch: `main` (or `master`), folder: `/ (root)`
4. Click **Save**

Your site will be live at:
```
https://YOUR_USERNAME.github.io/REPO_NAME/
```

---

### Step 4 — Connect Your Google Sheet
Open `config.js` and set your CSV URL:

```js
CSV_URL: "https://docs.google.com/spreadsheets/d/e/YOUR_KEY/pub?output=csv",
```

> **Important:** Make sure your sheet is published as CSV:
> Google Sheets → File → Share → Publish to web → CSV → Publish

---

### Step 5 — Map Your Columns (Optional)
If auto-detection doesn't work, set exact column names in `config.js`:

```js
DATE_COL:     "Order Date",
REVENUE_COL:  "Revenue",
CATEGORY_COL: "Category",
NAME_COL:     "Product Name",
QUANTITY_COL: "Quantity",
```

---

## 📁 File Overview

| File | Purpose |
|------|---------|
| `index.html` | Dashboard structure |
| `style.css` | All visual styling |
| `dashboard.js` | Data fetching, charts, table logic |
| `config.js` | ✏️ **Only file you need to edit** |

---

## 🔄 Live Refresh
The dashboard fetches fresh data every time someone opens the page.
Click the **↺ Refresh** button to reload without leaving.

---

## 🐛 Troubleshooting

**No data loads?**
- Make sure the sheet is published: File → Share → Publish to web → CSV
- Check that the URL in `config.js` ends with `?output=csv`
- Open browser DevTools (F12) → Console tab for error details

**Charts show wrong columns?**
- Set column names manually in `config.js` instead of relying on auto-detect

**CORS error in browser?**
- This only happens when opening `index.html` as a local file. Once deployed on GitHub Pages, it works fine.

---

## 💡 Customization Tips
- Change `CURRENCY` in `config.js` for your currency symbol
- Change `TOP_N` to show more/fewer top performers
- The dashboard is fully responsive — works on mobile too
