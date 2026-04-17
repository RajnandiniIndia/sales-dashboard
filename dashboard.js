// dashboard.js — Rajnandini Fashion Sales Dashboard

// ── State ─────────────────────────────────────────────────────
let allRows    = [];   // raw data
let filtered   = [];   // after global filters
let charts     = {};
let visibleCols = [];  // columns shown in table
let sortCol    = "";
let sortDir    = "asc";
let currentPage = 1;

const COLORS = [
  "#2563EB","#16A34A","#D97706","#DC2626",
  "#7C3AED","#0891B2","#BE185D","#65A30D",
  "#EA580C","#4338CA","#0D9488","#9333EA"
];

// ── Exact column names ────────────────────────────────────────
const C = () => CONFIG; // shorthand

// ── Load data ─────────────────────────────────────────────────
async function loadData() {
  setStatus("Fetching…");
  try {
    const res  = await fetch(C().CSV_URL + "&t=" + Date.now());
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true });

    allRows = parsed.data;
    visibleCols = parsed.meta.fields || [];

    buildFilterOptions();
    buildColToggle();
    buildSortSelect();
    applyFilters();

    setStatus("Updated " + new Date().toLocaleTimeString());
    document.getElementById("sheetLink").href = C().CSV_URL;
    document.title = C().TITLE;
  } catch(e) {
    setStatus("⚠ Load failed — check CSV_URL in config.js");
    console.error(e);
  }
}

// ── Build dropdown options from unique values ─────────────────
function buildFilterOptions() {
  populateSelect("fMaster",   uniqueVals(C().MASTER_COL));
  populateSelect("fChannel",  uniqueVals(C().CHANNEL_COL));
  populateSelect("fCategory", uniqueVals(C().CATEGORY_COL));
  populateSelect("fMonth",    uniqueVals(C().MONTH_COL, true));
}

function uniqueVals(col, sorted) {
  const s = new Set(allRows.map(r => String(r[col] ?? "")).filter(Boolean));
  const arr = [...s];
  return sorted ? arr.sort() : arr.sort();
}

function populateSelect(id, vals) {
  const sel = document.getElementById(id);
  const cur = sel.value;
  sel.innerHTML = '<option value="">All</option>' +
    vals.map(v => `<option value="${v}"${v===cur?' selected':''}>${v}</option>`).join("");
}

// ── Apply all global filters → rebuild charts & table ─────────
function applyFilters() {
  const master   = document.getElementById("fMaster").value;
  const channel  = document.getElementById("fChannel").value;
  const category = document.getElementById("fCategory").value;
  const month    = document.getElementById("fMonth").value;
  const last30   = document.getElementById("fLast30").value;

  filtered = allRows.filter(r => {
    if (master   && String(r[C().MASTER_COL]   ?? "") !== master)   return false;
    if (channel  && String(r[C().CHANNEL_COL]  ?? "") !== channel)  return false;
    if (category && String(r[C().CATEGORY_COL] ?? "") !== category) return false;
    if (month    && String(r[C().MONTH_COL]    ?? "") !== month)    return false;
    if (last30) {
      const v = String(r[C().LAST30_COL] ?? "").toLowerCase();
      if (last30 === "true"  && v !== "true")  return false;
      if (last30 === "false" && v !== "false") return false;
    }
    return true;
  });

  const activeFilters = [master, channel, category, month, last30].filter(Boolean).length;
  document.getElementById("filterCount").textContent =
    activeFilters ? `${activeFilters} filter${activeFilters>1?"s":""} · ${filtered.length.toLocaleString()} rows` : "";

  renderKPIs();
  renderMonthChart();
  renderMasterChart();
  renderCatChart();
  renderSvRChart();
  currentPage = 1;
  renderTable();
}

function clearFilters() {
  ["fMaster","fChannel","fCategory","fMonth","fLast30"].forEach(id => {
    document.getElementById(id).value = "";
  });
  applyFilters();
}

// ── KPI Cards ─────────────────────────────────────────────────
function renderKPIs() {
  const rows   = filtered;
  const sales  = sumCol(rows, C().SALE_COL);
  const rets   = sumCol(rows, C().RETURN_COL);
  const net    = sales - rets;
  const retPct = sales > 0 ? ((rets/sales)*100).toFixed(1) : "0.0";
  const masters = new Set(rows.map(r => r[C().MASTER_COL])).size;
  const skus    = new Set(rows.map(r => r[C().CHAN_SKU_COL])).size;

  const cards = [
    { label: "Total Sales (Units)", value: sales.toLocaleString(),        color: "blue"   },
    { label: "Total Returns",        value: rets.toLocaleString(),         color: "red"    },
    { label: "Net Units",            value: net.toLocaleString(),          color: "green"  },
    { label: "Return Rate",          value: retPct + "%",                  color: "amber"  },
    { label: "Unique SKUs",          value: skus.toLocaleString(),         color: "purple" },
  ];

  document.getElementById("kpiGrid").innerHTML = cards.map(c => `
    <div class="kpi-card kpi-${c.color}">
      <div class="kpi-label">${c.label}</div>
      <div class="kpi-value">${c.value}</div>
    </div>
  `).join("");
}

