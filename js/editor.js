import { el, twoTap } from "./dom.js";
import * as store from "./store.js";
import { BLOCK_TYPES, blockTitle, blockDuration, workoutDuration, buildSession, fmt, parseDur,
  tasksToText, textToTasks, newBlock, convertBlock } from "./session.js";

const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export function renderEditor(root, id) {
  const existing = id ? store.get(id) : null;
  if (id && !existing) {
    root.append(el("p", {}, "That workout isn't on this device. "), el("a", { href: "#/" }, "Back to workouts"));
    return;
  }
  const w = existing ? structuredClone(existing) : {
    id: store.uid(), name: "", date: today(), notes: "",
    blocks: [newBlock("single", "Warm-up", [], "", 600), newBlock("every", "Block 1"), newBlock("single", "Cool-down", [], "", 300)]
  };
  let dirty = !existing;

  const summary = el("span", { class: "seg-count" });
  const blocksEl = el("div", { class: "wrap", style: "padding:0;gap:16px" });
  const err = el("p", { class: "error", hidden: true });

  function changed() {
    dirty = true;
    const steps = buildSession(w);
    summary.textContent = steps.length + " steps · " + fmt(workoutDuration(w));
    blocksEl.querySelectorAll("[data-b]").forEach(card => {
      const b = w.blocks[+card.dataset.b];
      card.querySelector(".b-title").textContent = blockTitle(b);
      card.querySelector(".b-dur").textContent = fmt(blockDuration(b));
    });
  }

  const field = (label, input, hint) => el("label", { class: "field" }, el("span", {}, label), input, hint && el("p", { class: "hint" }, hint));

  function durInput(obj, key) {
    return el("input", { type: "text", inputMode: "numeric", value: fmt(obj[key]), placeholder: "m:ss", oninput: e => {
      const v = parseDur(e.target.value);
      const ok = v > 0;
      e.target.classList.toggle("invalid", !ok);
      if (ok) { obj[key] = v; changed(); }
    } });
  }
  function roundsInput(obj) {
    return el("input", { type: "number", min: 1, max: 99, inputMode: "numeric", value: obj.rounds, oninput: e => {
      const v = parseInt(e.target.value, 10);
      const ok = v >= 1 && v <= 99;
      e.target.classList.toggle("invalid", !ok);
      if (ok) { obj.rounds = v; changed(); }
    } });
  }
  const textInput = (obj, key, placeholder) => el("input", { type: "text", value: obj[key] || "", placeholder,
    oninput: e => { obj[key] = e.target.value; changed(); } });
  const tasksInput = obj => el("textarea", { value: tasksToText(obj.tasks), rows: Math.max(3, (obj.tasks || []).length + 1),
    placeholder: "SkiErg 250 m | damper 6\nSled pull 25 m | 103 kg\nBurpee broad jumps | × 5",
    oninput: e => { obj.tasks = textToTasks(e.target.value); changed(); } });

  function blockCard(b, k) {
    const n = w.blocks.length;
    const move = d => { const [x] = w.blocks.splice(k, 1); w.blocks.splice(k + d, 0, x); draw(); };
    const typeSel = el("select", { onchange: e => { w.blocks[k] = convertBlock(b, e.target.value); draw(); } },
      Object.entries(BLOCK_TYPES).map(([v, l]) => el("option", { value: v, selected: v === b.type }, l)));
    const remove = twoTap(el("button", { class: "icon-btn danger", "aria-label": "Remove block" }, "✕"), "Remove?", () => { w.blocks.splice(k, 1); draw(); });

    const body = [];
    body.push(el("div", { class: "field-row" }, field("Type", typeSel), field("Name", textInput(b, "name", "e.g. Block 1"))));
    if (b.type === "single") {
      body.push(el("div", { class: "field-row" }, field("Duration", durInput(b, "dur")), field("Clock label", textInput(b, "label", b.name || "optional"))));
    } else if (b.type === "amrap") {
      body.push(el("div", { class: "field-row" }, field("Duration", durInput(b, "dur")), field("Clock label", textInput(b, "label", "optional"))));
    } else {
      body.push(el("div", { class: "field-row" }, field("Every", durInput(b, "interval")), field("Rounds", roundsInput(b))));
    }
    if (b.type === "emom") {
      b.stations.forEach((st, m) => {
        const rm = b.stations.length > 1 && el("button", { class: "icon-btn", onclick: () => { b.stations.splice(m, 1); draw(); } }, "Remove");
        body.push(el("div", { class: "station" },
          el("div", { class: "station-head" }, el("span", {}, (b.interval === 60 ? "Minute " : "Station ") + (m + 1)), rm),
          tasksInput(st), textInput(st, "note", "Coaching note (optional)")));
      });
      body.push(el("button", { class: "icon-btn", onclick: () => { b.stations.push({ tasks: [], note: "" }); draw(); } }, "+ Add station"));
    } else {
      body.push(field("Tasks", tasksInput(b), "One per line. Put the weight or reps after a | to show it on the right."));
      body.push(field("Coaching note", textInput(b, "note", "optional")));
    }

    return el("section", { class: "card b-card", "data-b": k },
      el("div", { class: "b-head" },
        el("span", { class: "b-num" }, k + 1),
        el("span", { class: "b-title" }, blockTitle(b)),
        el("span", { class: "b-dur" }, fmt(blockDuration(b))),
        el("button", { class: "icon-btn", disabled: k === 0, "aria-label": "Move up", onclick: () => move(-1) }, "↑"),
        el("button", { class: "icon-btn", disabled: k === n - 1, "aria-label": "Move down", onclick: () => move(1) }, "↓"),
        remove),
      body);
  }

  function draw() {
    blocksEl.replaceChildren(...w.blocks.map(blockCard));
    changed();
  }

  function save(thenRun) {
    if (root.querySelector(".invalid")) { err.textContent = "Fix the fields outlined in red first."; err.hidden = false; return; }
    if (!w.blocks.length) { err.textContent = "Add at least one block."; err.hidden = false; return; }
    w.name = w.name.trim() || "Untitled workout";
    store.put(w); dirty = false;
    location.hash = thenRun ? "#/run/" + w.id : "#/";
  }

  const cancel = el("button", {}, "Cancel");
  let armed = null;
  cancel.addEventListener("click", () => {
    if (!dirty || armed) { clearTimeout(armed); location.hash = "#/"; return; }
    cancel.textContent = "Discard?";
    armed = setTimeout(() => { armed = null; cancel.textContent = "Cancel"; }, 3000);
  });

  root.append(
    el("nav", { class: "nav" }, el("a", { class: "link-btn", href: "#/" }, "‹ Workouts"), summary),
    el("h1", { class: "title" }, existing ? "Edit workout" : "New workout"),
    el("section", { class: "card form" },
      field("Name", textInput(w, "name", "e.g. Sled, EMOM, AMRAP")),
      field("Date", el("input", { type: "date", value: w.date || "", oninput: e => { w.date = e.target.value; dirty = true; } })),
      field("Notes", el("textarea", { value: w.notes || "", rows: 2, placeholder: "optional", oninput: e => { w.notes = e.target.value; dirty = true; } }))),
    blocksEl,
    el("div", { class: "add-row" }, el("span", {}, "Add a block"),
      Object.entries(BLOCK_TYPES).map(([t, l]) => el("button", { onclick: () => {
        w.blocks.push(newBlock(t, t === "single" ? "" : "Block " + (w.blocks.filter(x => x.type !== "single").length + 1)));
        draw();
        blocksEl.lastElementChild.scrollIntoView({ behavior: "smooth", block: "start" });
      } }, "+ " + l))),
    err,
    el("div", { class: "save-bar" }, cancel,
      el("button", { onclick: () => save(false) }, "Save"),
      el("button", { class: "primary", onclick: () => save(true) }, "Save & start"))
  );
  draw();
  if (!existing) dirty = true; else dirty = false;
}
