// dashboard.js — Core logic

let allRows = [], headers = [], charts = {};
let colMap = {};

// ── Colour palette ────────────────────────────────────────────
const COLORS = [
  "#2563EB","#16A34A","#D97706","#DC2626",
  "#7C3AED","#0891B2","#BE185D","#65A30D",
  "#EA580C","#4338CA","#0D9488","#B45309"
];

// ── Entry point ───────────────────────────────────────────────
async function loadData() {
  showSkeletons(true);
  setStatus("Fetching data…");
  try {
    const res = await fetch(CONFIG.CSV_URL + "&t=" + Date.now());
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
    headers = parsed.meta.fields || [];
    allRows = parsed.data;
    buildColMap();
    renderAll();
    setStatus("Updated " + new Date().toLocaleTimeString());
    document.getElementById("sheetLink").href = CONFIG.CSV_URL;
    document.title = CONFIG.TITLE;
  } catch(e) {
    setStatus("⚠ Could not load data — check CONFIG.CSV_URL");
    console.error(e);
  }
  showSkeletons(false);
}

// ── Auto-detect columns ───────────────────────────────────────
function buildColMap() {
  const c = CONFIG;
  colMap = {
    date:     c.DATE_COL     || autoFind("date",     ["date","month","year","period","week","day","time","created"]),
    revenue:  c.REVENUE_COL  || autoFind("revenue",  ["revenue","sales","amount","total","value","income","price","gmv","net","gross"]),
    category: c.CATEGORY_COL || autoFind("category", ["category","type","segment","region","channel","product","group","dept","division"]),
    name:     c.NAME_COL     || autoFind("name",     ["name","product","item","sku","title","description","label"]),
    quantity: c.QUANTITY_COL || autoFind("quantity", ["quantity","qty","units","count","volume","orders","transactions"]),
  };
}

function autoFind(key, keywords) {
  if (!CONFIG.AUTO_DETECT) return null;
  for (const h of headers) {
    const l = h.toLowerCase();
    if (keywords.some(k => l.includes(k))) return h;
  }
  // fallback: first numeric column for revenue/quantity
  if (key === "revenue" || key === "quantity") {
    return headers.find(h => typeof allRows[0]?.[h] === "number") || null;
  }
  return null;
}

// ── Render everything ─────────────────────────────────────────
function renderAll() {
  renderKPIs();
  renderRevenueChart();
  renderCategoryChart();
  renderBarChart();
  renderTopChart();
  renderTable();
  buildColFilterSelect();
}

// ── KPI Cards ─────────────────────────────────────────────────
function renderKPIs() {
  const grid = document.getElementById("kpiGrid");
  const rev = colMap.revenue;
  const qty = colMap.quantity;

  const total    = rev ? sum(allRows, rev) : null;
  const count    = allRows.length;
  const avgOrder = (rev && count) ? total / count : null;
  const totalQty = qty ? sum(allRows, qty) : null;

  const cards = [
    { label: "Total Revenue",   value: total    != null ? fmt(total)           : count + " rows",  delta: null },
    { label: "Total Orders",    value: count,                                                       delta: null },
    { label: "Avg Order Value", value: avgOrder != null ? fmt(avgOrder)        : "—",              delta: null },
    { label: "Total Units Sold",value: totalQty != null ? totalQty.toLocaleString() : "—",         delta: null },
  ];

  grid.innerHTML = cards.map(c => `
    <div class="kpi-card">
      <div class="kpi-label">${c.label}</div>
      <div class="kpi-value">${c.value}</div>
    </div>
  `).join("");
}