// ── Month Sales Bar Chart ─────────────────────────────────────
function renderMonthChart() {
  if (charts.month) { charts.month.destroy(); }
  const ctx = document.getElementById("monthChart").getContext("2d");

  const groups = groupSum(filtered, C().MONTH_COL, C().SALE_COL);
  const labels = Object.keys(groups).sort((a,b) => monthOrder(a) - monthOrder(b));
  const vals   = labels.map(k => groups[k]);

  charts.month = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Sales",
        data: vals,
        backgroundColor: labels.map((_, i) => COLORS[i % COLORS.length]),
        borderRadius: 5,
        borderSkipped: false,
      }]
    },
    options: stdOpts({ xLabel: false, yCallback: v => v.toLocaleString() })
  });
}

function monthOrder(m) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const [mon, yr] = m.split("-");
  const mi = months.findIndex(x => m.startsWith(x));
  if (mi >= 0) return parseInt(yr || "0") * 12 + mi;
  return 0;
}

// ── Master Channel Doughnut ───────────────────────────────────
function renderMasterChart() {
  if (charts.master) { charts.master.destroy(); }
  const ctx = document.getElementById("masterChart").getContext("2d");

  const groups = groupSum(filtered, C().MASTER_COL, C().SALE_COL);
  const sorted = Object.entries(groups).sort((a,b)=>b[1]-a[1]);
  const labels = sorted.map(x=>x[0]);
  const vals   = sorted.map(x=>x[1]);

  charts.master = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data: vals, backgroundColor: COLORS.slice(0,labels.length), borderWidth: 2, borderColor:"#fff" }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: "right", labels: { font:{size:11}, color:"#555", boxWidth:12, padding:8 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed.toLocaleString()}` } }
      }
    }
  });
}

// ── Top Categories Horizontal Bar ────────────────────────────
function renderCatChart() {
  if (charts.cat) { charts.cat.destroy(); }
  const ctx = document.getElementById("catChart").getContext("2d");

  const groups = groupSum(filtered, C().CATEGORY_COL, C().SALE_COL);
  const top    = Object.entries(groups).sort((a,b)=>b[1]-a[1]).slice(0, C().TOP_N);
  const labels = top.map(x=>x[0]);
  const vals   = top.map(x=>x[1]);

  const h = Math.max(260, labels.length * 36 + 40);
  document.getElementById("catWrap").style.height = h + "px";

  charts.cat = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Sales",
        data: vals,
        backgroundColor: COLORS.slice(0, labels.length),
        borderRadius: 3,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${c.parsed.x.toLocaleString()} units` } }
      },
      scales: {
        x: { ticks: { color:"#888", font:{size:11}, callback: v => v.toLocaleString() }, grid:{ color:"rgba(0,0,0,0.05)" } },
        y: { ticks: { color:"#333", font:{size:12} } }
      }
    }
  });
}

// ── Sales vs Returns by Master Channel ───────────────────────
function renderSvRChart() {
  if (charts.svr) { charts.svr.destroy(); }
  const ctx = document.getElementById("svrChart").getContext("2d");

  const salesG  = groupSum(filtered, C().MASTER_COL, C().SALE_COL);
  const returnG = groupSum(filtered, C().MASTER_COL, C().RETURN_COL);
  const labels  = Object.keys(salesG).sort((a,b) => salesG[b] - salesG[a]).slice(0,8);

  charts.svr = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Sales",   data: labels.map(k=>salesG[k]||0),  backgroundColor:"rgba(37,99,235,0.8)",  borderRadius:3, borderSkipped:false },
        { label: "Returns", data: labels.map(k=>returnG[k]||0), backgroundColor:"rgba(220,38,38,0.75)", borderRadius:3, borderSkipped:false },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position:"top", labels:{font:{size:12},color:"#555",boxWidth:12} } },
      scales: {
        x: { ticks:{color:"#888",font:{size:11},maxRotation:30} },
        y: { ticks:{color:"#888",font:{size:11}, callback: v=>v.toLocaleString()}, grid:{color:"rgba(0,0,0,0.05)"} }
      }
    }
  });
}

// ── Column Toggle ─────────────────────────────────────────────
const HEADERS = ["MONTH","DATE","Channel Name","Category","Channel SKU","Uniwere SKU","SALE","RETURN","LAST 30 DAYS","MASTER Channel Name"];

function buildColToggle() {
  visibleCols = [...HEADERS];
  const wrap = document.getElementById("colToggle");
  wrap.innerHTML = "<span class='col-toggle-label'>Show columns:</span>" +
    HEADERS.map(h => `
      <label class="col-pill">
        <input type="checkbox" checked onchange="toggleCol('${h}', this.checked)" />
        ${h}
      </label>
    `).join("");
}

function toggleCol(col, show) {
  if (show) { if (!visibleCols.includes(col)) visibleCols.push(col); }
  else       { visibleCols = visibleCols.filter(c => c !== col); }
  renderTable();
}

