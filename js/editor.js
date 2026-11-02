import { el, isoDay, toast, menu } from "./dom.js";
import * as store from "./store.js";
import { blockFormat, blockDuration, workoutDuration, fmt, fmtMin, newBlock, convertBlock } from "./session.js";
import { moveOf, moveIcon, splitTask } from "./moves.js";
import { timeline } from "./library.js";

// Three block types as people think of them. "every" and "emom" are both an Interval block:
// the switch between same tasks each round and rotating stations moves a block between them.
const TYPES = [
  ["interval", "Interval", "Every 3:00 × 4, EMOM 15"],
  ["amrap", "AMRAP", "As many rounds in 12 min"],
  ["single", "Timed", "Warm-up, cool-down, steady piece"]
];
const kindOf = b => (b.type === "every" || b.type === "emom" ? "interval" : b.type);
const INTERVALS = [60, 90, 120, 180, 210, 240, 300];
const PIECES = [300, 480, 600, 900];
const CAPS = [480, 600, 720, 900, 1200];
// What the station picker starts a task with: the words moveOf() recognises.
const PICK = [
  ["skierg", "SkiErg"], ["rowerg", "Row"], ["sled-push", "Sled push"], ["sled-pull", "Sled pull"],
  ["burpee", "Burpee broad jumps"], ["farmers-carry", "Farmers carry"], ["sandbag-lunge", "Sandbag lunges"],
  ["wall-ball", "Wall balls"], ["run", "Run"], ["kettlebell", "Kettlebell"], ["", "Other"]
];
// "Block 1" says nothing a reader needs, so only real names are shown.
const realName = b => (b.name && !/^block\s*\d+$/i.test(b.name.trim()) ? b.name : "");
const blockTitle = b => blockFormat(b) || b.name || b.label || "Timed piece";

// Custom times are typed as digits, because the phone's number pad has no ":". "330" -> 3:30, "4" -> 4:00.
function parseDigits(v) {
  const d = String(v).replace(/\D/g, "");
  if (!d) return { err: "Enter minutes and seconds, like 330 for 3:30." };
  const m = d.length <= 2 ? +d : +d.slice(0, -2), s = d.length <= 2 ? 0 : +d.slice(-2);
  if (s > 59) return { err: "Seconds go up to 59. Try " + m + "59 or " + (m + 1) + "00." };
  const t = m * 60 + s;
  if (t < 10 || t > 5400) return { err: "Pick between 0:10 and 90:00." };
  return { sec: t };
}

// The load last used for each movement, from the most recent workout that has one.
function lastLoads(exceptId) {
  const loads = {};
  const ws = store.all().filter(w => w.id !== exceptId).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  for (const w of ws) for (const b of w.blocks) {
    if (b.type === "single") continue;
    for (const [what, load] of b.type === "emom" ? b.stations.flatMap(s => s.tasks) : b.tasks || []) {
      const m = moveOf(what);
      if (m && load && !/^×/.test(load) && !(m.id in loads)) loads[m.id] = load.replace(/\s*×\s*\d+\s*$/, "");
    }
  }
  return loads;
}