// ── Revenue over time (line chart) ───────────────────────────
function renderRevenueChart() {
  if (charts.revenue) { charts.revenue.destroy(); }
  const ctx = document.getElementById("revenueChart").getContext("2d");

  if (!colMap.date || !colMap.revenue) {
    // fallback: just plot raw revenue values
    const vals = allRows.slice(0, 50).map(r => r[colMap.revenue] || 0);
    const labels = vals.map((_, i) => "Row " + (i+1));
    charts.revenue = makeLineChart(ctx, labels, vals);
    return;
  }

  // Group by date
  const groups = {};
  allRows.forEach(r => {
    const d = r[colMap.date];
    if (!d) return;
    const key = String(d).substring(0, 7); // YYYY-MM
    groups[key] = (groups[key] || 0) + (r[colMap.revenue] || 0);
  });
  const sorted = Object.keys(groups).sort();
  const vals   = sorted.map(k => groups[k]);
  charts.revenue = makeLineChart(ctx, sorted, vals);
}

function makeLineChart(ctx, labels, data) {
  return new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Revenue",
        data,
        borderColor: "#2563EB",
        backgroundColor: "rgba(37,99,235,0.08)",
        borderWidth: 2.5,
        pointRadius: data.length < 30 ? 4 : 0,
        pointBackgroundColor: "#2563EB",
        tension: 0.35,
        fill: true,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#888", font: { size: 11 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 12 } },
        y: { ticks: { color: "#888", font: { size: 11 }, callback: v => CONFIG.CURRENCY + compactNum(v) }, grid: { color: "rgba(0,0,0,0.05)" } }
      }
    }
  });
}

// ── Category breakdown (doughnut) ───────────────────────────
function renderCategoryChart() {
  if (charts.category) { charts.category.destroy(); }
  const ctx = document.getElementById("categoryChart").getContext("2d");

  const col = colMap.category || colMap.name;
  if (!col) {
    ctx.canvas.parentElement.innerHTML = '<p class="no-data">No category column detected.</p>';
    return;
  }

  const groups = {};
  allRows.forEach(r => {
    const k = r[col] || "Other";
    groups[k] = (groups[k] || 0) + (colMap.revenue ? (r[colMap.revenue] || 0) : 1);
  });
  const sorted = Object.entries(groups).sort((a,b) => b[1]-a[1]).slice(0, 10);
  const labels = sorted.map(x => x[0]);
  const vals   = sorted.map(x => x[1]);

  charts.category = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data: vals, backgroundColor: COLORS.slice(0,labels.length), borderWidth: 2, borderColor: "#fff" }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: "right", labels: { font: { size: 11 }, color: "#555", boxWidth: 12, padding: 10 } }
      }
    }
  });
}

// ── Monthly bar chart ─────────────────────────────────────────
function renderBarChart() {
  if (charts.bar) { charts.bar.destroy(); }
  const ctx = document.getElementById("barChart").getContext("2d");

  if (!colMap.date || !colMap.revenue) {
    const col = colMap.revenue || headers.find(h => typeof allRows[0]?.[h] === "number");
    if (!col) { ctx.canvas.parentElement.innerHTML = '<p class="no-data">No numeric column detected.</p>'; return; }
    const vals   = allRows.slice(0, 12).map(r => r[col] || 0);
    const labels = vals.map((_, i) => "Row " + (i+1));
    makeBarChart(ctx, labels, vals);
    return;
  }

  const groups = {};
  allRows.forEach(r => {
    const d = r[colMap.date];
    if (!d) return;
    const key = String(d).substring(0, 7);
    groups[key] = (groups[key] || 0) + (r[colMap.revenue] || 0);
  });
  const sorted = Object.keys(groups).sort().slice(-12);
  makeBarChart(ctx, sorted, sorted.map(k => groups[k]));
}

function makeBarChart(ctx, labels, data) {
  charts.bar = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Revenue",
        data,
        backgroundColor: "rgba(37,99,235,0.75)",
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#888", font: { size: 11 }, autoSkip: false, maxRotation: 45 } },
        y: { ticks: { color: "#888", font: { size: 11 }, callback: v => CONFIG.CURRENCY + compactNum(v) }, grid: { color: "rgba(0,0,0,0.05)" } }
      }
    }
  });
}

