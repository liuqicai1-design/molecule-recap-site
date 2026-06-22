(function () {
  const dataset = window.RECAP_DATA || { meta: {}, rows: [] };
  const rows = dataset.rows || [];
  const meta = dataset.meta || {};
  const TA_ORDER = ["CVM", "CVU", "CPC", "EMG"];
  const PRODUCT_ORDER = ["立普妥", "络活喜", "可多华", "西乐葆", "乐瑞卡", "左洛复", "怡诺思", "迪敏思", "利加隆", "爱宁达"];
  const RELATION_ORDER = [
    "本品/同成分",
    "追踪对象",
    "直接竞品",
    "同类竞品",
    "NSAID 竞品",
    "非 NSAID 竞品",
    "复方/机制竞品",
    "机制/联合竞品",
    "机制竞品",
    "PCSK9 竞品",
    "PCSK9 潜在竞品",
    "局部竞品",
    "口服竞品",
    "系统治疗竞品",
    "生物制剂竞品",
    "重症/潜在竞品",
    "特殊人群竞品",
    "历史竞品",
    "潜在竞品",
    "潜在/新机制",
    "潜在/相邻适应症",
  ];
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

  const els = {
    metaLine: document.getElementById("metaLine"),
    homeStats: document.getElementById("homeStats"),
    overviewPanel: document.getElementById("overviewPanel"),
    overviewSection: document.getElementById("overview"),
    jumpQuery: document.getElementById("jumpQuery"),
    navQuery: document.getElementById("navQuery"),
    backHome: document.getElementById("backHome"),
    querySection: document.getElementById("query"),
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
  };

  let filteredRows = rows.slice();
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

  function productList(row) {
    return String(row["产品"] || "")
      .split("；")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function allProducts() {
    return Array.from(new Set(rows.flatMap(productList))).sort(compareProduct);
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

  function competitorEntries(product) {
    const seen = new Set();
    const entries = [];
    rows.forEach((row) => {
      if (!productList(row).includes(product)) return;
      const parsed = parseCompetitor(row["产品/竞品"], product);
      if (!parsed || seen.has(parsed.raw)) return;
      seen.add(parsed.raw);
      entries.push(parsed);
    });
    return entries.sort((a, b) => `${a.relation}${a.name}`.localeCompare(`${b.relation}${b.name}`, "zh-Hans-CN"));
  }

  function competitorGroups(product) {
    const groups = new Map();
    competitorEntries(product).forEach((entry) => {
      if (!groups.has(entry.relation)) groups.set(entry.relation, []);
      groups.get(entry.relation).push(entry.name);
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
    const range = meta.dateRange || {};
    const competitorCount = new Set(rows.map((row) => row["产品/竞品"]).filter(Boolean)).size;
    const items = [
      ["总更新", rows.length, `${range.start || ""} 至 ${range.end || ""}`],
      ["产品", products.length, "CVM / CVU / CPC / EMG"],
      ["追踪口径", competitorCount, "本品、直接竞品、机制和潜在竞品"],
      ["信息来源", uniqueValues("来源").length, uniqueValues("来源").join(" / ")],
      ["建议跟进", rows.filter((row) => row["是否建议跟进"] === "是").length, "优先阅读与判断影响"],
      ["高证据", rows.filter((row) => row["证据等级"] === "高").length, "临床研究或关键证据更新"],
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
        grid.appendChild(overviewCard(ta, `${products.length} 个产品，${rowCount.toLocaleString("zh-CN")} 条更新`, products));
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
      body.textContent = `${groups.length} 类，${entryCount} 个竞品/分子追踪口径，${productRows.length.toLocaleString("zh-CN")} 条更新`;
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
        grid.appendChild(overviewCard(source, `${bySource[source].toLocaleString("zh-CN")} 条记录`, tags));
      });
    els.overviewPanel.replaceChildren(grid);
  }

  function renderFiltersOverview() {
    const range = meta.dateRange || {};
    const items = [
      ["关键词", "标题、分子、摘要、影响判断、链接均可检索", ["全文匹配"]],
      ["分类", "新发研究与医学报道两类", uniqueValues("分类")],
      ["TA", "按业务治疗领域快速收敛", uniqueValues("TA")],
      ["产品", "支持多个产品组合筛选", allProducts()],
      ["来源", "按信息来源定位证据入口", uniqueValues("来源")],
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
    document.body.classList.toggle("view-home", !isQuery);
    document.body.classList.toggle("view-query", isQuery);
    if (!isQuery) els.floatingTableScrollBar.classList.remove("visible");
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(() => {
      updateTableScrollbar();
      if (shouldFocusQuery) {
        setTimeout(() => els.queryInput.focus(), 220);
      }
    });
  }

  function buildFilters() {
    const range = meta.dateRange || {};
    els.metaLine.textContent = `${range.start || ""} 至 ${range.end || ""} | ${rows.length.toLocaleString("zh-CN")} 条更新`;

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
    uniqueValues("来源").forEach((value) => addOption(els.sourceFilter, value, value));

    addOption(els.evidenceFilter, "全部", "全部");
    ["高", "中", "低"].forEach((value) => {
      if (rows.some((row) => row["证据等级"] === value)) addOption(els.evidenceFilter, value, value);
    });

    els.dateStart.value = range.start || "";
    els.dateEnd.value = range.end || "";
    pageState.start = els.dateStart.value;
    pageState.end = els.dateEnd.value;
  }

  function wireEvents() {
    document.querySelectorAll("[data-overview]").forEach((button) => {
      button.addEventListener("click", () => setOverview(button.dataset.overview, true));
    });
    els.jumpQuery.addEventListener("click", () => setPage("query", true));
    els.navQuery.addEventListener("click", () => setPage("query", true));
    els.backHome.addEventListener("click", () => setPage("home", false));
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
    wireTableScroll();
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
    if (pageState.query && !String(row.searchText || "").includes(pageState.query)) return false;
    if (pageState.category !== "全部" && row["分类"] !== pageState.category) return false;
    if (pageState.ta !== "全部" && row["TA"] !== pageState.ta) return false;
    if (pageState.source !== "全部" && row["来源"] !== pageState.source) return false;
    if (pageState.evidence !== "全部" && row["证据等级"] !== pageState.evidence) return false;
    if (pageState.followOnly && row["是否建议跟进"] !== "是") return false;
    if (pageState.start && row["研究/论文发布时间"] < pageState.start) return false;
    if (pageState.end && row["研究/论文发布时间"] > pageState.end) return false;
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
      ["产品/竞品", row["产品/竞品"]],
      ["活性成分/分子式追踪口径", row["活性成分/分子式追踪口径"]],
      ["研究/论文发布时间", row["研究/论文发布时间"]],
      ["来源", row["来源"]],
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

    const sourceLink = document.createElement("a");
    sourceLink.className = "source-link";
    sourceLink.href = row["原始链接"] || "#";
    sourceLink.target = "_blank";
    sourceLink.rel = "noreferrer";
    sourceLink.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>打开原始链接';
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
        link.href = row["原始链接"];
        link.target = "_blank";
        link.rel = "noreferrer";
        link.title = "打开原始链接";
        link.setAttribute("aria-label", "打开原始链接");
        link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>';
        link.addEventListener("click", (event) => event.stopPropagation());
        linkCell.appendChild(link);

        tr.append(
          makeCell(row["研究/论文发布时间"], "date-cell"),
          categoryCell,
          makeCell(row["TA"], "ta-cell"),
          makeCell(row["产品"], "product-cell"),
          makeCell(row["产品/竞品"], "competitor-cell"),
          makeCell(row["来源"], "source-cell"),
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
    if (pageState.source !== "全部") bits.push(pageState.source);
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
    pageState.start = (meta.dateRange || {}).start || "";
    pageState.end = (meta.dateRange || {}).end || "";
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
      lines.push(columns.map((column) => csvEscape(row[column])).join(","));
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
  wireEvents();
  renderHomeStats();
  setOverview("products", false);
  render();
})();
