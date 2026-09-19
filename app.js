/* DP-900 Practice Center — reusable static quiz engine (vanilla JS).
   Data-driven: adding a new topic = new JSON file + entry in data/topics.json.
   No backend. Works on GitHub Pages with relative paths. */
(function () {
  "use strict";

  var QUESTIONS_PER_SESSION = 15;
  var TOPICS_URL = "./data/topics.json";
  var STORAGE_KEY = "dp900-progress-v1";

  var app = document.getElementById("app");

  var state = {
    view: "home",
    topics: [],
    topicCache: {},   // topicId -> { meta, questions }
    topicStats: {},   // topicId -> { total, byDifficulty }
    session: null,    // active quiz session
    bankTopicId: "all",
    bankDifficulty: "all",
    bankQuery: "",
    reviewFrom: "results"
  };

  /* ---------- utils ---------- */

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
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fetchJSON(url) {
    return fetch(url, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status + " loading " + url);
      return res.json();
    });
  }

  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch (e) { return {}; }
  }

  function saveProgress(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch (e) { /* storage unavailable — app still works */ }
  }

  function recordAttempt(topicId, score, total) {
    var p = loadProgress();
    var prev = p[topicId] || { attempts: 0, bestScore: 0, bestTotal: 0 };
    prev.attempts = (prev.attempts || 0) + 1;
    var prevPct = prev.bestTotal ? prev.bestScore / prev.bestTotal : -1;
    var curPct = total ? score / total : 0;
    if (curPct > prevPct) { prev.bestScore = score; prev.bestTotal = total; }
    prev.lastScore = score;
    prev.lastTotal = total;
    prev.lastDate = new Date().toISOString();
    p[topicId] = prev;
    saveProgress(p);
  }

  function formatTime(totalSeconds) {
    var m = Math.floor(totalSeconds / 60);
    var s = totalSeconds % 60;
    return (m < 10 ? "0" + m : "" + m) + ":" + (s < 10 ? "0" + s : "" + s);
  }

  function difficultyLabel(d) {
    d = String(d || "medium").toLowerCase();
    if (d === "easy" || d === "medium" || d === "hard" || d === "scenario") return d;
    if (d.indexOf("exam") >= 0) return "scenario";
    return "medium";
  }

  function stopTimer() {
    if (state.session && state.session.timerId) {
      clearInterval(state.session.timerId);
      state.session.timerId = null;
    }
  }

  /* ---------- boot ---------- */

  document.getElementById("brand-home").addEventListener("click", function (e) {
    e.preventDefault(); stopTimer(); renderHome();
  });
  document.getElementById("nav-topics").addEventListener("click", function () {
    stopTimer(); renderHome(true);
  });
  document.getElementById("nav-bank").addEventListener("click", function () {
    stopTimer(); renderBank();
  });
  document.getElementById("nav-how").addEventListener("click", function () {
    stopTimer(); renderHome(false, true);
  });

  init();

  function init() {
    fetchJSON(TOPICS_URL).then(function (topics) {
      state.topics = Array.isArray(topics) ? topics : [];
      // Preload counts for homepage cards (non-blocking, progressive).
      renderHome();
      var loaders = state.topics.map(function (t) {
        return fetchJSON(t.file).then(function (qs) {
          state.topicCache[t.id] = { meta: t, questions: qs };
          state.topicStats[t.id] = summarize(qs);
        }).catch(function () {
          state.topicStats[t.id] = { total: 0, byDifficulty: {}, error: true };
        });
      });
      Promise.all(loaders).then(function () { if (state.view === "home") renderHome(); });
    }).catch(function (err) {
      renderFetchError(err);
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

  function renderFetchError(err) {
    state.view = "error";
    app.innerHTML =
      '<div class="card error-card" role="alert">' +
      "<h2>Could not load question data</h2>" +
      "<p>" + escapeHtml(err && err.message ? err.message : String(err)) + "</p>" +
      "<p>If you opened this file directly with <code>file://</code>, browsers block <code>fetch()</code> of JSON. " +
      "Run a local static server instead, e.g.: <code>python -m http.server</code> in this folder, then open " +
      "<code>http://localhost:8000</code>. On GitHub Pages this works without extra setup.</p>" +
      '<button class="btn" id="btn-retry" type="button">Retry</button>' +
      "</div>";
    document.getElementById("btn-retry").addEventListener("click", init);
  }

  /* ---------- home ---------- */

  function renderHome(scrollToTopics, scrollToHow) {
    state.view = "home";
    var progress = loadProgress();
    var totalQuestions = state.topics.reduce(function (n, t) {
      var s = state.topicStats[t.id];
      return n + (s && s.total ? s.total : 0);
    }, 0);
    var totalAttempts = Object.keys(progress).reduce(function (n, k) {
      return n + (progress[k].attempts || 0);
    }, 0);
    var bestOverall = null;
    Object.keys(progress).forEach(function (k) {
      var p = progress[k];
      if (p.bestTotal) {
        var pct = Math.round((p.bestScore / p.bestTotal) * 100);
        if (!bestOverall || pct > bestOverall.pct) {
          bestOverall = { pct: pct, score: p.bestScore, total: p.bestTotal };
        }
      }
    });

    var cards = state.topics.map(function (t) {
      var s = state.topicStats[t.id];
      var count = s ? s.total : null;
      var countLabel = s ? (s.error ? "Unavailable" : count + (count === 1 ? " question" : " questions")) : "Loading…";
      var p = progress[t.id];
      var best = p && p.bestTotal ? ("Best: " + p.bestScore + "/" + p.bestTotal) : "Not attempted yet";
      var attempts = p && p.attempts ? (p.attempts + (p.attempts === 1 ? " attempt" : " attempts")) : "0 attempts";
      var diffPills = "";
      if (s && !s.error) {
        ["easy", "medium", "hard", "scenario"].forEach(function (d) {
          if (s.byDifficulty[d]) diffPills += '<span class="pill">' + d + ": " + s.byDifficulty[d] + "</span>";
        });
      }
      return (
        '<article class="topic-card" aria-label="' + escapeHtml(t.name) + '">' +
        '<div class="topic-top"><div class="topic-icon" aria-hidden="true">' + escapeHtml(t.icon || "◈") + "</div>" +
        "<div><h3>" + escapeHtml(t.name) + "</h3>" +
        (t.examWeight ? '<div class="exam-weight">' + escapeHtml(t.examWeight) + "</div>" : "") +
        "</div></div>" +
        '<p class="desc">' + escapeHtml(t.description || "") + "</p>" +
        '<div class="topic-meta"><span class="pill"><strong>' + escapeHtml(countLabel) + "</strong></span>" + diffPills + "</div>" +
        '<div class="topic-meta"><span class="pill good">' + escapeHtml(best) + "</span>" +
        '<span class="pill">' + escapeHtml(attempts) + "</span></div>" +
        '<div class="card-actions">' +
        '<button class="btn small" type="button" data-start="' + escapeHtml(t.id) + '">Start quiz · 15</button>' +
        '<button class="btn secondary small" type="button" data-browse="' + escapeHtml(t.id) + '">Browse questions</button>' +
        "</div></article>"
      );
    }).join("");

    if (!cards) {
      cards = '<div class="card"><p>No topics found in <code>data/topics.json</code> yet.</p></div>';
    }

    app.innerHTML =
      '<section class="hero" aria-labelledby="hero-title">' +
      '<span class="eyebrow">DP-900 · Azure Data Fundamentals</span>' +
      '<h1 id="hero-title">Practice. Learn. Improve.</h1>' +
      '<p class="lead">Exam-style multiple-choice sets with instant feedback and explanations. ' +
      "Each run picks <strong>15 random questions</strong> and shuffles the answer order — so it never feels the same twice.</p>" +
      '<ul class="hero-points"><li>✓ Correct / ✗ Incorrect states + explanations</li><li>Progress bar &amp; review mode</li><li>Best scores saved in your browser</li></ul>' +
      '<div class="stat-grid" role="list">' +
      '<div class="stat" role="listitem"><strong>' + state.topics.length + "</strong><span>Topics</span></div>" +
      '<div class="stat" role="listitem"><strong>' + totalQuestions + "</strong><span>Questions in bank</span></div>" +
      '<div class="stat" role="listitem"><strong>' + (bestOverall ? bestOverall.pct + "%" : "—") + "</strong><span>" +
      (bestOverall ? "Best score (" + bestOverall.score + "/" + bestOverall.total + ")" : "Best score · take a quiz") + "</span></div>" +
      "</div>" +
      '<p class="section-sub" style="margin:6px 0 0">Sessions: ' + totalAttempts + " attempt(s) on this device.</p>" +
      "</section>" +
      '<h2 class="section-title" id="topics-heading">Question sets</h2>' +
      '<p class="section-sub">Pick a topic to start a 15-question session. If a set has fewer than 15, you get the whole set.</p>' +
      '<div class="topic-grid">' + cards + "</div>" +
      '<h2 class="section-title" id="how-heading">How it works</h2>' +
      '<div class="how-grid">' +
      '<div class="how-card"><h3>1 · Start a session</h3><p>We load the topic JSON, pick up to 15 questions at random, and shuffle both questions and options.</p></div>' +
      '<div class="how-card"><h3>2 · Answer &amp; learn</h3><p>Pick an answer to lock it in. Correct answers go green, wrong ones show the right answer plus an explanation.</p></div>' +
      '<div class="how-card"><h3>3 · Review &amp; retry</h3><p>See your score, time, per-question review, and retry with a fresh random draw. Use Previous/Next freely.</p></div>' +
      '<div class="how-card"><h3>4 · Add topics without code changes</h3><p>Drop a new <code>data/*.json</code> file and one entry in <code>data/topics.json</code> — it appears here automatically.</p></div>' +
      "</div>";

    Array.prototype.forEach.call(app.querySelectorAll("[data-start]"), function (btn) {
      btn.addEventListener("click", function () { startQuiz(btn.getAttribute("data-start")); });
    });
    Array.prototype.forEach.call(app.querySelectorAll("[data-browse]"), function (btn) {
      btn.addEventListener("click", function () {
        state.bankTopicId = btn.getAttribute("data-browse");
        renderBank();
      });
    });

    if (scrollToTopics) {
      var h = document.getElementById("topics-heading");
      if (h) h.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (scrollToHow) {
      var hw = document.getElementById("how-heading");
      if (hw) hw.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /* ---------- quiz ---------- */

  function startQuiz(topicId) {
    var meta = null;
    state.topics.forEach(function (t) { if (t.id === topicId) meta = t; });
    if (!meta) return;

    function begin(questions) {
      if (!questions || !questions.length) {
        app.innerHTML = '<div class="card error-card"><h2>No questions in this topic yet</h2>' +
          '<p><button class="btn" id="btn-back" type="button">Back to topics</button></p></div>';
        document.getElementById("btn-back").addEventListener("click", renderHome);
        return;
      }
      var picked = shuffle(questions).slice(0, QUESTIONS_PER_SESSION);
      var sessionQs = picked.map(function (q) {
        // Build shuffled options while preserving the answer key.
        var indexed = q.options.map(function (text, i) {
          return { text: text, isCorrect: i === q.correctAnswer };
        });
        var shuffled = shuffle(indexed);
        var newCorrect = 0;
        shuffled.forEach(function (o, i) { if (o.isCorrect) newCorrect = i; });
        return {
          src: q,
          options: shuffled.map(function (o) { return o.text; }),
          correctIndex: newCorrect
        };
      });
      state.session = {
        topic: meta,
        questions: sessionQs,
        index: 0,
        answers: sessionQs.map(function () { return null; }),
        startTime: Date.now(),
        elapsed: 0,
        timerId: null,
        finished: false
      };
      state.session.timerId = setInterval(tickTimer, 1000);
      state.view = "quiz";
      renderQuiz();
    }

    if (state.topicCache[topicId]) {
      begin(state.topicCache[topicId].questions);
    } else {
      app.innerHTML = '<div class="loading-card"><div class="spinner"></div><p>Loading ' + escapeHtml(meta.name) + "…</p></div>";
      fetchJSON(meta.file).then(function (qs) {
        state.topicCache[topicId] = { meta: meta, questions: qs };
        state.topicStats[topicId] = summarize(qs);
        begin(qs);
      }).catch(renderFetchError);
    }
  }

  function tickTimer() {
    if (!state.session || state.view !== "quiz") return;
    state.session.elapsed = Math.floor((Date.now() - state.session.startTime) / 1000);
    var el = document.getElementById("quiz-timer");
    if (el) el.textContent = "⏱ " + formatTime(state.session.elapsed);
  }

  function renderQuiz() {
    var s = state.session;
    if (!s) { renderHome(); return; }
    state.view = "quiz";
    var total = s.questions.length;
    var cur = s.questions[s.index];
    var userAns = s.answers[s.index];
    var answered = userAns !== null && userAns !== undefined;
    var answeredCount = s.answers.filter(function (a) { return a !== null && a !== undefined; }).length;
    var pct = Math.round(((s.index + 1) / total) * 100);
    var letters = ["A", "B", "C", "D", "E", "F"];

    var optionsHtml = cur.options.map(function (text, i) {
      var cls = "option-btn";
      var stateBadge = "";
      if (answered) {
        if (i === cur.correctIndex) { cls += " correct"; stateBadge = '<span class="option-state ok">✓ Correct</span>'; }
        else if (i === userAns) { cls += " incorrect"; stateBadge = '<span class="option-state bad">✗ Your answer</span>'; }
        else { cls += " dim"; }
      }
      return '<li><button class="' + cls + '" type="button" data-opt="' + i + '"' +
        (answered ? " disabled" : "") +
        ' aria-pressed="' + (userAns === i ? "true" : "false") + '">' +
        '<span class="option-letter" aria-hidden="true">' + letters[i] + "</span>" +
        "<span>" + escapeHtml(text) + "</span>" + stateBadge + "</button></li>";
    }).join("");

    var dots = s.questions.map(function (_, i) {
      var a = s.answers[i];
      var cls = "dot";
      if (i === s.index) cls += " current";
      if (a !== null && a !== undefined) {
        cls += (a === s.questions[i].correctIndex) ? " answered-correct" : " answered-wrong";
      }
      return '<button class="' + cls + '" type="button" data-jump="' + i + '" aria-label="Go to question ' + (i + 1) + '">' + (i + 1) + "</button>";
    }).join("");

    var feedbackHtml = "";
    if (answered) {
      var ok = userAns === cur.correctIndex;
      feedbackHtml =
        '<div class="feedback show ' + (ok ? "correct" : "incorrect") + '" role="status">' +
        "<strong>" + (ok ? "✓ Correct! Nice work." : "✗ Incorrect — correct answer highlighted above.") + "</strong>" +
        "<p><strong>Explanation:</strong> " + escapeHtml(cur.src.explanation || "No explanation provided.") + "</p>" +
        "</div>";
    }

    app.innerHTML =
      '<div class="quiz-shell">' +
      '<div class="quiz-topbar">' +
      '<div class="quiz-top-row"><div><div class="quiz-topic">' + escapeHtml(s.topic.name) + "</div>" +
      '<div class="quiz-counter">Question ' + (s.index + 1) + " of " + total +
      (total < QUESTIONS_PER_SESSION ? " (full set — fewer than " + QUESTIONS_PER_SESSION + " available)" : "") + "</div></div>" +
      '<div class="quiz-timer" id="quiz-timer" aria-label="Elapsed time">⏱ ' + formatTime(s.elapsed || 0) + "</div></div>" +
      '<div class="progress" role="progressbar" aria-valuenow="' + (s.index + 1) + '" aria-valuemin="1" aria-valuemax="' + total + '" aria-label="Quiz progress">' +
      "<div style=\"width:" + pct + '%"></div></div>' +
      '<div class="quiz-answered">' + answeredCount + " answered · " + (total - answeredCount) + " remaining · Press 1–" + cur.options.length + " to answer, ←/→ to move</div>" +
      '<div class="quiz-dots" role="navigation" aria-label="Question jump">' + dots + "</div>" +
      "</div>" +
      '<article class="question-card" aria-labelledby="q-text">' +
      '<div class="q-badges"><span class="badge ' + difficultyLabel(cur.src.difficulty) + '">' + escapeHtml(difficultyLabel(cur.src.difficulty)) + "</span>" +
      (cur.src.subtopic ? '<span class="badge">' + escapeHtml(cur.src.subtopic) + "</span>" : "") +
      '<span class="badge">ID ' + escapeHtml(cur.src.id) + "</span></div>" +
      '<h2 class="question-text" id="q-text">' + escapeHtml(cur.src.question) + "</h2>" +
      '<ol class="options" style="list-style:none;margin:0;padding:0;display:grid;gap:10px">' + optionsHtml + "</ol>" +
      feedbackHtml +
      "</article>" +
      '<div class="quiz-nav">' +
      '<div class="nav-group"><button class="btn ghost" id="btn-quit" type="button">← Topics</button></div>' +
      '<div class="nav-group">' +
      '<button class="btn secondary" id="btn-prev" type="button"' + (s.index === 0 ? " disabled" : "") + ">← Previous</button>" +
      (s.index < total - 1
        ? '<button class="btn" id="btn-next" type="button">Next →</button>'
        : '<button class="btn" id="btn-finish" type="button">See results ✓</button>') +
      "</div></div>" +
      "</div>";

    Array.prototype.forEach.call(app.querySelectorAll("[data-opt]"), function (btn) {
      btn.addEventListener("click", function () {
        selectAnswer(parseInt(btn.getAttribute("data-opt"), 10));
      });
    });
    Array.prototype.forEach.call(app.querySelectorAll("[data-jump]"), function (btn) {
      btn.addEventListener("click", function () {
        s.index = parseInt(btn.getAttribute("data-jump"), 10);
        renderQuiz();
        focusQuestion();
      });
    });
    document.getElementById("btn-quit").addEventListener("click", function () {
      stopTimer(); state.session = null; renderHome();
    });
    var prev = document.getElementById("btn-prev");
    if (prev) prev.addEventListener("click", function () {
      if (s.index > 0) { s.index--; renderQuiz(); focusQuestion(); }
    });
    var next = document.getElementById("btn-next");
    if (next) next.addEventListener("click", function () {
      if (s.index < total - 1) { s.index++; renderQuiz(); focusQuestion(); }
    });
    var finish = document.getElementById("btn-finish");
    if (finish) finish.addEventListener("click", finishQuiz);
  }

  function focusQuestion() {
    var h = document.getElementById("q-text");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: false }); }
  }

  function selectAnswer(optIndex) {
    var s = state.session;
    if (!s || s.answers[s.index] !== null && s.answers[s.index] !== undefined) return;
    s.answers[s.index] = optIndex;
    renderQuiz();
  }

  document.addEventListener("keydown", function (e) {
    if (state.view !== "quiz" || !state.session) return;
    var s = state.session;
    if (e.key >= "1" && e.key <= "6") {
      var idx = parseInt(e.key, 10) - 1;
      if (idx < s.questions[s.index].options.length) selectAnswer(idx);
    } else if (e.key === "ArrowRight") {
      if (s.index < s.questions.length - 1) { s.index++; renderQuiz(); }
    } else if (e.key === "ArrowLeft") {
      if (s.index > 0) { s.index--; renderQuiz(); }
    }
  });

  /* ---------- results + review ---------- */

  function finishQuiz() {
    var s = state.session;
    if (!s) return;
    stopTimer();
    s.finished = true;
    var total = s.questions.length;
    var correct = 0, incorrect = 0, skipped = 0;
    s.questions.forEach(function (q, i) {
      var a = s.answers[i];
      if (a === null || a === undefined) skipped++;
      else if (a === q.correctIndex) correct++;
      else incorrect++;
    });
    var pct = total ? Math.round((correct / total) * 100) : 0;
    var elapsed = s.elapsed || Math.floor((Date.now() - s.startTime) / 1000);
    recordAttempt(s.topic.id, correct, total);
    renderResults({ correct: correct, incorrect: incorrect, skipped: skipped, total: total, pct: pct, elapsed: elapsed });
  }

  function performanceMessage(pct) {
    if (pct >= 90) return ["Outstanding!", "Excellent understanding — you are exam-ready on this topic. Keep mixed review to stay sharp."];
    if (pct >= 75) return ["Great job!", "Strong understanding of this topic. Review the questions you missed before moving to the next topic."];
    if (pct >= 60) return ["Good progress.", "Moderate understanding — revise the missed explanations, then retry for a fresh random set."];
    return ["Keep practicing.", "Review structured vs unstructured data, OLTP/OLAP, roles, and Azure data services, then try again. Short retries beat long cramming."];
  }

  function renderResults(r) {
    state.view = "results";
    var s = state.session;
    var pm = performanceMessage(r.pct);
    var subStats = {};
    s.questions.forEach(function (q, i) {
      var key = q.src.subtopic || "General";
      subStats[key] = subStats[key] || { correct: 0, total: 0 };
      subStats[key].total++;
      if (s.answers[i] === q.correctIndex) subStats[key].correct++;
    });
    var subHtml = Object.keys(subStats).sort().map(function (k) {
      var v = subStats[k];
      return '<span class="pill">' + escapeHtml(k) + ": " + v.correct + "/" + v.total + "</span>";
    }).join("");

    app.innerHTML =
      '<div class="card" aria-labelledby="res-title">' +
      '<div class="result-hero"><span class="eyebrow">' + escapeHtml(s.topic.name) + " · Results</span>" +
      '<h2 id="res-title" style="margin:6px 0">Quiz complete 🎉</h2>' +
      '<div class="score-ring" style="--pct:' + r.pct + '%" role="img" aria-label="Score ' + r.correct + " out of " + r.total + '">' +
      '<div class="score-inner"><strong>' + r.correct + " / " + r.total + "</strong><span>" + r.pct + "% · " + formatTime(r.elapsed) + "</span></div></div>" +
      "</div>" +
      '<div class="result-stats">' +
      '<div class="mini-stat"><strong>' + r.correct + '</strong><span>Correct</span></div>' +
      '<div class="mini-stat"><strong>' + r.incorrect + '</strong><span>Incorrect</span></div>' +
      '<div class="mini-stat"><strong>' + r.skipped + '</strong><span>Skipped</span></div>' +
      '<div class="mini-stat"><strong>' + formatTime(r.elapsed) + "</strong><span>Time taken</span></div>" +
      "</div>" +
      '<div class="perf-msg"><strong>' + escapeHtml(pm[0]) + "</strong><p style=\"margin:4px 0 8px\">" + escapeHtml(pm[1]) + "</p>" +
      '<div class="topic-meta">' + subHtml + "</div></div>" +
      '<div class="card-actions" style="margin-top:14px">' +
      '<button class="btn" id="btn-review" type="button">Review answers</button>' +
      '<button class="btn secondary" id="btn-retry" type="button">Retry (new random 15)</button>' +
      '<button class="btn ghost" id="btn-home" type="button">All topics</button>' +
      "</div>" +
      '<div id="review-slot" style="margin-top:16px"></div>' +
      "</div>";

    document.getElementById("btn-review").addEventListener("click", function () {
      renderReviewInline();
    });
    document.getElementById("btn-retry").addEventListener("click", function () {
      startQuiz(s.topic.id);
    });
    document.getElementById("btn-home").addEventListener("click", function () {
      state.session = null; renderHome();
    });
  }

  function renderReviewInline() {
    var s = state.session;
    var slot = document.getElementById("review-slot");
    if (!slot) return;
    var html = "<h3>Review — every question, your answer vs correct answer</h3>";
    s.questions.forEach(function (q, i) {
      var a = s.answers[i];
      var ok = a === q.correctIndex;
      var status = (a === null || a === undefined)
        ? '<span class="status-tag skipped">SKIPPED</span>'
        : (ok ? '<span class="status-tag correct">✓ CORRECT</span>' : '<span class="status-tag incorrect">✗ INCORRECT</span>');
      var cls = (a === null || a === undefined) ? "skipped" : (ok ? "correct" : "incorrect");
      var yourAns = (a === null || a === undefined) ? "<em>— no answer —</em>" : escapeHtml(q.options[a]);
      html +=
        '<div class="review-item ' + cls + '">' +
        "<h4>Question " + (i + 1) + " · " + escapeHtml(q.src.id) + " · " + escapeHtml(difficultyLabel(q.src.difficulty)) + " " + status + "</h4>" +
        "<p><strong>" + escapeHtml(q.src.question) + "</strong></p>" +
        '<p class="answer-line"><span class="label">Your answer:</span> ' + yourAns + "</p>" +
        '<p class="answer-line"><span class="label">Correct answer:</span> <strong>' + escapeHtml(q.options[q.correctIndex]) + "</strong></p>" +
        '<div class="explain"><strong>Explanation:</strong> ' + escapeHtml(q.src.explanation || "") + "</div>" +
        "</div>";
    });
    slot.innerHTML = html;
    slot.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- question bank ---------- */

  function allBankQuestions() {
    var out = [];
    state.topics.forEach(function (t) {
      var entry = state.topicCache[t.id];
      if (entry && entry.questions) {
        entry.questions.forEach(function (q) {
          out.push({ topicMeta: t, q: q });
        });
      }
    });
    return out;
  }

  function renderBank() {
    state.view = "bank";
    var topicOptions = '<option value="all">All topics</option>' + state.topics.map(function (t) {
      return '<option value="' + escapeHtml(t.id) + '"' + (state.bankTopicId === t.id ? " selected" : "") + ">" + escapeHtml(t.name) + "</option>";
    }).join("");

    app.innerHTML =
      '<section class="card" aria-labelledby="bank-title">' +
      '<span class="eyebrow">Self-study</span>' +
      '<h2 id="bank-title" style="margin:4px 0">Question bank</h2>' +
      '<p class="section-sub">Browse every question. Answers are hidden inside each item — try to answer before expanding.</p>' +
      '<div class="bank-controls">' +
      '<input class="input" id="bank-search" type="search" placeholder="Search questions, options, explanations…" value="' + escapeHtml(state.bankQuery) + '" aria-label="Search questions" />' +
      '<select class="select" id="bank-diff" aria-label="Filter by difficulty">' +
      ["all", "easy", "medium", "hard", "scenario"].map(function (d) {
        return '<option value="' + d + '"' + (state.bankDifficulty === d ? " selected" : "") + ">" +
          (d === "all" ? "All levels" : d[0].toUpperCase() + d.slice(1)) + "</option>";
      }).join("") + "</select>" +
      '<select class="select" id="bank-topic" aria-label="Filter by topic">' + topicOptions + "</select>" +
      "</div>" +
      '<div id="bank-list" aria-live="polite"><div class="loading-card"><div class="spinner"></div><p>Loading bank…</p></div></div>' +
      '<div class="card-actions" style="margin-top:12px"><button class="btn ghost" id="bank-home" type="button">← Back to topics</button></div>' +
      "</section>";

    document.getElementById("bank-home").addEventListener("click", renderHome);
    document.getElementById("bank-search").addEventListener("input", function (e) {
      state.bankQuery = e.target.value; paintBankList();
    });
    document.getElementById("bank-diff").addEventListener("change", function (e) {
      state.bankDifficulty = e.target.value; paintBankList();
    });
    document.getElementById("bank-topic").addEventListener("change", function (e) {
      state.bankTopicId = e.target.value; paintBankList();
    });

    // Ensure data is loaded before painting.
    var missing = state.topics.filter(function (t) { return !state.topicCache[t.id]; });
    if (!missing.length) { paintBankList(); return; }
    Promise.all(missing.map(function (t) {
      return fetchJSON(t.file).then(function (qs) {
        state.topicCache[t.id] = { meta: t, questions: qs };
        state.topicStats[t.id] = summarize(qs);
      }).catch(function () {});
    })).then(paintBankList);
  }

  function paintBankList() {
    var list = document.getElementById("bank-list");
    if (!list) return;
    var query = (state.bankQuery || "").toLowerCase().trim();
    var items = allBankQuestions().filter(function (row) {
      if (state.bankTopicId !== "all" && row.topicMeta.id !== state.bankTopicId) return false;
      if (state.bankDifficulty !== "all" && difficultyLabel(row.q.difficulty) !== state.bankDifficulty) return false;
      if (query) {
        var hay = (row.q.question + " " + row.q.options.join(" ") + " " + (row.q.explanation || "") + " " + (row.q.subtopic || "")).toLowerCase();
        if (hay.indexOf(query) < 0) return false;
      }
      return true;
    });

    if (!items.length) {
      list.innerHTML = '<div class="card"><p>No questions match these filters yet. Clear the search or pick another level.</p></div>';
      return;
    }
    list.innerHTML =
      '<p class="section-sub">' + items.length + " question(s) · click any item to reveal the answer.</p>" +
      items.map(function (row, i) {
        var q = row.q;
        var correctText = q.options[q.correctAnswer];
        return '<details class="bank-item">' +
          "<summary>Q" + (i + 1) + " · [" + escapeHtml(row.topicMeta.name) + "] " + escapeHtml(q.question) + "</summary>" +
          '<div class="bank-meta"><span class="badge ' + difficultyLabel(q.difficulty) + '">' + escapeHtml(difficultyLabel(q.difficulty)) + "</span>" +
          (q.subtopic ? '<span class="badge">' + escapeHtml(q.subtopic) + "</span>" : "") +
          '<span class="badge">' + escapeHtml(q.id) + "</span></div>" +
          "<ol>" + q.options.map(function (o) {
            return "<li>" + escapeHtml(o) + (o === correctText ? " ✓" : "") + "</li>";
          }).join("") + "</ol>" +
          "<p><strong>Answer:</strong> " + escapeHtml(correctText) + "</p>" +
          '<div class="explain"><strong>Explanation:</strong> ' + escapeHtml(q.explanation || "") + "</div>" +
          "</details>";
      }).join("");
  }
})();
