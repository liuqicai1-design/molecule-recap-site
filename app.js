(function () {
  const dataset = window.RECAP_DATA || { meta: {}, rows: [] };
  const rows = dataset.rows || [];
  const competitorCatalog = dataset.competitorCatalog || [];
  const meta = dataset.meta || {};
  const kolDataset = window.KOL_DATA || { meta: {}, rows: [] };
  const kolRows = kolDataset.rows || [];
  const kolMeta = kolDataset.meta || {};
  const monthlyReportDataset = window.MONTHLY_REPORT_DATA || { meta: {}, reports: [] };
  const monthlyReports = monthlyReportDataset.reports || [];
  const monthlyReportMeta = monthlyReportDataset.meta || {};
  const TA_ORDER = ["CVM", "CVU", "CPC", "EMG"];
  const PRODUCT_ORDER = ["立普妥", "络活喜", "可多华", "西乐葆", "乐瑞卡", "左洛复", "怡诺思", "迪敏思", "利加隆", "爱宁达"];
  const RELATION_ORDER = ["本品/同成分", "直接竞品", "机制竞品"];
  const DIRECT_RELATIONS = new Set([
    "直接竞品",
    "同类竞品",
    "间接竞品",
    "NSAID 竞品",
    "非 NSAID 竞品",
    "局部竞品",
    "口服竞品",
    "外用非激素抗炎竞品",
    "特殊人群竞品",
    "历史竞品",
  ]);
  const TA_LABEL = {
    立普妥: "CVM",
    络活喜: "CVU",
    可多华: "CVU",
    西乐葆: "CPC",
    乐瑞卡: "CPC",
    左洛复: "CPC",
    怡诺思: "CPC",
    迪敏思: "EMG",
    利加隆: "EMG",
    爱宁达: "EMG",
  };
  const SOURCE_LABEL = {
    "ClinicalTrials.gov": "Clinical",
  };
  const pageState = {
    query: "",
    category: "全部",
    ta: "全部",
    source: "全部",
    evidence: "全部",
    products: new Set(),
    start: "",
    end: "",
    followOnly: false,
    sort: "date-desc",
    page: 1,
    pageSize: 50,
    selectedId: null,
    overview: "products",
    filtersCollapsed: false,
  };
  const kolState = {
    query: "",
    product: "全部",
    type: "全部",
    infoSource: "全部",
    sourceName: "全部",
    start: "",
    end: "",
    productInfoOnly: false,
    sort: "date-desc",
    page: 1,
    pageSize: 24,
    selectedId: null,
  };
  const reportState = {
    selectedProduct: monthlyReports[0]?.product || "",
  };

  const els = {
    metaLine: document.getElementById("metaLine"),
    homeStats: document.getElementById("homeStats"),
    overviewPanel: document.getElementById("overviewPanel"),
    overviewSection: document.getElementById("overview"),
    jumpQuery: document.getElementById("jumpQuery"),
    jumpQa: document.getElementById("jumpQa"),
    navQuery: document.getElementById("navQuery"),
    navKol: document.getElementById("navKol"),
    navReports: document.getElementById("navReports"),
    navQa: document.getElementById("navQa"),
    jumpKol: document.getElementById("jumpKol"),
    jumpReports: document.getElementById("jumpReports"),
    backHome: document.getElementById("backHome"),
    backHomeFromKol: document.getElementById("backHomeFromKol"),
    backHomeFromReports: document.getElementById("backHomeFromReports"),
    backHomeFromQa: document.getElementById("backHomeFromQa"),
    kolToProduct: document.getElementById("kolToProduct"),
    qaToQuery: document.getElementById("qaToQuery"),
    querySection: document.getElementById("query"),
    kolSection: document.getElementById("kolPage"),
    qaSection: document.getElementById("qaPage"),
    filtersPanel: document.getElementById("filtersPanel"),
    toggleFilters: document.getElementById("toggleFilters"),
    statsGrid: document.getElementById("statsGrid"),
    queryInput: document.getElementById("queryInput"),
    categoryFilter: document.getElementById("categoryFilter"),
    taFilter: document.getElementById("taFilter"),
    productFilter: document.getElementById("productFilter"),
    sourceFilter: document.getElementById("sourceFilter"),
    evidenceFilter: document.getElementById("evidenceFilter"),
    dateStart: document.getElementById("dateStart"),
    dateEnd: document.getElementById("dateEnd"),
    followOnly: document.getElementById("followOnly"),
    resultBody: document.getElementById("resultBody"),
    resultCount: document.getElementById("resultCount"),
    activeFilters: document.getElementById("activeFilters"),
    sortSelect: document.getElementById("sortSelect"),
    pageSize: document.getElementById("pageSize"),
    prevPage: document.getElementById("prevPage"),
    nextPage: document.getElementById("nextPage"),
    pageInfo: document.getElementById("pageInfo"),
    resetButton: document.getElementById("resetButton"),
    exportButton: document.getElementById("exportButton"),
    tableWrap: document.querySelector(".table-wrap"),
    tableScrollBar: document.getElementById("tableScrollBar"),
    tableScrollSpacer: document.getElementById("tableScrollSpacer"),
    floatingTableScrollBar: document.getElementById("floatingTableScrollBar"),
    floatingTableScrollSpacer: document.getElementById("floatingTableScrollSpacer"),
    qaForm: document.getElementById("qaForm"),
    qaInput: document.getElementById("qaInput"),
    qaSubmit: document.getElementById("qaSubmit"),
    qaClear: document.getElementById("qaClear"),
    qaStatus: document.getElementById("qaStatus"),
    qaAnswer: document.getElementById("qaAnswer"),
    qaReferences: document.getElementById("qaReferences"),
    kolQueryInput: document.getElementById("kolQueryInput"),
    kolProductFilter: document.getElementById("kolProductFilter"),
    kolTypeFilter: document.getElementById("kolTypeFilter"),
    kolInfoSourceFilter: document.getElementById("kolInfoSourceFilter"),
    kolSourceFilter: document.getElementById("kolSourceFilter"),
    kolDateStart: document.getElementById("kolDateStart"),
    kolDateEnd: document.getElementById("kolDateEnd"),
    kolProductInfoOnly: document.getElementById("kolProductInfoOnly"),
    kolStatsGrid: document.getElementById("kolStatsGrid"),
    kolResultBody: document.getElementById("kolResultBody"),
    kolResultCount: document.getElementById("kolResultCount"),
    kolActiveFilters: document.getElementById("kolActiveFilters"),
    kolSortSelect: document.getElementById("kolSortSelect"),
    kolPageSize: document.getElementById("kolPageSize"),
    kolPrevPage: document.getElementById("kolPrevPage"),
    kolNextPage: document.getElementById("kolNextPage"),
    kolPageInfo: document.getElementById("kolPageInfo"),
    exportKolButton: document.getElementById("exportKolButton"),
    reportsSection: document.getElementById("reportsPage"),
    reportProductList: document.getElementById("reportProductList"),
    reportReader: document.getElementById("reportReader"),
    reportMonthLabel: document.getElementById("reportMonthLabel"),
    reportRangeLabel: document.getElementById("reportRangeLabel"),
    reportDownloadLink: document.getElementById("reportDownloadLink"),
  };

  let filteredRows = rows.slice();
  let filteredKolRows = kolRows.slice();
  let isSyncingScroll = false;

  function orderIndex(list, value) {
    const index = list.indexOf(value);
    return index === -1 ? list.length + 100 : index;
  }

  function compareTa(a, b) {
    return orderIndex(TA_ORDER, a) - orderIndex(TA_ORDER, b) || String(a).localeCompare(String(b), "zh-Hans-CN");
  }

  function productSortIndex(value) {
    return Math.min(
      ...String(value || "")
        .split("；")
        .map((item) => orderIndex(PRODUCT_ORDER, item.trim())),
    );
  }

  function compareProduct(a, b) {
    return (
      productSortIndex(a) - productSortIndex(b) ||
      compareTa(TA_LABEL[a] || "", TA_LABEL[b] || "") ||
      String(a).localeCompare(String(b), "zh-Hans-CN")
    );
  }

  function compareRelation(a, b) {
    return orderIndex(RELATION_ORDER, a) - orderIndex(RELATION_ORDER, b) || String(a).localeCompare(String(b), "zh-Hans-CN");
  }

  function uniqueValues(key) {
    const values = Array.from(new Set(rows.map((row) => row[key]).filter(Boolean)));
    if (key === "TA") return values.sort(compareTa);
    if (key === "产品") return values.sort(compareProduct);
    return values.sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  }

  function uniqueKolValues(key) {
    return Array.from(new Set(kolRows.map((row) => row[key]).filter(Boolean))).sort((a, b) => {
      if (key === "product") return compareProduct(a, b);
      return String(a).localeCompare(String(b), "zh-Hans-CN");
    });
  }

  function kolSearchText(row) {
    if (!row._searchText) {
      row._searchText = [
        row.infoSource,
        row.type,
        row.ccmTa,
        row.province,
        row.city,
        row.kolName,
        row.institution,
        row.department,
        row.academicRole1,
        row.academicRole2,
        row.kolCategory,
        row.management2026,
        row.product,
        row.relationTag,
        row.managementType,
        row.title,
        row.sourceName,
        row.date,
        row.mainContent,
        row.productInfo,
        row.abstract,
        row.pmid,
        row.doi,
        row.authors,
        row.matchNote,
      ].filter(Boolean).join(" ").toLowerCase();
    }
    return row._searchText;
  }

  function displaySource(value) {
    return SOURCE_LABEL[value] || value || "";
  }

  function displaySourceList(values) {
    return values.map(displaySource).join(" / ");
  }

  function displayRelation(value) {
    const relation = String(value || "").trim();
    if (!relation || relation === "追踪对象" || relation === "本品/同成分") return "本品/同成分";
    if (DIRECT_RELATIONS.has(relation)) return "直接竞品";
    return "机制竞品";
  }

  function normalizedDate(value) {
    const match = String(value || "").match(/\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : "";
  }

  function dataDateRange() {
    const dates = rows.map((row) => normalizedDate(row["研究/论文发布时间"])).filter(Boolean).sort();
    if (dates.length) return { start: dates[0], end: dates[dates.length - 1] };
    return meta.dateRange || { start: "", end: "" };
  }

  function kolDateRange() {
    const dates = kolRows.map((row) => normalizedDate(row.date)).filter(Boolean).sort();
    if (dates.length) return { start: dates[0], end: dates[dates.length - 1] };
    return kolMeta.dateRange || { start: "", end: "" };
  }

  function productList(row) {
    return String(row["产品"] || "")
      .split("；")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function allProducts() {
    return Array.from(new Set([...rows.flatMap(productList), ...competitorCatalog.map((item) => item["产品"]).filter(Boolean)])).sort(compareProduct);
  }

  function countBy(list, key) {
    return list.reduce((acc, row) => {
      const value = row[key] || "未标注";
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  function addOption(select, value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }

  function makeChip(label, active, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip" + (active ? " active" : "");
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function miniPill(text) {
    const span = document.createElement("span");
    span.className = "mini-pill";
    span.textContent = text;
    return span;
  }

  function overviewCard(title, body, tags) {
    const card = document.createElement("article");
    card.className = "overview-card";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const paragraph = document.createElement("p");
    paragraph.textContent = body;
    const metaWrap = document.createElement("div");
    metaWrap.className = "overview-meta";
    (tags || []).forEach((tag) => metaWrap.appendChild(miniPill(tag)));
    card.append(heading, paragraph, metaWrap);
    return card;
  }

  function competitorParts(label, fallbackProduct) {
    const parts = String(label || "")
      .split("；")
      .map((item) => item.trim())
      .filter(Boolean);
    if (parts.length >= 3) return { product: parts[0], relation: parts[1], name: parts.slice(2).join("；"), raw: label };
    if (parts.length === 1) return { product: parts[0] || fallbackProduct, relation: "本品/同成分", name: parts[0] || fallbackProduct, raw: label };
    if (parts.length === 2) return { product: parts[0] || fallbackProduct, relation: "追踪对象", name: parts[1], raw: label };
    return { product: fallbackProduct || "", relation: "本品/同成分", name: fallbackProduct || "", raw: label };
  }

  function displayCompetitorPath(row) {
    const fallbackProduct = productList(row)[0] || row["产品"] || "";
    const parsed = competitorParts(row["产品/竞品"], fallbackProduct);
    const product = parsed.product || fallbackProduct;
    const relation = displayRelation(parsed.relation);
    return parsed.name ? `${product}；${relation}；${parsed.name}` : `${product}；${relation}`;
  }

  function detailRelation(row) {
    const fallbackProduct = productList(row)[0] || row["产品"] || "";
    return competitorParts(row["产品/竞品"], fallbackProduct).relation || "本品/同成分";
  }

  function parseCompetitor(label, product) {
    const parts = String(label || "")
      .split("；")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!parts.length) return null;
    if (parts.length === 1 && parts[0] === product) return null;
    const relation = parts.length >= 3 ? parts[1] : "追踪对象";
    const name = parts.length >= 3 ? parts.slice(2).join("；") : parts.slice(1).join("；") || parts[0];
    return { relation, name, raw: label };
  }

  function competitorAliasKey(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[（）()]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function competitorAliases(name) {
    const aliases = String(name || "")
      .split(/[\/／]/)
      .map(competitorAliasKey)
      .filter(Boolean);
    return aliases.length ? aliases : [competitorAliasKey(name)].filter(Boolean);
  }

  function hasSeenAlias(seenAliases, name) {
    return competitorAliases(name).some((alias) => seenAliases.has(alias));
  }

  function rememberAliases(seenAliases, name) {
    competitorAliases(name).forEach((alias) => seenAliases.add(alias));
  }

  function competitorEntries(product) {
    const seen = new Set();
    const seenAliases = new Set();
    const entries = [];
    competitorCatalog.forEach((item) => {
      if (item["产品"] !== product) return;
      const relation = item["关系"] || "追踪对象";
      const name = item["竞品"] || item["活性成分中文"] || item["活性成分英文"];
      const raw = `${product}；${relation}；${name}`;
      if (!name || seen.has(raw) || hasSeenAlias(seenAliases, name)) return;
      seen.add(raw);
      rememberAliases(seenAliases, name);
      entries.push({ relation, name, raw });
    });
    rows.forEach((row) => {
      if (!productList(row).includes(product)) return;
      const parsed = parseCompetitor(row["产品/竞品"], product);
      if (!parsed || seen.has(parsed.raw) || hasSeenAlias(seenAliases, parsed.name)) return;
      seen.add(parsed.raw);
      rememberAliases(seenAliases, parsed.name);
      entries.push(parsed);
    });
    return entries.sort(
      (a, b) =>
        compareRelation(displayRelation(a.relation), displayRelation(b.relation)) ||
        a.name.localeCompare(b.name, "zh-Hans-CN") ||
        a.relation.localeCompare(b.relation, "zh-Hans-CN"),
    );
  }

  function competitorGroups(product) {
    const groups = new Map();
    competitorEntries(product).forEach((entry) => {
      const relation = displayRelation(entry.relation);
      if (!groups.has(relation)) groups.set(relation, []);
      groups.get(relation).push(entry.name);
    });
    return Array.from(groups.entries())
      .map(([relation, names]) => ({
        relation,
        names: Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, "zh-Hans-CN")),
      }))
      .sort((a, b) => compareRelation(a.relation, b.relation));
  }

  function renderHomeStats() {
    const products = allProducts();
    const range = dataDateRange();
    const kRange = kolDateRange();
    const competitorCount = new Set(rows.map(displayCompetitorPath).filter(Boolean)).size;
    const kolCount = new Set(kolRows.map((row) => row.kolName).filter(Boolean)).size;
    const institutionCount = new Set(kolRows.map((row) => row.institution).filter(Boolean)).size;
    const items = [
      ["产品数据", rows.length, `${range.start || ""} 至 ${range.end || ""}`],
      ["KOL记录", kolRows.length, `${kRange.start || ""} 至 ${kRange.end || ""}`],
      ["专家", kolCount, `${institutionCount.toLocaleString("zh-CN")} 家机构/医院`],
      ["产品", products.length, "CVM / CVU / CPC / EMG"],
      ["追踪口径", competitorCount, "本品/同成分、直接竞品、机制竞品"],
      ["当月报告", monthlyReports.length, monthlyReportMeta.period?.label || "本月产品关注"],
      ["问答证据", rows.length + kolRows.length, "产品数据 + NKOL 明细"],
    ];
    els.homeStats.replaceChildren(
      ...items.map(([label, value, note]) => {
        const card = document.createElement("div");
        card.className = "home-stat";
        const labelNode = document.createElement("span");
        labelNode.textContent = label;
        const valueNode = document.createElement("strong");
        valueNode.textContent = Number(value).toLocaleString("zh-CN");
        const noteNode = document.createElement("em");
        noteNode.textContent = note;
        card.append(labelNode, valueNode, noteNode);
        return card;
      }),
    );
  }

  function renderProductsOverview() {
    const taMap = {};
    rows.forEach((row) => {
      const ta = row["TA"] || "未标注";
      taMap[ta] ||= new Set();
      productList(row).forEach((product) => taMap[ta].add(product));
    });
    const grid = document.createElement("div");
    grid.className = "overview-grid";
    Object.keys(taMap)
      .sort(compareTa)
      .forEach((ta) => {
        const products = Array.from(taMap[ta]).sort(compareProduct);
        const rowCount = rows.filter((row) => row["TA"] === ta).length;
        grid.appendChild(overviewCard(ta, `${products.length} 个产品，${rowCount.toLocaleString("zh-CN")} 条数据`, products));
      });
    els.overviewPanel.replaceChildren(grid);
  }

  function renderCompetitorsOverview() {
    const grid = document.createElement("div");
    grid.className = "overview-grid competitors";
    allProducts().forEach((product) => {
      const groups = competitorGroups(product);
      const entryCount = groups.reduce((sum, group) => sum + group.names.length, 0);
      const card = document.createElement("article");
      card.className = "overview-card competitor-card";
      const head = document.createElement("div");
      head.className = "competitor-head";
      const heading = document.createElement("h3");
      heading.textContent = product;
      const body = document.createElement("p");
      const productRows = rows.filter((row) => productList(row).includes(product));
      body.textContent = `${groups.length} 类，${entryCount} 个竞品/分子追踪口径，${productRows.length.toLocaleString("zh-CN")} 条数据`;
      head.append(heading, body);
      const groupWrap = document.createElement("div");
      groupWrap.className = "competitor-groups";
      groups.forEach((group) => {
        const section = document.createElement("section");
        section.className = "competitor-group";
        const title = document.createElement("h4");
        title.textContent = group.relation;
        const count = document.createElement("span");
        count.textContent = `${group.names.length} 个`;
        const titleRow = document.createElement("div");
        titleRow.className = "competitor-group-title";
        titleRow.append(title, count);
        const names = document.createElement("div");
        names.className = "competitor-name-list";
        group.names.forEach((name) => names.appendChild(miniPill(name)));
        section.append(titleRow, names);
        groupWrap.appendChild(section);
      });
      card.append(head, groupWrap);
      grid.appendChild(card);
    });
    els.overviewPanel.replaceChildren(grid);
  }

  function renderSourcesOverview() {
    const bySource = countBy(rows, "来源");
    const grid = document.createElement("div");
    grid.className = "overview-grid sources";
    Object.keys(bySource)
      .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))
      .forEach((source) => {
        const sourceRows = rows.filter((row) => row["来源"] === source);
        const categoryCounts = countBy(sourceRows, "分类");
        const tags = Object.keys(categoryCounts).map((key) => `${key} ${categoryCounts[key]}`);
        tags.push(`高证据 ${sourceRows.filter((row) => row["证据等级"] === "高").length}`);
        grid.appendChild(overviewCard(displaySource(source), `${bySource[source].toLocaleString("zh-CN")} 条记录`, tags));
      });
    els.overviewPanel.replaceChildren(grid);
  }

  function renderFiltersOverview() {
    const range = dataDateRange();
    const items = [
      ["关键词", "标题、分子、摘要、影响判断、链接均可检索", ["全文匹配"]],
      ["分类", "新发研究与医学报道两类", uniqueValues("分类")],
      ["TA", "按业务治疗领域快速收敛", uniqueValues("TA")],
      ["产品", "支持多个产品组合筛选", allProducts()],
      ["来源", "按信息来源定位证据入口", uniqueValues("来源").map(displaySource)],
      ["证据等级", "按高、中、低过滤阅读优先级", ["高", "中", "低"]],
      ["时间", `${range.start || ""} 至 ${range.end || ""}`, ["可调整起止日期"]],
      ["建议跟进", "只查看需要优先处理的更新", ["是", "视情况"]],
    ];
    const grid = document.createElement("div");
    grid.className = "overview-grid filters";
    items.forEach(([title, body, tags]) => grid.appendChild(overviewCard(title, body, tags)));
    els.overviewPanel.replaceChildren(grid);
  }

  function setOverview(type, shouldScroll) {
    pageState.overview = type;
    document.querySelectorAll(".overview-tab").forEach((button) => {
      button.classList.toggle("active", button.dataset.overview === type);
    });
    if (type === "competitors") renderCompetitorsOverview();
    else if (type === "sources") renderSourcesOverview();
    else if (type === "filters") renderFiltersOverview();
    else renderProductsOverview();
    if (shouldScroll) els.overviewSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setPage(view, shouldFocusQuery) {
    const isQuery = view === "query";
    const isKol = view === "kol";
    const isReports = view === "reports";
    const isQa = view === "qa";
    document.body.classList.toggle("view-home", !isQuery && !isKol && !isReports && !isQa);
    document.body.classList.toggle("view-query", isQuery);
    document.body.classList.toggle("view-kol", isKol);
    document.body.classList.toggle("view-reports", isReports);
    document.body.classList.toggle("view-qa", isQa);
    if (!isQuery) els.floatingTableScrollBar.classList.remove("visible");
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(() => {
      updateTableScrollbar();
      if (shouldFocusQuery && isQuery) {
        setTimeout(() => els.queryInput.focus(), 220);
      } else if (isKol) {
        setTimeout(() => els.kolQueryInput?.focus(), 220);
      } else if (isQa) {
        setTimeout(() => els.qaInput?.focus(), 220);
      }
    });
  }

  function buildFilters() {
    const range = dataDateRange();
    els.metaLine.textContent = `${range.start || ""} 至 ${range.end || ""} | ${rows.length.toLocaleString("zh-CN")} 条数据`;

    ["全部", ...uniqueValues("分类")].forEach((category) => {
      els.categoryFilter.appendChild(
        makeChip(category, category === pageState.category, () => {
          pageState.category = category;
          pageState.page = 1;
          render();
        }),
      );
    });

    addOption(els.taFilter, "全部", "全部");
    uniqueValues("TA").forEach((value) => addOption(els.taFilter, value, value));

    allProducts().forEach((product) => {
      els.productFilter.appendChild(
        makeChip(product, false, () => {
          if (pageState.products.has(product)) {
            pageState.products.delete(product);
          } else {
            pageState.products.add(product);
          }
          pageState.page = 1;
          render();
        }),
      );
    });

    addOption(els.sourceFilter, "全部", "全部");
    uniqueValues("来源").forEach((value) => addOption(els.sourceFilter, value, displaySource(value)));

    addOption(els.evidenceFilter, "全部", "全部");
    ["高", "中", "低"].forEach((value) => {
      if (rows.some((row) => row["证据等级"] === value)) addOption(els.evidenceFilter, value, value);
    });

    els.dateStart.value = range.start || "";
    els.dateEnd.value = range.end || "";
    pageState.start = els.dateStart.value;
    pageState.end = els.dateEnd.value;
  }

  function buildKolFilters() {
    if (!els.kolProductFilter) return;
    const range = kolDateRange();
    addOption(els.kolProductFilter, "全部", "全部");
    uniqueKolValues("product").forEach((value) => addOption(els.kolProductFilter, value, value));
    addOption(els.kolTypeFilter, "全部", "全部");
    uniqueKolValues("type").forEach((value) => addOption(els.kolTypeFilter, value, value));
    addOption(els.kolInfoSourceFilter, "全部", "全部");
    uniqueKolValues("infoSource").forEach((value) => addOption(els.kolInfoSourceFilter, value, value));
    addOption(els.kolSourceFilter, "全部", "全部");
    uniqueKolValues("sourceName").forEach((value) => addOption(els.kolSourceFilter, value, value));
    els.kolDateStart.value = range.start || "";
    els.kolDateEnd.value = range.end || "";
    kolState.start = els.kolDateStart.value;
    kolState.end = els.kolDateEnd.value;
  }

  function wireEvents() {
    document.querySelectorAll("[data-overview]").forEach((button) => {
      button.addEventListener("click", () => setOverview(button.dataset.overview, true));
    });
    els.jumpKol?.addEventListener("click", () => setPage("kol", false));
    els.navKol?.addEventListener("click", () => setPage("kol", false));
    els.jumpReports?.addEventListener("click", () => setPage("reports", false));
    els.navReports?.addEventListener("click", () => setPage("reports", false));
    els.jumpQuery.addEventListener("click", () => setPage("query", true));
    els.navQuery.addEventListener("click", () => setPage("query", true));
    els.jumpQa?.addEventListener("click", () => setPage("qa", false));
    els.navQa?.addEventListener("click", () => setPage("qa", false));
    els.backHome.addEventListener("click", () => setPage("home", false));
    els.backHomeFromKol?.addEventListener("click", () => setPage("home", false));
    els.backHomeFromReports?.addEventListener("click", () => setPage("home", false));
    els.backHomeFromQa?.addEventListener("click", () => setPage("home", false));
    els.kolToProduct?.addEventListener("click", () => setPage("query", true));
    els.qaToQuery?.addEventListener("click", () => setPage("query", true));
    els.queryInput.addEventListener("input", () => {
      pageState.query = els.queryInput.value.trim().toLowerCase();
      pageState.page = 1;
      render();
    });
    els.taFilter.addEventListener("change", () => {
      pageState.ta = els.taFilter.value;
      pageState.page = 1;
      render();
    });
    els.sourceFilter.addEventListener("change", () => {
      pageState.source = els.sourceFilter.value;
      pageState.page = 1;
      render();
    });
    els.evidenceFilter.addEventListener("change", () => {
      pageState.evidence = els.evidenceFilter.value;
      pageState.page = 1;
      render();
    });
    els.dateStart.addEventListener("change", () => {
      pageState.start = els.dateStart.value;
      pageState.page = 1;
      render();
    });
    els.dateEnd.addEventListener("change", () => {
      pageState.end = els.dateEnd.value;
      pageState.page = 1;
      render();
    });
    els.followOnly.addEventListener("change", () => {
      pageState.followOnly = els.followOnly.checked;
      pageState.page = 1;
      render();
    });
    els.sortSelect.addEventListener("change", () => {
      pageState.sort = els.sortSelect.value;
      render();
    });
    els.pageSize.addEventListener("change", () => {
      pageState.pageSize = Number(els.pageSize.value);
      pageState.page = 1;
      render();
    });
    els.prevPage.addEventListener("click", () => {
      pageState.page = Math.max(1, pageState.page - 1);
      render();
    });
    els.nextPage.addEventListener("click", () => {
      const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageState.pageSize));
      pageState.page = Math.min(pageCount, pageState.page + 1);
      render();
    });
    els.resetButton.addEventListener("click", resetFilters);
    els.exportButton.addEventListener("click", exportCsv);
    els.toggleFilters.addEventListener("click", toggleFilters);
    els.kolQueryInput?.addEventListener("input", () => {
      kolState.query = els.kolQueryInput.value.trim().toLowerCase();
      kolState.page = 1;
      renderKol();
    });
    els.kolProductFilter?.addEventListener("change", () => {
      kolState.product = els.kolProductFilter.value;
      kolState.page = 1;
      renderKol();
    });
    els.kolTypeFilter?.addEventListener("change", () => {
      kolState.type = els.kolTypeFilter.value;
      kolState.page = 1;
      renderKol();
    });
    els.kolInfoSourceFilter?.addEventListener("change", () => {
      kolState.infoSource = els.kolInfoSourceFilter.value;
      kolState.page = 1;
      renderKol();
    });
    els.kolSourceFilter?.addEventListener("change", () => {
      kolState.sourceName = els.kolSourceFilter.value;
      kolState.page = 1;
      renderKol();
    });
    els.kolDateStart?.addEventListener("change", () => {
      kolState.start = els.kolDateStart.value;
      kolState.page = 1;
      renderKol();
    });
    els.kolDateEnd?.addEventListener("change", () => {
      kolState.end = els.kolDateEnd.value;
      kolState.page = 1;
      renderKol();
    });
    els.kolProductInfoOnly?.addEventListener("change", () => {
      kolState.productInfoOnly = els.kolProductInfoOnly.checked;
      kolState.page = 1;
      renderKol();
    });
    els.kolSortSelect?.addEventListener("change", () => {
      kolState.sort = els.kolSortSelect.value;
      renderKol();
    });
    els.kolPageSize?.addEventListener("change", () => {
      kolState.pageSize = Number(els.kolPageSize.value);
      kolState.page = 1;
      renderKol();
    });
    els.kolPrevPage?.addEventListener("click", () => {
      kolState.page = Math.max(1, kolState.page - 1);
      renderKol();
    });
    els.kolNextPage?.addEventListener("click", () => {
      const pageCount = Math.max(1, Math.ceil(filteredKolRows.length / kolState.pageSize));
      kolState.page = Math.min(pageCount, kolState.page + 1);
      renderKol();
    });
    els.exportKolButton?.addEventListener("click", exportKolCsv);
    els.qaForm?.addEventListener("submit", submitQuestion);
    els.qaClear?.addEventListener("click", clearQuestion);
    els.qaAnswer?.addEventListener("click", handleQaReferenceClick);
    document.querySelectorAll("[data-question]").forEach((button) => {
      button.addEventListener("click", () => {
        els.qaInput.value = button.dataset.question || "";
        submitQuestion();
      });
    });
    wireTableScroll();
  }

  function questionTokens(question) {
    const normalized = String(question || "").toLowerCase();
    const alpha = normalized.match(/[a-z0-9][a-z0-9\-_/]{1,}/g) || [];
    const chinese = normalized.match(/[\u4e00-\u9fff]{2,}/g) || [];
    const grams = chinese.flatMap((segment) => {
      const out = [segment];
      for (let index = 0; index < segment.length - 1; index += 1) {
        out.push(segment.slice(index, index + 2));
      }
      return out;
    });
    const productHits = PRODUCT_ORDER.filter((product) => normalized.includes(product));
    return Array.from(new Set([...alpha, ...grams, ...productHits])).filter((token) => token.length >= 2);
  }

  function qaText(row) {
    return `${row.searchText || ""} ${displayCompetitorPath(row)} ${detailRelation(row)}`.toLowerCase();
  }

  function qaStrictTopicTokens(question) {
    const common = new Set(["clinical", "pubmed", "study", "trial", "trials", "phase", "oral"]);
    const normalized = String(question || "").toLowerCase();
    const latin = (normalized.match(/[a-z0-9][a-z0-9\-_/]{2,}/g) || [])
      .filter((token) => !common.has(token));
    const productHits = PRODUCT_ORDER.filter((product) => normalized.includes(product));
    return Array.from(new Set([...latin, ...productHits]));
  }

  function qaScore(row, tokens, question) {
    const text = qaText(row);
    let score = 0;
    tokens.forEach((token) => {
      if (!text.includes(token)) return;
      score += token.length >= 4 ? 5 : 3;
      if (String(row["标题/事件"] || "").toLowerCase().includes(token)) score += 3;
      if (String(row["产品"] || "").toLowerCase().includes(token)) score += 5;
      if (String(row["产品/竞品"] || "").toLowerCase().includes(token)) score += 4;
    });
    if (/万方|中文|国内/.test(question) && row["来源"] === "万方") score += 8;
    if (/高证据|关键|优先/.test(question) && row["证据等级"] === "高") score += 6;
    if (/跟进|关注|优先/.test(question) && row["是否建议跟进"] === "是") score += 5;
    if (/医学报道|安全|不良反应|风险/.test(question) && row["分类"] === "医学报道") score += 5;
    if (/口服/.test(question) && /口服|oral|enlicitide|mk-0616/i.test(text)) score += 12;
    return score;
  }

  function qaEvidenceRank(row) {
    return { 高: 3, 中: 2, 低: 1 }[row["证据等级"]] || 0;
  }

  function qaSort(a, b) {
    return (
      b.score - a.score ||
      qaEvidenceRank(b.row) - qaEvidenceRank(a.row) ||
      b.row["研究/论文发布时间"].localeCompare(a.row["研究/论文发布时间"])
    );
  }

  function qaIsBroadQuestion(question) {
    return /哪些|有哪些|有什么|汇总|总结|全景|多少|有没有|相关/.test(question);
  }

  function qaGroupKey(row) {
    const parts = String(row["产品/竞品"] || "")
      .split("；")
      .map((part) => part.trim())
      .filter(Boolean);
    const product = parts[0] || row["产品"] || "";
    const relation = parts[1] || detailRelation(row) || "";
    const competitor = parts.slice(2).join("；") || displayCompetitorPath(row) || relation;
    return `${product}|${relation}|${competitor}`.toLowerCase();
  }

  function compactContext(row, index) {
    return {
      contextType: "product",
      ref: index + 1,
      id: row.id,
      date: row["研究/论文发布时间"],
      category: row["分类"],
      ta: row["TA"],
      product: row["产品"],
      competitor: displayCompetitorPath(row),
      relation: detailRelation(row),
      source: displaySource(row["来源"]),
      title: row["标题/事件"],
      summary: row["核心内容摘要"],
      impact: row["影响判断"],
      evidence: row["证据等级"],
      follow: row["是否建议跟进"],
      link: row["原始链接"],
    };
  }

  function compactKolContext(row, index) {
    const expertLine = [row.kolName, row.institution, row.department].filter(Boolean).join(" · ");
    const sourceLine = [row.infoSource, row.sourceName].filter(Boolean).join(" / ");
    const summary = [row.mainContent, row.abstract].filter(Boolean).join("\n");
    return {
      contextType: "kol",
      ref: index + 1,
      id: `kol-${row.id}`,
      date: row.date,
      category: row.type,
      ta: row.ccmTa,
      product: row.product,
      competitor: [expertLine, row.productInfo].filter(Boolean).join(" · "),
      relation: row.managementType || row.kolCategory,
      source: sourceLine || "NKOL",
      title: row.title,
      summary,
      impact: [
        row.kolName ? `专家：${row.kolName}` : "",
        row.institution ? `机构：${row.institution}` : "",
        row.productInfo ? `产品信息：${row.productInfo}` : "",
        row.paperRole ? `论文身份：${row.paperRole}` : "",
      ].filter(Boolean).join("；"),
      evidence: row.type || "资料",
      follow: row.management2026 || "",
      link: row.link,
      pmid: row.pmid,
      doi: row.doi,
    };
  }

  function retrieveProductQuestionContext(question) {
    const tokens = questionTokens(question);
    const strictTokens = qaStrictTopicTokens(question);
    const strictRows = strictTokens.length
      ? rows.filter((row) => strictTokens.some((token) => qaText(row).includes(token)))
      : [];
    const candidateRows = strictRows.length ? strictRows : rows;
    const scored = candidateRows
      .map((row) => ({ row, score: qaScore(row, tokens, question) }))
      .filter((item) => item.score > 0)
      .sort(qaSort);
    if (!qaIsBroadQuestion(question)) {
      return scored.slice(0, 20).map((item, index) => compactContext(item.row, index));
    }
    if (strictRows.length) {
      return scored.map((item, index) => compactContext(item.row, index));
    }
    const grouped = new Map();
    scored.slice(0, 160).forEach((item) => {
      const key = qaGroupKey(item.row);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    });
    const groups = Array.from(grouped.values()).sort((a, b) => qaSort(a[0], b[0]));
    const selected = [];
    groups.forEach((group) => {
      if (selected.length < 16) selected.push(group[0]);
    });
    groups.forEach((group) => {
      for (let index = 1; index < Math.min(group.length, 3) && selected.length < 24; index += 1) {
        selected.push(group[index]);
      }
    });
    return selected.slice(0, 24).map((item, index) => compactContext(item.row, index));
  }

  function kolQaText(row) {
    return kolSearchText(row);
  }

  function kolQaScore(row, tokens, question) {
    const text = kolQaText(row);
    let score = 0;
    tokens.forEach((token) => {
      if (!text.includes(token)) return;
      score += token.length >= 4 ? 5 : 3;
      if (String(row.title || "").toLowerCase().includes(token)) score += 4;
      if (String(row.kolName || "").toLowerCase().includes(token)) score += 8;
      if (String(row.institution || "").toLowerCase().includes(token)) score += 6;
      if (String(row.product || "").toLowerCase().includes(token)) score += 5;
      if (String(row.productInfo || "").toLowerCase().includes(token)) score += 5;
    });
    if (/专家|kol|医生|教授|主任|医院|机构|科室|学会|协会/.test(question)) score += 10;
    if (/微信|公众号|报道|推文|文章/.test(question) && row.infoSource === "微信公众号") score += 8;
    if (/论文|pubmed|pmid|doi|期刊|文献/.test(question) && row.infoSource === "PubMed") score += 8;
    if (/会议|大会|论坛/.test(question) && row.type === "会议") score += 6;
    if (/非会议|报道/.test(question) && row.type === "非会议") score += 4;
    if (/产品信息|化学名|分子|靶点|pcsk9|jak|il-/.test(question) && row.productInfo) score += 5;
    return score;
  }

  function kolQaSort(a, b) {
    return b.score - a.score || String(b.row.date || "").localeCompare(String(a.row.date || "")) || String(a.row.kolName || "").localeCompare(String(b.row.kolName || ""), "zh-Hans-CN");
  }

  function retrieveKolQuestionContext(question) {
    if (!kolRows.length) return [];
    const tokens = questionTokens(question);
    const strictTokens = qaStrictTopicTokens(question);
    const strictRows = strictTokens.length
      ? kolRows.filter((row) => strictTokens.some((token) => kolQaText(row).includes(token)))
      : [];
    const candidateRows = strictRows.length ? strictRows : kolRows;
    const scored = candidateRows
      .map((row) => ({ row, score: kolQaScore(row, tokens, question) }))
      .filter((item) => item.score > 0)
      .sort(kolQaSort);
    if (!qaIsBroadQuestion(question) || strictRows.length) {
      return scored.map((item, index) => compactKolContext(item.row, index));
    }
    const grouped = new Map();
    scored.slice(0, 180).forEach((item) => {
      const key = [item.row.kolName, item.row.institution, item.row.product, item.row.type].join("|").toLowerCase();
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    });
    const selected = [];
    Array.from(grouped.values()).sort((a, b) => kolQaSort(a[0], b[0])).forEach((group) => {
      if (selected.length < 36) selected.push(group[0]);
    });
    return selected.map((item, index) => compactKolContext(item.row, index));
  }

  function questionLooksKol(question) {
    return /专家|kol|医生|教授|主任|医院|机构|科室|学会|协会|微信|公众号|报道|推文|论文|pmid|doi|文献/.test(question);
  }

  function retrieveQuestionContext(question) {
    const productContexts = retrieveProductQuestionContext(question);
    const kolContexts = retrieveKolQuestionContext(question);
    const ordered = questionLooksKol(question)
      ? [...kolContexts, ...productContexts]
      : [...productContexts, ...kolContexts];
    const seen = new Set();
    return ordered
      .filter((item) => {
        const key = `${item.contextType}:${item.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((item, index) => ({ ...item, ref: index + 1 }));
  }

  function setQuestionBusy(isBusy, label) {
    if (els.qaSubmit) els.qaSubmit.disabled = isBusy;
    if (els.qaInput) els.qaInput.disabled = isBusy;
    if (isBusy && els.qaStatus) els.qaStatus.textContent = label || "检索中";
  }

  function renderQuestionAnswer(text, tone, options = {}) {
    els.qaAnswer.hidden = false;
    els.qaAnswer.className = `qa-answer${tone ? ` ${tone}` : ""}`;
    const nodes = options.markdown ? renderAnswerMarkdown(text) : linkAnswerReferences(text);
    els.qaAnswer.replaceChildren(...nodes);
    if (options.streaming) {
      const cursor = document.createElement("span");
      cursor.className = "qa-stream-cursor";
      cursor.textContent = " ";
      els.qaAnswer.appendChild(cursor);
    }
  }

  function validHttpUrl(url) {
    try {
      const parsed = new URL(String(url || "").trim());
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
    } catch {
      return "";
    }
  }

  function isTemporaryWechatUrl(url) {
    const sourceUrl = validHttpUrl(url);
    if (!sourceUrl) return false;
    try {
      const parsed = new URL(sourceUrl);
      return parsed.hostname === "mp.weixin.qq.com"
        && parsed.searchParams.get("src") === "11"
        && parsed.searchParams.has("timestamp")
        && parsed.searchParams.has("signature");
    } catch {
      return false;
    }
  }

  function wechatSearchUrl(title, sourceName) {
    const query = [title, sourceName].filter(Boolean).join(" ");
    if (!query) return "";
    return `https://weixin.sogou.com/weixin?type=2&s_from=input&query=${encodeURIComponent(query)}`;
  }

  function resolvedSourceLink(record, options = {}) {
    const rawUrl = options.url ?? record?.link ?? record?.["原始链接"];
    const sourceUrl = validHttpUrl(rawUrl);
    if (!sourceUrl) return { url: "", label: "", title: "", isWechatFallback: false };
    if (!isTemporaryWechatUrl(sourceUrl)) {
      return {
        url: sourceUrl,
        label: options.defaultLabel || "打开原文",
        title: options.defaultTitle || "打开原始链接",
        isWechatFallback: false,
      };
    }
    const fallbackUrl = wechatSearchUrl(record?.title || record?.["标题/事件"], record?.sourceName || record?.source || record?.["来源"]);
    if (!fallbackUrl) {
      return {
        url: sourceUrl,
        label: "微信链接已过期",
        title: "微信临时链接已过期，当前记录缺少标题，无法自动检索",
        isWechatFallback: true,
      };
    }
    return {
      url: fallbackUrl,
      label: "重新检索原文",
      title: "原微信临时链接已过期，已按标题重新检索原文",
      isWechatFallback: true,
    };
  }

  function applySourceLink(anchor, action) {
    if (!anchor || !action?.url) return false;
    anchor.href = action.url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.title = action.title || "";
    anchor.classList.toggle("wechat-fallback-link", Boolean(action.isWechatFallback));
    return true;
  }

  function linkAnswerReferences(text) {
    const content = String(text || "");
    const parts = [];
    const refPattern = /\[(?=[^\]]*ref)(?:ref[:：]?\s*)?\d+(?:\s*[,，、]\s*(?:ref[:：]?\s*)?\d+)*\]|\[ref\]\s*\d+\s*\[\/ref\]|\[ref\]\s*\d+/gi;
    let lastIndex = 0;
    let match;
    while ((match = refPattern.exec(content))) {
      if (match.index > lastIndex) {
        parts.push(document.createTextNode(content.slice(lastIndex, match.index)));
      }
      const refNumbers = match[0].match(/\d+/g) || [];
      parts.push(document.createTextNode("["));
      refNumbers.forEach((refNumber, index) => {
        if (index > 0) parts.push(document.createTextNode(", "));
        const link = document.createElement("a");
        link.className = "qa-ref-anchor";
        link.href = `#qa-ref-${refNumber}`;
        link.textContent = `ref${refNumber}`;
        parts.push(link);
      });
      parts.push(document.createTextNode("]"));
      lastIndex = refPattern.lastIndex;
    }
    if (lastIndex < content.length) {
      parts.push(document.createTextNode(content.slice(lastIndex)));
    }
    return parts.length ? parts : [document.createTextNode(content)];
  }

  function renderAnswerMarkdown(text) {
    const lines = String(text || "").split(/\r?\n/);
    const nodes = [];
    let list = null;
    const closeList = () => {
      if (!list) return;
      nodes.push(list);
      list = null;
    };
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        closeList();
        return;
      }
      const heading = trimmed.match(/^#{1,4}\s+(.+)$/);
      if (heading) {
        closeList();
        const title = document.createElement("h4");
        title.append(...linkAnswerReferences(heading[1]));
        nodes.push(title);
        return;
      }
      const bullet = trimmed.match(/^[-*]\s+(.+)$/);
      if (bullet) {
        if (!list) list = document.createElement("ul");
        const item = document.createElement("li");
        item.append(...linkAnswerReferences(bullet[1]));
        list.appendChild(item);
        return;
      }
      closeList();
      const paragraph = document.createElement("p");
      paragraph.append(...linkAnswerReferences(trimmed));
      nodes.push(paragraph);
    });
    closeList();
    return nodes.length ? nodes : [document.createTextNode(String(text || ""))];
  }

  function renderQuestionReferences(contexts) {
    if (!contexts.length) {
      els.qaReferences.hidden = true;
      els.qaReferences.replaceChildren();
      return;
    }
    const heading = document.createElement("h3");
    heading.textContent = `参考记录（共 ${contexts.length} 条）`;
    const list = document.createElement("div");
    list.className = "qa-reference-list";
    contexts.forEach((item) => {
      const sourceAction = resolvedSourceLink(item);
      const card = document.createElement(sourceAction.url ? "a" : "article");
      card.id = `qa-ref-${item.ref}`;
      card.className = sourceAction.url ? "qa-reference-card linked" : "qa-reference-card";
      if (sourceAction.url) {
        applySourceLink(card, sourceAction);
      }
      const title = document.createElement("strong");
      const evidenceLabel = item.contextType === "kol"
        ? `${item.evidence || "资料"} / KOL`
        : item.evidence === "资料" ? "资料" : `${item.evidence || "资料"}证据`;
      title.textContent = `${item.ref}. ${item.product || "资料"} | ${item.source || "来源"} | ${evidenceLabel}`;
      const body = document.createElement("p");
      body.textContent = item.title;
      const metaLine = document.createElement("span");
      metaLine.textContent = [item.date, item.competitor].filter(Boolean).join(" · ");
      if (sourceAction.url) {
        const action = document.createElement("em");
        action.textContent = sourceAction.label || "打开原文";
        card.append(title, body, metaLine, action);
      } else {
        card.append(title, body, metaLine);
      }
      list.appendChild(card);
    });
    els.qaReferences.hidden = false;
    els.qaReferences.replaceChildren(heading, list);
  }

  function handleQaReferenceClick(event) {
    const link = event.target.closest(".qa-ref-anchor");
    if (!link) return;
    const targetId = String(link.getAttribute("href") || "").replace(/^#/, "");
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("ref-focused");
    window.history.replaceState(null, "", `#${targetId}`);
    window.setTimeout(() => target.classList.remove("ref-focused"), 1800);
  }

  async function submitQuestion(event) {
    event?.preventDefault();
    const question = els.qaInput?.value.trim() || "";
    if (!question) {
      renderQuestionAnswer("请输入一个问题。", "warn");
      return;
    }
    const contexts = retrieveQuestionContext(question);
    renderQuestionReferences(contexts);
    const endpoint = String(window.RECAP_QA_ENDPOINT || "").trim();
    if (!contexts.length && !endpoint) {
      renderQuestionAnswer("当前数据中没有检索到足够相关的记录。", "warn");
      return;
    }
    if (!endpoint) {
      renderQuestionAnswer(`已从当前网站数据中检索到 ${contexts.length} 条相关记录。AI 问答后端还未配置，配置后即可生成总结答案。`, "warn");
      return;
    }
    setQuestionBusy(true, "生成中");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream, application/json" },
        body: JSON.stringify({
          question,
          contexts,
          stream: true,
          meta: {
            rowCount: rows.length,
            sourceCounts: meta.counts?.source || {},
            dateRange: dataDateRange(),
          },
        }),
      });
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream")) {
        if (!response.ok) throw new Error("问答服务暂时不可用");
        let answer = "";
        renderQuestionAnswer("", "", { streaming: true });
        let references = contexts;
        await readSseAnswer(response, (chunk) => {
          answer += chunk;
          renderQuestionAnswer(answer, "", { streaming: true });
        }, (nextReferences) => {
          references = nextReferences;
          renderQuestionReferences(references);
        });
        renderQuestionAnswer(answer || "没有生成答案。", "", { markdown: true });
        if (els.qaStatus) els.qaStatus.textContent = "已回答";
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "问答服务暂时不可用");
      if (Array.isArray(payload.references)) renderQuestionReferences(payload.references);
      renderQuestionAnswer(payload.answer || "没有生成答案。", "", { markdown: true });
      if (els.qaStatus) els.qaStatus.textContent = "已回答";
    } catch (error) {
      renderQuestionAnswer(error.message || "问答服务暂时不可用。", "warn");
      if (els.qaStatus) els.qaStatus.textContent = "调用失败";
    } finally {
      setQuestionBusy(false);
    }
  }

  async function readSseAnswer(response, onDelta, onReferences) {
    const reader = response.body?.getReader?.();
    if (!reader) throw new Error("当前浏览器不支持流式读取");
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        let payload;
        try {
          payload = JSON.parse(data);
        } catch {
          continue;
        }
        if (payload.type === "error") throw new Error(payload.error || "问答服务调用失败");
        if (payload.type === "references" && Array.isArray(payload.references)) onReferences?.(payload.references);
        if (payload.type === "delta" && payload.text) onDelta(payload.text);
      }
    }
  }

  function clearQuestion() {
    els.qaInput.value = "";
    els.qaAnswer.hidden = true;
    els.qaReferences.hidden = true;
    els.qaAnswer.textContent = "";
    els.qaReferences.replaceChildren();
    if (els.qaStatus) els.qaStatus.textContent = "待提问";
  }

  function toggleFilters() {
    pageState.filtersCollapsed = !pageState.filtersCollapsed;
    els.filtersPanel.classList.toggle("collapsed", pageState.filtersCollapsed);
    els.toggleFilters.setAttribute("aria-expanded", String(!pageState.filtersCollapsed));
    els.toggleFilters.querySelector("span").textContent = pageState.filtersCollapsed ? "展开筛选" : "隐藏筛选";
  }

  function syncScroll(source) {
    if (isSyncingScroll) return;
    isSyncingScroll = true;
    const left = source.scrollLeft;
    [els.tableWrap, els.tableScrollBar, els.floatingTableScrollBar].forEach((target) => {
      if (target !== source) target.scrollLeft = left;
    });
    requestAnimationFrame(() => {
      isSyncingScroll = false;
    });
  }

  function updateTableScrollbar() {
    if (!document.body.classList.contains("view-query")) {
      els.floatingTableScrollBar.classList.remove("visible");
      return;
    }
    const table = els.tableWrap.querySelector("table");
    const needsHorizontalScroll = table.scrollWidth > els.tableWrap.clientWidth;
    const tableRect = els.tableWrap.getBoundingClientRect();
    const isTableInView = tableRect.top < window.innerHeight - 70 && tableRect.bottom > 90;
    els.tableScrollSpacer.style.width = `${table.scrollWidth}px`;
    els.floatingTableScrollSpacer.style.width = `${table.scrollWidth}px`;
    els.tableScrollBar.scrollLeft = els.tableWrap.scrollLeft;
    els.floatingTableScrollBar.scrollLeft = els.tableWrap.scrollLeft;
    els.tableScrollBar.classList.toggle("hidden", !needsHorizontalScroll);
    els.floatingTableScrollBar.classList.toggle("visible", needsHorizontalScroll && isTableInView);
  }

  function wireTableScroll() {
    els.tableScrollBar.addEventListener("scroll", () => syncScroll(els.tableScrollBar));
    els.floatingTableScrollBar.addEventListener("scroll", () => syncScroll(els.floatingTableScrollBar));
    els.tableWrap.addEventListener("scroll", () => syncScroll(els.tableWrap));
    window.addEventListener("resize", updateTableScrollbar);
    window.addEventListener("scroll", updateTableScrollbar, { passive: true });
    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(updateTableScrollbar);
      resizeObserver.observe(els.tableWrap);
      resizeObserver.observe(els.tableWrap.querySelector("table"));
    }
  }

  function rowMatches(row) {
    const rowDate = normalizedDate(row["研究/论文发布时间"]);
    const displayText = `${row.searchText || ""} ${displayCompetitorPath(row)} ${detailRelation(row)}`.toLowerCase();
    if (pageState.query && !displayText.includes(pageState.query)) return false;
    if (pageState.category !== "全部" && row["分类"] !== pageState.category) return false;
    if (pageState.ta !== "全部" && row["TA"] !== pageState.ta) return false;
    if (pageState.source !== "全部" && row["来源"] !== pageState.source) return false;
    if (pageState.evidence !== "全部" && row["证据等级"] !== pageState.evidence) return false;
    if (pageState.followOnly && row["是否建议跟进"] !== "是") return false;
    if (pageState.start && rowDate && rowDate < pageState.start) return false;
    if (pageState.end && rowDate && rowDate > pageState.end) return false;
    if (pageState.products.size) {
      const productSet = productList(row);
      if (!productSet.some((product) => pageState.products.has(product))) return false;
    }
    return true;
  }

  function sortRows(list) {
    const evidenceRank = { 高: 3, 中: 2, 低: 1 };
    const copy = list.slice();
    copy.sort((a, b) => {
      if (pageState.sort === "date-asc") {
        return a["研究/论文发布时间"].localeCompare(b["研究/论文发布时间"]);
      }
      if (pageState.sort === "product") {
        return (
          compareProduct(a["产品"], b["产品"]) ||
          compareTa(a["TA"], b["TA"]) ||
          b["研究/论文发布时间"].localeCompare(a["研究/论文发布时间"])
        );
      }
      if (pageState.sort === "evidence") {
        return (
          (evidenceRank[b["证据等级"]] || 0) - (evidenceRank[a["证据等级"]] || 0) ||
          b["研究/论文发布时间"].localeCompare(a["研究/论文发布时间"])
        );
      }
      return b["研究/论文发布时间"].localeCompare(a["研究/论文发布时间"]);
    });
    return copy;
  }

  function renderStats(list) {
    const counts = {
      total: list.length,
      research: list.filter((row) => row["分类"] === "新发研究").length,
      medical: list.filter((row) => row["分类"] === "医学报道").length,
      follow: list.filter((row) => row["是否建议跟进"] === "是").length,
      high: list.filter((row) => row["证据等级"] === "高").length,
    };
    const items = [
      ["当前结果", counts.total],
      ["新发研究", counts.research],
      ["医学报道", counts.medical],
      ["建议跟进", counts.follow],
      ["高证据", counts.high],
    ];
    els.statsGrid.replaceChildren(
      ...items.map(([label, value]) => {
        const card = document.createElement("div");
        card.className = "stat";
        const labelNode = document.createElement("span");
        labelNode.textContent = label;
        const valueNode = document.createElement("strong");
        valueNode.textContent = Number(value).toLocaleString("zh-CN");
        card.append(labelNode, valueNode);
        return card;
      }),
    );
  }

  function renderCategoryChips() {
    Array.from(els.categoryFilter.children).forEach((child) => {
      child.classList.toggle("active", child.textContent === pageState.category);
    });
  }

  function renderProductChips() {
    Array.from(els.productFilter.children).forEach((child) => {
      child.classList.toggle("active", pageState.products.has(child.textContent));
    });
  }

  function tagClass(value) {
    if (value === "医学报道") return "pill medical";
    if (value === "高") return "pill high";
    if (value === "中") return "pill medium";
    if (value === "低") return "pill low";
    return "pill";
  }

  function pill(value) {
    const span = document.createElement("span");
    span.className = tagClass(value);
    span.textContent = value || "-";
    return span;
  }

  function categoryPill(value) {
    const span = pill(value);
    const text = String(value || "");
    const parts = text.length === 4 ? [text.slice(0, 2), text.slice(2)] : [text || "-"];
    span.classList.add("category-pill");
    span.replaceChildren(
      ...parts.map((part) => {
        const line = document.createElement("span");
        line.textContent = part;
        return line;
      }),
    );
    return span;
  }

  function makeCell(text, className) {
    const td = document.createElement("td");
    if (className) td.className = className;
    td.textContent = text || "";
    return td;
  }

  function buildDetailContent(row) {
    const content = document.createElement("div");
    content.className = "detail-content";

    const head = document.createElement("div");
    head.className = "detail-head";
    const titleWrap = document.createElement("div");
    const category = pill(row["分类"]);
    const title = document.createElement("h2");
    title.textContent = row["标题/事件"];
    titleWrap.append(category, title);

    const closeButton = document.createElement("button");
    closeButton.className = "icon-only";
    closeButton.type = "button";
    closeButton.title = "关闭详情";
    closeButton.setAttribute("aria-label", "关闭详情");
    closeButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    closeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      clearDetail(true);
    });
    head.append(titleWrap, closeButton);

    const fields = [
      ["产品", row["产品"]],
      ["TA", row["TA"]],
      ["产品/竞品", displayCompetitorPath(row)],
      ["细分口径", detailRelation(row)],
      ["活性成分/分子式追踪口径", row["活性成分/分子式追踪口径"]],
      ["研究/论文发布时间", row["研究/论文发布时间"]],
      ["来源", displaySource(row["来源"])],
      ["核心内容摘要", row["核心内容摘要"]],
      ["影响判断", row["影响判断"]],
      ["证据等级", row["证据等级"]],
      ["是否建议跟进", row["是否建议跟进"]],
    ];

    const definitionList = document.createElement("dl");
    definitionList.replaceChildren(
      ...fields.flatMap(([label, value]) => {
        const dt = document.createElement("dt");
        dt.textContent = label;
        const dd = document.createElement("dd");
        dd.textContent = value || "-";
        return [dt, dd];
      }),
    );

    const sourceAction = resolvedSourceLink({
      ...row,
      title: row["标题/事件"],
      source: row["来源"],
      link: row["原始链接"],
    }, { defaultLabel: "打开原始链接" });
    const sourceLink = document.createElement("a");
    sourceLink.className = "source-link";
    if (applySourceLink(sourceLink, sourceAction)) {
      sourceLink.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>${sourceAction.label || "打开原始链接"}`;
    } else {
      sourceLink.href = "#";
      sourceLink.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>暂无原始链接';
    }
    sourceLink.addEventListener("click", (event) => event.stopPropagation());

    content.append(head, definitionList, sourceLink);
    return content;
  }

  function makeDetailRow(row) {
    const detailRow = document.createElement("tr");
    detailRow.className = "detail-row";
    detailRow.id = `detail-${row.id}`;
    const detailCell = document.createElement("td");
    detailCell.colSpan = 11;
    detailCell.appendChild(buildDetailContent(row));
    detailRow.appendChild(detailCell);
    return detailRow;
  }

  function renderRows(list) {
    const pageCount = Math.max(1, Math.ceil(list.length / pageState.pageSize));
    pageState.page = Math.min(pageState.page, pageCount);
    const start = (pageState.page - 1) * pageState.pageSize;
    const pageRows = list.slice(start, start + pageState.pageSize);

    if (!pageRows.length) {
      const tr = document.createElement("tr");
      tr.className = "empty-row";
      const td = document.createElement("td");
      td.colSpan = 11;
      td.textContent = "没有符合条件的记录";
      tr.appendChild(td);
      els.resultBody.replaceChildren(tr);
    } else {
      const tableRows = [];
      pageRows.forEach((row) => {
        const tr = document.createElement("tr");
        tr.tabIndex = 0;
        tr.className = row.id === pageState.selectedId ? "selected" : "";
        tr.setAttribute("aria-expanded", String(row.id === pageState.selectedId));
        tr.addEventListener("click", () => showDetail(row));
        tr.addEventListener("keydown", (event) => {
          if (event.key === "Enter") showDetail(row);
        });

        const categoryCell = document.createElement("td");
        categoryCell.className = "category-cell";
        categoryCell.appendChild(categoryPill(row["分类"]));
        const evidenceCell = document.createElement("td");
        evidenceCell.className = "evidence-cell";
        evidenceCell.appendChild(pill(row["证据等级"]));
        const followCell = makeCell(row["是否建议跟进"], "follow-cell");
        const linkCell = document.createElement("td");
        const link = document.createElement("a");
        link.className = "row-link";
        const sourceAction = resolvedSourceLink({
          ...row,
          title: row["标题/事件"],
          source: row["来源"],
          link: row["原始链接"],
        }, { defaultLabel: "打开原始链接" });
        applySourceLink(link, sourceAction);
        link.setAttribute("aria-label", sourceAction.label || "打开原始链接");
        link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>';
        link.addEventListener("click", (event) => event.stopPropagation());
        linkCell.appendChild(link);

        tr.append(
          makeCell(row["研究/论文发布时间"], "date-cell"),
          categoryCell,
          makeCell(row["TA"], "ta-cell"),
          makeCell(row["产品"], "product-cell"),
          makeCell(displayCompetitorPath(row), "competitor-cell"),
          makeCell(displaySource(row["来源"]), "source-cell"),
          makeCell(row["标题/事件"], "title-cell"),
          makeCell(row["核心内容摘要"], "summary-cell"),
          evidenceCell,
          followCell,
          linkCell,
        );
        tableRows.push(tr);
        if (row.id === pageState.selectedId) tableRows.push(makeDetailRow(row));
      });
      els.resultBody.replaceChildren(...tableRows);
    }

    els.resultCount.textContent = `${list.length.toLocaleString("zh-CN")} 条`;
    els.pageInfo.textContent = `${pageState.page} / ${pageCount}`;
    els.prevPage.disabled = pageState.page <= 1;
    els.nextPage.disabled = pageState.page >= pageCount;
    updateTableScrollbar();
  }

  function renderActiveFilters() {
    const bits = [];
    if (pageState.query) bits.push("关键词");
    if (pageState.category !== "全部") bits.push(pageState.category);
    if (pageState.ta !== "全部") bits.push(pageState.ta);
    if (pageState.source !== "全部") bits.push(displaySource(pageState.source));
    if (pageState.evidence !== "全部") bits.push(`${pageState.evidence}证据`);
    if (pageState.products.size) bits.push(`${pageState.products.size} 个产品`);
    if (pageState.followOnly) bits.push("建议跟进");
    els.activeFilters.textContent = bits.length ? `| ${bits.join(" · ")}` : "";
  }

  function showDetail(row) {
    if (pageState.selectedId === row.id) {
      clearDetail(true);
      return;
    }
    pageState.selectedId = row.id;
    renderRows(filteredRows);
    requestAnimationFrame(() => {
      document.getElementById(`detail-${row.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function clearDetail(shouldRender) {
    pageState.selectedId = null;
    if (shouldRender) renderRows(filteredRows);
  }

  function resetFilters() {
    pageState.query = "";
    pageState.category = "全部";
    pageState.ta = "全部";
    pageState.source = "全部";
    pageState.evidence = "全部";
    pageState.products.clear();
    pageState.followOnly = false;
    pageState.start = dataDateRange().start || "";
    pageState.end = dataDateRange().end || "";
    pageState.sort = "date-desc";
    pageState.page = 1;
    els.queryInput.value = "";
    els.taFilter.value = "全部";
    els.sourceFilter.value = "全部";
    els.evidenceFilter.value = "全部";
    els.followOnly.checked = false;
    els.dateStart.value = pageState.start;
    els.dateEnd.value = pageState.end;
    els.sortSelect.value = pageState.sort;
    clearDetail(false);
    render();
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportCsv() {
    const columns = meta.columns || [
      "分类",
      "TA",
      "产品",
      "产品/竞品",
      "活性成分/分子式追踪口径",
      "研究/论文发布时间",
      "来源",
      "标题/事件",
      "核心内容摘要",
      "影响判断",
      "证据等级",
      "原始链接",
      "是否建议跟进",
    ];
    const lines = [columns.map(csvEscape).join(",")];
    filteredRows.forEach((row) => {
      lines.push(columns.map((column) => {
        if (column === "原始链接") {
          return csvEscape(resolvedSourceLink({
            ...row,
            title: row["标题/事件"],
            source: row["来源"],
            link: row["原始链接"],
          }).url || row[column]);
        }
        return csvEscape(row[column]);
      }).join(","));
    });
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "产品分子式研究进展_筛选结果.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function kolMatches(row) {
    const rowDate = normalizedDate(row.date);
    if (kolState.query && !kolSearchText(row).includes(kolState.query)) return false;
    if (kolState.product !== "全部" && row.product !== kolState.product) return false;
    if (kolState.type !== "全部" && row.type !== kolState.type) return false;
    if (kolState.infoSource !== "全部" && row.infoSource !== kolState.infoSource) return false;
    if (kolState.sourceName !== "全部" && row.sourceName !== kolState.sourceName) return false;
    if (kolState.productInfoOnly && !row.productInfo) return false;
    if (kolState.start && rowDate && rowDate < kolState.start) return false;
    if (kolState.end && rowDate && rowDate > kolState.end) return false;
    return true;
  }

  function sortKolRows(list) {
    const copy = list.slice();
    copy.sort((a, b) => {
      if (kolState.sort === "date-asc") return String(a.date || "").localeCompare(String(b.date || ""));
      if (kolState.sort === "kol") {
        return String(a.kolName || "").localeCompare(String(b.kolName || ""), "zh-Hans-CN") || String(b.date || "").localeCompare(String(a.date || ""));
      }
      if (kolState.sort === "product") {
        return compareProduct(a.product || "", b.product || "") || String(b.date || "").localeCompare(String(a.date || ""));
      }
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
    return copy;
  }

  function renderKolStats(list) {
    if (!els.kolStatsGrid) return;
    const experts = new Set(list.map((row) => row.kolName).filter(Boolean)).size;
    const institutions = new Set(list.map((row) => row.institution).filter(Boolean)).size;
    const pubmed = list.filter((row) => row.infoSource === "PubMed").length;
    const wechat = list.filter((row) => row.infoSource === "微信公众号").length;
    const productInfo = list.filter((row) => row.productInfo).length;
    const items = [
      ["当前结果", list.length],
      ["专家", experts],
      ["机构", institutions],
      ["PubMed", pubmed],
      ["微信", wechat],
      ["有产品信息", productInfo],
    ];
    els.kolStatsGrid.replaceChildren(
      ...items.map(([label, value]) => {
        const card = document.createElement("div");
        card.className = "stat";
        const labelNode = document.createElement("span");
        labelNode.textContent = label;
        const valueNode = document.createElement("strong");
        valueNode.textContent = Number(value).toLocaleString("zh-CN");
        card.append(labelNode, valueNode);
        return card;
      }),
    );
  }

  function compactText(text, limit = 180) {
    const value = String(text || "").replace(/\s+/g, " ").trim();
    return value.length > limit ? `${value.slice(0, limit)}...` : value;
  }

  function makeKolMeta(label, value) {
    const item = document.createElement("span");
    item.className = "kol-meta-item";
    const strong = document.createElement("strong");
    strong.textContent = label;
    const text = document.createElement("em");
    text.textContent = value || "-";
    item.append(strong, text);
    return item;
  }

  function renderKolCard(row) {
    const card = document.createElement("article");
    card.className = "kol-card";
    const head = document.createElement("div");
    head.className = "kol-card-head";
    const titleWrap = document.createElement("div");
    const eyebrow = document.createElement("div");
    eyebrow.className = "kol-card-eyebrow";
    eyebrow.append(miniPill(row.type || "资料"), miniPill(row.infoSource || "来源"));
    const title = document.createElement("h3");
    title.textContent = row.title || "未命名记录";
    titleWrap.append(eyebrow, title);
    const date = document.createElement("time");
    date.textContent = row.date || "-";
    head.append(titleWrap, date);

    const expert = document.createElement("div");
    expert.className = "kol-expert-line";
    const expertName = document.createElement("strong");
    expertName.textContent = row.kolName || "未定位专家";
    const expertMeta = document.createElement("span");
    expertMeta.textContent = [row.institution, row.department].filter(Boolean).join(" · ") || "机构未标注";
    expert.append(expertName, expertMeta);

    const metaGrid = document.createElement("div");
    metaGrid.className = "kol-meta-grid";
    metaGrid.append(
      makeKolMeta("产品", row.product),
      makeKolMeta("来源", row.sourceName || row.infoSource),
      makeKolMeta("地区", [row.province, row.city].filter(Boolean).join(" / ")),
      makeKolMeta("管理", row.management2026 || row.managementType),
    );

    const summary = document.createElement("p");
    summary.className = "kol-summary";
    summary.textContent = compactText(row.mainContent || row.abstract, 230) || "暂无内容概要。";

    const productInfo = document.createElement("div");
    productInfo.className = "kol-product-info";
    if (row.productInfo) {
      row.productInfo.split("；").filter(Boolean).forEach((item) => productInfo.appendChild(miniPill(item)));
    } else {
      productInfo.appendChild(miniPill("未提取产品信息"));
    }

    const actions = document.createElement("div");
    actions.className = "kol-card-actions";
    const detailButton = document.createElement("button");
    detailButton.type = "button";
    detailButton.className = "icon-button";
    detailButton.textContent = kolState.selectedId === row.id ? "收起详情" : "查看详情";
    detailButton.addEventListener("click", () => {
      kolState.selectedId = kolState.selectedId === row.id ? null : row.id;
      renderKolRows(filteredKolRows);
    });
    actions.appendChild(detailButton);
    const sourceAction = resolvedSourceLink(row);
    if (sourceAction.url) {
      const link = document.createElement("a");
      link.className = "source-link kol-source-link";
      applySourceLink(link, sourceAction);
      link.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>${sourceAction.label || "打开原文"}`;
      actions.appendChild(link);
    }

    card.append(head, expert, metaGrid, productInfo, summary, actions);

    if (kolState.selectedId === row.id) {
      const detail = document.createElement("dl");
      detail.className = "kol-detail";
      [
        ["摘要", row.abstract],
        ["全部作者", row.authors],
        ["论文身份", row.paperRole],
        ["PMID", row.pmid],
        ["DOI", row.doi],
        ["匹配说明", row.matchNote],
      ].forEach(([label, value]) => {
        if (!value) return;
        const dt = document.createElement("dt");
        dt.textContent = label;
        const dd = document.createElement("dd");
        dd.textContent = value;
        detail.append(dt, dd);
      });
      if (detail.children.length) card.appendChild(detail);
    }
    return card;
  }

  function renderKolRows(list) {
    if (!els.kolResultBody) return;
    const pageCount = Math.max(1, Math.ceil(list.length / kolState.pageSize));
    kolState.page = Math.min(kolState.page, pageCount);
    const start = (kolState.page - 1) * kolState.pageSize;
    const pageRows = list.slice(start, start + kolState.pageSize);
    if (!pageRows.length) {
      const empty = document.createElement("div");
      empty.className = "kol-empty";
      empty.textContent = "没有符合条件的KOL记录";
      els.kolResultBody.replaceChildren(empty);
    } else {
      els.kolResultBody.replaceChildren(...pageRows.map(renderKolCard));
    }
    els.kolResultCount.textContent = `${list.length.toLocaleString("zh-CN")} 条`;
    els.kolPageInfo.textContent = `${kolState.page} / ${pageCount}`;
    els.kolPrevPage.disabled = kolState.page <= 1;
    els.kolNextPage.disabled = kolState.page >= pageCount;
  }

  function renderKolActiveFilters() {
    if (!els.kolActiveFilters) return;
    const bits = [];
    if (kolState.query) bits.push("关键词");
    if (kolState.product !== "全部") bits.push(kolState.product);
    if (kolState.type !== "全部") bits.push(kolState.type);
    if (kolState.infoSource !== "全部") bits.push(kolState.infoSource);
    if (kolState.sourceName !== "全部") bits.push(kolState.sourceName);
    if (kolState.productInfoOnly) bits.push("有产品信息");
    els.kolActiveFilters.textContent = bits.length ? `| ${bits.join(" · ")}` : "";
  }

  function exportKolCsv() {
    const columns = [
      ["信息来源", "infoSource"],
      ["类型", "type"],
      ["KOL姓名", "kolName"],
      ["KOL所属医院/机构", "institution"],
      ["科室", "department"],
      ["产品", "product"],
      ["标题", "title"],
      ["来源名称", "sourceName"],
      ["日期", "date"],
      ["内容概要/主要观点", "mainContent"],
      ["产品信息（化学名）", "productInfo"],
      ["摘要", "abstract"],
      ["链接", "link"],
      ["PMID", "pmid"],
      ["DOI", "doi"],
    ];
    const lines = [columns.map(([label]) => csvEscape(label)).join(",")];
    filteredKolRows.forEach((row) => {
      lines.push(columns.map(([, key]) => {
        if (key === "link") return csvEscape(resolvedSourceLink(row).url || row[key]);
        return csvEscape(row[key]);
      }).join(","));
    });
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "KOL信息查询_筛选结果.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function renderKol() {
    filteredKolRows = sortKolRows(kolRows.filter(kolMatches));
    if (kolState.selectedId && !filteredKolRows.some((row) => row.id === kolState.selectedId)) kolState.selectedId = null;
    renderKolStats(filteredKolRows);
    renderKolActiveFilters();
    renderKolRows(filteredKolRows);
  }

  function reportByProduct(product) {
    return monthlyReports.find((report) => report.product === product) || monthlyReports[0] || null;
  }

  function reportMetric(label, value) {
    const card = document.createElement("div");
    card.className = "report-metric";
    const valueNode = document.createElement("strong");
    valueNode.textContent = Number(value || 0).toLocaleString("zh-CN");
    const labelNode = document.createElement("span");
    labelNode.textContent = label;
    card.append(valueNode, labelNode);
    return card;
  }

  function reportBlock(title, className) {
    const section = document.createElement("section");
    section.className = `report-block${className ? ` ${className}` : ""}`;
    const heading = document.createElement("h3");
    heading.textContent = title;
    section.appendChild(heading);
    return section;
  }

  function reportList(items) {
    const list = document.createElement("ul");
    list.className = "report-list";
    (items || []).forEach((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      list.appendChild(item);
    });
    return list;
  }

  function reportExecutiveSummary(summary) {
    const wrap = document.createElement("div");
    wrap.className = "report-executive-summary";
    if (!summary) {
      const empty = document.createElement("p");
      empty.className = "report-empty";
      empty.textContent = "暂无管理层摘要。";
      wrap.appendChild(empty);
      return wrap;
    }

    if (summary.headline) {
      const headline = document.createElement("p");
      headline.className = "report-executive-headline";
      headline.textContent = summary.headline;
      wrap.appendChild(headline);
    }

    const grid = document.createElement("div");
    grid.className = "report-executive-grid";
    [
      ["发生了什么", summary.whatHappened],
      ["关注什么", summary.watch],
      ["为什么关注", summary.why],
      ["建议动作", summary.actions],
    ].forEach(([label, value]) => {
      if (!value) return;
      const card = document.createElement("div");
      card.className = "report-executive-card";
      const title = document.createElement("strong");
      title.textContent = label;
      const body = document.createElement("p");
      body.textContent = Array.isArray(value) ? value.join("；") : value;
      card.append(title, body);
      grid.appendChild(card);
    });
    if (grid.children.length) wrap.appendChild(grid);
    return wrap;
  }

  function reportEvidenceCard(item, type) {
    const card = document.createElement("article");
    card.className = `report-evidence-card ${type || ""}`;
    const top = document.createElement("div");
    top.className = "report-evidence-top";
    const meta = document.createElement("div");
    meta.className = "report-evidence-meta";
    [item.date, item.source, item.type, item.evidence, item.follow].filter(Boolean).forEach((value) => meta.appendChild(miniPill(value)));
    const path = document.createElement("span");
    path.className = "report-evidence-path";
    path.textContent = item.path || [item.expert, item.institution].filter(Boolean).join(" / ") || item.productInfo || "";
    top.append(meta, path);

    const title = document.createElement("h4");
    title.textContent = item.title || "未命名记录";
    const summary = document.createElement("p");
    summary.textContent = item.summary || item.impact || "";
    card.append(top, title, summary);

    if (item.productInfo) {
      const productInfo = document.createElement("div");
      productInfo.className = "report-inline-tags";
      item.productInfo.split("；").filter(Boolean).forEach((tag) => productInfo.appendChild(miniPill(tag)));
      card.appendChild(productInfo);
    }
    if (item.impact) {
      const impact = document.createElement("p");
      impact.className = "report-impact";
      impact.textContent = item.impact;
      card.appendChild(impact);
    }
    const sourceAction = resolvedSourceLink(item);
    if (sourceAction.url) {
      const link = document.createElement("a");
      link.className = "report-card-link";
      applySourceLink(link, sourceAction);
      link.textContent = sourceAction.label || "打开原文";
      card.appendChild(link);
    }
    return card;
  }

  function renderReportProductList() {
    if (!els.reportProductList) return;
    const range = monthlyReportMeta.period || {};
    if (els.reportMonthLabel) els.reportMonthLabel.textContent = range.label || "当月产品报告";
    if (els.reportRangeLabel) els.reportRangeLabel.textContent = [range.start, range.end].filter(Boolean).join(" 至 ");
    els.reportProductList.replaceChildren(
      ...monthlyReports.map((report) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `report-product-button${report.product === reportState.selectedProduct ? " active" : ""}`;
        const name = document.createElement("strong");
        name.textContent = report.product;
        const metaLine = document.createElement("span");
        metaLine.textContent = `${report.metrics.productUpdates} 条进展 / ${report.metrics.kolUpdates} 条KOL`;
        button.append(name, metaLine);
        button.addEventListener("click", () => {
          reportState.selectedProduct = report.product;
          renderReports();
        });
        return button;
      }),
    );
  }

  function renderReportReader() {
    if (!els.reportReader) return;
    const report = reportByProduct(reportState.selectedProduct);
    if (!report) {
      const empty = document.createElement("div");
      empty.className = "report-reader-empty";
      empty.textContent = "暂无当月产品报告";
      els.reportReader.replaceChildren(empty);
      return;
    }
    if (els.reportDownloadLink) {
      els.reportDownloadLink.href = report.download || "#";
      els.reportDownloadLink.setAttribute("download", `${report.period.label || "当月"}_${report.product}_关注报告.docx`);
    }

    const head = document.createElement("div");
    head.className = "report-reader-head";
    const titleWrap = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = report.period.label || monthlyReportMeta.period?.label || "当月报告";
    const title = document.createElement("h3");
    title.textContent = `${report.product}关注报告`;
    const subtitle = document.createElement("p");
    subtitle.textContent = [report.period.start, report.period.end].filter(Boolean).join(" 至 ");
    titleWrap.append(eyebrow, title, subtitle);
    head.appendChild(titleWrap);

    const metrics = document.createElement("div");
    metrics.className = "report-metrics";
    metrics.append(
      reportMetric("产品/竞品进展", report.metrics.productUpdates),
      reportMetric("建议跟进", report.metrics.follow),
      reportMetric("高证据", report.metrics.highEvidence),
      reportMetric("KOL记录", report.metrics.kolUpdates),
      reportMetric("涉及专家", report.metrics.experts),
      reportMetric("涉及机构", report.metrics.institutions),
    );

    const executive = reportBlock("管理层摘要", "executive");
    executive.appendChild(reportExecutiveSummary(report.executiveSummary));

    const conclusion = reportBlock("本月结论", "conclusion");
    conclusion.appendChild(reportList(report.conclusion));

    const focus = reportBlock("重点关注事项", "focus");
    const focusGrid = document.createElement("div");
    focusGrid.className = "report-evidence-grid";
    if (report.focusItems?.length) {
      report.focusItems.forEach((item) => focusGrid.appendChild(reportEvidenceCard(item, "focus")));
    } else {
      const empty = document.createElement("p");
      empty.className = "report-empty";
      empty.textContent = "本月未检索到产品/竞品研究进展。";
      focusGrid.appendChild(empty);
    }
    focus.appendChild(focusGrid);

    const kolBlock = reportBlock("KOL/专家动态", "kol");
    const kolGrid = document.createElement("div");
    kolGrid.className = "report-evidence-grid";
    if (report.kolItems?.length) {
      report.kolItems.forEach((item) => kolGrid.appendChild(reportEvidenceCard(item, "kol")));
    } else {
      const empty = document.createElement("p");
      empty.className = "report-empty";
      empty.textContent = "本月未检索到KOL/专家相关记录。";
      kolGrid.appendChild(empty);
    }
    kolBlock.appendChild(kolGrid);

    const terms = reportBlock("涉及分子/靶点", "terms");
    const termWrap = document.createElement("div");
    termWrap.className = "report-term-list";
    if (report.terms?.length) {
      report.terms.forEach((term) => {
        const chip = document.createElement("span");
        chip.className = "report-term-chip";
        chip.textContent = `${term.name} · ${term.count}`;
        termWrap.appendChild(chip);
      });
    } else {
      const empty = document.createElement("p");
      empty.className = "report-empty";
      empty.textContent = "本月记录中未提取到明确的产品信息或分子/靶点。";
      termWrap.appendChild(empty);
    }
    terms.appendChild(termWrap);

    const follow = reportBlock("建议跟进", "follow");
    follow.appendChild(reportList(report.followups));

    els.reportReader.replaceChildren(head, metrics, executive, conclusion, focus, kolBlock, terms, follow);
  }

  function renderReports() {
    renderReportProductList();
    renderReportReader();
  }

  function render() {
    filteredRows = sortRows(rows.filter(rowMatches));
    if (pageState.selectedId && !filteredRows.some((row) => row.id === pageState.selectedId)) clearDetail(false);
    renderStats(filteredRows);
    renderCategoryChips();
    renderProductChips();
    renderActiveFilters();
    renderRows(filteredRows);
  }

  buildFilters();
  buildKolFilters();
  wireEvents();
  renderHomeStats();
  setOverview("products", false);
  render();
  renderKol();
  renderReports();
})();
