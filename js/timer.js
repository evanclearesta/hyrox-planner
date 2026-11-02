// The gym timer from hyrox-timer.html, driven by a workout instead of a hard-coded session.
// Additions: split log (CSV on the done screen, saved to history) and catch-up for steps
// that ended while the screen was off (auto-advance carries the end time forward).
import { buildSession, fmtMs, fmt } from "./session.js";
import * as store from "./store.js";
import { download, slug } from "./dom.js";

const TEMPLATE = `
  <nav class="nav">
    <button class="link-btn" id="leave">‹ Workouts</button>
    <span class="w-title" id="wName"></span>
  </nav>
  <div class="top">
    <div class="block-name" id="blockName"></div>
    <div class="seg-count" id="segCount"></div>
  </div>
  <div class="progress"><div id="bar"></div></div>

  <div class="clock" id="clock" data-mode="gate">
    <div class="state" id="state"></div>
    <div class="time" id="time">0:00</div>
    <div class="round-line" id="roundLine"></div>
    <div class="adjust">
      <button id="minus10" aria-label="Take 10 seconds off">−10 s</button>
      <button id="plus10" aria-label="Add 10 seconds">+10 s</button>
    </div>
  </div>

  <section class="card now" id="nowCard">
    <h2 id="nowTitle">Now</h2>
    <ul class="tasks" id="tasks"></ul>
    <p class="note" id="note"></p>
  </section>

  <section class="card next" id="nextCard">
    <h2>Up next</h2>
    <ul class="tasks" id="nextTasks"></ul>
  </section>

  <section class="card now done-card" id="doneCard" hidden>
    <h2>Session done</h2>
    <div class="big" id="doneTime"></div>
    <p class="note" id="doneMeta"></p>
    <div class="row grow">
      <button id="csv">Download splits (CSV)</button>
      <a class="btn" href="#/">Back to workouts</a>
    </div>
  </section>

  <div class="amrap" id="amrap" hidden>
    <button class="round-btn" id="rMinus" aria-label="Remove a round">−</button>
    <div><div class="n" id="rN">0</div><div class="lbl">rounds</div></div>
    <button class="round-btn" id="rPlus" aria-label="Add a round">+</button>
  </div>

  <div class="controls">
    <button id="back" aria-label="Previous segment">◀ Back</button>
    <button class="primary" id="main">Start</button>
    <button id="skip" aria-label="Next segment">Skip ▶</button>
  </div>

  <section class="card">
    <h2>Settings</h2>
    <div class="opts">
      <div class="opt">
        <label for="holdRounds">Wait for a tap before every round, not just each block</label>
        <input type="checkbox" class="switch" id="holdRounds">
      </div>
      <div class="opt">
        <label for="lead">Get-ready countdown after tapping Start</label>
        <select id="lead">
          <option value="0">Off</option>
          <option value="5">5 s</option>
          <option value="10">10 s</option>
          <option value="15">15 s</option>
        </select>
      </div>
      <div class="opt">
        <label for="sound">Beeps at 3-2-1 and at the end of each interval</label>
        <input type="checkbox" class="switch" id="sound">
      </div>
    </div>
  </section>

  <section class="card">
    <h2>Session · tap a line to jump there</h2>
    <ul class="plan" id="plan"></ul>
  </section>

  <div class="reset-row">
    <button id="reset" class="danger">Restart session</button>
  </div>`;

