/* ============ Tabellone Mondiali 2026 — app logic ============ */
(function () {
  "use strict";
  var WC = window.WC, COMBOS = window.COMBOS;
  var GL = WC.groupLetters;
  var STORE = "wc2026:v2";

  /* ---------- helpers ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function $(s, r) { return (r || document).querySelector(s); }

  /* ---------- state ---------- */
  function defaults() {
    var groups = {}, names = {};
    GL.forEach(function (g) { groups[g] = WC.teams[g].slice(); });
    Object.keys(WC.teamNames).forEach(function (id) { names[id] = WC.teamNames[id]; });
    return { groups: groups, thirds: GL.slice(), names: names, winners: {}, tab: "gironi" };
  }
  var state = load();

  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (!raw) return defaults();
      var s = JSON.parse(raw), d = defaults();
      // merge defensively
      GL.forEach(function (g) { if (!Array.isArray(s.groups && s.groups[g]) || s.groups[g].length !== 4) s.groups = s.groups || {}, s.groups[g] = d.groups[g]; });
      if (!Array.isArray(s.thirds) || s.thirds.length !== 12) s.thirds = d.thirds;
      s.names = s.names || {};
      s.winners = s.winners || {};
      s.tab = s.tab || "gironi";
      return s;
    } catch (e) { return defaults(); }
  }
  var saveT = null;
  function save() { clearTimeout(saveT); saveT = setTimeout(function () { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }, 120); }

  function teamName(id) { return id == null ? null : (state.names[id] != null && state.names[id] !== "" ? state.names[id] : id); }

  /* ---------- third-placed combination logic ---------- */
  function qualifiedSet() { return state.thirds.slice(0, 8); }
  function thirdAssignment() {
    var key = qualifiedSet().slice().sort().join("");
    var val = COMBOS[key];
    var map = {};
    if (val) WC.thirdCols.forEach(function (c, i) { map[c] = val[i]; });
    return map; // slot letter -> group letter whose 3rd-placed team fills it
  }

  /* ---------- resolve match teams ---------- */
  function resolveSpec(sp) {
    if (sp.t === "pos") return state.groups[sp.g][sp.p];
    if (sp.t === "third") { var grp = thirdAssignment()[sp.slot]; return grp ? state.groups[grp][2] : null; }
    if (sp.t === "win") return winnerId(sp.m);
    if (sp.t === "lose") return loserId(sp.m);
    return null;
  }
  function winnerId(m) { var s = state.winners[m]; if (!s) return null; return resolveSpec(WC.M[m][s]); }
  function loserId(m) { var s = state.winners[m]; if (!s) return null; return resolveSpec(WC.M[m][s === "home" ? "away" : "home"]); }

  var ALL_IDS = Object.keys(WC.M).map(Number).sort(function (a, b) { return a - b; });
  function cleanupWinners() {
    var changed = true;
    while (changed) {
      changed = false;
      ALL_IDS.forEach(function (m) {
        var s = state.winners[m]; if (!s) return;
        if (resolveSpec(WC.M[m][s]) == null) { delete state.winners[m]; changed = true; }
      });
    }
  }

  /* ---------- spec display ---------- */
  function specSeed(sp) {
    if (sp.t === "pos") return sp.p === 0 ? { txt: "1" + sp.g, cls: "seed-1" } : { txt: "2" + sp.g, cls: "seed-2" };
    if (sp.t === "third") { var grp = thirdAssignment()[sp.slot]; return { txt: grp ? "3" + grp : "3ª", cls: "seed-3" }; }
    if (sp.t === "win") return { txt: "V" + sp.m, cls: "" };
    return { txt: "P" + sp.m, cls: "" };
  }
  function specText(sp) {
    var id = resolveSpec(sp);
    if (id != null) return { name: teamName(id), tbd: false };
    return { name: sp.t === "win" ? "Vincente M" + sp.m : "Perdente M" + sp.m, tbd: true };
  }

  /* ================= SORTABLE (HTML5 DnD via handle) ================= */
  function dragAfter(container, y, sel) {
    var els = Array.prototype.slice.call(container.querySelectorAll(sel + ":not(.dragging)"));
    var best = { off: -Infinity, el: null };
    els.forEach(function (el) {
      var b = el.getBoundingClientRect();
      var off = y - b.top - b.height / 2;
      if (off < 0 && off > best.off) best = { off: off, el: el };
    });
    return best.el;
  }
  function makeSortable(container, sel, onCommit) {
    container.querySelectorAll(sel + " .handle").forEach(function (handle) {
      var row = handle.closest(sel);
      handle.setAttribute("draggable", "true");
      handle.addEventListener("dragstart", function (e) {
        row.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", row.dataset.id); e.dataTransfer.setDragImage(row, 24, 18); } catch (_) {}
      });
      handle.addEventListener("dragend", function () {
        row.classList.remove("dragging");
        var ids = Array.prototype.slice.call(container.querySelectorAll(sel)).map(function (r) { return r.dataset.id; });
        onCommit(ids);
      });
    });
    if (!container._sortBound) {
      container._sortBound = true;
      container.addEventListener("dragover", function (e) {
        var dragging = container.querySelector(".dragging");
        if (!dragging) return;
        e.preventDefault();
        var after = dragAfter(container, e.clientY, sel);
        if (after == null) container.appendChild(dragging);
        else container.insertBefore(dragging, after);
      });
    }
  }

  /* ================= RENDER: GIRONI ================= */
  var QSYM = ["✓", "✓", "3ª", "✕"];
  function renderGroups() {
    var grid = $("#groups-grid");
    var html = "";
    GL.forEach(function (g) {
      html += '<div class="gcard"><div class="gcard-head"><span class="gcard-letter">Girone <b>' + g + "</b></span>" +
        '<span class="gcard-hint">trascina per ordinare</span></div><div class="gcard-body" data-g="' + g + '">';
      state.groups[g].forEach(function (id, i) {
        html += '<div class="srow p' + i + '" data-id="' + id + '">' +
          '<span class="handle" title="trascina">⠿</span>' +
          '<span class="pos">' + (i + 1) + "</span>" +
          '<span class="name" contenteditable="true" spellcheck="false" data-id="' + id + '">' + esc(teamName(id)) + "</span>" +
          '<span class="qtag">' + QSYM[i] + "</span></div>";
      });
      html += "</div></div>";
    });
    grid.innerHTML = html;
    GL.forEach(function (g) {
      var body = grid.querySelector('.gcard-body[data-g="' + g + '"]');
      makeSortable(body, ".srow", function (ids) {
        state.groups[g] = ids;
        save(); renderGroups(); renderThirds(); if (state.tab === "bracket") { cleanupWinners(); renderBracket(); }
      });
    });
    wireNames(grid);
  }

  function wireNames(scope) {
    scope.querySelectorAll(".name[contenteditable]").forEach(function (n) {
      n.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); n.blur(); } });
      n.addEventListener("blur", function () {
        var id = n.dataset.id, v = n.textContent.trim();
        if (v === "") { v = id; n.textContent = id; }
        state.names[id] = v; save();
        renderThirds(); if (state.tab === "bracket") renderBracket();
      });
    });
  }

  /* ================= RENDER: THIRDS ================= */
  function renderThirds() {
    var list = $("#thirds-list");
    var html = "";
    state.thirds.forEach(function (g, i) {
      if (i === 8) html += '<div class="cutline"><span>Linea di qualificazione</span></div>';
      var id = state.groups[g][2];
      var qual = i < 8;
      html += '<div class="trow ' + (qual ? "qual" : "out") + '" data-id="' + g + '">' +
        '<span class="handle">⠿</span>' +
        '<span class="rank">' + (i + 1) + "</span>" +
        '<span class="gtag">3' + g + "</span>" +
        '<span class="tname">' + esc(teamName(id)) + "</span>" +
        '<span class="status">' + (qual ? "✓" : "✕") + "</span></div>";
    });
    list.innerHTML = html;
    makeSortable(list, ".trow", function (ids) {
      state.thirds = ids; save(); renderThirds(); if (state.tab === "bracket") { cleanupWinners(); renderBracket(); }
    });
  }

  /* ================= RENDER: BRACKET ================= */
  var SLOT = 96, TOPPAD = 50, CARD_W = 226, COL_W = 258;
  var roundOf = {}; WC.rounds.forEach(function (r, ri) { r.ids.forEach(function (m) { roundOf[m] = ri; }); });
  function xOf(r) { return r * COL_W; }
  var r32ids = WC.rounds[0].ids;

  function center(m, memo) {
    if (memo[m] != null) return memo[m];
    var ri = roundOf[m], v;
    if (ri === 0) { v = TOPPAD + r32ids.indexOf(m) * SLOT + SLOT / 2; }
    else { var d = WC.M[m]; v = (center(d.home.m, memo) + center(d.away.m, memo)) / 2; }
    memo[m] = v; return v;
  }

  function sideHTML(m, side) {
    var sp = WC.M[m][side];
    var seed = specSeed(sp), info = specText(sp);
    var w = state.winners[m];
    var cls = "side " + seed.cls;
    var resolved = !info.tbd;
    var bothKnown = resolveSpec(WC.M[m].home) != null && resolveSpec(WC.M[m].away) != null;
    if (bothKnown) cls += " clickable";
    if (info.tbd) cls += " tbd";
    if (w === side) cls += " win";
    else if (w) cls += " lose";
    return '<div class="' + cls + '" data-m="' + m + '" data-side="' + side + '">' +
      '<span class="seed">' + esc(seed.txt) + "</span>" +
      '<span class="tm">' + esc(info.name) + "</span>" +
      '<span class="chk">✓</span></div>';
  }

  function matchHTML(m, extraCls) {
    var d = WC.M[m];
    var cand = d.away.t === "third" ? ("3ª " + d.away.lbl) : "";
    var cls = "match" + (extraCls ? " " + extraCls : "");
    if (m === 104 && winnerId(104) != null) cls += " champ-final";
    return '<div class="' + cls + '" data-m="' + m + '">' +
      '<div class="mhdr"><span class="mno">M' + m + "</span>" + (cand ? '<span class="mcand">' + esc(cand) + "</span>" : "") + "</div>" +
      sideHTML(m, "home") + sideHTML(m, "away") + "</div>";
  }

  function renderBracket() {
    var stage = $("#bracket-stage");
    var memo = {};
    // headers
    var headHTML = "";
    WC.rounds.forEach(function (r, ri) {
      var n = r.ids.length;
      headHTML += '<div class="rhead" style="position:absolute;left:' + (xOf(ri) + 2) + 'px;top:8px;">' + r.name +
        "<small>" + (ri === 4 ? "MetLife Stadium" : n + " partite") + "</small></div>";
    });
    headHTML += '<div class="rhead" style="position:absolute;left:' + (xOf(4) + CARD_W + 60) + 'px;top:8px;">Campione<small>19 luglio 2026</small></div>';

    var cardsHTML = "";
    WC.rounds.forEach(function (r) { r.ids.forEach(function (m) { cardsHTML += matchHTML(m); }); });
    cardsHTML += matchHTML(WC.thirdMatch, "third-place"); // 103

    // champion card
    var champId = winnerId(104), champName = champId != null ? teamName(champId) : null;
    cardsHTML += '<div class="champ-card" id="champ-card"><div class="trophy">★</div><div class="cl">Campione del Mondo</div>' +
      '<div class="cn ' + (champName ? "" : "empty") + '">' + (champName ? esc(champName) : "Da definire") + "</div></div>";

    stage.innerHTML = '<svg id="bracket-svg"></svg>' + headHTML + cardsHTML;

    // position cards (measure heights)
    var geo = {};
    WC.rounds.forEach(function (r, ri) {
      r.ids.forEach(function (m) {
        var el = stage.querySelector('.match[data-m="' + m + '"]');
        el.style.left = xOf(ri) + "px"; el.style.width = CARD_W + "px";
        var h = el.offsetHeight, cy = center(m, memo);
        el.style.top = (cy - h / 2) + "px";
        geo[m] = { x: xOf(ri), top: cy - h / 2, h: h, cy: cy, right: xOf(ri) + CARD_W };
      });
    });
    // third-place card under the final
    var fin = geo[104];
    var tp = stage.querySelector('.match[data-m="' + WC.thirdMatch + '"]');
    tp.style.left = xOf(4) + "px"; tp.style.width = CARD_W + "px";
    var th = tp.offsetHeight, ttop = fin.top + fin.h + 46;
    tp.style.top = ttop + "px";
    geo[103] = { x: xOf(4), top: ttop, h: th, cy: ttop + th / 2, right: xOf(4) + CARD_W };
    // champion card
    var cc = $("#champ-card");
    var ch = cc.offsetHeight; var cx = xOf(4) + CARD_W + 60;
    cc.style.left = cx + "px"; cc.style.width = "190px";
    cc.style.top = (fin.cy - ch / 2) + "px";

    // connectors
    var paths = "";
    function elbow(c, p) { var mx = (c.right + p.x) / 2; return "M" + c.right + " " + c.cy + " H" + mx + " V" + p.cy + " H" + p.x; }
    WC.rounds.forEach(function (r) {
      r.ids.forEach(function (m) {
        var d = WC.M[m];
        if (d.home.t === "win") paths += '<path d="' + elbow(geo[d.home.m], geo[m]) + '"/>';
        if (d.away.t === "win") paths += '<path d="' + elbow(geo[d.away.m], geo[m]) + '"/>';
      });
    });
    // final -> champion
    paths += '<path d="M' + geo[104].right + " " + geo[104].cy + " H" + cx + '"/>';
    // semis -> third place (dashed)
    var dash = ' stroke-dasharray="3 5" opacity="0.5"';
    [101, 102].forEach(function (sm) { paths += '<path' + dash + ' d="' + elbow(geo[sm], geo[103]) + '"/>'; });

    var svg = $("#bracket-svg");
    svg.setAttribute("width", (xOf(4) + CARD_W + 260));
    svg.setAttribute("height", (TOPPAD + 16 * SLOT + 60));
    svg.innerHTML = paths;
    // stage size
    stage.style.width = (xOf(4) + CARD_W + 260) + "px";
    stage.style.height = Math.max(TOPPAD + 16 * SLOT + 30, ttop + th + 40) + "px";
  }

  // click to pick winners (delegated)
  $("#bracket-stage").addEventListener("click", function (e) {
    var side = e.target.closest(".side.clickable");
    if (!side) return;
    var m = Number(side.dataset.m), s = side.dataset.side;
    state.winners[m] = (state.winners[m] === s) ? undefined : s;
    if (state.winners[m] === undefined) delete state.winners[m];
    cleanupWinners(); save(); renderBracket();
  });

  /* ================= TABS + ACTIONS ================= */
  function setTab(t) {
    state.tab = t; save();
    $("#tab-gironi").classList.toggle("active", t === "gironi");
    $("#tab-bracket").classList.toggle("active", t === "bracket");
    $("#panel-gironi").classList.toggle("active", t === "gironi");
    $("#panel-bracket").classList.toggle("active", t === "bracket");
    if (t === "bracket") renderBracket();
  }
  $("#tab-gironi").addEventListener("click", function () { setTab("gironi"); });
  $("#tab-bracket").addEventListener("click", function () { setTab("bracket"); });

  $("#btn-reset").addEventListener("click", function () {
    if (!confirm("Azzerare tutte le selezioni e i nomi delle squadre?")) return;
    try { localStorage.removeItem(STORE); } catch (e) {}
    state = defaults();
    renderGroups(); renderThirds(); setTab("gironi");
  });

  /* ================= INIT ================= */
  cleanupWinners();
  renderGroups();
  renderThirds();
  setTab(state.tab);
})();