// ── Sort select ───────────────────────────────────────────────
function buildSortSelect() {
  const sel = document.getElementById("tSortCol");
  sel.innerHTML = '<option value="">Sort by…</option>' +
    HEADERS.map(h => `<option value="${h}">${h}</option>`).join("");
}

// ── Table render ──────────────────────────────────────────────
function renderTable() {
  const q       = (document.getElementById("searchInput").value || "").toLowerCase();
  const pageSize = parseInt(document.getElementById("tPageSize").value) || 50;
  sortCol = document.getElementById("tSortCol").value;
  sortDir = document.getElementById("tSortDir").value;

  // search
  let rows = q
    ? filtered.filter(r => visibleCols.some(h => String(r[h]??"").toLowerCase().includes(q)))
    : [...filtered];

  // sort
  if (sortCol) {
    rows.sort((a, b) => {
      const av = a[sortCol] ?? "";
      const bv = b[sortCol] ?? "";
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), undefined, {numeric:true});
      return sortDir === "desc" ? -cmp : cmp;
    });
  }

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * pageSize;
  const page  = rows.slice(start, start + pageSize);

  // header
  document.getElementById("tableHead").innerHTML =
    "<tr>" + visibleCols.map(h =>
      `<th class="sortable" onclick="sortBy('${h}')">${h}${sortCol===h ? (sortDir==='asc'?' ↑':' ↓'):''}</th>`
    ).join("") + "</tr>";

  // body
  const body  = document.getElementById("tableBody");
  const empty = document.getElementById("emptyState");
  if (!page.length) {
    body.innerHTML = "";
    empty.style.display = "block";
  } else {
    empty.style.display = "none";
    body.innerHTML = page.map(r =>
      "<tr>" + visibleCols.map(h => {
        const v = r[h] ?? "";
        // colour SALE/RETURN cells
        if (h === C().SALE_COL   && v > 0) return `<td class="cell-sale">${v}</td>`;
        if (h === C().RETURN_COL && v > 0) return `<td class="cell-ret">${v}</td>`;
        if (h === C().LAST30_COL) {
          const cls = String(v).toLowerCase() === "true" ? "badge-yes" : "badge-no";
          return `<td><span class="${cls}">${v}</span></td>`;
        }
        return `<td>${v}</td>`;
      }).join("") + "</tr>"
    ).join("");
  }

  document.getElementById("recBadge").textContent = total.toLocaleString();
  document.getElementById("tableFooter").textContent =
    `Showing ${(start+1).toLocaleString()}–${Math.min(start+pageSize,total).toLocaleString()} of ${total.toLocaleString()} records`;

  renderPagination(totalPages);
}

function sortBy(col) {
  if (sortCol === col) {
    sortDir = sortDir === "asc" ? "desc" : "asc";
  } else {
    sortCol = col;
    sortDir = "asc";
  }
  document.getElementById("tSortCol").value = sortCol;
  document.getElementById("tSortDir").value = sortDir;
  renderTable();
}

// ── Pagination ────────────────────────────────────────────────
function renderPagination(totalPages) {
  const pag = document.getElementById("pagination");
  if (totalPages <= 1) { pag.innerHTML = ""; return; }

  let html = `<button onclick="goPage(${currentPage-1})" ${currentPage===1?"disabled":""}>‹</button>`;
  const range = pageRange(currentPage, totalPages);
  range.forEach(p => {
    if (p === "…") html += `<span class="pag-dot">…</span>`;
    else html += `<button class="${p===currentPage?'pag-active':''}" onclick="goPage(${p})">${p}</button>`;
  });
  html += `<button onclick="goPage(${currentPage+1})" ${currentPage===totalPages?"disabled":""}>›</button>`;
  pag.innerHTML = html;
}

function pageRange(cur, total) {
  if (total <= 7) return Array.from({length:total},(_,i)=>i+1);
  if (cur <= 4)   return [1,2,3,4,5,"…",total];
  if (cur >= total-3) return [1,"…",total-4,total-3,total-2,total-1,total];
  return [1,"…",cur-1,cur,cur+1,"…",total];
}

function goPage(p) {
  const pageSize = parseInt(document.getElementById("tPageSize").value) || 50;
  const total = parseInt(document.getElementById("recBadge").textContent.replace(/,/g,"")) || 1;
  const maxP  = Math.ceil(total/pageSize);
  currentPage = Math.max(1, Math.min(p, maxP));
  renderTable();
}

// ── Helpers ───────────────────────────────────────────────────
function sumCol(rows, col) { return rows.reduce((a,r) => a + (Number(r[col])||0), 0); }

function groupSum(rows, groupCol, sumColName) {
  const g = {};
  rows.forEach(r => {
    const k = String(r[groupCol] ?? "Other");
    g[k] = (g[k]||0) + (Number(r[sumColName])||0);
  });
  return g;
}

function stdOpts({ yCallback }) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color:"#888", font:{size:11}, maxRotation:40 } },
      y: { ticks: { color:"#888", font:{size:11}, callback: yCallback }, grid:{ color:"rgba(0,0,0,0.05)" } }
    }
  };
}

function setStatus(msg) { document.getElementById("lastUpdated").textContent = msg; }

// ── Init ──────────────────────────────────────────────────────
loadData();
