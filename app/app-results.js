/* ============ Tabellone Mondiali 2026 — VERSIONE RISULTATI ============ */
(function () {
  "use strict";
  var WC = window.WC, COMBOS = window.COMBOS, FIX = window.FIXTURES;
  var GL = WC.groupLetters;
  var STORE = "wc2026r:v1";

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function teamName(id) { return id == null ? null : (WC.teamNames[id] || id); }

  var fixByGroup = {}; GL.forEach(function (g) { fixByGroup[g] = FIX.filter(function (f) { return f.g === g; }); });

  /* ---------- state ---------- */
  function defaults() { return { scores: {}, winners: {}, tab: "risultati" }; }
  var state = load();
  function load() {
    try { var s = JSON.parse(localStorage.getItem(STORE)); if (!s) return defaults(); s.scores = s.scores || {}; s.winners = s.winners || {}; s.tab = s.tab || "risultati"; return s; }
    catch (e) { return defaults(); }
  }
  var saveT; function save() { clearTimeout(saveT); saveT = setTimeout(function () { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }, 120); }

  function played(mid) { var s = state.scores[mid]; return s && s.h != null && s.h !== "" && s.a != null && s.a !== ""; }
  function sc(mid) { var s = state.scores[mid]; return { h: parseInt(s.h, 10), a: parseInt(s.a, 10) }; }

  /* ---------- standings (FIFA tiebreakers) ---------- */
  function blankStat(id, seed) { return { id: id, seed: seed, pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }; }
  function computeGroupStats(g) {
    var st = {}; WC.teams[g].forEach(function (id, i) { st[id] = blankStat(id, i); });
    fixByGroup[g].forEach(function (f) {
      if (!played(f.mid)) return;
      var s = sc(f.mid), H = st[f.home], A = st[f.away];
      H.pld++; A.pld++; H.gf += s.h; H.ga += s.a; A.gf += s.a; A.ga += s.h;
      if (s.h > s.a) { H.w++; A.l++; H.pts += 3; }
      else if (s.h < s.a) { A.w++; H.l++; A.pts += 3; }
      else { H.d++; A.d++; H.pts++; A.pts++; }
      H.gd = H.gf - H.ga; A.gd = A.gf - A.ga;
    });
    return st;
  }
  // head-to-head mini ranking among a tied cluster
  function resolveH2H(g, cluster) {
    var ids = {}; cluster.forEach(function (t) { ids[t.id] = { pts: 0, gd: 0, gf: 0 }; });
    fixByGroup[g].forEach(function (f) {
      if (!played(f.mid) || !ids[f.home] || !ids[f.away]) return;
      var s = sc(f.mid);
      ids[f.home].gf += s.h; ids[f.home].gd += s.h - s.a;
      ids[f.away].gf += s.a; ids[f.away].gd += s.a - s.h;
      if (s.h > s.a) ids[f.home].pts += 3; else if (s.h < s.a) ids[f.away].pts += 3; else { ids[f.home].pts++; ids[f.away].pts++; }
    });
    return cluster.slice().sort(function (a, b) {
      var x = ids[a.id], y = ids[b.id];
      return (y.pts - x.pts) || (y.gd - x.gd) || (y.gf - x.gf) || (a.seed - b.seed);
    });
  }
  function rankGroup(g, st) {
    var arr = WC.teams[g].map(function (id) { return st[id]; });
    arr.sort(function (a, b) { return (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || (a.seed - b.seed); });
    var out = [], i = 0;
    while (i < arr.length) {
      var j = i + 1;
      while (j < arr.length && arr[j].pts === arr[i].pts && arr[j].gd === arr[i].gd && arr[j].gf === arr[i].gf) j++;
      var cl = arr.slice(i, j);
      out = out.concat(cl.length > 1 ? resolveH2H(g, cl) : cl);
      i = j;
    }
    return out; // array of stat objects, ranked
  }

  // recompute everything derived
  var derived = null;
  function recompute() {
    var stats = {}, rank = {}, rankObj = {};
    GL.forEach(function (g) {
      var st = computeGroupStats(g);
      GL && Object.keys(st).forEach(function (id) { stats[id] = st[id]; });
      var ranked = rankGroup(g, st);
      rankObj[g] = ranked;
      rank[g] = ranked.map(function (t) { return t.id; });
    });
    // best thirds: rank the 12 third-placed teams
    var thirds = GL.map(function (g) { return { g: g, id: rank[g][2], st: stats[rank[g][2]] }; });
    thirds.sort(function (a, b) { return (b.st.pts - a.st.pts) || (b.st.gd - a.st.gd) || (b.st.gf - a.st.gf) || (a.g < b.g ? -1 : 1); });
    derived = { stats: stats, rank: rank, rankObj: rankObj, thirds: thirds.map(function (t) { return t.g; }), thirdsObj: thirds };
  }

  /* ---------- bracket resolution (shared engine) ---------- */
  function qualifiedSet() { return derived.thirds.slice(0, 8); }
  function thirdAssignment() {
    var key = qualifiedSet().slice().sort().join(""); var val = COMBOS[key], map = {};
    if (val) WC.thirdCols.forEach(function (c, i) { map[c] = val[i]; });
    return map;
  }
  function resolveSpec(sp) {
    if (sp.t === "pos") return derived.rank[sp.g][sp.p];
    if (sp.t === "third") { var grp = thirdAssignment()[sp.slot]; return grp ? derived.rank[grp][2] : null; }
    if (sp.t === "win") return winnerId(sp.m);
    if (sp.t === "lose") return loserId(sp.m);
    return null;
  }
  function winnerId(m) { var s = state.winners[m]; return s ? resolveSpec(WC.M[m][s]) : null; }
  function loserId(m) { var s = state.winners[m]; return s ? resolveSpec(WC.M[m][s === "home" ? "away" : "home"]) : null; }
  var ALL_IDS = Object.keys(WC.M).map(Number).sort(function (a, b) { return a - b; });
  function cleanupWinners() {
    var changed = true;
    while (changed) { changed = false; ALL_IDS.forEach(function (m) { var s = state.winners[m]; if (s && resolveSpec(WC.M[m][s]) == null) { delete state.winners[m]; changed = true; } }); }
  }
  function specSeed(sp) {
    if (sp.t === "pos") return sp.p === 0 ? { txt: "1" + sp.g, cls: "seed-1" } : { txt: "2" + sp.g, cls: "seed-2" };
    if (sp.t === "third") { var grp = thirdAssignment()[sp.slot]; return { txt: grp ? "3" + grp : "3ª", cls: "seed-3" }; }
    if (sp.t === "win") return { txt: "V" + sp.m, cls: "" };
    return { txt: "P" + sp.m, cls: "" };
  }
  function specText(sp) { var id = resolveSpec(sp); if (id != null) return { name: teamName(id), tbd: false }; return { name: sp.t === "win" ? "Vincente M" + sp.m : "Perdente M" + sp.m, tbd: true }; }

  /* ================= RENDER: MATCHES ================= */
  function renderMatches() {
    var host = $("#matches-list"), html = "", lastDay = null;
    FIX.forEach(function (f) {
      if (f.dateLabel !== lastDay) { html += '<div class="day-divider"><span class="d">' + f.dateLabel + "</span></div>"; lastDay = f.dateLabel; }
      var s = state.scores[f.mid] || {}, pl = played(f.mid);
      var hv = (s.h == null ? "" : s.h), av = (s.a == null ? "" : s.a);
      var hw = "", aw = "";
      if (pl) { var v = sc(f.mid); if (v.h > v.a) { hw = "win-team"; aw = "lose-team"; } else if (v.h < v.a) { aw = "win-team"; hw = "lose-team"; } }
      html += '<div class="mrow ' + (pl ? "played" : "") + '">' +
        '<div class="mtime">' + f.time + "<small>Giorn. " + f.md + "</small></div>" +
        '<div class="gchip">' + f.g + "</div>" +
        '<div class="thome"><span class="tname ' + hw + '">' + esc(teamName(f.home)) + "</span></div>" +
        '<div class="score"><input type="number" min="0" max="99" inputmode="numeric" data-mid="' + f.mid + '" data-s="h" value="' + hv + '" class="' + (hv !== "" ? "filled" : "") + '">' +
        '<span class="dash">–</span>' +
        '<input type="number" min="0" max="99" inputmode="numeric" data-mid="' + f.mid + '" data-s="a" value="' + av + '" class="' + (av !== "" ? "filled" : "") + '"></div>' +
        '<div class="taway"><span class="tname ' + aw + '">' + esc(teamName(f.away)) + "</span></div>" +
        '<div class="mstad">' + esc(f.stadium) + "</div></div>";
    });
    host.innerHTML = html;
  }

  function onScoreInput(e) {
    var el = e.target; if (!el.dataset || !el.dataset.mid) return;
    var mid = el.dataset.mid, side = el.dataset.s;
    var v = el.value.replace(/[^0-9]/g, "").slice(0, 2); el.value = v;
    if (!state.scores[mid]) state.scores[mid] = { h: "", a: "" };
    state.scores[mid][side] = v;
    el.classList.toggle("filled", v !== "");
    // update row win/lose styling + played class without full re-render (keep focus)
    var row = el.closest(".mrow");
    var s = state.scores[mid], pl = (s.h !== "" && s.a !== "");
    row.classList.toggle("played", pl);
    var names = row.querySelectorAll(".tname");
    names[0].className = "tname"; names[1].className = "tname";
    if (pl) { var H = parseInt(s.h, 10), A = parseInt(s.a, 10); if (H > A) { names[0].classList.add("win-team"); names[1].classList.add("lose-team"); } else if (H < A) { names[1].classList.add("win-team"); names[0].classList.add("lose-team"); } }
    recompute(); cleanupWinners(); renderStandings(); renderProgress(); if (state.tab === "bracket") renderBracket(); save();
  }

  function renderProgress() {
    var done = FIX.filter(function (f) { return played(f.mid); }).length;
    $("#prog-fill").style.width = (done / FIX.length * 100) + "%";
    $("#prog-lbl").textContent = done + " / " + FIX.length + " partite";
  }

  /* ================= RENDER: STANDINGS RAIL ================= */
  function renderStandings() {
    var host = $("#standings-scroll"), html = "";
    GL.forEach(function (g) {
      html += '<div class="mini-group"><div class="mini-gh"><span class="gl">Girone <b>' + g + '</b></span>' +
        '<span class="cols"><span>PG</span><span>DR</span><span>PT</span></span></div>';
      derived.rankObj[g].forEach(function (t, i) {
        html += '<div class="mini-row q' + i + '"><span class="rk">' + (i + 1) + '</span>' +
          '<span class="nm">' + esc(teamName(t.id)) + '</span>' +
          '<span class="v">' + t.pld + '</span>' +
          '<span class="v">' + (t.gd > 0 ? "+" + t.gd : t.gd) + '</span>' +
          '<span class="pts">' + t.pts + '</span></div>';
      });
      html += "</div>";
    });
    // best thirds
    html += '<div class="thirds-mini"><h3>Migliori terze</h3>';
    derived.thirdsObj.forEach(function (t, i) {
      if (i === 8) html += '<div class="tm-cut"><span>Linea di qualificazione</span></div>';
      var q = i < 8;
      html += '<div class="tm-row ' + (q ? "qual" : "out") + '"><span class="rk">' + (i + 1) + '</span>' +
        '<span class="gt">3' + t.g + '</span>' +
        '<span class="nm">' + esc(teamName(t.id)) + '</span>' +
        '<span class="pt">' + t.st.pts + 'p</span>' +
        '<span class="st">' + (q ? "✓" : "✕") + '</span></div>';
    });
    html += "</div>";
    host.innerHTML = html;
  }

  /* ================= RENDER: BRACKET (shared) ================= */
  var SLOT = 96, TOPPAD = 50, CARD_W = 226, COL_W = 258;
  var roundOf = {}; WC.rounds.forEach(function (r, ri) { r.ids.forEach(function (m) { roundOf[m] = ri; }); });
  function xOf(r) { return r * COL_W; }
  var r32ids = WC.rounds[0].ids;
  function center(m, memo) {
    if (memo[m] != null) return memo[m];
    var ri = roundOf[m], v;
    if (ri === 0) v = TOPPAD + r32ids.indexOf(m) * SLOT + SLOT / 2;
    else { var d = WC.M[m]; v = (center(d.home.m, memo) + center(d.away.m, memo)) / 2; }
    memo[m] = v; return v;
  }
  function sideHTML(m, side) {
    var sp = WC.M[m][side], seed = specSeed(sp), info = specText(sp), w = state.winners[m];
    var cls = "side " + seed.cls;
    if (resolveSpec(WC.M[m].home) != null && resolveSpec(WC.M[m].away) != null) cls += " clickable";
    if (info.tbd) cls += " tbd";
    if (w === side) cls += " win"; else if (w) cls += " lose";
    return '<div class="' + cls + '" data-m="' + m + '" data-side="' + side + '"><span class="seed">' + esc(seed.txt) +
      '</span><span class="tm">' + esc(info.name) + '</span><span class="chk">✓</span></div>';
  }
  function matchHTML(m, extra) {
    var d = WC.M[m], cand = d.away.t === "third" ? ("3ª " + d.away.lbl) : "";
    var cls = "match" + (extra ? " " + extra : ""); if (m === 104 && winnerId(104) != null) cls += " champ-final";
    return '<div class="' + cls + '" data-m="' + m + '"><div class="mhdr"><span class="mno">M' + m + "</span>" +
      (cand ? '<span class="mcand">' + esc(cand) + "</span>" : "") + "</div>" + sideHTML(m, "home") + sideHTML(m, "away") + "</div>";
  }
  function renderBracket() {
    var stage = $("#bracket-stage"), memo = {}, headHTML = "";
    WC.rounds.forEach(function (r, ri) {
      headHTML += '<div class="rhead" style="position:absolute;left:' + (xOf(ri) + 2) + 'px;top:8px;">' + r.name +
        "<small>" + (ri === 4 ? "MetLife Stadium" : r.ids.length + " partite") + "</small></div>";
    });
    headHTML += '<div class="rhead" style="position:absolute;left:' + (xOf(4) + CARD_W + 60) + 'px;top:8px;">Campione<small>19 luglio 2026</small></div>';
    var cardsHTML = "";
    WC.rounds.forEach(function (r) { r.ids.forEach(function (m) { cardsHTML += matchHTML(m); }); });
    cardsHTML += matchHTML(WC.thirdMatch, "third-place");
    var champId = winnerId(104), champName = champId != null ? teamName(champId) : null;
    cardsHTML += '<div class="champ-card" id="champ-card"><div class="trophy">★</div><div class="cl">Campione del Mondo</div>' +
      '<div class="cn ' + (champName ? "" : "empty") + '">' + (champName ? esc(champName) : "Da definire") + "</div></div>";
    stage.innerHTML = '<svg id="bracket-svg"></svg>' + headHTML + cardsHTML;
    var geo = {};
    WC.rounds.forEach(function (r, ri) {
      r.ids.forEach(function (m) {
        var el = stage.querySelector('.match[data-m="' + m + '"]');
        el.style.left = xOf(ri) + "px"; el.style.width = CARD_W + "px";
        var h = el.offsetHeight, cy = center(m, memo); el.style.top = (cy - h / 2) + "px";
        geo[m] = { x: xOf(ri), top: cy - h / 2, h: h, cy: cy, right: xOf(ri) + CARD_W };
      });
    });
    var fin = geo[104], tp = stage.querySelector('.match[data-m="' + WC.thirdMatch + '"]');
    tp.style.left = xOf(4) + "px"; tp.style.width = CARD_W + "px";
    var th = tp.offsetHeight, ttop = fin.top + fin.h + 46; tp.style.top = ttop + "px";
    geo[103] = { x: xOf(4), top: ttop, h: th, cy: ttop + th / 2, right: xOf(4) + CARD_W };
    var cc = $("#champ-card"), ch = cc.offsetHeight, cx = xOf(4) + CARD_W + 60;
    cc.style.left = cx + "px"; cc.style.width = "190px"; cc.style.top = (fin.cy - ch / 2) + "px";
    var paths = "";
    function elbow(c, p) { var mx = (c.right + p.x) / 2; return "M" + c.right + " " + c.cy + " H" + mx + " V" + p.cy + " H" + p.x; }
    WC.rounds.forEach(function (r) { r.ids.forEach(function (m) { var d = WC.M[m]; if (d.home.t === "win") paths += '<path d="' + elbow(geo[d.home.m], geo[m]) + '"/>'; if (d.away.t === "win") paths += '<path d="' + elbow(geo[d.away.m], geo[m]) + '"/>'; }); });
    paths += '<path d="M' + geo[104].right + " " + geo[104].cy + " H" + cx + '"/>';
    [101, 102].forEach(function (sm) { paths += '<path stroke-dasharray="3 5" opacity="0.5" d="' + elbow(geo[sm], geo[103]) + '"/>'; });
    var svg = $("#bracket-svg"); svg.setAttribute("width", xOf(4) + CARD_W + 260); svg.setAttribute("height", TOPPAD + 16 * SLOT + 60); svg.innerHTML = paths;
    stage.style.width = (xOf(4) + CARD_W + 260) + "px"; stage.style.height = Math.max(TOPPAD + 16 * SLOT + 30, ttop + th + 40) + "px";
  }
  $("#bracket-stage").addEventListener("click", function (e) {
    var side = e.target.closest(".side.clickable"); if (!side) return;
    var m = Number(side.dataset.m), s = side.dataset.side;
    if (state.winners[m] === s) delete state.winners[m]; else state.winners[m] = s;
    cleanupWinners(); save(); renderBracket();
  });

  /* ================= TABS + ACTIONS ================= */
  function setTab(t) {
    state.tab = t; save();
    $("#tab-risultati").classList.toggle("active", t === "risultati");
    $("#tab-bracket").classList.toggle("active", t === "bracket");
    $("#panel-risultati").classList.toggle("active", t === "risultati");
    $("#panel-bracket").classList.toggle("active", t === "bracket");
    if (t === "bracket") renderBracket();
  }
  $("#tab-risultati").addEventListener("click", function () { setTab("risultati"); });
  $("#tab-bracket").addEventListener("click", function () { setTab("bracket"); });
  $("#matches-list").addEventListener("input", onScoreInput);

  $("#btn-standings").addEventListener("click", function () {
    $("#panel-risultati").classList.toggle("standings-open");
  });

  $("#btn-reset").addEventListener("click", function () {
    if (!confirm("Azzerare tutti i risultati inseriti e il tabellone?")) return;
    try { localStorage.removeItem(STORE); } catch (e) {}
    state = defaults(); recompute(); cleanupWinners();
    $("#panel-risultati").classList.remove("standings-open");
    renderMatches(); renderStandings(); renderProgress(); setTab("risultati");
  });

  /* ================= INIT ================= */
  recompute(); cleanupWinners();
  renderMatches(); renderStandings(); renderProgress(); setTab(state.tab);
})();