// date: the day a new workout is planned for (from the week strip); defaults to today.
// Returns a guard the router asks before leaving, so unsaved changes aren't lost.
export function renderEditor(root, id, date) {
  const existing = id ? store.get(id) : null;
  if (id && !existing) {
    root.append(el("p", {}, "That workout isn't on this device. "), el("a", { href: "#/" }, "Back to workouts"));
    return null;
  }
  const today = isoDay();
  const w = existing ? structuredClone(existing) : {
    id: store.uid(), name: "", date: date || today, notes: "",
    blocks: [newBlock("single", "Warm-up", [], "", 600), newBlock("every", ""), newBlock("single", "Cool-down", [], "", 300)]
  };
  const loads = lastLoads(w.id);
  const ui = { editing: null, picking: null, custom: new Set(), pending: null, leaving: null };
  let dirty = false, undo = null;
  const touch = () => { dirty = true; };

  const summary = el("div", { class: "ed-sum" });
  const leaveBar = el("div", { class: "ed-leave", role: "alert", hidden: true });
  const blocksEl = el("div", { class: "ed-blocks" });
  const err = el("p", { class: "error", hidden: true, role: "alert" });
  const saveBar = el("div", { class: "save-bar" });

  // Task keys: block.station.task, with "x" for a block without stations.
  const sKey = (k, s) => k + "." + (s < 0 ? "x" : s);
  const tasksAt = (k, s) => (s < 0 ? w.blocks[k].tasks : w.blocks[k].stations[s].tasks);

  function refresh() {
    const total = workoutDuration(w), main = w.blocks.filter(b => b.type !== "single").length;
    summary.replaceChildren(
      el("div", { class: "ed-total" }, el("b", {}, fmtMin(total).replace(" min", "")), el("small", {}, total % 60 ? "" : " min"),
        el("span", {}, main + (main === 1 ? " main block" : " main blocks"))),
      timeline(w));
    blocksEl.querySelectorAll("[data-b]").forEach(card => {
      const b = w.blocks[+card.dataset.b];
      card.querySelector(".b-title").textContent = blockTitle(b);
      card.querySelector(".b-sub").textContent = fmtMin(blockDuration(b)) + (realName(b) && b.type !== "single" ? " · " + realName(b) : "");
    });
  }

  function draw(focusId) {
    const keep = focusId || document.activeElement?.id;
    blocksEl.replaceChildren(...w.blocks.map(blockCard));
    refresh();
    const f = keep && document.getElementById(keep);
    if (f) f.focus({ preventScroll: !focusId });
  }

  const field = (label, input, opt) => el("label", { class: "field" }, el("span", {}, label, opt && el("em", {}, " (optional)")), input);
  const text = (id, obj, key, placeholder, onChange) => el("input", { type: "text", id, value: obj[key] || "", placeholder,
    oninput: e => { obj[key] = e.target.value; touch(); onChange && onChange(); } });

  // Common times as chips; "Custom" takes digits.
  function timeChips(b, k, key, opts, inMinutes) {
    const ck = k + "." + key, custom = ui.custom.has(ck) || !opts.includes(b[key]);
    const chips = el("div", { class: "chips-row", role: "group", "aria-label": key === "interval" ? "Every" : "Duration" },
      opts.map(o => el("button", { type: "button", class: "chip", id: "ch-" + ck + "-" + o, "aria-pressed": String(!custom && b[key] === o),
        onclick: () => { b[key] = o; ui.custom.delete(ck); touch(); draw(); } }, inMinutes ? String(o / 60) : fmt(o))),
      el("button", { type: "button", class: "chip", id: "ch-" + ck + "-c", "aria-pressed": String(custom),
        onclick: () => { ui.custom.add(ck); draw("cu-" + ck); document.getElementById("cu-" + ck)?.select(); } }, "Custom"));
    if (!custom) return chips;
    const hint = el("small", { id: "cuh-" + ck }, "= " + fmt(b[key]));
    const input = el("input", { type: "text", inputMode: "numeric", id: "cu-" + ck, class: "custom-in", value: fmt(b[key]).replace(":", ""),
      "aria-describedby": "cuh-" + ck, oninput: e => {
        const r = parseDigits(e.target.value);
        e.target.classList.toggle("invalid", !!r.err); e.target.setAttribute("aria-invalid", String(!!r.err));
        hint.className = r.err ? "error" : ""; hint.textContent = r.err || "= " + fmt(r.sec);
        if (!r.err) { b[key] = r.sec; touch(); refresh(); }
      } });
    return el("div", { class: "ed-time" }, chips, el("label", { class: "field custom" }, el("span", {}, "Custom time ", el("em", {}, "(digits: 330 = 3:30)")), input, hint));
  }

  function taskRow(t, k, s, i) {
    const key = sKey(k, s) + "." + i, [what, load] = t, m = moveOf(what);
    if (ui.editing === key) {
      const last = m && loads[m.id];
      return el("div", { class: "t-edit", role: "group", "aria-label": "Edit task" },
        field("Task", el("input", { type: "text", id: "tw-" + key, value: what, placeholder: "Sled pull 25 m",
          oninput: e => { t[0] = e.target.value; touch(); } })),
        field("Load or reps", el("input", { type: "text", id: "tl-" + key, value: load, placeholder: "103 kg, or × 15",
          oninput: e => { t[1] = e.target.value; touch(); } }), true),
        last && last !== load && el("p", { class: "hint" }, "Last time: " + last),
        el("div", { class: "row grow" },
          el("button", { type: "button", class: "danger", onclick: () => {
            tasksAt(k, s).splice(i, 1); ui.editing = null; touch(); draw("at-" + sKey(k, s));
          } }, "Remove"),
          el("button", { type: "button", id: "td-" + key, onclick: () => { ui.editing = null; draw("tr-" + key); } }, "Done")));
    }
    const p = splitTask(what, load);
    return el("button", { type: "button", class: "t-row", id: "tr-" + key, "aria-label": "Edit task: " + [what, load].filter(Boolean).join(", "),
      onclick: () => { ui.editing = key; ui.picking = null; draw("tw-" + key); } },
      m ? moveIcon(m) : el("span", { class: "mv none" }),
      el("span", { class: "amt" }, p.amount),
      el("span", { class: "t" }, p.move || what || el("i", {}, "Describe the task")),
      el("span", { class: "load" }, p.load));
  }

  function taskList(k, s, placeholder) {
    const key = sKey(k, s), list = tasksAt(k, s);
    const out = [el("div", { class: "t-list" }, list.map((t, i) => taskRow(t, k, s, i)))];
    if (ui.picking === key) {
      out.push(el("div", { class: "picker", role: "group", "aria-label": "Pick a movement" }, PICK.map(([mid, label]) => {
        const m = mid && moveOf(label);
        return el("button", { type: "button", class: "pick", id: "pk-" + key + "-" + (mid || "other"), onclick: () => {
          list.push([mid ? label + " " : "", (mid && loads[mid]) || ""]);
          ui.picking = null; ui.editing = key + "." + (list.length - 1); touch();
          draw("tw-" + ui.editing);
          const f = document.getElementById("tw-" + ui.editing); f?.setSelectionRange(f.value.length, f.value.length);
        } }, m ? moveIcon(m) : el("span", { class: "mv plus" }, "+"), mid === "burpee" ? "Burpee BJ" : label);
      })));
    } else {
      if (!list.length && placeholder) out.push(el("p", { class: "hint" }, placeholder));
      out.push(el("button", { type: "button", class: "add-task", id: "at-" + key,
        onclick: () => { ui.picking = key; ui.editing = null; draw("pk-" + key + "-skierg"); } }, "+ Add task"));
    }
    return out;
  }

  // Stations merge into one list when rotation is turned off; that's the only change that can lose notes.
  const mergeLoss = b => {
    if (b.type !== "emom" || b.stations.length < 2) return "";
    const notes = b.stations.slice(1).filter(s => s.note).length;
    return "This merges " + b.stations.length + " stations into one task list" + (notes ? " and drops " + notes + (notes === 1 ? " station note" : " station notes") : "") + ".";
  };
  function setRotate(k, on) {
    const b = w.blocks[k];
    if (on) w.blocks[k] = { type: "emom", name: b.name, interval: b.interval, rounds: b.rounds,
      stations: b.tasks.length ? b.tasks.map((t, i) => ({ tasks: [t], note: i ? "" : b.note || "" })) : [{ tasks: [], note: "" }, { tasks: [], note: "" }] };
    else w.blocks[k] = { type: "every", name: b.name, interval: b.interval, rounds: b.rounds,
      tasks: b.stations.flatMap(s => s.tasks), note: b.stations[0]?.note || "" };
  }
  function changeType(k, kind) {
    const b = w.blocks[k];
    if (kind === "interval") w.blocks[k] = convertBlock(b, "every");
    else w.blocks[k] = convertBlock(b, kind);
    if (kind === "single" && !w.blocks[k].name) w.blocks[k].name = "Timed piece";
  }
  // Apply a change that can be undone from the toast.
  function withUndo(msg, fn, focusId) {
    undo = structuredClone(w.blocks);
    fn(); ui.pending = null; ui.editing = null; touch(); draw(focusId);
    toast(msg, "Undo", () => { w.blocks = undo; draw(); });
  }

  function blockCard(b, k) {
    const n = w.blocks.length, kind = kindOf(b), soft = b.type === "single";
    const body = [];
    if (ui.pending && ui.pending.k === k) {
      const p = ui.pending;
      body.push(el("div", { class: "warn", role: "alert" }, el("span", {}, p.msg),
        el("div", { class: "row grow" },
          el("button", { type: "button", onclick: () => { ui.pending = null; draw(); } }, p.rotate ? "Keep stations" : "Cancel"),
          el("button", { type: "button", id: "pc-" + k, onclick: () => withUndo(p.rotate ? "Stations merged" : "Changed to " + p.label, p.apply, "bt-" + k) }, p.rotate ? "Merge" : "Change"))));
    }
    if (kind === "interval") {
      body.push(el("div", {}, el("div", { class: "lbl" }, "Every"), timeChips(b, k, "interval", INTERVALS)));
      const rot = b.type === "emom";
      body.push(el("div", { class: "seg2", role: "radiogroup", "aria-label": "Each round" },
        [[false, "Same tasks", "every round"], [true, "Rotate stations", "one per interval"]].map(([on, t, sub]) =>
          el("button", { type: "button", role: "radio", id: "rot-" + k + "-" + +on, "aria-checked": String(rot === on), onclick: () => {
            if (rot === on) return;
            const loss = !on && mergeLoss(b);
            if (loss) { ui.pending = { k, rotate: true, msg: loss, apply: () => setRotate(k, false) }; draw("pc-" + k); return; }
            withUndo(on ? "Each task is now a station" : "Same tasks every round", () => setRotate(k, on), "rot-" + k + "-" + +on);
          } }, el("b", {}, t), el("small", {}, sub)))));
      body.push(el("div", { class: "ed-rounds" }, el("span", { class: "lbl" }, rot ? "Rounds of all stations" : "Rounds"),
        el("div", { class: "stepper", role: "group", "aria-label": "Rounds" },
          el("button", { type: "button", id: "rd-" + k, "aria-label": "Fewer rounds", disabled: b.rounds <= 1, onclick: () => { b.rounds--; touch(); draw(); } }, "−"),
          el("output", { "aria-live": "polite" }, String(b.rounds)),
          el("button", { type: "button", id: "ru-" + k, "aria-label": "More rounds", disabled: b.rounds >= 99, onclick: () => { b.rounds++; touch(); draw(); } }, "+"))));
    } else {
      body.push(el("div", {}, el("div", { class: "lbl" }, kind === "amrap" ? "Time cap (min)" : "Duration (min)"),
        timeChips(b, k, "dur", soft ? PIECES : CAPS, true)));
    }
    if (b.type === "emom") {
      b.stations.forEach((st, s) => body.push(el("div", { class: "station" },
        el("div", { class: "lbl station-head" }, el("span", {}, (b.interval === 60 ? "Minute " : "Station ") + (s + 1)),
          b.stations.length > 1 && el("button", { type: "button", class: "link-btn", "aria-label": "Remove station " + (s + 1),
            onclick: () => withUndo("Station removed", () => b.stations.splice(s, 1)) }, "Remove")),
        ...taskList(k, s),
        field("Station note", text("sn-" + k + "-" + s, st, "note", "e.g. Zero put-downs"), true))));
      body.push(el("button", { type: "button", class: "add-task", onclick: () => { b.stations.push({ tasks: [], note: "" }); touch(); draw(); } }, "+ Add station"));
    } else {
      body.push(el("div", {}, el("div", { class: "lbl" }, "Tasks"),
        ...taskList(k, -1, soft ? (/cool/i.test(b.name) ? "e.g. easy erg, then stretch" : "e.g. 5 min easy row, leg swings") : "")));
    }
    const hasMore = (b.type !== "single" && realName(b)) || (b.label && b.label !== b.name) || b.note;
    body.push(el("details", { class: "more", open: !!hasMore }, el("summary", {}, "More options"),
      el("div", {},
        b.type !== "single" && field("Block name", text("bn-" + k, b, "name", "e.g. Sled engine", refresh), true),
        "label" in b && field("Timer label", text("bl-" + k, b, "label", "Shown on the timer, e.g. " + (soft ? b.name || "Warm-up" : "Race pace")), true),
        b.type !== "emom" ? field("Coach note", text("bc-" + k, b, "note", "e.g. Low hips, short fast steps"), true)
          : el("p", { class: "hint" }, "Station notes are under each station."))));

    const label = "block " + (k + 1) + ", " + blockTitle(b);
    return el("section", { class: "card b-card" + (soft ? " soft" : ""), "data-b": k, id: "blk-" + k, "aria-label": "Block " + (k + 1) },
      el("div", { class: "b-head" },
        el("div", { class: "b-t" }, el("h2", { class: "b-title", id: "bt-" + k, tabindex: -1 }, blockTitle(b)), el("span", { class: "b-sub" })),
        menu("Options for " + label, [
          k > 0 && ["Move up", () => { const [x] = w.blocks.splice(k, 1); w.blocks.splice(k - 1, 0, x); touch(); draw("bt-" + (k - 1)); }],
          k < n - 1 && ["Move down", () => { const [x] = w.blocks.splice(k, 1); w.blocks.splice(k + 1, 0, x); touch(); draw("bt-" + (k + 1)); }],
          ...TYPES.filter(([t]) => t !== kind).map(([t, l]) => ["Change to " + l, (e, d) => {
            d.open = false;
            const loss = mergeLoss(b);
            if (loss) { ui.pending = { k, msg: loss, label: l, apply: () => changeType(k, t) }; draw("pc-" + k); return; }
            withUndo("Changed to " + l, () => changeType(k, t), "bt-" + k);
          }]),
          ["Remove block", () => withUndo("Block removed", () => w.blocks.splice(k, 1)), "danger"]
        ])),
      el("div", { class: "b-body" }, body));
  }

  // New blocks go before a closing cool-down, where they belong.
  function addBlock(kind) {
    const last = w.blocks.at(-1), at = last && last.type === "single" && /cool/i.test(last.name || "") ? w.blocks.length - 1 : w.blocks.length;
    w.blocks.splice(at, 0, kind === "interval" ? newBlock("every", "") : kind === "amrap" ? newBlock("amrap", "") : newBlock("single", "Timed piece"));
    touch(); draw("bt-" + at);
    document.getElementById("blk-" + at)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function save(thenRun) {
    const bad = root.querySelector(".invalid");
    if (bad) { err.textContent = "Fix the time marked in red first."; err.hidden = false; bad.focus(); bad.scrollIntoView({ block: "center" }); return; }
    if (!w.blocks.length) { err.textContent = "Add at least one block."; err.hidden = false; return; }
    w.name = w.name.trim() || "Untitled workout";
    store.put(w); dirty = false;
    location.hash = thenRun ? "#/run/" + w.id : "#/";
  }

  // On today's date the main action is to train; on any other day it's to save the plan.
  function drawSaveBar() {
    const now = w.date === today;
    const saveBtn = el("button", { class: now ? "" : "primary", onclick: () => save(false) }, "Save");
    const runBtn = el("button", { class: now ? "primary" : "", onclick: () => save(true) }, "Save & start");
    saveBar.replaceChildren(el("button", { onclick: () => { location.hash = "#/"; } }, "Cancel"), ...(now ? [saveBtn, runBtn] : [runBtn, saveBtn]));
  }

  function askLeave(target) {
    ui.leaving = target;
    leaveBar.replaceChildren(el("span", {}, "Discard your changes to this workout?"),
      el("div", { class: "row grow" },
        el("button", { id: "leave-keep", onclick: () => { leaveBar.hidden = true; } }, "Keep editing"),
        el("button", { class: "danger", onclick: () => { dirty = false; location.hash = target; } }, "Discard")));
    leaveBar.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.getElementById("leave-keep")?.focus({ preventScroll: true });
  }

  root.append(
    el("div", { class: "ed-head" },
      el("nav", { class: "nav" }, el("a", { class: "link-btn", href: "#/" }, "‹ Workouts"),
        el("h1", { class: "ed-title" }, existing ? "Edit workout" : "New workout")),
      summary),
    leaveBar,
    el("section", { class: "card form" },
      field("Name", text("w-name", w, "name", "e.g. Sled push & wall ball engine")),
      el("div", { class: "field-row" }, field("Date", el("input", { type: "date", id: "w-date", value: w.date || "",
        oninput: e => { w.date = e.target.value; touch(); drawSaveBar(); } }))),
      field("Coach note", el("textarea", { id: "w-note", value: w.notes || "", rows: 2, placeholder: "e.g. Light on grip after the pull day",
        oninput: e => { w.notes = e.target.value; touch(); } }), true)),
    blocksEl,
    el("div", { class: "add-blk" }, el("span", { class: "lbl" }, "Add a block"),
      TYPES.map(([t, l, hint]) => el("button", { type: "button", onclick: () => addBlock(t) }, el("b", {}, "+ " + l), el("small", {}, hint))),
      el("p", { class: "hint" }, "New blocks go before the cool-down.")),
    err,
    saveBar
  );
  draw();
  drawSaveBar();
  return target => (dirty ? (askLeave(target), false) : true);
}
