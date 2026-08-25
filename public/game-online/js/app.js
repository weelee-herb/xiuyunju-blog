/* ============ 识药闯关 · 游戏逻辑 ============ */
(function () {
  "use strict";

  var HERBS = window.HERBS_DATA || [];
  var BY_ID = {};
  HERBS.forEach(function (h) { BY_ID[h.id] = h; });

  /* ---------- 本地存储 ---------- */
  var LS_HIGH = "tcm-high-score";
  var LS_WRONG = "tcm-wrongs";
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 隐私模式等，忽略 */ }
  }
  function getHigh() { return load(LS_HIGH, 0) || 0; }
  function setHigh(v) { if (v > getHigh()) save(LS_HIGH, v); }
  function getWrongs() { var w = load(LS_WRONG, []); return Array.isArray(w) ? w : []; }
  function uniqueWrongIds() {
    var seen = {};
    getWrongs().forEach(function (e) { if (e && e.id && !seen[e.id]) seen[e.id] = true; });
    return Object.keys(seen);
  }
  function addWrong(entry) {
    var w = getWrongs();
    w.push(entry);
    if (w.length > 500) w = w.slice(-500);
    save(LS_WRONG, w);
  }

  /* ---------- 图鉴增强：scene 筛选 / 拼音排序 / 收藏 / 手账 ---------- */
  var atScene = "all", atOnlyFav = false, atSortPy = false;
  function getFavs() { var v = load("tcm-favs", []); return Array.isArray(v) ? v : []; }
  function isFav(id) { return getFavs().indexOf(id) >= 0; }
  function toggleFav(id, el) {
    var f = getFavs();
    var i = f.indexOf(id);
    if (i >= 0) { f.splice(i, 1); toast("已移出收藏"); }
    else { f.push(id); toast("已加入收藏 ⭐"); }
    save("tcm-favs", f);
    if (el) { el.classList.toggle("fav-on", isFav(id)); el.textContent = isFav(id) ? "★" : "☆"; }
    renderAtlas();
  }
  var SCENE_ICONS = { "厨房里的药": "🍳", "花园里的药": "🌸", "山野本草": "⛰️", "果盘里的药": "🍇" };
  function renderSceneRow() {
    var row = $("atlas-scene-row");
    if (!row) return;
    var sc = ["all"].concat(SCENES);
    row.innerHTML = "";
    sc.forEach(function (s) {
      var c = document.createElement("span");
      c.className = "chip a-chip" + ((atScene === s) ? " on" : "");
      c.textContent = s === "all" ? "全部场景" : (SCENE_ICONS[s] + " " + s);
      c.addEventListener("click", function () {
        atScene = s;
        renderSceneRow(); renderAtlas();
      });
      row.appendChild(c);
    });
  }
  function renderSceneDoors() {
    var row = $("scene-door-row");
    if (!row) return;
    row.innerHTML = "";
    SCENES.forEach(function (s) {
      var n = HERBS.filter(function (h) { return h.scene === s; }).length;
      var d = document.createElement("div");
      d.className = "scene-door";
      d.innerHTML = '<span class="sd-ico">' + (SCENE_ICONS[s] || "🌿") + '</span><span>' + s + '<small style="color:var(--ink-soft);font-weight:400"> · ' + n + ' 味</small></span>';
      d.addEventListener("click", function () { showView("view-atlas"); atScene = s; renderSceneRow(); renderAtlas(); });
      row.appendChild(d);
    });
  }
  function getStats() { var v = load("tcm-stats", {}); return v || {}; }
  function statGame(score, correct, total) {
    var st = getStats();
    st.games = (st.games || 0) + 1;
    st.correct = (st.correct || 0) + correct;
    st.total = (st.total || 0) + total;
    st.score = (st.score || 0) + score;
    save("tcm-stats", st);
  }
  function renderJournal() {
    var st = getStats();
    var lit = getCollected().length;
    var acc = st.total ? Math.round((st.correct || 0) / st.total * 100) : 0;
    $("jv-collect").textContent = lit + " / " + HERBS.length;
    $("jv-acc").textContent = acc + "%";
    $("jv-streak").textContent = getStreak().count + " 天";
    $("jv-badges").textContent = (load("tcm-badges", []) || []).join(" · ") || "暂无";
    $("jv-games").textContent = st.games || 0;
    $("jv-best").textContent = getHigh() + " 分";
  }
  function buildJournalView() {
    var row = $("journal-stats");
    if (!row) return;
    row.innerHTML = "";
    var items = [
      ["已点亮", "jv-collect"], ["正确率", "jv-acc"], ["连续打卡", "jv-streak"],
      ["已达成成就", "jv-badges"], ["累计局数", "jv-games"], ["历史最高", "jv-best"]
    ];
    row.innerHTML = items.map(function (it) {
      return '<div class="journal-item"><div class="jv-k">' + it[0] + '</div><div class="jv-v" id="' + it[1] + '">—</div></div>';
    }).join("");
  }

  /* ---------- 四季皮肤 & 舒缓环境音（程序生成，无版权） ---------- */
  var THEMES = ["spring", "summer", "autumn", "winter"];
  var curTheme = load("tcm-theme", "summer");
  if (THEMES.indexOf(curTheme) < 0) curTheme = "summer";
  function applyTheme(t) {
    curTheme = t; save("tcm-theme", t);
    document.body.setAttribute("data-theme", t);
    document.querySelectorAll(".theme-btn").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-theme-link") === t);
    });
  }
  var Ambient = {
    on: load("tcm-ambient", 0) === 1,
    timer: null,
    playing: false,
    chords: [
      [130.81, 196.00, 261.63, 329.63],
      [196.00, 293.66, 392.00, 493.88],
      [220.00, 330.00, 440.00, 554.37],
      [174.61, 261.63, 349.23, 440.00]
    ],
    melody: [523.25, 587.33, 659.25, 783.99, 880.00, 783.99, 659.25, 587.33],
    chordIndex: 0,
    melodyIndex: 0,
    start: function () {
      var self = this;
      if (!Sfx.ctx) Sfx.ensure();
      if (!Sfx.ctx) return;
      this.playing = true;
      if (this.timer) return;
      var note = function (freq, delay, dur, gain, type) {
        if (!Sfx.ctx) return;
        var t = Sfx.ctx.currentTime + delay;
        var o = Sfx.ctx.createOscillator(), g = Sfx.ctx.createGain();
        o.type = type || "sine";
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(gain, t + Math.min(0.6, dur * 0.25));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(Sfx.ctx.destination);
        o.start(t); o.stop(t + dur + 0.12);
      };
      var play = function () {
        if (!self.on || !Sfx.ctx) return;
        var chord = self.chords[self.chordIndex % self.chords.length];
        self.chordIndex++;
        chord.forEach(function (freq) {
          note(freq, 0.05, 7.0, 0.014, "sine");
        });
        var top = self.melody[self.melodyIndex % self.melody.length];
        self.melodyIndex++;
        note(top, 0.75, 3.2, 0.016, "sine");
        note(top / 2, 0.75, 3.8, 0.009, "sine");
      };
      play();
      this.timer = setInterval(function () {
        if (!self.on) { clearInterval(self.timer); self.timer = null; return; }
        play();
      }, 6500);
    },
    stop: function () { this.playing = false; if (this.timer) { clearInterval(this.timer); this.timer = null; } },
    toggle: function () {
      this.on = !this.on; save("tcm-ambient", this.on ? 1 : 0);
      if (this.on) this.start(); else this.stop();
      setAmbientUI();
    }
  };
  function setAmbientUI() {
    var b = $("btn-ambient");
    if (b) { b.textContent = Ambient.on ? "🎵 背景音 开" : "🎵 背景音 关"; b.classList.toggle("off", !Ambient.on); }
  }

  /* ---------- 今日药签（每日一味，轮换展示冷知识） ---------- */
  var SCENE_CLS = { "厨房里的药": "sc-k", "花园里的药": "sc-g", "山野本草": "sc-w", "果盘里的药": "sc-f" };
  function todayHerb() {
    var pool = HERBS.filter(function (h) { return h.coldfact; });
    if (!pool.length) return null;
    var rng = hashRng("tcm-today-" + todayStr());
    return pool[rng() % pool.length];
  }
  function renderTodayCard() {
    var h = todayHerb();
    if (!h) return;
    $("today-img").src = h.image;
    $("today-img").alt = h.name;
    $("today-name").textContent = h.name;
    $("today-scene").textContent = h.scene || "";
    $("today-scene").className = "scene-chip sc-" + (SCENE_CLS[h.scene] && SCENE_CLS[h.scene].slice(3) || "k");
    if (h.scene && SCENE_CLS[h.scene]) { $("today-scene").className = "scene-chip " + SCENE_CLS[h.scene]; $("today-scene").textContent = h.scene; }
    else { $("today-scene").className = "scene-chip"; $("today-scene").textContent = ""; }
    $("today-fact").textContent = h.coldfact;
    $("today-date").textContent = todayStr() + " · 每日一味";
    $("today-card").dataset.id = h.id;
  }

  /* ---------- 音效（Web Audio 合成，无外部文件） ---------- */
  var Sfx = {
    ctx: null,
    on: load("tcm-sound", 1) === 1,
    ensure: function () {
      try {
        if (!this.ctx) {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (AC) this.ctx = new AC();
        }
        if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
      } catch (e) { /* 无音频环境 */ }
    },
    tone: function (freq, delay, dur, type, gain) {
      if (!this.on || !this.ctx) return;
      try {
        var t = this.ctx.currentTime + delay;
        var o = this.ctx.createOscillator();
        var g = this.ctx.createGain();
        o.type = type || "sine";
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gain || 0.09, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(t); o.stop(t + dur + 0.05);
      } catch (e) { }
    },
    correct: function () { this.ensure(); this.tone(660, 0, 0.12, "sine", 0.1); this.tone(880, 0.09, 0.18, "sine", 0.09); },
    wrong: function () { this.ensure(); this.tone(196, 0, 0.28, "sawtooth", 0.06); this.tone(147, 0.12, 0.26, "sawtooth", 0.05); },
    combo: function (n) { this.ensure(); var b = 620 + Math.min(n, 12) * 55; this.tone(b, 0, 0.1, "sine", 0.09); this.tone(b * 1.25, 0.08, 0.16, "sine", 0.08); },
    ding: function () { this.ensure(); this.tone(1046, 0, 0.22, "sine", 0.08); this.tone(1568, 0.04, 0.18, "sine", 0.04); },
    chord: function () { var self = this; this.ensure(); [523, 659, 784, 1046].forEach(function (f, i) { self.tone(f, i * 0.09, 0.5, "triangle", 0.06); }); }
  };
  function setSoundUI() {
    var b = $("btn-sound");
    if (b) {
      b.textContent = Sfx.on ? "🔊 音效 开" : "🔇 音效 关";
      b.classList.toggle("off", !Sfx.on);
    }
    document.body.classList.toggle("sound-off", !Sfx.on);
  }

  /* ---------- 图鉴收集与成就 ---------- */
  var SCENES = ["厨房里的药", "花园里的药", "山野本草", "果盘里的药"];
  function getCollected() { var v = load("tcm-collect-ids", []); return Array.isArray(v) ? v : []; }
  function isLit(id) { return getCollected().indexOf(id) >= 0; }
  function lightUp(id) {
    var c = getCollected();
    if (c.indexOf(id) >= 0) return false;
    c.push(id); save("tcm-collect-ids", c);
    var h = BY_ID[id];
    if (h) toast("已认识「" + h.name + "」🌿");
    if (h && h.scene) checkSceneBadge(h.scene);
    return true;
  }
  function sceneDone(scene) {
    var ids = HERBS.filter(function (h) { return h.scene === scene; }).map(function (h) { return h.id; });
    if (!ids.length) return false;
    var c = getCollected();
    return ids.every(function (id) { return c.indexOf(id) >= 0; });
  }
  function checkSceneBadge(scene) {
    var badges = load("tcm-badges", []);
    if (badges.indexOf(scene) < 0 && sceneDone(scene)) {
      badges.push(scene); save("tcm-badges", badges);
      toast("🏅 成就达成：" + scene + " · 集齐");
    }
  }
  function renderCollect() {
    var c = getCollected();
    $("collect-count").textContent = c.length + " / " + HERBS.length;
    $("collect-fill").style.width = Math.min(100, Math.round(c.length / HERBS.length * 100)) + "%";
    var badges = load("tcm-badges", []);
    var row = $("badge-row");
    row.innerHTML = "";
    SCENES.forEach(function (s) {
      var b = document.createElement("span");
      b.className = "badge-chip" + (badges.indexOf(s) >= 0 ? " on" : "");
      b.textContent = (badges.indexOf(s) >= 0 ? "✓ " : "") + s + " · 集齐";
      row.appendChild(b);
    });
  }

  /* ---------- 每日挑战：日期种子随机 & 连续打卡 ---------- */
  var DAY_OVERRIDE = (function () {
    try {
      var q = new URLSearchParams(location.search).get("day");
      return /^\d{4}-\d{2}-\d{2}$/.test(q || "") ? q : "";
    } catch (e) { return ""; }
  })();
  function formatYmd(d) {
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function currentDate(offset) {
    var d = DAY_OVERRIDE ? new Date(DAY_OVERRIDE + "T00:00:00") : new Date();
    if (offset) d.setDate(d.getDate() + offset);
    return formatYmd(d);
  }
  function todayStr() {
    return currentDate(0);
  }
  function yesterdayStr() {
    return currentDate(-1);
  }
  function hashRng(str) { // xmur3 哈希 → 可复现随机数
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16;
    return function () { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
  }
  function seededShuffle(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = rng() % (i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function getDaily() { return load("tcm-daily", {}); }
  function getStreak() { return load("tcm-streak", { count: 0, last: "" }); }
  function refreshStreak() {
    var s = getStreak();
    var today = todayStr();
    if (s.last === today) return s;
    s.count = (s.last === yesterdayStr()) ? s.count + 1 : 1;
    s.last = today;
    save("tcm-streak", s);
    return s;
  }

  /* ---------- 工具 ---------- */
  function $(id) { return document.getElementById(id); }

  /* ---------- 分享卡（Canvas 国风竖版） ---------- */
  function speak(text) {
    try {
      if (!("speechSynthesis" in window)) { toast("当前设备不支持朗读"); return; }
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN"; u.rate = 0.95;
      speechSynthesis.speak(u);
    } catch (e) { }
  }
  function speakDetail() {
    var h = BY_ID[($("detail-name").dataset.id || "")];
    if (h) speak(h.name + (h.coldfact ? "，" + h.coldfact : ""));
  }

  function wrapText(ctx, text, x, y, maxW, lineH, maxLines) {
    var lines = [];
    var line = "";
    for (var i = 0; i < text.length; i++) {
      var t = line + text[i];
      if (ctx.measureText(t).width > maxW && line) {
        lines.push(line); line = text[i];
        if (lines.length === maxLines - 1) { lines.push("…"); return lines; }
      } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }
  var SHARE_STYLE = "herb";
  function setShareStyle(s) {
    SHARE_STYLE = s;
    document.querySelectorAll(".share-style").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-style") === s); });
  }
  function drawShareCard(opts) {
    var W = 640, H = 1000;
    if (opts.style === "song") return drawSongCard(opts, W, H);
    if (opts.style === "journal") return drawJournalCard(opts, W, H);
    if (opts.style === "poster") return drawPosterCard(opts, W, H);
    return drawHerbCard(opts, W, H);
  }
  function drawPosterCard(opts, W, H) {
    var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d");
    ctx.fillStyle = "#122d25"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#c9a227"; ctx.lineWidth = 2; ctx.strokeRect(20, 20, W - 40, H - 40);
    ctx.fillStyle = "#c9a227"; ctx.font = "20px serif"; ctx.textAlign = "center";
    ctx.fillText("识 药 闯 关 · 今 日 药 签", W / 2, 96);
    var name = (opts.body[0] || "").replace(/^今日一味：/, "").split("（")[0];
    ctx.fillStyle = "#f6f1e5"; ctx.font = "bold 78px serif";
    ctx.fillText(name || "一味药", W / 2, H * 0.32);
    ctx.fillStyle = "#c9a227"; ctx.font = "16px serif";
    var sub = (opts.body[1] || "").slice(0, 44);
    if (sub) ctx.fillText(sub.slice(0, 22), W / 2, H * 0.42);
    if (opts.streak > 0) { ctx.fillStyle = "#f6f1e5"; ctx.font = "18px serif"; ctx.fillText("连续认识第 " + opts.streak + " 天", W / 2, H * 0.72); }
    ctx.fillStyle = "#8fa3a0"; ctx.font = "16px serif";
    ctx.fillText("· 认识中药，从一株草木开始 ·", W / 2, H - 130);
    ctx.fillStyle = "#7c8c86"; ctx.font = "14px sans-serif";
    ctx.fillText("路边草 ≠ 中药", W / 2, H - 100);
    drawQrPlaceholder(ctx, W, H);
    ctx.textAlign = "left";
    return cv.toDataURL("image/png");
  }
  function sharePairCompare() {
    if (!Q || !Q.curPair) { toast("本局没有药对"); return; }
    var idx = (window.HERB_PAIRS || []).indexOf(Q.curPair);
    if (idx < 0) { toast("对比图未找到"); return; }
    var dataUrl = drawShareCard({ style: "herb", head: "易混药对·一眼区别", body: [Q.curPair.tip], extra: "看图找不同：" + BY_ID[Q.curPair.a].name + " / " + BY_ID[Q.curPair.b].name, streak: getStreak().count });
    showShare(dataUrl);
  }
  function drawHerbCard(opts, W, H) {
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d");
    // 米白底 + 细腻纹理
    ctx.fillStyle = "#f6f1e5"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(201,162,39,0.06)";
    for (var i = 0; i < 24; i++) ctx.fillRect((i * 137) % W, (i * 83) % H, 3, 3);
    ctx.strokeStyle = "#c9a227"; ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.strokeStyle = "rgba(201,162,39,0.4)"; ctx.lineWidth = 1;
    ctx.strokeRect(24, 24, W - 48, H - 48);
    // 印章
    ctx.fillStyle = "#a03434";
    ctx.fillRect(46, 60, 64, 64);
    ctx.strokeStyle = "rgba(248,241,227,.6)"; ctx.lineWidth = 2;
    ctx.strokeRect(52, 66, 52, 52);
    ctx.fillStyle = "#f8f1e3"; ctx.font = "bold 34px serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("药", 78, 94);
    // 标题
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#1e4234"; ctx.font = "bold 46px serif";
    ctx.fillText("识药闯关", 132, 92);
    // 连续认识天数
    var streakDays = opts.streak || 0;
    if (streakDays > 0) {
      ctx.fillStyle = "#8d7b45"; ctx.font = "16px sans-serif"; ctx.textAlign = "right";
      ctx.fillText("连续认识第 " + streakDays + " 天", W - 46, 128);
      ctx.textAlign = "left";
    }
    ctx.fillStyle = "#5c6b62"; ctx.font = "20px sans-serif";
    ctx.fillText("认识中药，从一株草木开始", 132, 128);
    ctx.strokeStyle = "#c9a227"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(46, 158); ctx.lineTo(W - 46, 158); ctx.stroke();
    var y = 208;
    // 标题行
    ctx.fillStyle = "#2f5d4c"; ctx.font = "bold 30px serif";
    ctx.fillText(opts.head, 46, y); y += 44;
    // 主内容（药名+冷知识 / 成绩）
    ctx.fillStyle = "#2c3a33"; ctx.font = "22px sans-serif";
    for (var seg of opts.body) {
      var lines = wrapText(ctx, seg, 46, y, W - 92, 32, 8);
      for (var ln of lines) { ctx.fillText(ln, 46, y); y += 32; }
      y += 6;
    }
    y += 12;
    // 分隔
    ctx.strokeStyle = "rgba(47,93,76,.25)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(46, y); ctx.lineTo(W - 46, y); ctx.stroke();
    y += 30;
    if (opts.extra) {
      ctx.fillStyle = "#8d7b45"; ctx.font = "19px sans-serif";
      var el = wrapText(ctx, opts.extra, 46, y, W - 92, 28, 6);
      for (var el2 of el) { ctx.fillText(el2, 46, y); y += 28; }
    }
    // 落款
    ctx.fillStyle = "#c9a227"; ctx.font = "20px serif";
    ctx.textAlign = "center";
    ctx.fillText("· 认识中药，从一株草木开始 ·", W / 2, H - 84);
    ctx.fillStyle = "#a99f88"; ctx.font = "16px sans-serif";
    ctx.fillText("路边草 ≠ 中药，认药须遵权威资料", W / 2, H - 52);
    drawQrPlaceholder(ctx, W, H);
    ctx.textAlign = "left";
    return cv.toDataURL("image/png");
  }
  function drawQrPlaceholder(ctx, W, H) {
    if (!window.QR_LINK) return;
    var s = 64, x = W - 46 - s, y = H - 46 - s;
    ctx.fillStyle = "#f6f1e5"; ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = "#b9b0a0"; ctx.lineWidth = 2; ctx.strokeRect(x, y, s, s);
    ctx.fillStyle = "#8a8070"; ctx.font = "11px sans-serif";
    ctx.textAlign = "center"; ctx.fillText("二维码", x + s / 2, y + s / 2 + 4); ctx.textAlign = "left";
  }
  function drawSongCard(opts, W, H) {
    var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d");
    ctx.fillStyle = "#f3ecd9"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(106,82,14,.05)";
    for (var i = 0; i < 30; i++) ctx.fillRect((i * 97) % W, (i * 61) % H, 2, 2);
    ctx.strokeStyle = "#6a520e"; ctx.lineWidth = 3;
    ctx.strokeRect(26, 26, W - 52, H - 52);
    ctx.strokeStyle = "rgba(106,82,14,.4)"; ctx.lineWidth = 1;
    ctx.strokeRect(34, 34, W - 68, H - 68);
    ctx.fillStyle = "#8a6d17"; ctx.font = "bold 20px serif";
    ctx.textAlign = "center";
    var chars = "识药闯关".split("");
    for (var c = 0; c < chars.length; c++) { ctx.fillText(chars[c], 90 + c * 30, 80); }
    ctx.fillStyle = "#6b520e"; ctx.font = "16px serif";
    ctx.fillText("认 识 中 药 之 路", W / 2, 150);
    var y = 260;
    ctx.fillStyle = "#4a3a20"; ctx.font = "20px serif";
    ctx.textAlign = "left";
    ctx.fillText(opts.head, 70, y); y += 70;
    ctx.font = "19px serif";
    for (var seg of opts.body) {
      var lines = wrapText(ctx, seg, 70, y, W - 140, 30, 9);
      for (var ln of lines) { ctx.fillText(ln, 70, y); y += 30; }
      y += 8;
    }
    if (opts.streak > 0) { ctx.fillText("连续认识第 " + opts.streak + " 天", 70, y); y += 40; }
    if (opts.extra) { ctx.fillStyle = "#7a6a4c"; ctx.font = "17px serif"; var el = wrapText(ctx, opts.extra, 70, y, W - 140, 27, 5); for (var e2 of el) { ctx.fillText(e2, 70, y); y += 27; } }
    ctx.textAlign = "center"; ctx.fillStyle = "#8a6d17"; ctx.font = "18px serif";
    ctx.fillText("认识中药，从一株草木开始", W / 2, H - 108);
    ctx.fillStyle = "#7a6a4c"; ctx.font = "15px serif";
    ctx.fillText("路边草 ≠ 中药 · 识药须遵真知", W / 2, H - 76);
    drawQrPlaceholder(ctx, W, H);
    ctx.textAlign = "left";
    return cv.toDataURL("image/png");
  }
  function drawJournalCard(opts, W, H) {
    var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d");
    ctx.fillStyle = "#fbf7ee"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(58,90,74,.06)";
    for (var i = 0; i < 60; i++) ctx.fillRect((i * 53) % W, (i * 71) % H, 2, 2);
    // 胶带
    ctx.fillStyle = "#e7d9a8"; ctx.fillRect(60, 60, 210, 40);
    ctx.fillStyle = "#5d7a63"; ctx.font = "bold 24px serif"; ctx.textAlign = "center";
    ctx.fillText("识药闯关", 165, 89);
    ctx.fillStyle = "#3d74a5"; ctx.font = "15px sans-serif";
    ctx.fillText("每日药签手账", W / 2, 150);
    var y = 240;
    ctx.fillStyle = "#2c3a33"; ctx.font = "22px serif"; ctx.textAlign = "left";
    ctx.fillText("🍀 " + opts.head, 70, y); y += 40;
    ctx.font = "19px serif";
    for (var seg of opts.body) {
      var lines = wrapText(ctx, seg, 70, y, W - 140, 30, 9);
      for (var ln of lines) { ctx.fillText(ln, 70, y); y += 30; }
      y += 8;
    }
    ctx.fillStyle = "#b04040"; ctx.font = "18px serif";
    if (opts.streak > 0) { ctx.fillText("📅 连续认识第 " + opts.streak + " 天", 70, y); y += 40; }
    if (opts.extra) { ctx.fillStyle = "#5c6b62"; ctx.font = "17px sans-serif"; var el = wrapText(ctx, opts.extra, 70, y, W - 140, 27, 5); for (var e2 of el) { ctx.fillText(e2, 70, y); y += 27; } }
    ctx.fillStyle = "#5d7a63"; ctx.font = "17px serif"; ctx.textAlign = "center";
    ctx.fillText("· 认识中药，从一株草木开始 ·", W / 2, H - 108);
    ctx.fillStyle = "#a99f88"; ctx.font = "15px sans-serif";
    ctx.fillText("路边草 ≠ 中药 ✎ 认真看、慢慢记", W / 2, H - 76);
    drawQrPlaceholder(ctx, W, H);
    ctx.textAlign = "left";
    return cv.toDataURL("image/png");
  }
  function showShare(dataUrl) {
    $("share-img").src = dataUrl;
    $("share-modal").classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  }
  function shareForResult() {
    var s = getHigh(), acc = 0;
    var body = [];
    var today = todayHerb();
    if (today) {
      body.push("今日一味：「" + today.name + "」" + (today.scene ? "（" + today.scene + "）" : ""));
      body.push(today.coldfact || "");
    }
    body.push("上一局 · 答对 " + (Q ? Q.correct + " / " + Q.pool.length : "见界面") + " · 得分 " + ($("result-score").textContent || ""));
    var dataUrl = drawShareCard({ style: SHARE_STYLE, head: "闯关·一局", body: body, extra: "最高分 " + s + " 分", streak: getStreak().count });
    showShare(dataUrl);
  }
  function shareForToday() {
    var today = todayHerb();
    if (!today) { toast("今日药签未就绪"); return; }
    var dl = getDaily(), st = getStreak();
    var done = dl.date === todayStr() && !!dl.done;
    var body = ["今日一味：「" + today.name + "」" + (today.scene ? "（" + today.scene + "）" : ""), today.coldfact || ""];
    var dataUrl = drawShareCard({
      style: SHARE_STYLE, head: "今日药签",
      body: body,
      extra: done ? "今日已签完 ✓" : "今日还未签",
      streak: st.count
    });
    showShare(dataUrl);
  }

  function copyTodayLink() {
    var url = location.origin + location.pathname + "?day=" + todayStr();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { toast("已复制今日药签链接"); }).catch(function () {});
      return;
    }
    var ta = document.createElement("textarea");
    ta.value = url;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); toast("已复制今日药签链接"); } catch (e) {}
    ta.remove();
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  var shown = null;
  function showView(id) {
    ["view-home", "view-quiz", "view-result", "view-atlas"].forEach(function (v) {
      $(v).classList.add("is-hidden");
    });
    $(id).classList.remove("is-hidden");
    window.scrollTo(0, 0);
  }
  function toast(msg, ms) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.remove("is-hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.add("is-hidden"); }, ms || 2200);
  }

  /* ---------- 首页 ---------- */
  function renderHome() {
    $("stat-high").textContent = getHigh();
    var wC = uniqueWrongIds().length;
    $("stat-wrong").textContent = wC;
    $("stat-count").textContent = HERBS.length;
    var badge = $("wrong-badge");
    badge.hidden = wC === 0;
    badge.textContent = wC;
    // 每日挑战状态
    var dl = getDaily();
    var today2 = todayStr();
    var st = getStreak();
    var doneToday = dl.date === today2 && !!dl.done;
    renderTodayCard();
    renderSceneDoors();
  }

  /* ---------- 闯关 ---------- */
  var Q = null; // { mode, cat, pool, idx, score, correct, wrongs, locked, combo, daily }
  var KEYS = ["A", "B", "C", "D"];
  var GUESS_ZOOM = 0; // 0=局部最大 1=半图 2=全图(提示完)

  function startQuiz(mode, cat) {
    var ids;
    var today = todayStr();
    if (mode === "daily") {
      // 每日固定一组题：以日期为种子
      ids = seededShuffle(HERBS.map(function (h) { return h.id; }), hashRng("tcm-daily-" + today)).slice(0, 10);
      if (getDaily().date === today && getDaily().done) toast("今日已完成，再挑战一次不记成绩哦");
    } else if (mode === "wrong") {
      ids = uniqueWrongIds();
      if (!ids.length) { toast("还没有错题，先去闯关吧！"); return; }
      ids = shuffle(ids).slice(0, 10);
    } else if (mode === "pair") {
      var prs = (window.HERB_PAIRS || []).slice();
      var out2 = [];
      shuffle(prs).slice(0, 5).forEach(function (p) { out2.push(p.a, p.b); });
      ids = out2;
    } else {
      var src = cat ? HERBS.filter(function (h) { return h.category === cat; }) : HERBS;
      // 智能出题：错过的药/未点亮的药权重更高（详见 REPORT）
      var pool = [];
      src.forEach(function (h) {
        var w = 1;
        if (!isLit(h.id)) w += 3;
        if (getWrongs().some(function (e2) { return e2 && e2.id === h.id; })) w += 2;
        for (var k = 0; k < w; k++) pool.push(h.id);
      });
      ids = shuffle(pool).slice(0, 10);
    }
    Q = { mode: mode, cat: cat || null, pool: ids, idx: 0, score: 0, correct: 0, wrongs: [], locked: false, combo: 0, daily: mode === "daily" };
    $("quiz-mode-label").textContent =
      mode === "wrong" ? "再战错题" : mode === "daily" ? "今日药签 · " + today : mode === "guess" ? "猜猜看 · 局部特写" : mode === "warm" ? "温故一下" : (cat ? cat + "门类" : "闯关模式");
    $("combo-chip").classList.add("is-hidden");
    $("guess-wrap").classList.toggle("is-hidden", mode !== "guess");
    buildProgress(ids.length);
    showView("view-quiz");
    loadQuestion();
  }

  function buildProgress(n) {
    var box = $("quiz-progress");
    box.innerHTML = "";
    for (var i = 0; i < n; i++) {
      var c = document.createElement("div");
      c.className = "progress-cell";
      box.appendChild(c);
    }
  }

  function setProgressLabel() {
    $("ques-count").textContent = "第 " + (Q.idx + 1) + " / " + Q.pool.length + " 题";
    var cells = $("quiz-progress").children;
    for (var i = 0; i < cells.length; i++) {
      cells[i].className = "progress-cell" +
        (i < Q.idx ? " done" : "") + (i === Q.idx ? " cur" : "");
    }
  }

  function sameCategoryOthers(herb, n, rng) {
    var same = HERBS.filter(function (h) { return h.id !== herb.id && h.category === herb.category; });
    return (rng ? seededShuffle(same, rng) : shuffle(same)).slice(0, n);
  }

  function loadQuestion() {
    var herb = BY_ID[Q.pool[Q.idx]];
    Q.cur = herb;
    // 图片（加载占位 → 淡入）
    var img = $("ques-img");
    img.classList.remove("img-error", "loaded");
    document.querySelector(".ques-img-wrap").classList.add("img-loading");
    img.onload = function () { img.classList.add("loaded"); document.querySelector(".ques-img-wrap").classList.remove("img-loading"); };
    img.src = herb.image;
    img.alt = "药材图片（猜猜看）";
    // 猜猜看：局部特写档位
    GUESS_ZOOM = 0;
    if (Q.mode === "guess") { img.classList.add("guess-view", "zoom3"); }
    else { img.classList.remove("guess-view", "zoom3", "zoom2"); }
    // 选项：同类干扰（每日模式使用日期种子，保证可复现）；挑战模式=对子双方
    var daySeed = Q.daily ? todayStr() + "-" + herb.id : null;
    var options;
    if (Q.mode === "pair") {
      var pf = (window.HERB_PAIRS || []).filter(function (p) { return p.a === herb.id || p.b === herb.id; })[0];
      var other = pf ? BY_ID[pf.a === herb.id ? pf.b : pf.a] : null;
      Q.curPair = pf;
      options = other ? shuffle([herb, other]) : [herb];
    } else {
      var distractors = sameCategoryOthers(herb, 3, daySeed ? hashRng("dist-" + daySeed) : null);
      options = daySeed ? seededShuffle([herb].concat(distractors), hashRng("opt-" + daySeed)) : shuffle([herb].concat(distractors));
    }
    var opts = $("opts");
    opts.innerHTML = "";
    options.forEach(function (o, i) {
      var btn = document.createElement("button");
      btn.className = "opt";
      btn.setAttribute("data-id", o.id);
      btn.innerHTML = '<span class="opt-key">' + KEYS[i] + '</span><span>' + o.name + '</span>';
      btn.addEventListener("click", function () { answer(o.id, btn); });
      opts.appendChild(btn);
    });
    // 分类标签
    $("ques-cat").textContent = herb.category;
    // 重置反馈
    var fb = $("feedback");
    fb.hidden = true;
    fb.className = "feedback";
    $("know-card").classList.add("is-hidden");
    $("btn-next").disabled = false;
    setProgressLabel();
    $("quiz-score").textContent = Q.score + " 分";
    // 动画重放
    var stage = document.querySelector(".ques-stage");
    stage.style.animation = "none";
    void stage.offsetWidth;
    stage.style.animation = "";
  }

  function answer(selId, btn) {
    if (Q.locked) return;
    Q.locked = true;
    var herb = Q.cur;
    var correct = selId === herb.id;
    var allBtns = document.querySelectorAll(".opt");
    allBtns.forEach(function (b) { b.disabled = true; });
    allBtns.forEach(function (b) {
      if (b.getAttribute("data-id") === herb.id) b.classList.add("right");
    });
    var fb = $("feedback");
    if (correct) {
      Q.combo++;
      var pts = Q.combo >= 3 ? 15 : 10;
      Q.score += pts;
      Q.correct++;
      fb.className = "feedback ok";
      fb.hidden = false;
      fb.textContent = Q.combo >= 3 ? "回答正确！连击 ×" + Q.combo + "，+15" : "回答正确！+10";
      bumpScore(true, pts);
      updateComboChip();
      lightUp(herb.id);
      if (Q.combo >= 3) Sfx.combo(Q.combo); else Sfx.correct();
    } else {
      Q.combo = 0;
      updateComboChip();
      btn.classList.add("wrong");
      Sfx.wrong();
      Q.wrongs.push({ id: herb.id, picked: BY_ID[selId].name });
      addWrong({ id: herb.id, picked: BY_ID[selId].name, ts: Date.now() });
      fb.className = "feedback no";
      fb.hidden = false;
      fb.textContent = "回答错误，正确答案是「" + herb.name + "」——猜错没关系，下次就认识了";
    }
    // 知识点卡片
    showKnowCard(herb);
  }

  function bumpScore(add, pts) {
    var el = $("quiz-score");
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
    if (add) {
      var span = document.createElement("span");
      span.className = "float-plus" + (pts >= 15 ? " bonus" : "");
      span.textContent = "+" + (pts || add);
      el.appendChild(span);
      setTimeout(function () { span.remove(); }, 1100);
    }
    el.textContent = Q.score + " 分";
  }

  function updateComboChip() {
    var chip = $("combo-chip");
    if (Q.combo >= 2) {
      chip.classList.remove("is-hidden");
      chip.textContent = "🔥 连击 ×" + Q.combo + (Q.combo >= 3 ? " · +15/题" : " · +10/题");
      chip.classList.remove("grow"); void chip.offsetWidth; chip.classList.add("grow");
    } else {
      chip.classList.add("is-hidden");
    }
  }

  function showKnowCard(herb) {
    Sfx.ding();
    $("know-name").textContent = herb.name;
    $("know-cat").textContent = herb.category;
    $("know-gx").textContent = herb.gongxiao;
    $("know-xw").textContent = herb.xingwei;
    $("know-tip").textContent = herb.tips;
    var pw = $("know-pair-wrap");
    if (Q.curPair) {
      pw.hidden = false;
      $("know-pair").textContent = Q.curPair.tip;
      if ($("btn-share-pair")) $("btn-share-pair").hidden = false;
      var pimg = $("know-pair-img");
      var idx = (window.HERB_PAIRS || []).indexOf(Q.curPair);
      if (pimg && idx >= 0) { pimg.hidden = false; pimg.src = "compare-cards/cc" + ("0" + idx).slice(-2) + ".png"; }
    } else { pw.hidden = true; if ($("btn-share-pair")) $("btn-share-pair").hidden = true; }
    var cw = $("know-cold-wrap");
    if (herb.coldfact) { cw.style.display = ""; $("know-cold").textContent = herb.coldfact; }
    else cw.style.display = "none";
    var ow = $("know-other-wrap");
    if (Q.curPair) {
      var oid = Q.curPair.a === herb.id ? Q.curPair.b : Q.curPair.a;
      var oh = BY_ID[oid];
      ow.hidden = false;
      $("know-other").textContent = (oh ? oh.name + "：" + (oh.coldfact || "也有自己的小故事。") : "");
    } else ow.hidden = true;
    var card = $("know-card");
    card.classList.remove("is-hidden");
    setTimeout(function () { card.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, 120);
  }

  function next() {
    if (!Q) return;
    Q.locked = false;
    Q.idx++;
    if (Q.idx >= Q.pool.length) { finishRound(); return; }
    loadQuestion();
  }

  function finishRound() {
    Sfx.chord();
    statGame(Q.score, Q.correct, Q.pool.length);
    var n = Q.pool.length;
    var acc = n ? Math.round(Q.correct / n * 100) : 0;
    setHigh(Q.score);
    $("result-meta").textContent = "答对 " + Q.correct + " / " + n + " · 正确率 " + acc + "%";
    animateResult(Q.score, acc);
    var rank, title;
    if (acc === 100) { rank = "完美！满分开局"; title = "本局完成"; }
    else if (acc >= 80) { rank = "优秀！再接再厉"; title = "本局完成"; }
    else if (acc >= 60) { rank = "不错，离高分不远了"; title = "本局完成"; }
    else { rank = "翻翻图鉴，下次就认识了！"; title = "本局完成"; }
    $("result-rank").textContent = rank;
    $("result-title").textContent = Q.daily ? "今日药签签完" : title;
    if (Q.daily) {
      var rec = getDaily();
      if (rec.date !== todayStr() || !rec.done) {
        save("tcm-daily", { date: todayStr(), done: true, score: Q.score, correct: Q.correct, total: n });
        var st = refreshStreak();
        $("result-meta").textContent += " · 连续打卡 " + st.count + " 天";
      } else {
        $("result-meta").textContent += " · 今日已打卡";
      }
    }
    // 错题回顾
    var wrap = $("result-wrong-wrap");
    var list = $("result-wrong");
    var ok = $("result-ok");
    list.innerHTML = "";
    if (Q.wrongs.length) {
      wrap.classList.remove("is-hidden");
      ok.classList.add("is-hidden");
      Q.wrongs.forEach(function (w) {
        var h = BY_ID[w.id];
        var item = document.createElement("div");
        item.className = "wrong-item";
        item.innerHTML =
          '<img src="' + h.image + '" alt="" onload="this.classList.add(\'loaded\')">' +
          '<div><div class="w-name">' + h.name + '</div>' +
          '<div class="w-pick">你选了：' + w.picked + '</div>' +
          '<div class="w-right">正确：' + h.name + ' · ' + h.gongxiao + '</div></div>';
        list.appendChild(item);
      });
    } else {
      wrap.classList.add("is-hidden");
      ok.classList.remove("is-hidden");
    }
    Q = null;
    showView("view-result");
  }

  // 结算页：得分滚动 + 正确率圆环
  function animateResult(score, acc) {
    var ring = $("ring-fg");
    var C = 327;
    var offset = C * (1 - acc / 100);
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      ring.style.strokeDashoffset = offset;
      $("result-score").textContent = score;
      return;
    }
    ring.style.strokeDashoffset = C;
    var t0 = null, dur = 900;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      $("result-score").textContent = Math.round(score * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { ring.style.strokeDashoffset = offset; });
    });
  }

  /* ---------- 分类选择（闯关模式入口） ---------- */
  var selectCat = null;
  function listCats() {
    var seen = [];
    HERBS.forEach(function (h) { if (seen.indexOf(h.category) === -1) seen.push(h.category); });
    return seen;
  }
  function openSelect() {
    var box = $("select-chips");
    box.innerHTML = "";
    var cats = ["all"].concat(listCats());
    cats.forEach(function (c) {
      var n = c === "all" ? HERBS.length : HERBS.filter(function (h) { return h.category === c; }).length;
      var b = document.createElement("button");
      b.className = "select-chip" + ((selectCat == null && c === "all") || selectCat === c ? " on" : "");
      b.innerHTML = (c === "all" ? "全部" : c) + " <small>(" + n + ")</small>";
      b.addEventListener("click", function () {
        selectCat = c === "all" ? null : c;
        [].slice.call(box.children).forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        $("select-title").textContent = c === "all" ? "选择刷题分类（全部随机）" : "选择刷题分类（" + c + "）";
      });
      box.appendChild(b);
    });
    $("select-modal").classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  }

  /* ---------- 图鉴 ---------- */
  var atlasFilter = "all";
  var atlasQ = "";
  function renderAtlas() {
    renderCollect();
    renderSceneRow();
    var cats = ["all"].concat(HERBS.map(function (h) { return h.category; }).filter(function (c, i, a) { return a.indexOf(c) === i; }));
    var filter = $("atlas-filter");
    filter.innerHTML = "";
    cats.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "filter-chip" + (c === atlasFilter ? " on" : "");
      b.textContent = c === "all" ? "全部 (" + HERBS.length + ")" : c;
      b.addEventListener("click", function () { atlasFilter = c; renderAtlas(); });
      filter.appendChild(b);
    });
    var grid = $("atlas-grid");
    grid.innerHTML = "";
    var list = HERBS.filter(function (h) {
      if (atlasFilter !== "all" && h.category !== atlasFilter) return false;
      if (atScene !== "all" && h.scene !== atScene) return false;
      if (atOnlyFav && !isFav(h.id)) return false;
      if (atlasQ && h.name.indexOf(atlasQ) === -1 && h.pinyin.indexOf(atlasQ.toLowerCase()) === -1) return false;
      return true;
    });
    if (atSortPy) list = list.slice().sort(function (a, b) { return (a.pinyin || "").localeCompare(b.pinyin || ""); });
    $("atlas-count").textContent = list.length + " 味";
    if (!list.length) {
      var empty = document.createElement("p");
      empty.className = "atlas-empty";
      empty.textContent = "没有找到匹配的药材，换个关键词试试？";
      grid.appendChild(empty);
      return;
    }
    list.forEach(function (h) {
      var card = document.createElement("button");
      card.className = "atlas-card";
      var sceneHtml = h.scene ? '<span class="scene-chip ' + (SCENE_CLS[h.scene] || "") + ' a-scene">' + h.scene + '</span>' : '';
      var favMark = '<span class="fav-star ' + (isFav(h.id) ? 'fav-on' : '') + '" data-fav="' + h.id + '">' + (isFav(h.id) ? "★" : "☆") + '</span>';
      var litMark = isLit(h.id) ? '<span class="lit-mark">✓ 已认识</span>' : '';
      card.classList.toggle("lit", isLit(h.id));
      card.innerHTML =
        favMark + litMark +
        '<img src="' + h.image + '" alt="' + h.name + '" loading="lazy" onload="this.classList.add(\'loaded\')" onerror="this.classList.add(\'img-error\')">' +
        '<div class="a-body"><span class="a-name">' + h.name + '</span>' +
        '<span class="chip a-cat">' + h.category + '</span>' + sceneHtml + '</div>';
      card.addEventListener("click", function () { openDetail(h); });
      grid.appendChild(card);
    });
  }

  function openDetail(h) {
    $("detail-img").classList.remove("loaded", "img-error");
    $("detail-img").onload = function () { $("detail-img").classList.add("loaded"); };
    $("detail-img").onerror = function () { $("detail-img").classList.add("img-error"); };
    $("detail-img").src = h.image;
    $("detail-img").alt = h.name;
    $("detail-name").textContent = h.name;
    $("detail-pinyin").textContent = h.pinyin;
    $("detail-cat").textContent = h.category;
    $("detail-gx").textContent = h.gongxiao;
    $("detail-xw").textContent = h.xingwei;
    $("detail-name").dataset.id = h.id;
    $("detail-tip").textContent = h.tips;
    var cw2 = $("detail-cold-wrap");
    if (h.coldfact) { cw2.style.display = ""; $("detail-cold").textContent = h.coldfact; }
    else cw2.style.display = "none";
    $("detail-source").textContent = "图片来源：" + h.imageSource;
    var link = $("detail-link");
    var m = h.imageSource.match(/https?\S+/);
    if (m) { link.href = m[0]; link.style.display = ""; } else { link.style.display = "none"; }
    $("detail-modal").classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  }
  function closeModal(id) {
    $(id).classList.add("is-hidden");
    document.body.style.overflow = "";
  }

  /* ---------- 事件绑定 ---------- */
  function bind() {
    $("btn-start").addEventListener("click", function () { openSelect(); });
    $("btn-today-go").addEventListener("click", function () {
      var h = BY_ID[$("today-card").dataset.id];
      if (h) openDetail(h);
    });
    $("btn-today-quiz").addEventListener("click", function () { startQuiz("daily"); });
    $("today-speak").addEventListener("click", function () {
      var h = todayHerb();
      if (h) speak(h.name + (h.coldfact ? "，" + h.coldfact : ""));
    });
    $("detail-speak").addEventListener("click", speakDetail);
    $("know-speak").addEventListener("click", function () {
      if (Q && Q.cur) speak(Q.cur.name + (Q.cur.coldfact ? "，" + Q.cur.coldfact : ""));
    });
    $("btn-close-select").addEventListener("click", function () { closeModal("select-modal"); });
    $("select-mask").addEventListener("click", function () { closeModal("select-modal"); });
    $("btn-go-select").addEventListener("click", function () {
      closeModal("select-modal");
      startQuiz("normal", selectCat);
    });
    $("btn-wrong").addEventListener("click", function () { startQuiz("wrong"); });
    $("btn-atlas").addEventListener("click", function () { renderAtlas(); showView("view-atlas"); });
    $("btn-back-atlas").addEventListener("click", function () { showView("view-home"); renderHome(); });
    $("btn-quit-quiz").addEventListener("click", function () { showView("view-home"); renderHome(); });
    $("btn-next").addEventListener("click", next);
    $("btn-peek").addEventListener("click", function () {
      var img2 = $("ques-img");
      GUESS_ZOOM = Math.min(GUESS_ZOOM + 1, 2);
      img2.classList.remove("zoom3", "zoom2");
      if (GUESS_ZOOM === 1) img2.classList.add("zoom2");
      if (GUESS_ZOOM === 2) img2.classList.remove("zoom2", "zoom3");
    });
    $("btn-guess").addEventListener("click", function () { startQuiz("guess"); });
    $("btn-pair").addEventListener("click", function () { startQuiz("pair"); });
    $("btn-close-know").addEventListener("click", function () { $("know-card").classList.add("is-hidden"); });
    $("btn-again").addEventListener("click", function () { startQuiz("normal"); });
    $("btn-wrong-again").addEventListener("click", function () { startQuiz("wrong"); });
    $("btn-home").addEventListener("click", function () { showView("view-home"); renderHome(); });
    $("btn-share").addEventListener("click", shareForResult);
    $("btn-share-today").addEventListener("click", shareForToday);
    var copyDayBtn = $("btn-copy-day");
    if (copyDayBtn) copyDayBtn.addEventListener("click", copyTodayLink);
    $("btn-close-share").addEventListener("click", function () { closeModal("share-modal"); });
    $("share-mask").addEventListener("click", function () { closeModal("share-modal"); });
    document.querySelectorAll(".share-style").forEach(function (b) {
      b.addEventListener("click", function () {
        setShareStyle(b.getAttribute("data-style"));
        if ($("share-modal").classList.contains("is-hidden")) return;
        if (Q) shareForResult(); else shareForToday();
      });
    });
    $("btn-close-modal").addEventListener("click", function () { closeModal("detail-modal"); });
    $("modal-mask").addEventListener("click", function () { closeModal("detail-modal"); });
    $("btn-ambient").addEventListener("click", function () { Ambient.toggle(); });
    document.querySelectorAll(".theme-btn").forEach(function (b) {
      b.addEventListener("click", function () { applyTheme(b.getAttribute("data-theme-link")); });
    });
    $("btn-sound").addEventListener("click", function () {
      Sfx.on = !Sfx.on;
      save("tcm-sound", Sfx.on ? 1 : 0);
      if (Sfx.on) Sfx.ensure();
      setSoundUI();
    });
    // 声音只在用户首次交互后启用（不自动播放）
    var firstTap = function () {
      if (Sfx.on) Sfx.ensure();
      if (Ambient.on) Ambient.start();
      document.removeEventListener("pointerdown", firstTap);
      document.removeEventListener("keydown", firstTap);
    };
    document.addEventListener("pointerdown", firstTap);
    document.addEventListener("keydown", firstTap);
    $("atlas-grid").addEventListener("click", function (ev) {
      var star = ev.target.closest ? ev.target.closest(".fav-star") : null;
      if (star) { ev.preventDefault(); ev.stopPropagation(); toggleFav(star.getAttribute("data-fav"), star); }
    });
    $("chip-only-fav").addEventListener("click", function () {
      atOnlyFav = !atOnlyFav;
      $("chip-only-fav").classList.toggle("on", atOnlyFav);
      renderAtlas();
    });
    $("chip-sort-py").addEventListener("click", function () {
      atSortPy = !atSortPy;
      $("chip-sort-py").classList.toggle("on", atSortPy);
      renderAtlas();
    });
    $("btn-journal").addEventListener("click", function () { showView("view-journal"); buildJournalView(); renderJournal(); });
    $("journal-back").addEventListener("click", function () { showView("view-home"); renderHome(); });
    $("btn-about").addEventListener("click", function () { $("about-modal").classList.remove("is-hidden"); document.body.style.overflow = "hidden"; });
    $("btn-help").addEventListener("click", function () { $("help-modal").classList.remove("is-hidden"); document.body.style.overflow = "hidden"; });
    $("btn-close-help").addEventListener("click", function () { closeModal("help-modal"); });
    $("help-mask").addEventListener("click", function () { closeModal("help-modal"); });
    $("btn-notice-ok").addEventListener("click", function () {
      save("tcm-notice-read", 1); closeModal("notice-modal");
    });
    $("btn-close-about").addEventListener("click", function () { closeModal("about-modal"); });
    $("about-mask").addEventListener("click", function () { closeModal("about-modal"); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeModal("detail-modal"); closeModal("about-modal"); closeModal("select-modal"); }
    });
    $("ques-img").addEventListener("load", function () {
      $("ques-img").classList.add("loaded");
      var w = document.querySelector(".ques-img-wrap");
      if (w) w.classList.remove("img-loading");
    });
    $("ques-img").addEventListener("error", function () {
      $("ques-img").classList.add("img-error");
      var w2 = document.querySelector(".ques-img-wrap");
      if (w2) w2.classList.remove("img-loading");
    });
    var qTimer = null;
    $("atlas-q").addEventListener("input", function () {
      atlasQ = this.value.trim();
      clearTimeout(qTimer);
      qTimer = setTimeout(renderAtlas, 120); // 轻量防抖，200 味大图鉴依然流畅
    });
  }

  /* ---------- 启动 ---------- */
  function preload() {
    HERBS.forEach(function (h) { var im = new Image(); im.src = h.image; });
  }
  bind();
  preload();
  renderHome();
  setSoundUI();
  setAmbientUI();
  applyTheme(curTheme);
  showView("view-home");
  if (load("tcm-notice-read", 0) !== 1) $("notice-modal").classList.remove("is-hidden");

  // 调试/自测钩子：支持 #quiz / #atlas / #detail 直接打开对应界面
  try {
    if (location.hash === "#quiz") startQuiz("normal");
    else if (location.hash === "#atlas") { renderAtlas(); showView("view-atlas"); }
    else if (location.hash === "#detail") openDetail(HERBS[0]);
    else if (location.hash === "#demo") {
      startQuiz("normal");
      setTimeout(function () {
        var bs = [].slice.call(document.querySelectorAll(".opt"));
        answer(bs[bs.length - 1].getAttribute("data-id"), bs[bs.length - 1]);
      }, 500);
    } else if (location.hash === "#demo-end") {
      startQuiz("normal");
      while (Q && Q.idx < Q.pool.length) {
        var bs2 = [].slice.call(document.querySelectorAll(".opt"));
        var b2 = bs2[bs2.length - 1];
        answer(b2.getAttribute("data-id"), b2);
        next();
      }
    } else if (location.hash === "#daily") {
      startQuiz("daily");
      document.title = "DAILY:" + (Q ? Q.pool.join(",") : "none");
    } else if (location.hash === "#daily-end") {
      startQuiz("daily");
      while (Q && Q.idx < Q.pool.length) {
        var dbs = [].slice.call(document.querySelectorAll(".opt"));
        var db = dbs[dbs.length - 1];
        answer(db.getAttribute("data-id"), db);
        next();
      }
      var drec = getDaily(); var dst = getStreak();
      document.title = "DAILYEND:" + (drec.date === todayStr() ? "done" : "no") + ":streak" + dst.count;
    } else if (location.hash === "#select") {
      openSelect();
    } else if (location.hash === "#combo") {
      startQuiz("normal");
      setTimeout(function () {
        for (var k = 0; k < 3 && Q; k++) {
          var qb = [].slice.call(document.querySelectorAll(".opt")).filter(function (b) {
            return b.getAttribute("data-id") === Q.cur.id;
          })[0];
          if (!qb) break;
          answer(Q.cur.id, qb);
          if (Q.idx < Q.pool.length - 1) next();
        }
        if (Q) document.title = "COMBO:" + Q.score + ":" + Q.combo;
      }, 300);
    } else if (location.hash === "#sftoggle") {
      var sb = $("btn-sound");
      if (sb) sb.click();
      document.title = "SFXTOG:" + (Sfx.on ? "on" : "off") + ":" + (load("tcm-sound", 1) === 0 ? "saved0" : "saved1");
    } else if (location.hash === "#sharetoday") {
      shareForToday();
    } else if (location.hash === "#sfxtest") {
      document.title = "SFX:" + (Sfx.on ? "on" : "off") + ":" + (window.AudioContext || window.webkitAudioContext ? "ac" : "noac") + ":" + (Sfx.ctx ? (Sfx.ctx.state || "?") : "none");
    } else if (location.hash.indexOf("#catq=") === 0) {
      startQuiz("normal", decodeURIComponent(location.hash.slice(6)));
      document.title = "CAT:" + (Q && Q.cat ? Q.cat + ":" + Q.pool.length : "none");
    } else if (location.hash === "#imgtest") {
      // 全量图片自检：结果写入 document.title，便于自动化读取
      var fails = [];
      var todo = HERBS.length;
      var doneOne = function () {
        todo--;
        if (todo <= 0) {
          document.title = fails.length ? "IMG_FAIL:" + fails.join(",") : "IMG_OK:" + HERBS.length;
        }
      };
      HERBS.forEach(function (h) {
        var im = new Image();
        im.onload = function () { if (!im.naturalWidth) fails.push(h.name); doneOne(); };
        im.onerror = function () { fails.push(h.name); doneOne(); };
        im.src = h.image;
      });
    }
  } catch (e) { /* ignore */ }
})();