export function runTimer(root, workout) {
  const steps = buildSession(workout);
  if (!steps.length) {
    root.innerHTML = `<p>This workout has no steps yet. <a href="#/edit/${encodeURIComponent(workout.id)}">Edit it</a></p>`;
    return () => {};
  }
  root.innerHTML = TEMPLATE;
  const $ = id => root.querySelector("#" + id);
  $("wName").textContent = workout.name || "Workout";
  document.title = (workout.name || "Workout") + " · HYROX";

  const total = steps.reduce((a, s) => a + s.dur, 0);
  const offsets = []; steps.reduce((a, s, k) => (offsets[k] = a) + s.dur, 0);

  // ---- State ----
  let i = 0;
  let mode = "gate";        // gate | lead | running | paused | done
  let remaining = steps[0].dur * 1000;
  let endAt = 0;
  let leadEnd = 0;
  let pausedFrom = null;    // "lead" or "running"
  let lastBeep = null;
  let rounds = 0;
  let wake = null;
  let raf = 0;
  let alive = true;

  // ---- Split log: one row per step that was started ----
  let splits = [];
  let cur = null;           // { i, start } for the step in progress (wall-clock ms)
  let saved = false;
  const wallAt = perfTs => Date.now() - (performance.now() - perfTs);
  function logStart(start = Date.now()) { if (!cur || cur.i !== i) cur = { i, start }; }
  function logEnd(how, end = Date.now()) {
    if (!cur) return;
    const s = steps[cur.i];
    splits.push({ n: cur.i + 1, block: s.block, label: s.label, planned: s.dur, start: cur.start, end, how });
    cur = null;
  }

  // ---- Settings ----
  $("holdRounds").checked = store.pref("hold", false);
  $("lead").value = String(store.pref("lead", 10));
  $("sound").checked = store.pref("sound", true);
  $("holdRounds").addEventListener("change", e => store.setPref("hold", e.target.checked));
  $("lead").addEventListener("change", e => store.setPref("lead", +e.target.value));
  $("sound").addEventListener("change", e => store.setPref("sound", e.target.checked));

  // ---- Sound ----
  let ctx = null;
  function audio() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } }
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }
  function beep(freq, len) {
    if (!$("sound").checked) return;
    const c = audio(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.value = freq; o.type = "square";
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + len);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + len + 0.02);
    try { navigator.vibrate && navigator.vibrate(len > 0.3 ? 400 : 80); } catch (e) {}
  }
  async function keepAwake() {
    try { if ("wakeLock" in navigator && !wake) { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => { wake = null; }); } } catch (e) {}
  }
  const onVis = () => { if (document.visibilityState === "visible" && (mode === "running" || mode === "lead")) keepAwake(); };
  document.addEventListener("visibilitychange", onVis);

  // ---- Flow ----
  function startStep() {
    keepAwake(); audio();
    const lead = +$("lead").value * 1000;
    if (lead > 0) { mode = "lead"; leadEnd = performance.now() + lead; }
    else { go(); }
    lastBeep = null; render();
  }
  function go() {
    mode = "running"; endAt = performance.now() + remaining; lastBeep = null; beep(1320, 0.5);
    logStart();
    render();
  }
  function adjust(sec) {
    const d = sec * 1000;
    if (mode === "running") {
      endAt = Math.max(performance.now() + 1000, endAt + d);
    } else if (mode === "lead") {
      leadEnd = Math.max(performance.now() + 1000, leadEnd + d);
    } else if (mode === "paused" && pausedFrom === "lead") {
      leadEnd = Math.max(1000, leadEnd + d);
    } else if (mode === "gate" || mode === "paused") {
      remaining = Math.max(1000, remaining + d);
    }
    lastBeep = null; render();
  }
  function pause() {
    if (mode === "running") { remaining = endAt - performance.now(); pausedFrom = "running"; }
    else if (mode === "lead") { pausedFrom = "lead"; leadEnd -= performance.now(); }
    mode = "paused"; render();
  }
  function resume() {
    if (pausedFrom === "lead") { mode = "lead"; leadEnd = performance.now() + leadEnd; }
    else { mode = "running"; endAt = performance.now() + remaining; }
    lastBeep = null; keepAwake(); render();
  }
  // carryFrom: performance.now() timestamp the previous step ended, to auto-start from it.
  function load(n, carryFrom = null, how = "skipped") {
    if (cur) logEnd(how);
    i = Math.max(0, Math.min(steps.length - 1, n));
    remaining = steps[i].dur * 1000;
    if (carryFrom !== null) {
      mode = "running"; endAt = carryFrom + remaining; lastBeep = null;
      logStart(wallAt(carryFrom));
    } else mode = "gate";
    render();
  }
  function finishStep() {
    beep(880, 0.7);
    const ended = endAt;
    logEnd("done", wallAt(ended));
    if (i >= steps.length - 1) { finish(); return; }
    const hold = steps[i + 1].gate || $("holdRounds").checked;
    load(i + 1, hold ? null : ended);
  }
  function finish() {
    if (cur) logEnd("skipped");
    mode = "done"; remaining = 0;
    if (!saved && splits.length) {
      store.addHistory({ workoutId: workout.id, name: workout.name, finishedAt: Date.now(), rounds, splits });
      saved = true;
    }
    render();
  }

  function tick() {
    if (!alive) return;
    const now = performance.now();
    if (mode === "lead") {
      const left = leadEnd - now;
      const s = Math.ceil(left / 1000);
      if (s <= 3 && s >= 1 && lastBeep !== s) { lastBeep = s; beep(660, 0.15); }
      if (left <= 0) go();
      else paintTime(left);
    } else if (mode === "running") {
      // Catch up on any steps that ended while the tab was hidden.
      let guard = steps.length;
      while (mode === "running" && endAt <= now && guard-- > 0) finishStep();
      if (mode === "running") {
        const left = endAt - now;
        const s = Math.ceil(left / 1000);
        if (s <= 3 && s >= 1 && lastBeep !== s) { lastBeep = s; beep(660, 0.15); }
        paintTime(left);
      }
    }
    raf = requestAnimationFrame(tick);
  }

  // ---- Render ----
  function paintTime(ms) {
    $("time").textContent = fmtMs(ms);
    const inStep = mode === "running" ? steps[i].dur - Math.max(0, ms) / 1000 : steps[i].dur - remaining / 1000;
    const pct = mode === "done" ? 100 : ((offsets[i] + Math.max(0, inStep)) / total) * 100;
    $("bar").style.width = Math.min(100, pct) + "%";
  }
  function taskList(el, tasks) {
    el.innerHTML = "";
    tasks.forEach(([what, w]) => {
      const li = document.createElement("li");
      const a = document.createElement("span"); a.className = "what"; a.textContent = what;
      const b = document.createElement("span"); b.className = "w"; b.textContent = w;
      li.append(a, b); el.append(li);
    });
  }
  function render() {
    const s = steps[i];
    const done = mode === "done";
    $("blockName").textContent = done ? "Session done" : s.block;
    $("segCount").textContent = (i + 1) + " / " + steps.length;
    $("clock").dataset.mode = mode;
    const states = {
      gate: s.gate ? "Transition · set up, then tap Start" : "Tap Start for the next round",
      lead: "Get ready",
      running: s.amrap ? "AMRAP · go" : "Work",
      paused: pausedFrom === "lead" ? "Paused · get ready" : "Paused",
      done: "Nice work"
    };
    $("state").textContent = states[mode];
    $("roundLine").textContent = done ? (rounds ? "AMRAP: " + rounds + " rounds" : "") : s.label;
    $("nowTitle").textContent = mode === "gate" ? "Set up for" : "Now";
    taskList($("tasks"), s.tasks);
    $("note").textContent = s.note || "";
    $("note").hidden = !s.note;
    const n = steps[i + 1];
    taskList($("nextTasks"), n ? [[n.block + " · " + n.label, fmt(n.dur)]].concat(n.tasks) : [["End of session", ""]]);
    $("nowCard").hidden = $("nextCard").hidden = done;
    $("amrap").hidden = !s.amrap || done;
    $("rN").textContent = rounds;

    $("doneCard").hidden = !done;
    if (done) {
      const elapsed = splits.length ? (splits[splits.length - 1].end - splits[0].start) / 1000 : 0;
      $("doneTime").textContent = fmt(elapsed);
      const finished = splits.filter(x => x.how === "done").length;
      $("doneMeta").textContent = [finished + " of " + steps.length + " steps completed", rounds && rounds + " AMRAP rounds", "planned " + fmt(total)].filter(Boolean).join(" · ");
      $("csv").disabled = !splits.length;
    }

    const main = $("main");
    main.classList.toggle("pause", mode === "running" || mode === "lead");
    main.textContent = { gate: "Start", lead: "Pause", running: "Pause", paused: "Resume", done: "Done" }[mode];
    main.disabled = done;

    if (mode === "paused" && pausedFrom === "lead") $("time").textContent = fmtMs(leadEnd);
    else if (mode === "gate" || mode === "paused" || done) paintTime(remaining);
    if (mode === "lead") $("time").textContent = fmtMs(leadEnd - performance.now());
    $("minus10").disabled = $("plus10").disabled = done;

    const plan = $("plan"); plan.innerHTML = "";
    steps.forEach((st, k) => {
      const li = document.createElement("li");
      if (k < i || done) li.className = "done";
      if (k === i && !done) li.className = "current";
      const a = document.createElement("span"); a.textContent = st.block + " · " + st.label;
      if (st.gate) { const g = document.createElement("span"); g.className = "gate-tag"; g.textContent = "hold"; a.append(g); }
      const d = document.createElement("span"); d.className = "d"; d.textContent = fmt(st.dur);
      li.append(a, d);
      li.addEventListener("click", () => load(k));
      plan.append(li);
    });
  }

  function csv() {
    const q = v => '"' + String(v).replace(/"/g, '""') + '"';
    const iso = t => new Date(t).toISOString();
    const rows = [["step", "block", "label", "planned_s", "actual_s", "start", "end", "result"]].concat(
      splits.map(x => [x.n, x.block, x.label, x.planned, ((x.end - x.start) / 1000).toFixed(1), iso(x.start), iso(x.end), x.how]));
    const name = slug(workout.name) + "-" + new Date().toISOString().slice(0, 10) + "-splits.csv";
    download(name, rows.map(r => r.map(q).join(",")).join("\n"), "text/csv");
  }

  // ---- Controls ----
  $("main").addEventListener("click", () => {
    if (mode === "gate") startStep();
    else if (mode === "running" || mode === "lead") pause();
    else if (mode === "paused") resume();
  });
  $("skip").addEventListener("click", () => { if (i < steps.length - 1) load(i + 1); else finish(); });
  $("back").addEventListener("click", () => {
    // While a step is started or paused, Back resets it; while waiting at a hold, it goes to the previous step.
    load(mode === "gate" ? i - 1 : i, null, "restarted");
  });
  $("plus10").addEventListener("click", () => adjust(10));
  $("minus10").addEventListener("click", () => adjust(-10));
  $("rPlus").addEventListener("click", () => { rounds++; render(); });
  $("rMinus").addEventListener("click", () => { rounds = Math.max(0, rounds - 1); render(); });
  $("csv").addEventListener("click", csv);

  const armed = (btn, idle, prompt, fn) => {
    let t = null;
    btn.addEventListener("click", () => {
      if (!t) { btn.textContent = prompt; t = setTimeout(() => { t = null; btn.textContent = idle; }, 3000); return; }
      clearTimeout(t); t = null; btn.textContent = idle; fn();
    });
  };
  armed($("reset"), "Restart session", "Tap again to restart", () => {
    rounds = 0; splits = []; cur = null; saved = false; load(0);
  });
  // Leaving mid-session needs a second tap; at a hold or when done it leaves at once.
  let leaveT = null;
  $("leave").addEventListener("click", () => {
    const busy = mode === "running" || mode === "lead" || mode === "paused";
    if (!busy || leaveT) { clearTimeout(leaveT); location.hash = "#/"; return; }
    $("leave").textContent = "Tap again to leave";
    leaveT = setTimeout(() => { leaveT = null; $("leave").textContent = "‹ Workouts"; }, 3000);
  });

  render();
  raf = requestAnimationFrame(tick);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    document.removeEventListener("visibilitychange", onVis);
    if (wake) wake.release().catch(() => {});
    if (ctx) ctx.close().catch(() => {});
  };
}