// ── Top performers (horizontal bar) ──────────────────────────
function renderTopChart() {
  if (charts.top) { charts.top.destroy(); }
  const ctx = document.getElementById("topChart").getContext("2d");

  const col = colMap.name || colMap.category;
  if (!col || !colMap.revenue) {
    ctx.canvas.parentElement.innerHTML = '<p class="no-data">Need a name/category and revenue column.</p>';
    return;
  }

  const groups = {};
  allRows.forEach(r => {
    const k = r[col] || "Unknown";
    groups[k] = (groups[k] || 0) + (r[colMap.revenue] || 0);
  });
  const top = Object.entries(groups).sort((a,b)=>b[1]-a[1]).slice(0, CONFIG.TOP_N);
  const labels = top.map(x => x[0]);
  const vals   = top.map(x => x[1]);

  const wrapH = Math.max(200, labels.length * 38 + 40);
  ctx.canvas.parentElement.style.height = wrapH + "px";

  charts.top = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Revenue",
        data: vals,
        backgroundColor: COLORS.slice(0, labels.length),
        borderRadius: 3,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#888", font: { size: 11 }, callback: v => CONFIG.CURRENCY + compactNum(v) }, grid: { color: "rgba(0,0,0,0.05)" } },
        y: { ticks: { color: "#444", font: { size: 12 } } }
      }
    }
  });
}

// ── Data table ────────────────────────────────────────────────
let filteredRows = [];

function renderTable() {
  filteredRows = allRows.slice(0, CONFIG.MAX_TABLE_ROWS);

  const head = document.getElementById("tableHead");
  head.innerHTML = "<tr>" + headers.map(h => `<th>${h}</th>`).join("") + "</tr>";

  renderTableBody(filteredRows);
}

function renderTableBody(rows) {
  const body = document.getElementById("tableBody");
  const empty = document.getElementById("emptyState");
  const footer = document.getElementById("tableFooter");

  if (!rows.length) {
    body.innerHTML = "";
    empty.style.display = "block";
    footer.textContent = "";
    return;
  }
  empty.style.display = "none";
  body.innerHTML = rows.map(r =>
    "<tr>" + headers.map(h => `<td>${r[h] ?? ""}</td>`).join("") + "</tr>"
  ).join("");
  footer.textContent = rows.length.toLocaleString() + " of " + allRows.length.toLocaleString() + " records";
}

function filterTable() {
  const q   = document.getElementById("searchInput").value.toLowerCase();
  const col = document.getElementById("colFilter").value;

  const filtered = allRows.filter(r => {
    if (!q) return true;
    const checkCols = col ? [col] : headers;
    return checkCols.some(h => String(r[h] ?? "").toLowerCase().includes(q));
  });
  renderTableBody(filtered.slice(0, CONFIG.MAX_TABLE_ROWS));
}

function buildColFilterSelect() {
  const sel = document.getElementById("colFilter");
  sel.innerHTML = '<option value="">All columns</option>' +
    headers.map(h => `<option value="${h}">${h}</option>`).join("");
}

// ── Helpers ───────────────────────────────────────────────────
function sum(rows, col) { return rows.reduce((a,r) => a + (Number(r[col]) || 0), 0); }
function fmt(n) { return CONFIG.CURRENCY + Math.round(n).toLocaleString("en-IN"); }
function compactNum(n) {
  if (n >= 1e7) return (n/1e7).toFixed(1) + "Cr";
  if (n >= 1e5) return (n/1e5).toFixed(1) + "L";
  if (n >= 1e3) return (n/1e3).toFixed(1) + "K";
  return n;
}
function setStatus(msg) { document.getElementById("lastUpdated").textContent = msg; }
function showSkeletons(show) {
  document.querySelectorAll(".kpi-card.skeleton").forEach(el => el.style.display = show ? "block" : "none");
}

// ── Init ──────────────────────────────────────────────────────
loadData();
