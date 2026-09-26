/* DP-900 Practice Center — interactive learning platform engine (vanilla JS).
   Static + data-driven: new topic = new data/*.json + entry in data/topics.json.
   No backend. Relative paths only (GitHub Pages safe). */
(function () {
  "use strict";

  /* ================= config & state ================= */

  var QUESTIONS_PER_SESSION = 15;
  var EXAM_SECONDS = 15 * 60;
  var TOPICS_URL = "./data/topics.json";
  var NOTES_URL = "./notes/topics.json";
  var PROGRESS_KEY = "dp900-progress-v1"; // per-topic (kept backward compatible)
  var STATS_KEY = "dp900-stats-v1";       // global dashboard/streak/achievements
  var THEME_KEY = "dp900-theme";
  var SOUND_KEY = "dp900-sound";          // "on" | "off", default off
  var RECENT_KEY = "dp900-recent-v1"; // { questionId: lastPresentedTimestamp }
  var RECENT_MAX = 150;             // sliding window keeps the pool fresh

  var app = document.getElementById("app");
  var toastRegion = document.getElementById("toast-region");

  var state = {
    view: "home",
    topics: [],
    topicCache: {},
    topicStats: {},
    session: null,
    bankTopicId: "all",
    bankDifficulty: "all",
    bankQuery: "",
    notesTopics: [],     // notes index (Concept Notes cards)
    notesCache: {},      // notesId -> doc
    randomScope: "all", // random-practice pool: "all" or a topic id
    randomScope: "all", // random-practice pool: "all" or a topic id
    topicQuery: "",
    topicFilter: "all", // all | new | practiced | mastered
    soundOn: false,
    audioCtx: null
  };

  /* ================= generic utils ================= */

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function fetchJSON(url) {
    return fetch(url, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status + " loading " + url);
      return res.json();
    });
  }

  function todayKey(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function formatTime(totalSeconds) {
    totalSeconds = Math.max(0, totalSeconds | 0);
    var m = Math.floor(totalSeconds / 60), s = totalSeconds % 60;
    return (m < 10 ? "0" + m : "" + m) + ":" + (s < 10 ? "0" + s : "" + s);
  }

  function difficultyLabel(d) {
    d = String(d || "medium").toLowerCase();
    if (d === "easy" || d === "medium" || d === "hard" || d === "scenario") return d;
    if (d.indexOf("exam") >= 0) return "scenario";
    return "medium";
  }

  /* ============ question-set registry (topics.json) ============
     Canonical schema: id, title, sourceType, sourceName, createdAt,
     questionFile, questionCount. Legacy aliases (name/file) are still
     accepted so old banks keep working. Each source gets its OWN set —
     never merged unless the user explicitly says "merge with X". */
  var NEW_BADGE_DAYS = 30;

  function topicTitle(t) { return (t && (t.title || t.name)) || "Untitled set"; }
  function topicFile(t) { return t && (t.questionFile || t.file); }
  function topicDesc(t) { return (t && t.description) || ""; }

  function topicCreatedAt(t) {
    var ms = t && t.createdAt ? Date.parse(t.createdAt) : NaN;
    return isNaN(ms) ? 0 : ms;
  }

  /** Newest sets first — new sources automatically float to the top. */
  function sortedTopics() {
    return state.topics.slice().sort(function (a, b) { return topicCreatedAt(b) - topicCreatedAt(a); });
  }

  function isNewTopic(t) {
    var ms = topicCreatedAt(t);
    return !!ms && (Date.now() - ms) < NEW_BADGE_DAYS * 24 * 3600 * 1000;
  }

  /** Live count from loaded JSON; falls back to stored questionCount. */
  function topicCount(t) {
    var s = state.topicStats[t.id];
    if (s && !s.error) return s.total;
    if (t && typeof t.questionCount === "number") return t.questionCount;
    return null;
  }

  /* ================= persistence ================= */

  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) {}
  }
  function loadStats() {
    try {
      var s = JSON.parse(localStorage.getItem(STATS_KEY)) || {};
      s.answered = s.answered || 0; s.correct = s.correct || 0;
      s.quizzes = s.quizzes || 0; s.dates = s.dates || {};
      s.achievements = s.achievements || []; s.daily = s.daily || {};
      return s;
    } catch (e) {
      return { answered: 0, correct: 0, quizzes: 0, dates: {}, achievements: [], daily: {} };
    }
  }
  function saveStats(s) {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) {}
  }

  /* ============ recently-practiced history (Random Practice only) ============
     Maps questionId -> timestamp last presented. Bounded sliding window so
     the pool always stays fresh; used ONLY to pick random sessions. */
  function loadRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveRecent(map) {
    try {
      var keys = Object.keys(map).sort(function (a, b) { return map[a] - map[b]; });
      while (keys.length > RECENT_MAX) delete map[keys.shift()];
      localStorage.setItem(RECENT_KEY, JSON.stringify(map));
    } catch (e) {}
  }
  function recordPracticed(ids) {
    if (!ids || !ids.length) return;
    var map = loadRecent(), now = Date.now();
    ids.forEach(function (id) { map[id] = now; });
    saveRecent(map);
  }

  /** Record a finished quiz: per-topic best + global dashboard counters. */
  function saveAttempt(topicId, score, total, opts) {
    opts = opts || {};
    var p = loadProgress();
    var prev = p[topicId] || { attempts: 0, bestScore: 0, bestTotal: 0 };
    prev.attempts = (prev.attempts || 0) + 1;
    var prevPct = prev.bestTotal ? prev.bestScore / prev.bestTotal : -1;
    if (total ? score / total > prevPct : false) { prev.bestScore = score; prev.bestTotal = total; }
    prev.lastScore = score; prev.lastTotal = total;
    prev.lastDate = new Date().toISOString();
    prev.lastKind = opts.kind || "practice";
    p[topicId] = prev;
    saveProgress(p);

    var st = loadStats();
    st.answered += total; st.correct += score; st.quizzes += 1;
    var dk = todayKey();
    st.dates[dk] = (st.dates[dk] || 0) + 1;
    if (opts.kind === "daily") st.daily[dk] = { score: score, total: total };
    saveStats(st);
    checkAchievements(score, total);
  }

  function computeStreak() {
    var st = loadStats(), n = 0, d = new Date();
    if (!st.dates[todayKey(d)]) d.setDate(d.getDate() - 1); // streak alive if practiced yesterday
    while (st.dates[todayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  /* ================= achievements ================= */

  function achievementDefs() {
    var st = loadStats(), p = loadProgress();
    var distinctTopics = Object.keys(p).filter(function (k) {
      return k.indexOf("__") !== 0 && (p[k].attempts || 0) > 0;
    }).length;
    var acc = st.answered ? st.correct / st.answered : 0;
    return [
      { id: "first", em: "🏁", name: "First Quiz", desc: "Complete your first quiz.", done: st.quizzes >= 1 },
      { id: "perfect", em: "🎯", name: "Perfect Score", desc: "Score 100% on a full quiz.", done: (st.bestPerfect || false) },
      { id: "streak3", em: "🔥", name: "3-Day Streak", desc: "Practice 3 days in a row.", done: computeStreak() >= 3 },
      { id: "explorer", em: "📚", name: "Topic Explorer", desc: "Complete 5 different topics.", done: distinctTopics >= 5 },
      { id: "accuracy", em: "💯", name: "Accuracy Master", desc: "Hold 90%+ over 30+ questions.", done: st.answered >= 30 && acc >= 0.9 }
    ];
  }

  function checkAchievements(score, total) {
    var st = loadStats(), changed = false;
    if (score === total && total >= 5 && st.bestPerfect !== true) { st.bestPerfect = true; }
    saveStats(st);
    achievementDefs().forEach(function (a) {
      if (a.done && st.achievements.indexOf(a.id) < 0) {
        st.achievements.push(a.id); changed = true;
        showToast(a.em + " Achievement unlocked", a.name + " — " + a.desc);
        playSound("achievement");
      }
    });
    if (changed) saveStats(st);
  }

  function showToast(title, msg) {
    if (!toastRegion) return;
    var el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = "<strong>" + escapeHtml(title) + "</strong><span>" + escapeHtml(msg || "") + "</span>";
    toastRegion.appendChild(el);
    setTimeout(function () {
      el.style.opacity = "0"; el.style.transition = "opacity .4s";
      setTimeout(function () { el.remove(); }, 450);
    }, 3400);
  }

  /* ================= sound (Web Audio, OFF by default) ================= */

  function isSoundOn() { return state.soundOn; }

  function ensureAudio() {
    if (state.audioCtx) return state.audioCtx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      state.audioCtx = new AC();
      return state.audioCtx;
    } catch (e) { return null; }
  }

  function tone(freq, dur, type, gain, when) {
    var ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") ctx.resume();
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || "sine"; o.frequency.value = freq;
      var t = ctx.currentTime + (when || 0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain || 0.06, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }

  /** Short subtle UI tones. Never autoplays: only called from click/answer handlers. */
  function playSound(name) {
    if (!state.soundOn) return;
    if (name === "correct") { tone(660, 0.1, "sine", 0.06, 0); tone(880, 0.12, "sine", 0.05, 0.09); }
    else if (name === "incorrect") { tone(185, 0.16, "triangle", 0.06, 0); }
    else if (name === "click") { tone(520, 0.04, "square", 0.025, 0); }
    else if (name === "complete") { tone(523, 0.1, "sine", 0.06, 0); tone(659, 0.1, "sine", 0.06, 0.1); tone(784, 0.16, "sine", 0.06, 0.2); }
    else if (name === "achievement") { tone(880, 0.1, "sine", 0.055, 0); tone(1174, 0.14, "sine", 0.05, 0.1); }
  }

  /* ================= theme ================= */

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var btn = document.getElementById("btn-theme");
    if (btn) {
      var dark = theme === "dark";
      btn.textContent = dark ? "☀️" : "🌙";
      btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    }
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  }

  function toggleTheme() {
    var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(cur);
    playSound("click");
  }

  function initThemeSound() {
    var theme = "light";
    try {
      theme = localStorage.getItem(THEME_KEY) ||
        (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } catch (e) {}
    applyTheme(theme);
    try { state.soundOn = localStorage.getItem(SOUND_KEY) === "on"; } catch (e) { state.soundOn = false; }
    syncSoundBtn();
  }

  function syncSoundBtn() {
    var btn = document.getElementById("btn-sound");
    if (!btn) return;
    btn.textContent = state.soundOn ? "🔊" : "🔇";
    btn.setAttribute("aria-pressed", state.soundOn ? "true" : "false");
    btn.setAttribute("aria-label", state.soundOn ? "Sound on" : "Sound off");
  }

  function toggleSound() {
    state.soundOn = !state.soundOn;
    try { localStorage.setItem(SOUND_KEY, state.soundOn ? "on" : "off"); } catch (e) {}
    syncSoundBtn();
    if (state.soundOn) playSound("click");
    showToast(state.soundOn ? "🔊 Sound on" : "🔇 Sound off",
      state.soundOn ? "Subtle tones for answers and completions." : "All sounds muted.");
  }

  /* ================= topic icons (inline SVG, no external assets) ================= */

  function topicIcon(topic) {
    var key = ((topic && topic.id) + " " + topicTitle(topic)).toLowerCase();
    var stroke = "currentColor";
    function svg(inner) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="' + stroke + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>";
    }
    if (key.indexOf("non-relation") >= 0 || key.indexOf("cosmos") >= 0 || key.indexOf("document") >= 0)
      return svg('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><circle cx="12" cy="14" r="2.4"/><path d="M12 6.5v2M9 20l1.2-1.2M15 20l-1.2-1.2"/>');
    if (key.indexOf("relation") >= 0 || key.indexOf("sql") >= 0 || key.indexOf("table") >= 0)
      return svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 4v16M15 4v16"/>');
    if (key.indexOf("analytic") >= 0 || key.indexOf("synapse") >= 0 || key.indexOf("power bi") >= 0 || key.indexOf("chart") >= 0)
      return svg('<path d="M4 20V10M10 20V4M16 20v-8M21 20H3"/>');
    if (key.indexOf("storage") >= 0 || key.indexOf("blob") >= 0)
      return svg('<ellipse cx="12" cy="6" rx="7" ry="2.6"/><path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6"/><path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6"/>');
    if (key.indexOf("network") >= 0 || key.indexOf("globe") >= 0)
      return svg('<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.4 3.8 5 3.8 8S14.5 17.6 12 20c-2.5-2.4-3.8-5-3.8-8S9.5 6.4 12 4z"/>');
    return svg('<ellipse cx="12" cy="5.5" rx="7" ry="2.8"/><path d="M5 5.5v13c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-13"/><path d="M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8"/>');
  }

  /* ============ boot (null-safe: survives stale cached shells) ============ */

  function on(id, ev, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener(ev, fn);
  }

  on("brand-home", "click", function (e) {
    e.preventDefault(); stopTimer(); renderHome();
  });
  on("nav-topics", "click", function () { stopTimer(); renderHome(); scrollToId("topics-heading"); });
  on("nav-notes", "click", function () { stopTimer(); renderHome(); scrollToId("notes-heading"); });
  on("nav-modes", "click", function () { stopTimer(); renderHome(); scrollToId("modes-heading"); });
  on("nav-progress", "click", function () { stopTimer(); renderHome(); scrollToId("progress-heading"); });
  on("nav-bank", "click", function () { stopTimer(); playSound("click"); renderBank(); });
  on("btn-theme", "click", toggleTheme);
  on("btn-sound", "click", toggleSound);

  initThemeSound();
  init();

  function scrollToId(id) {
    setTimeout(function () {
      var el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  /** Load the topic registry (topics.json drives all landing cards). */
  function loadTopics() {
    return fetchJSON(TOPICS_URL);
  }

  function init() {
    loadTopics().then(function (topics) {
      state.topics = Array.isArray(topics) ? topics : [];
      renderHome();
      var loaders = state.topics.map(function (t) {
        return fetchJSON(topicFile(t)).then(function (qs) {
          state.topicCache[t.id] = { meta: t, questions: qs };
          state.topicStats[t.id] = summarize(qs);
        }).catch(function (err) {
          console.error("Failed to load " + topicFile(t), err);
          state.topicStats[t.id] = { total: 0, byDifficulty: {}, error: true };
        });
      });
      Promise.all(loaders).then(function () { if (state.view === "home") renderHome(); });
    }).catch(function (err) { renderFetchError(err); });
    // Concept Notes index loads independently — never blocks the quiz.
    fetchJSON(NOTES_URL).then(function (nt) {
      state.notesTopics = Array.isArray(nt) ? nt : [];
      if (state.view === "home") paintNotesGrid();
    }).catch(function (err) {
      console.error("Failed to load notes index", err);
      state.notesTopics = [];
      if (state.view === "home") paintNotesGrid();
    });
  }

  function summarize(questions) {
    var by = {};
    (questions || []).forEach(function (q) {
      var d = difficultyLabel(q.difficulty);
      by[d] = (by[d] || 0) + 1;
    });
    return { total: (questions || []).length, byDifficulty: by };
  }

  function totalQuestions() {
    return state.topics.reduce(function (n, t) {
      var s = state.topicStats[t.id];
      return n + (s && !s.error ? s.total : 0);
    }, 0);
  }

  function renderFetchError(err) {
    state.view = "error";
    app.innerHTML =
      '<div class="card error-card" role="alert"><h2>Could not load question data</h2>' +
      "<p>" + escapeHtml(err && err.message ? err.message : String(err)) + "</p>" +
      "<p>If you opened this file directly with <code>file://</code>, browsers block <code>fetch()</code> of JSON. " +
      "Run <code>python -m http.server</code> in this folder and open <code>http://localhost:8000</code>. On GitHub Pages this works without setup.</p>" +
      '<button class="btn" id="btn-retry" type="button">Retry</button></div>';
    document.getElementById("btn-retry").addEventListener("click", init);
  }

  /* ================= landing page ================= */

  function lastPracticedTopic() {
    var p = loadProgress(), best = null;
    state.topics.forEach(function (t) {
      var e = p[t.id];
      if (e && e.lastDate && (!best || e.lastDate > best.entry.lastDate)) best = { meta: t, entry: e };
    });
    return best;
  }

  function renderHome() {
    state.view = "home";
    stopTimer();
    var progress = loadProgress(), stats = loadStats();
    var tq = totalQuestions();
    var streak = computeStreak();
    var dk = todayKey();
    var dailyDone = !!stats.daily[dk];
    var last = lastPracticedTopic();

    /* hero */
    var hero =
      '<section class="hero" aria-labelledby="hero-title">' +
      '<div class="hero-grid"><div>' +
      '<span class="eyebrow" style="background:rgba(154,106,69,.14);color:#7d5334">DP-900 · Azure Data Fundamentals</span>' +
      '<h1 id="hero-title">Practice. Test. Improve.</h1>' +
      '<p class="sub">Master data concepts through focused practice and realistic exam-style questions.</p>' +
      '<p class="desc">Practice mode gives instant feedback. Exam mode simulates the real thing. Every run draws fresh random questions.</p>' +
      '<div class="hero-cta">' +
      '<button class="btn light big" id="hero-start" type="button">Start Practice →</button>' +
      '<button class="btn outline-light" id="hero-topics" type="button">Explore Topics</button>' +
      "</div>" +
      '<div class="hero-stats" role="list">' +
      '<div class="hero-stat" role="listitem"><strong>' + tq + "</strong><span>Questions</span></div>" +
      '<div class="hero-stat" role="listitem"><strong>' + state.topics.length + "</strong><span>Topics</span></div>" +
      '<div class="hero-stat" role="listitem"><strong>15–50</strong><span>Random sizes</span></div>' +
      (streak ? '<div class="hero-stat" role="listitem"><strong>🔥 ' + streak + "</strong><span>Day streak</span></div>" : "") +
      "</div></div>" +
      '<div class="hero-visual" aria-hidden="true">' +
      '<svg class="wires" viewBox="0 0 300 170"><path d="M40 40 L150 85 L255 55 M70 140 L150 85 L230 130" stroke="#c99a68" stroke-width="1.4" fill="none" stroke-dasharray="5 5"/></svg>' +
      '<span class="particle" style="left:18%"></span><span class="particle p2"></span><span class="particle p3"></span>' +
      '<span class="node n1">🗄️</span><span class="node n2">📊</span><span class="node n3">🧪</span>' +
      '<span class="code-chip">SELECT * FROM confidence WHERE topic = \'DP-900\'</span>' +
      "</div></div></section>";

    /* continue learning */
    var cont = last
      ? '<section class="card continue-card" aria-labelledby="cont-title"><div><span class="eyebrow">Continue Learning</span>' +
        '<h3 id="cont-title" style="margin:2px 0 4px">' + escapeHtml(topicTitle(last.meta)) + "</h3>" +
        '<p class="section-sub" style="margin:0">Last score: <strong>' + last.entry.lastScore + " / " + last.entry.lastTotal + "</strong> · Best: <strong>" +
        last.entry.bestScore + " / " + last.entry.bestTotal + "</strong> · " + last.entry.attempts + " attempt(s)</p></div>" +
        '<button class="btn" id="btn-continue" type="button">Continue Practice →</button></section>'
      : '<section class="card continue-card"><div><span class="eyebrow">Continue Learning</span>' +
        '<h3 style="margin:2px 0 4px">Start your first practice session 🚀</h3>' +
        '<p class="section-sub" style="margin:0">Fifteen questions, instant explanations, zero setup.</p></div>' +
        '<button class="btn" id="btn-continue" type="button">Start now →</button></section>';

    /* concept notes (Learn before you Practice) */
    var notesHtml =
      '<h2 class="section-title" id="notes-heading">Concept Notes</h2>' +
      '<p class="section-sub">Understand first, then practice. Short, visual, phone-friendly.</p>' +
      '<div class="topic-grid" id="notes-grid"><div class="card"><div class="skeleton skeleton-hero"></div><p class="section-sub">Loading notes…</p></div></div>';

    /* quick modes */
    var modes =
      '<h2 class="section-title" id="modes-heading">Choose your mode</h2>' +
      '<p class="section-sub">Random for mixed drills, Exam to simulate, Daily to build the habit — or master one set at a time below.</p>' +
      '<div class="mode-grid">' +
      '<div class="mode-card"><span class="mode-ico">🎲</span><h3>Random Practice</h3>' +
      "<p>Live-mixed and reshuffled every attempt. Nothing stored, instant feedback.</p>" +
      '<label class="sr-only" for="random-scope">Random Practice topic scope</label>' +
      '<select class="select" id="random-scope">' + randomScopeOptions() + "</select>" +
      '<div class="size-btns" role="group" aria-label="Random Practice size">' +
      '<button class="btn small" data-mode="random" data-count="15" type="button">15</button>' +
      '<button class="btn small" data-mode="random" data-count="30" type="button">30</button>' +
      '<button class="btn small" data-mode="random" data-count="50" type="button">50</button>' +
      "</div></div>" +
      '<div class="mode-card"><span class="mode-ico">🎯</span><h3>Exam Mode</h3>' +
      "<p>15 mixed questions, 15:00 timer, answers locked in — feedback only at the end.</p>" +
      '<button class="btn secondary" data-mode="exam" type="button">Start Exam Mode</button></div>' +
      '<div class="mode-card"><span class="mode-ico">🔥</span><h3>Daily Practice</h3>' +
      (dailyDone
        ? "<p>Today's practice ✓ completed — " + stats.daily[dk].score + "/" + stats.daily[dk].total + ". Come back tomorrow to extend the streak.</p><button class=\"btn ghost\" data-mode=\"daily\" type=\"button\">Practice again</button>"
        : "<p>Today's challenge is waiting. 15 mixed questions, one streak point.</p><button class=\"btn ghost\" data-mode=\"daily\" type=\"button\">Start Daily Practice</button>") +
      "</div></div>";

    /* topics */
    var topicsHtml =
      '<h2 class="section-title" id="topics-heading">Question sets</h2>' +
      '<p class="section-sub">Cards generate automatically from <code>data/topics.json</code> — new banks appear here with zero code changes.</p>' +
      '<div class="topic-toolbar">' +
      '<input class="input" id="topic-search" type="search" placeholder="Search question sets…" aria-label="Search question sets" value="' + escapeHtml(state.topicQuery) + '" />' +
      '<select class="select" id="topic-filter" aria-label="Filter question sets">' +
      [["all", "All sets"], ["new", "Not started"], ["practiced", "Practiced"], ["mastered", "Mastered (80%+)"]].map(function (o) {
        return '<option value="' + o[0] + '"' + (state.topicFilter === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
      }).join("") + "</select></div>" +
      '<div class="topic-grid" id="topic-grid">' + topicCardsHtml(progress) + "</div>";

    /* progress dashboard */
    var acc = stats.answered ? (100 * stats.correct / stats.answered) : 0;
    var ach = achievementDefs();
    var dash =
      '<h2 class="section-title" id="progress-heading">Your Progress</h2>' +
      (stats.quizzes ? '<p class="section-sub">Computed live from this browser\'s history.</p>' : '<p class="section-sub">Start practicing to see your progress.</p>') +
      '<div class="dash-grid">' +
      '<div class="dash-stat"><strong>' + stats.answered + "</strong><span>Questions Answered</span></div>" +
      '<div class="dash-stat"><strong>' + stats.correct + "</strong><span>Correct</span></div>" +
      '<div class="dash-stat"><strong>' + acc.toFixed(1) + "%</strong><span>Accuracy</span></div>" +
      '<div class="dash-stat"><strong>' + stats.quizzes + "</strong><span>Quizzes Completed</span></div>" +
      '<div class="dash-stat"><strong>' + (streak ? "🔥 " + streak : "—") + "</strong><span>Day Streak</span></div>" +
      "</div>" +
      '<h3 style="margin:16px 0 4px">Achievements</h3>' +
      '<div class="ach-grid">' + ach.map(function (a) {
        var un = stUnlocked(a.id);
        return '<div class="ach' + (a.done || un ? " unlocked" : "") + '"><span class="em">' + a.em + "</span><strong>" + escapeHtml(a.name) + "</strong><small>" + escapeHtml(a.done || un ? "Unlocked ✓" : a.desc) + "</small></div>";
      }).join("") + "</div>";

    app.innerHTML = hero + cont + notesHtml + modes + topicsHtml + dash +
      '<h2 class="section-title">How it works</h2><div class="how-grid">' +
      '<div class="how-card"><h3>1 · Pick a mode</h3><p>Single-set practice, mixed Random (15/30/50), timed Exam, or Daily streak builder.</p></div>' +
      '<div class="how-card"><h3>2 · Answer &amp; learn</h3><p>Practice shows instant feedback + explanations. Exam holds everything until the end.</p></div>' +
      '<div class="how-card"><h3>3 · Track &amp; retry</h3><p>Dashboard, streaks and achievements update after every completed quiz. Retry for a fresh draw.</p></div></div>';

    /* wire up */
    document.getElementById("hero-start").addEventListener("click", function () { playSound("click"); startMixed("random", 15, state.randomScope); });
    document.getElementById("hero-topics").addEventListener("click", function () { playSound("click"); scrollToId("topics-heading"); });
    var bc = document.getElementById("btn-continue");
    if (bc) bc.addEventListener("click", function () {
      playSound("click");
      if (last) startQuiz(last.meta.id, { kind: "practice" });
      else if (sortedTopics().length) startQuiz(sortedTopics()[0].id, { kind: "practice" });
    });
    Array.prototype.forEach.call(app.querySelectorAll("[data-mode]"), function (b) {
      b.addEventListener("click", function () {
        playSound("click");
        var mode = b.getAttribute("data-mode");
        startMixed(mode, parseInt(b.getAttribute("data-count") || "15", 10),
          mode === "random" ? state.randomScope : undefined);
      });
    });
    var scopeSel = document.getElementById("random-scope");
    if (scopeSel) scopeSel.addEventListener("change", function (e) {
      state.randomScope = e.target.value;
      playSound("click");
    });
    document.getElementById("topic-search").addEventListener("input", function (e) {
      state.topicQuery = e.target.value;
      document.getElementById("topic-grid").innerHTML = topicCardsHtml(loadProgress());
      wireTopicCards();
    });
    document.getElementById("topic-filter").addEventListener("change", function (e) {
      state.topicFilter = e.target.value;
      document.getElementById("topic-grid").innerHTML = topicCardsHtml(loadProgress());
      wireTopicCards();
    });
    wireTopicCards();
    paintNotesGrid();
  }

  /* ================= concept notes (reusable renderer) =================
     New topic = one notes/*.json + one entry in notes/topics.json. */

  function paintNotesGrid() {
    var grid = document.getElementById("notes-grid");
    if (!grid) return;
    if (!state.notesTopics.length) {
      grid.innerHTML = '<div class="card"><p>No notes yet. Add a file to <code>notes/</code> and list it in <code>notes/topics.json</code>.</p></div>';
      return;
    }
    grid.innerHTML = state.notesTopics.map(function (n) {
      return '<article class="topic-card note-card" aria-label="Notes: ' + escapeHtml(n.title) + '">' +
        '<div class="topic-top"><div class="topic-icon">' + topicIcon({ id: n.id, name: n.title }) + "</div>" +
        "<div><h3>" + escapeHtml(n.title) + "</h3>" +
        (n.updatedAt ? '<div class="exam-weight">Updated ' + escapeHtml(n.updatedAt) + "</div>" : "") + "</div></div>" +
        '<p class="desc">' + escapeHtml(n.description || "") + "</p>" +
        '<div class="card-actions"><button class="btn small" type="button" data-notes="' + escapeHtml(n.id) + '">Read Notes →</button>' +
        '<button class="btn secondary small" type="button" data-notes-practice="' + escapeHtml(n.id) + '">Practice →</button></div></article>';
    }).join("");
    wireNotesCards();
  }

  function wireNotesCards() {
    Array.prototype.forEach.call(app.querySelectorAll("[data-notes]"), function (b) {
      b.addEventListener("click", function () { playSound("click"); renderNotes(b.getAttribute("data-notes")); });
    });
    Array.prototype.forEach.call(app.querySelectorAll("[data-notes-practice]"), function (b) {
      b.addEventListener("click", function () { playSound("click"); startNotesPractice(b.getAttribute("data-notes-practice")); });
    });
  }

  function notesMeta(id) {
    var found = null;
    state.notesTopics.forEach(function (n) { if (n.id === id) found = n; });
    return found;
  }

  function startNotesPractice(notesId) {
    var meta = notesMeta(notesId);
    if (meta && meta.practiceTopicId) {
      var exists = state.topics.some(function (t) { return t.id === meta.practiceTopicId; });
      if (exists) { startQuiz(meta.practiceTopicId, { kind: "practice" }); return; }
    }
    showToast("Question set coming soon", "Try Random Practice meanwhile.");
  }

  function loadNotesDoc(id) {
    if (state.notesCache[id]) return Promise.resolve(state.notesCache[id]);
    var meta = notesMeta(id);
    if (!meta) return Promise.reject(new Error("Unknown notes topic " + id));
    return fetchJSON(meta.file).then(function (doc) {
      state.notesCache[id] = doc;
      return doc;
    });
  }

  function notesTable(t) {
    if (!t || !t.rows || !t.rows.length) return "";
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      t.head.map(function (c) { return "<th>" + escapeHtml(c) + "</th>"; }).join("") +
      "</tr></thead><tbody>" +
      t.rows.map(function (r) {
        return "<tr>" + r.map(function (c) { return "<td>" + escapeHtml(c) + "</td>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";
  }

  /** Full notes reading view: sticky nav, progress, expandables, practice CTAs. */
  function renderNotes(id) {
    stopTimer();
    state.view = "notes-loading";
    app.innerHTML = '<div class="loading-card" role="status"><div class="skeleton skeleton-hero"></div><p>Loading notes…</p></div>';
    window.scrollTo(0, 0);
    loadNotesDoc(id).then(function (doc) {
      state.view = "notes";
      var meta = notesMeta(id) || {};
      var chips = [["n-what", "What"], ["n-concepts", "Concepts"], ["n-examples", "Examples"],
        ["n-compare", "Compare"], ["n-services", "Services"], ["n-remember", "Remember"], ["n-check", "Quick Check"]]
        .map(function (c) { return '<a class="chip" href="#' + c[0] + '">' + c[1] + "</a>"; }).join("");
      var concepts = (doc.concepts || []).map(function (c, i) {
        return '<details class="concept"' + (i === 0 ? " open" : "") + ">" +
          "<summary>" + escapeHtml(c.term) + "</summary><p>" + escapeHtml(c.body) + "</p></details>";
      }).join("");
      var examples = (doc.examples || []).map(function (x) {
        return '<div class="example-card"><h4>' + escapeHtml(x.title) + "</h4><p>" + escapeHtml(x.body || "") + "</p>" +
          (x.code ? '<pre class="code">' + escapeHtml(x.code) + "</pre>" : "") + notesTable(x.table) + "</div>";
      }).join("");
      var compares = (doc.comparisons || []).map(function (t) {
        return '<div class="example-card"><h4>' + escapeHtml(t.title) + "</h4>" + notesTable(t) + "</div>";
      }).join("");
      var services = (doc.services || []).map(function (s) {
        return '<div class="service-card"><h4>' + escapeHtml(s.name) + "</h4>" +
          "<p><strong>What:</strong> " + escapeHtml(s.what || "") + "</p>" +
          "<p><strong>Data:</strong> " + escapeHtml(s.data || "") + "</p>" +
          "<p><strong>Use when:</strong> " + escapeHtml(s.when || "") + "</p>" +
          '<p class="scenario"><strong>Scenario:</strong> ' + escapeHtml(s.scenario || "") + "</p></div>";
      }).join("");
      var remember = '<ul class="remember-list">' + (doc.remember || []).map(function (r) {
        return "<li>" + escapeHtml(r) + "</li>";
      }).join("") + "</ul>";
      var check = (doc.quickCheck || []).map(function (q, i) {
        return '<details class="concept qc"><summary><span class="pill">Q' + (i + 1) + "</span> " + escapeHtml(q.q) + "</summary>" +
          "<p><strong>Answer:</strong> " + escapeHtml(q.a) + "</p></details>";
      }).join("");

      app.innerHTML =
        '<div class="notes-bar"><button class="btn ghost small" id="notes-back" type="button">← Notes</button>' +
        '<nav class="chips" aria-label="Notes sections">' + chips + '</nav><div class="read-progress"><div id="read-progress"></div></div></div>' +
        '<article class="notes-doc" aria-labelledby="notes-title">' +
        '<span class="eyebrow">Concept Notes · DP-900</span>' +
        '<h2 id="notes-title">' + escapeHtml(doc.title) + "</h2>" +
        '<p class="section-sub">' + escapeHtml(doc.subtitle || meta.description || "") + "</p>" +
        '<section id="n-what" class="nsec"><h3>1 · What is it?</h3><p>' + escapeHtml(doc.what.body) + "</p>" +
        '<div class="example-card"><h4>Real-world example</h4><p>' + escapeHtml(doc.what.example) + "</p></div></section>" +
        '<section id="n-concepts" class="nsec"><h3>2 · Key Concepts</h3><p class="section-sub">Tap any card to expand.</p>' + concepts + "</section>" +
        '<section id="n-examples" class="nsec"><h3>3 · Examples</h3>' + examples + "</section>" +
        '<section id="n-compare" class="nsec"><h3>4 · Compare Similar Concepts</h3>' + compares + "</section>" +
        '<section id="n-services" class="nsec"><h3>5 · Azure Services</h3>' + services + "</section>" +
        '<section id="n-remember" class="nsec remember-box"><h3>6 · Remember This ⭐</h3>' + remember + "</section>" +
        '<section id="n-check" class="nsec"><h3>7 · Quick Check</h3>' +
        '<p class="section-sub">Learning only — not scored, not part of the question bank.</p>' + check + "</section>" +
        '<div class="card-actions notes-cta"><button class="btn" id="notes-practice" type="button">Start Practice →</button>' +
        '<button class="btn secondary" id="notes-random" type="button">🎲 Random Practice</button>' +
        '<button class="btn ghost" id="notes-home" type="button">All Topics</button></div>' +
        "</article>";

      document.getElementById("notes-back").addEventListener("click", function () {
        renderHome(); scrollToId("notes-heading");
      });
      document.getElementById("notes-practice").addEventListener("click", function () {
        playSound("click"); startNotesPractice(id);
      });
      document.getElementById("notes-random").addEventListener("click", function () {
        playSound("click"); startMixed("random", 15, state.randomScope);
      });
      document.getElementById("notes-home").addEventListener("click", function () { renderHome(); });
      window.scrollTo(0, 0);
    }).catch(function () {
      app.innerHTML = '<div class="card error-card"><h2>Unable to load these notes.</h2>' +
        '<p>Please try again — the quiz still works.</p><p><button class="btn" id="btn-back" type="button">Back</button></p></div>';
      document.getElementById("btn-back").addEventListener("click", renderHome);
    });
  }

  function stUnlocked(id) { return loadStats().achievements.indexOf(id) >= 0; }

  function topicMatchesFilter(t, p) {
    var q = (state.topicQuery || "").toLowerCase().trim();
    if (q && ((topicTitle(t) + " " + topicDesc(t) + " " + (t.sourceName || "")).toLowerCase().indexOf(q) < 0)) return false;
    var e = p[t.id];
    var att = e && e.attempts > 0;
    if (state.topicFilter === "new" && att) return false;
    if (state.topicFilter === "practiced" && !att) return false;
    if (state.topicFilter === "mastered") {
      if (!e || !e.bestTotal || (e.bestScore / e.bestTotal) < 0.8) return false;
    }
    return true;
  }

  /** Options for the Random Practice scope dropdown (All + every set). */
  function randomScopeOptions() {
    var opts = '<option value="all"' + (state.randomScope === "all" ? " selected" : "") + ">All topics</option>";
    opts += sortedTopics().map(function (t) {
      var c = topicCount(t);
      return '<option value="' + escapeHtml(t.id) + '"' + (state.randomScope === t.id ? " selected" : "") + ">" +
        escapeHtml(topicTitle(t)) + (c === null ? "" : " (" + c + ")") + "</option>";
    }).join("");
    return opts;
  }

  /** Render topic cards — pure function of topics.json + stats (future-proof). */
  function renderTopicCards() {
    return topicCardsHtml(loadProgress());
  }

  function topicCardsHtml(progress) {
    var list = sortedTopics().filter(function (t) { return topicMatchesFilter(t, progress); });
    if (!state.topics.length) return '<div class="card"><p>No question sets found. Add a question bank to <code>data/</code> and list it in <code>data/topics.json</code> to get started.</p></div>';
    if (!list.length) return '<div class="card"><p>No question sets match this search. Clear the search or choose another filter.</p></div>';
    return list.map(function (t) {
      var s = state.topicStats[t.id];
      var count = topicCount(t);
      var e = progress[t.id];
      var bestPct = e && e.bestTotal ? Math.round(100 * e.bestScore / e.bestTotal) : 0;
      var statusLine = e && e.attempts
        ? "Best: " + e.bestScore + "/" + e.bestTotal + " · " + e.attempts + (e.attempts === 1 ? " attempt" : " attempts")
        : "Not started";
      var sourceLine = t.sourceName
        ? '<div class="topic-source">Source: ' + escapeHtml(t.sourceName) + (t.sourceType ? " · " + escapeHtml(t.sourceType) : "") + "</div>"
        : "";
      return '<article class="topic-card" aria-label="' + escapeHtml(topicTitle(t)) + '">' +
        '<div class="topic-top"><div class="topic-icon">' + topicIcon(t) + "</div>" +
        "<div><h3>" + escapeHtml(topicTitle(t)) +
        (isNewTopic(t) ? ' <span class="new-badge">NEW</span>' : "") + "</h3>" +
        (t.examWeight ? '<div class="exam-weight">' + escapeHtml(t.examWeight) + "</div>" : "") + "</div></div>" +
        '<p class="desc">' + escapeHtml(topicDesc(t)) + "</p>" + sourceLine +
        '<div class="topic-meta"><span class="pill"><strong>' + (s && s.error ? "Unavailable" : count === null ? "…" : count + (count === 1 ? " question" : " questions")) + "</strong></span>" +
        '<span class="pill">' + escapeHtml(statusLine) + "</span></div>" +
        '<div class="meter" role="progressbar" aria-valuenow="' + bestPct + '" aria-valuemin="0" aria-valuemax="100" aria-label="Best score for ' + escapeHtml(topicTitle(t)) + '"><div style="width:' + bestPct + '%"></div></div>' +
        '<div class="card-actions"><button class="btn small" type="button" data-start="' + escapeHtml(t.id) + '">Start Practice →</button>' +
        '<button class="btn secondary small" type="button" data-browse="' + escapeHtml(t.id) + '">Browse</button></div></article>';
    }).join("");
  }

  function wireTopicCards() {
    Array.prototype.forEach.call(app.querySelectorAll("[data-start]"), function (b) {
      b.addEventListener("click", function () { playSound("click"); startQuiz(b.getAttribute("data-start"), { kind: "practice" }); });
    });
    Array.prototype.forEach.call(app.querySelectorAll("[data-browse]"), function (b) {
      b.addEventListener("click", function () {
        playSound("click");
        state.bankTopicId = b.getAttribute("data-browse");
        renderBank();
      });
    });
  }

  /* ================= quiz loading ================= */

  /** Load a single topic's question set (cached). */
  function loadQuestionSet(topicId) {
    var cached = state.topicCache[topicId];
    if (cached) return Promise.resolve(cached.questions);
    var meta = null;
    state.topics.forEach(function (t) { if (t.id === topicId) meta = t; });
    if (!meta) return Promise.reject(new Error("Unknown topic " + topicId));
    return fetchJSON(topicFile(meta)).then(function (qs) {
      state.topicCache[topicId] = { meta: meta, questions: qs };
      state.topicStats[topicId] = summarize(qs);
      return qs;
    });
  }

  function ensureAllLoaded() {
    var missing = state.topics.filter(function (t) { return !state.topicCache[t.id]; });
    if (!missing.length) return Promise.resolve();
    return Promise.all(missing.map(function (t) {
      return fetchJSON(topicFile(t)).then(function (qs) {
        state.topicCache[t.id] = { meta: t, questions: qs };
        state.topicStats[t.id] = summarize(qs);
      }).catch(function (err) {
        console.error("Failed to load " + topicFile(t), err);
        state.topicStats[t.id] = { total: 0, byDifficulty: {}, error: true };
      });
    })).then(function () {});
  }

  function allQuestions() {
    var out = [];
    state.topics.forEach(function (t) {
      var c = state.topicCache[t.id];
      if (c && c.questions) c.questions.forEach(function (q) { out.push(q); });
    });
    return out;
  }

  /** Random Practice picker: unseen-first, repeats capped at 10% of the
      session (15->1, 30->3, 50->5), least-recently-seen fill, never a
      duplicate inside one session, always shuffled. Other modes untouched. */
  function pickRandom(pool, count) {
    count = Math.max(1, Math.min(count || QUESTIONS_PER_SESSION, pool.length));
    var recent = loadRecent(), unseen = [], seen = [];
    pool.forEach(function (q) {
      if (recent[q.id]) seen.push(q); else unseen.push(q);
    });
    unseen = shuffle(unseen);
    seen.sort(function (a, b) { return (recent[a.id] || 0) - (recent[b.id] || 0); });
    var maxRepeat = Math.floor(count * 0.1);
    var takeUnseen = Math.min(count, unseen.length);
    var takeSeen = Math.min(count - takeUnseen, maxRepeat);
    var picked = unseen.slice(0, takeUnseen).concat(seen.slice(0, takeSeen));
    if (picked.length < count) {
      // Pool too exhausted for the cap (e.g. re-rolling a 50/50 set):
      // deliver the full count from least-recently-seen first.
      picked = picked.concat(seen.slice(takeSeen, takeSeen + (count - picked.length)));
    }
    return shuffle(picked);
  }

  /** Build a session: pick N random, shuffle options while preserving the key. */
  function buildSession(meta, pool, kind, count) {
    var n = Math.max(1, Math.min(count || QUESTIONS_PER_SESSION, pool.length));
    var picked = (kind === "random") ? pickRandom(pool, n) : shuffle(pool).slice(0, n);
    var sessionQs = picked.map(function (q) {
      var indexed = q.options.map(function (text, i) { return { text: text, isCorrect: i === q.correctAnswer }; });
      var sh = shuffle(indexed), nc = 0;
      sh.forEach(function (o, i) { if (o.isCorrect) nc = i; });
      return { src: q, options: sh.map(function (o) { return o.text; }), correctIndex: nc };
    });
    var now = Date.now();
    recordPracticed(sessionQs.map(function (q) { return q.src.id; }));
    state.session = {
      kind: kind, count: n, topic: meta, questions: sessionQs, index: 0,
      answers: sessionQs.map(function () { return null; }),
      startTime: now, elapsed: 0, remaining: kind === "exam" ? EXAM_SECONDS : null,
      timerId: null, finished: false, hideFeedback: kind === "exam"
    };
    state.session.timerId = setInterval(tickTimer, 1000);
    state.view = "quiz";
    renderQuestion();
  }

  function startQuiz(topicId, opts) {
    var kind = (opts && opts.kind) || "practice";
    var meta = null;
    state.topics.forEach(function (t) { if (t.id === topicId) meta = t; });
    if (!meta) return;
    app.innerHTML = '<div class="loading-card" role="status"><div class="skeleton skeleton-hero"></div><p>Loading ' + escapeHtml(topicTitle(meta)) + "…</p></div>";
    loadQuestionSet(topicId).then(function (qs) {
      if (!qs.length) {
        app.innerHTML = '<div class="card error-card"><h2>Unable to load this question set.</h2><p>Please try again — other topics should still work.</p><p><button class="btn" id="btn-back" type="button">Back to topics</button></p></div>';
        document.getElementById("btn-back").addEventListener("click", renderHome);
        return;
      }
      buildSession(meta, qs, kind);
    }).catch(renderFetchError);
  }

  function questionsOf(topicId) {
    var c = state.topicCache[topicId];
    return (c && c.questions) ? c.questions.slice() : [];
  }

  /** Random / Exam / Daily: questions pooled LIVE across banks (or one scoped set).
      Nothing is stored — each attempt reshuffles a fresh combination. */
  function startMixed(kind, count, scopeId) {
    if (kind === "quick") kind = "random"; // legacy alias
    count = Math.max(1, count || QUESTIONS_PER_SESSION);
    if (kind === "random") scopeId = scopeId || state.randomScope || "all";
    var scopeTitle = "All topics";
    if (kind === "random" && scopeId && scopeId !== "all") {
      state.topics.forEach(function (t) { if (t.id === scopeId) scopeTitle = topicTitle(t); });
    }
    var labels = {
      random: "🎲 Random Practice · " + scopeTitle,
      exam: "🎯 Exam Mode · Mixed topics",
      daily: "🔥 Daily Practice · " + todayKey()
    };
    var meta = { id: "__mixed__", title: labels[kind] || "Mixed Practice", name: labels[kind] || "Mixed Practice" };
    meta.scopeId = (kind === "random") ? scopeId : "all";
    meta.scopeLabel = scopeTitle;
    app.innerHTML = '<div class="loading-card" role="status"><div class="skeleton skeleton-hero"></div><p>Drawing ' + count + " random questions…</p></div>";
    ensureAllLoaded().then(function () {
      var pool = (kind === "random" && scopeId && scopeId !== "all") ? questionsOf(scopeId) : allQuestions();
      if (!pool.length) {
        app.innerHTML = '<div class="card error-card"><h2>No questions available yet.</h2><p><button class="btn" id="btn-back" type="button">Back</button></p></div>';
        document.getElementById("btn-back").addEventListener("click", renderHome);
        return;
      }
      if (kind === "daily") meta.id = "__daily__";
      if (kind === "exam") meta.id = "__exam__";
      if (kind === "random") meta.id = "__random__";
      buildSession(meta, pool, kind === "daily" ? "daily" : kind, count);
    });
  }

  /* ================= quiz rendering ================= */

  function stopTimer() {
    if (state.session && state.session.timerId) { clearInterval(state.session.timerId); state.session.timerId = null; }
  }

  function tickTimer() {
    var s = state.session;
    if (!s || state.view !== "quiz") return;
    if (s.kind === "exam") {
      s.remaining = EXAM_SECONDS - Math.floor((Date.now() - s.startTime) / 1000);
      if (s.remaining <= 0) {
        s.remaining = 0; paintTimer(s);
        stopTimer();
        showToast("⏰ Time expired", "Exam auto-submitted.");
        finishQuiz(true);
        return;
      }
      paintTimer(s);
    } else {
      s.elapsed = Math.floor((Date.now() - s.startTime) / 1000);
      paintTimer(s);
    }
  }

  function paintTimer(s) {
    var el = document.getElementById("quiz-timer");
    if (!el) return;
    if (s.kind === "exam") {
      el.textContent = "⏱ " + formatTime(s.remaining);
      el.classList.toggle("urgent", s.remaining < 120);
    } else {
      el.textContent = "⏱ " + formatTime(s.elapsed || 0);
    }
  }

  function isAnswered(s, i) {
    var a = s.answers[i];
    return a !== null && a !== undefined;
  }

  /** Render the current question card + navigator. */
  function renderQuestion() {
    var s = state.session;
    if (!s) { renderHome(); return; }
    state.view = "quiz";
    var total = s.questions.length;
    var cur = s.questions[s.index];
    var userAns = s.answers[s.index];
    var answered = isAnswered(s, s.index);
    var answeredCount = s.answers.filter(function (a, i) { return isAnswered(s, i); }).length;
    var pct = Math.round(100 * (s.index + 1) / total);
    var letters = ["A", "B", "C", "D", "E", "F"];
    var exam = s.hideFeedback;

    var optionsHtml = cur.options.map(function (text, i) {
      var cls = "option-btn", badge = "";
      if (exam) {
        if (userAns === i) { cls += " picked-exam"; badge = '<span class="option-state">● Selected</span>'; }
      } else if (answered) {
        if (i === cur.correctIndex) { cls += " correct"; badge = '<span class="option-state ok">✓ Correct</span>'; }
        else if (i === userAns) { cls += " incorrect"; badge = '<span class="option-state bad">✗ Yours</span>'; }
        else cls += " dim";
      }
      var disabled = (!exam && answered) ? " disabled" : "";
      return '<li><button class="' + cls + '" type="button" data-opt="' + i + '"' + disabled +
        ' aria-pressed="' + (userAns === i ? "true" : "false") + '">' +
        '<span class="option-letter" aria-hidden="true">' + letters[i] + "</span><span>" +
        escapeHtml(text) + "</span>" + badge + "</button></li>";
    }).join("");

    var dots = s.questions.map(function (q, i) {
      var cls = "dot", label;
      if (i === s.index) cls += " current";
      if (isAnswered(s, i)) {
        if (exam) cls += " answered-exam";
        else cls += (s.answers[i] === q.correctIndex) ? " ok" : " bad";
      }
      label = "Go to question " + (i + 1) + (isAnswered(s, i) ? (exam ? ", answered" : (s.answers[i] === q.correctIndex ? ", correct" : ", incorrect")) : ", unanswered");
      return '<button class="' + cls + '" type="button" data-jump="' + i + '" aria-label="' + label + '">' + (i + 1) + "</button>";
    }).join("");

    var feedbackHtml = "";
    if (!exam && answered) {
      var ok = userAns === cur.correctIndex;
      feedbackHtml = '<div class="feedback show ' + (ok ? "correct" : "incorrect") + '" role="status">' +
        "<strong>" + (ok ? "✓ Correct! " + pickPraise() : "✗ Incorrect — correct answer highlighted above.") + "</strong>" +
        "<p><strong>Explanation:</strong> " + escapeHtml(cur.src.explanation || "No explanation provided.") + "</p></div>";
    } else if (exam && answered) {
      feedbackHtml = '<div class="feedback show" role="status"><strong>Answer locked in.</strong><p>Feedback is hidden in Exam Mode — you\'ll see everything at the end.</p></div>';
    }

    var modeTag = s.kind === "exam" ? "Exam Mode · " + formatTime(s.remaining != null ? s.remaining : EXAM_SECONDS) + " left"
      : s.kind === "daily" ? "Daily Practice" : s.kind === "random" ? "Random Practice · " + randomScopeName(s) + " · " + s.questions.length + " questions" : topicTitle(s.topic);

    app.innerHTML =
      '<div class="quiz-shell' + (state.softRefresh ? " no-anim" : "") + '"><div class="quiz-topbar">' +
      '<div class="quiz-top-row"><div><div class="quiz-topic">DP-900 · ' + escapeHtml(modeTag) + "</div>" +
      '<div class="quiz-counter">Question ' + (s.index + 1) + " of " + total + "</div></div>" +
      '<div class="quiz-timer' + (s.kind === "exam" && s.remaining < 120 ? " urgent" : "") + '" id="quiz-timer" aria-label="Timer">' +
      (s.kind === "exam" ? "⏱ " + formatTime(s.remaining != null ? s.remaining : EXAM_SECONDS) : "⏱ " + formatTime(s.elapsed || 0)) + "</div></div>" +
      '<div class="progress" role="progressbar" aria-valuenow="' + (s.index + 1) + '" aria-valuemin="1" aria-valuemax="' + total + '" aria-label="Quiz progress"><div style="width:' + pct + '%"></div></div>' +
      '<div class="quiz-answered">' + answeredCount + " answered · " + (total - answeredCount) + " remaining · " +
      (exam ? "Feedback hidden until submit" : "Press 1–" + cur.options.length + " to answer") + " · Enter = next</div>" +
      '<div class="quiz-dots" role="navigation" aria-label="Question navigator">' + dots + "</div></div>" +
      '<article class="question-card" aria-labelledby="q-text">' +
      '<p class="q-kicker">Question ' + (s.index + 1) + " of " + total + "</p>" +
      '<div class="q-badges"><span class="badge ' + difficultyLabel(cur.src.difficulty) + '">' + escapeHtml(difficultyLabel(cur.src.difficulty)) + "</span>" +
      '<span class="badge">' + escapeHtml(cur.src.topic || topicTitle(s.topic)) + "</span>" +
      (cur.src.subtopic ? '<span class="badge">' + escapeHtml(cur.src.subtopic) + "</span>" : "") + "</div>" +
      '<h2 class="question-text" id="q-text" tabindex="-1">' + escapeHtml(cur.src.question) + "</h2>" +
      '<ol class="options">' + optionsHtml + "</ol>" + feedbackHtml + "</article>" +
      '<div class="quiz-nav">' +
      '<div class="nav-group"><button class="btn secondary" id="btn-prev" type="button"' + (s.index === 0 ? " disabled" : "") + ">← Previous</button>" +
      (s.index < total - 1 ? '<button class="btn" id="btn-next" type="button">Next →</button>'
        : '<button class="btn" id="btn-finish" type="button">Submit ✓</button>') +
      '<span class="kbd-hint"><kbd>←</kbd><kbd>→</kbd> move · <kbd>1</kbd>–<kbd>4</kbd> answer · <kbd>Enter</kbd> next</span></div>' +
      '<button class="btn ghost small" id="btn-quit" type="button">← Exit practice</button></div></div>';

    Array.prototype.forEach.call(app.querySelectorAll("[data-opt]"), function (b) {
      b.addEventListener("click", function () { selectAnswer(parseInt(b.getAttribute("data-opt"), 10)); });
    });
    Array.prototype.forEach.call(app.querySelectorAll("[data-jump]"), function (b) {
      b.addEventListener("click", function () {
        playSound("click");
        s.index = parseInt(b.getAttribute("data-jump"), 10);
        renderQuestion(); focusQuestion();
      });
    });
    /* Exit sits at the bottom and needs a confirming second tap,
       so an accidental touch can never kill a practice session. */
    var quitBtn = document.getElementById("btn-quit");
    var quitArmed = false, quitTimer = null;
    quitBtn.addEventListener("click", function () {
      if (!quitArmed) {
        quitArmed = true;
        quitBtn.classList.add("armed");
        quitBtn.textContent = "Tap again to exit";
        quitTimer = setTimeout(function () {
          quitArmed = false;
          quitBtn.classList.remove("armed");
          quitBtn.textContent = "← Exit practice";
        }, 3000);
      } else {
        if (quitTimer) clearTimeout(quitTimer);
        stopTimer(); state.session = null; renderHome();
      }
    });
    var prev = document.getElementById("btn-prev");
    if (prev) prev.addEventListener("click", function () { previousQuestion(); });
    var next = document.getElementById("btn-next");
    if (next) next.addEventListener("click", function () { nextQuestion(); });
    var fin = document.getElementById("btn-finish");
    if (fin) fin.addEventListener("click", function () { finishQuiz(false); });
  }

  function pickPraise() {
    return ["Nice work!", "Exactly right!", "Well done!", "Got it!"][Math.floor(Math.random() * 4)];
  }

  function focusQuestion() {
    var h = document.getElementById("q-text");
    if (h) h.focus({ preventScroll: false });
  }

  /** Handle an answer pick. Practice locks; exam allows re-pick. Key mapping stays correct. */
  function selectAnswer(optIndex) {
    var s = state.session;
    if (!s) return;
    if (s.hideFeedback) {
      s.answers[s.index] = optIndex; // exam: selectable until submit
      playSound("click");
      renderQuestion();
      return;
    }
    if (isAnswered(s, s.index)) return; // prevent multiple submissions
    s.answers[s.index] = optIndex;
    var ok = optIndex === s.questions[s.index].correctIndex;
    playSound(ok ? "correct" : "incorrect");
    // Soft refresh: same question, no slide animation, no scroll jump.
    state.softRefresh = true;
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    showAnswerFeedback();
    window.scrollTo(0, y);
    state.softRefresh = false;
  }

  function showAnswerFeedback() { renderQuestion(); }
  function nextQuestion() {
    var s = state.session;
    if (!s) return;
    playSound("click");
    if (s.index < s.questions.length - 1) { s.index++; renderQuestion(); focusQuestion(); }
  }
  function previousQuestion() {
    var s = state.session;
    if (!s) return;
    playSound("click");
    if (s.index > 0) { s.index--; renderQuestion(); focusQuestion(); }
  }

  /* Reading progress for the notes view (passive, notes-only). */
  window.addEventListener("scroll", function () {
    if (state.view !== "notes") return;
    var bar = document.getElementById("read-progress");
    if (!bar) return;
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? Math.round(100 * (h.scrollTop || 0) / max) : 0) + "%";
  }, { passive: true });

  document.addEventListener("keydown", function (e) {
    if (state.view !== "quiz" || !state.session) return;
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return; // don't hijack typing
    var s = state.session;
    if (e.key >= "1" && e.key <= "6") {
      var idx = parseInt(e.key, 10) - 1;
      if (idx < s.questions[s.index].options.length) { e.preventDefault(); selectAnswer(idx); }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (s.index < s.questions.length - 1) nextQuestion(); else finishQuiz(false);
    } else if (e.key === "ArrowRight") {
      if (s.index < s.questions.length - 1) { s.index++; renderQuestion(); }
    } else if (e.key === "ArrowLeft") {
      if (s.index > 0) { s.index--; renderQuestion(); }
    }
  });

  /* ================= results ================= */

  /** Scope display name for a random session ("All topics" or the set title). */
  function randomScopeName(s) {
    if (s && s.topic && s.topic.scopeLabel) return s.topic.scopeLabel;
    return "All topics";
  }

  /** Grade the session. */
  function calculateResult() {
    var s = state.session, correct = 0, incorrect = 0, skipped = 0;
    s.questions.forEach(function (q, i) {
      var a = s.answers[i];
      if (a === null || a === undefined) skipped++;
      else if (a === q.correctIndex) correct++;
      else incorrect++;
    });
    var total = s.questions.length;
    return { correct: correct, incorrect: incorrect, skipped: skipped, total: total, pct: total ? Math.round(100 * correct / total) : 0 };
  }

  function finishQuiz(auto) {
    var s = state.session;
    if (!s || s.finished) return;
    stopTimer();
    s.finished = true;
    s.elapsed = Math.floor((Date.now() - s.startTime) / 1000);
    var r = calculateResult();
    r.elapsed = s.elapsed;
    r.remaining = s.remaining;
    // Persist: real topic id for single-topic; special ids for mixed modes.
    var storeId = (s.kind === "practice" && s.topic.id.indexOf("__") !== 0) ? s.topic.id : s.topic.id;
    saveAttempt(storeId, r.correct, r.total, { kind: s.kind });
    playSound("complete");
    renderResult(r, !!auto);
  }

  function performanceMessage(pct) {
    if (pct >= 90) return ["Outstanding! 🎉", "Exam-ready on this set. Do a mixed Random Practice next to confirm it holds across topics."];
    if (pct >= 75) return ["Great job! 💪", "Strong understanding. Review the ones you missed below, then retry for a fresh draw."];
    if (pct >= 60) return ["Good progress. 📈", "Moderate understanding — reread the explanations for your misses, then try again."];
    return ["Keep practicing. 🌱", "Short, frequent retries beat long cramming. Review each explanation, then go again."];
  }

  /** Render the result screen with animated score + breakdown + actions. */
  function renderResult(r, auto) {
    state.view = "results";
    var s = state.session;
    var pm = performanceMessage(r.pct);
    var byTopic = {};
    s.questions.forEach(function (q, i) {
      var key = q.src.topic || topicTitle(s.topic);
      if (s.kind === "practice") key = q.src.subtopic || key;
      byTopic[key] = byTopic[key] || { correct: 0, total: 0 };
      byTopic[key].total++;
      if (s.answers[i] === q.correctIndex) byTopic[key].correct++;
    });
    var byHtml = Object.keys(byTopic).sort().map(function (k) {
      var v = byTopic[k], p = Math.round(100 * v.correct / v.total);
      return '<span class="pill">' + escapeHtml(k) + ": " + v.correct + "/" + v.total + " (" + p + "%)</span>";
    }).join("");
    var kindLabel = s.kind === "exam" ? "🎯 Exam Mode" : s.kind === "daily" ? "🔥 Daily Practice" : s.kind === "random" ? "🎲 Random Practice · " + randomScopeName(s) : topicTitle(s.topic);

    app.innerHTML =
      '<div class="card" aria-labelledby="res-title"><div class="result-hero">' +
      '<span class="eyebrow">' + escapeHtml(kindLabel) + " · Results</span>" +
      '<h2 id="res-title" style="margin:6px 0">' + (auto ? "Time expired — auto-submitted ⏰" : "Quiz complete! 🎉") + "</h2>" +
      '<div class="score-ring" id="score-ring" style="--pct:0%" role="img" aria-label="Score ' + r.correct + " out of " + r.total + '">' +
      '<div class="score-inner"><strong id="score-num">0 / ' + r.total + "</strong><span>" + r.pct + "% · " +
      (s.kind === "exam" ? "used " + formatTime(EXAM_SECONDS - (r.remaining || 0)) : formatTime(r.elapsed)) + "</span></div></div></div>" +
      '<div class="result-stats"><div class="mini-stat"><strong>✓ ' + r.correct + '</strong><span>Correct</span></div>' +
      '<div class="mini-stat"><strong>✗ ' + r.incorrect + '</strong><span>Incorrect</span></div>' +
      '<div class="mini-stat"><strong>' + r.skipped + '</strong><span>Skipped</span></div>' +
      '<div class="mini-stat"><strong>' + r.pct + '%</strong><span>Accuracy</span></div></div>' +
      '<div class="perf-msg"><strong>' + escapeHtml(pm[0]) + "</strong><p style=\"margin:4px 0 8px\">" + escapeHtml(pm[1]) + '</p><div class="topic-meta">' + byHtml + "</div></div>" +
      '<div class="card-actions" style="margin-top:14px">' +
      '<button class="btn" id="btn-review" type="button">Review answers</button>' +
      '<button class="btn secondary" id="btn-retry" type="button">Retry quiz</button>' +
      '<button class="btn secondary" id="btn-quick" type="button">Random Practice</button>' +
      '<button class="btn ghost" id="btn-home" type="button">Back to topics</button></div>' +
      '<div id="review-slot" style="margin-top:16px"></div></div>';

    // Animated score counter.
    var num = document.getElementById("score-num"), ring = document.getElementById("score-ring");
    var t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / 750);
      var v = Math.round(r.correct * k);
      if (num) num.textContent = v + " / " + r.total;
      if (ring) ring.style.setProperty("--pct", Math.round(r.pct * k) + "%");
      if (k < 1) requestAnimationFrame(step);
    }
    if (window.requestAnimationFrame) requestAnimationFrame(step);
    else { if (num) num.textContent = r.correct + " / " + r.total; if (ring) ring.style.setProperty("--pct", r.pct + "%"); }

    document.getElementById("btn-review").addEventListener("click", function () { playSound("click"); renderReview(); });
    document.getElementById("btn-retry").addEventListener("click", function () {
      playSound("click");
      if (s.kind === "practice") startQuiz(s.topic.id, { kind: "practice" });
      else startMixed(s.kind === "daily" ? "daily" : s.kind, s.count || QUESTIONS_PER_SESSION,
        s.topic.scopeId || undefined);
    });
    document.getElementById("btn-quick").addEventListener("click", function () { playSound("click"); startMixed("random", s.count || 15, s.topic.scopeId || undefined); });
    document.getElementById("btn-home").addEventListener("click", function () { state.session = null; renderHome(); });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Improved review: incorrect answers visually prominent. */
  function renderReview() {
    var s = state.session;
    var slot = document.getElementById("review-slot");
    if (!slot || !s) return;
    state.view = "results";
    var html = "<h3>Review — your answer vs the correct answer</h3>";
    s.questions.forEach(function (q, i) {
      var a = s.answers[i], ok = a === q.correctIndex;
      var status = (a === null || a === undefined) ? '<span class="status-tag skipped">SKIPPED</span>'
        : ok ? '<span class="status-tag correct">✓ CORRECT</span>' : '<span class="status-tag incorrect">✗ INCORRECT</span>';
      var cls = (a === null || a === undefined) ? "skipped" : ok ? "correct" : "incorrect";
      html += '<div class="review-item ' + cls + '"><h4>Question ' + (i + 1) + " · " + escapeHtml(q.src.id) + " · " +
        escapeHtml(difficultyLabel(q.src.difficulty)) + " " + status + "</h4>" +
        "<p><strong>" + escapeHtml(q.src.question) + "</strong></p>" +
        '<p class="answer-line"><span class="label">Your answer:</span> ' +
        ((a === null || a === undefined) ? "<em>— no answer —</em>" : (ok ? "✓ " : "❌ ") + escapeHtml(q.options[a])) + "</p>" +
        '<p class="answer-line"><span class="label">Correct answer:</span> <strong>✓ ' + escapeHtml(q.options[q.correctIndex]) + "</strong></p>" +
        '<div class="explain"><strong>Explanation:</strong> ' + escapeHtml(q.src.explanation || "") + "</div></div>";
    });
    slot.innerHTML = html;
    slot.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ================= question bank ================= */

  function allBankQuestions() {
    var out = [];
    state.topics.forEach(function (t) {
      var c = state.topicCache[t.id];
      if (c && c.questions) c.questions.forEach(function (q) { out.push({ topicMeta: t, q: q }); });
    });
    return out;
  }

  function renderBank() {
    state.view = "bank";
    var topicOptions = '<option value="all">All topics</option>' + state.topics.map(function (t) {
      return '<option value="' + escapeHtml(t.id) + '"' + (state.bankTopicId === t.id ? " selected" : "") + ">" + escapeHtml(topicTitle(t)) + "</option>";
    }).join("");
    app.innerHTML =
      '<section class="card" aria-labelledby="bank-title"><span class="eyebrow">Self-study</span>' +
      '<h2 id="bank-title" style="margin:4px 0">Question bank</h2>' +
      '<p class="section-sub">Browse every question. Answers hide inside each item — attempt before expanding.</p>' +
      '<div class="bank-controls">' +
      '<input class="input" id="bank-search" type="search" placeholder="Search questions, options, explanations…" value="' + escapeHtml(state.bankQuery) + '" aria-label="Search questions" />' +
      '<select class="select" id="bank-diff" aria-label="Filter by difficulty">' +
      [["all", "All levels"], ["easy", "Easy"], ["medium", "Medium"], ["hard", "Hard"], ["scenario", "Scenario"]].map(function (d) {
        return '<option value="' + d[0] + '"' + (state.bankDifficulty === d[0] ? " selected" : "") + ">" + d[1] + "</option>";
      }).join("") + "</select>" +
      '<select class="select" id="bank-topic" aria-label="Filter by topic">' + topicOptions + "</select></div>" +
      '<div id="bank-list" aria-live="polite"><div class="loading-card"><div class="skeleton skeleton-hero"></div><p>Loading bank…</p></div></div>' +
      '<div class="card-actions" style="margin-top:12px"><button class="btn ghost" id="bank-home" type="button">← Back to topics</button></div></section>';
    document.getElementById("bank-home").addEventListener("click", renderHome);
    document.getElementById("bank-search").addEventListener("input", function (e) { state.bankQuery = e.target.value; paintBankList(); });
    document.getElementById("bank-diff").addEventListener("change", function (e) { state.bankDifficulty = e.target.value; paintBankList(); });
    document.getElementById("bank-topic").addEventListener("change", function (e) { state.bankTopicId = e.target.value; paintBankList(); });
    ensureAllLoaded().then(paintBankList);
  }

  function paintBankList() {
    var list = document.getElementById("bank-list");
    if (!list) return;
    var query = (state.bankQuery || "").toLowerCase().trim();
    var items = allBankQuestions().filter(function (row) {
      if (state.bankTopicId !== "all" && row.topicMeta.id !== state.bankTopicId) return false;
      if (state.bankDifficulty !== "all" && difficultyLabel(row.q.difficulty) !== state.bankDifficulty) return false;
      if (query && ((row.q.question + " " + row.q.options.join(" ") + " " + (row.q.explanation || "") + " " + (row.q.subtopic || "")).toLowerCase().indexOf(query) < 0)) return false;
      return true;
    });
    if (!items.length) {
      list.innerHTML = '<div class="card"><p>No questions match these filters yet. Clear the search or pick another level.</p></div>';
      return;
    }
    list.innerHTML = '<p class="section-sub">' + items.length + " question(s) · click any item to reveal the answer.</p>" +
      items.map(function (row, i) {
        var q = row.q, correctText = q.options[q.correctAnswer];
        return '<details class="bank-item"><summary>Q' + (i + 1) + " · [" + escapeHtml(topicTitle(row.topicMeta)) + "] " + escapeHtml(q.question) + "</summary>" +
          '<div class="bank-meta"><span class="badge ' + difficultyLabel(q.difficulty) + '">' + escapeHtml(difficultyLabel(q.difficulty)) + "</span>" +
          (q.subtopic ? '<span class="badge">' + escapeHtml(q.subtopic) + "</span>" : "") +
          '<span class="badge">' + escapeHtml(q.id) + "</span></div><ol>" +
          q.options.map(function (o) { return "<li>" + escapeHtml(o) + (o === correctText ? " ✓" : "") + "</li>"; }).join("") +
          "</ol><p><strong>Answer:</strong> " + escapeHtml(correctText) + '</p><div class="explain"><strong>Explanation:</strong> ' + escapeHtml(q.explanation || "") + "</div></details>";
      }).join("");
  }

  /* ================= dashboard upkeep ================= */

  function updateDashboard() { if (state.view === "home") renderHome(); }
  void updateDashboard;
})();
