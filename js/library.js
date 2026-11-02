import { el, twoTap, download, slug } from "./dom.js";
import * as store from "./store.js";
import { blockFormat, blockDuration, workoutDuration, buildSession, fmt } from "./session.js";
import { moveOf, moveIcon, shortTask } from "./moves.js";

const blockTasks = b => (b.type === "emom" ? b.stations.flatMap(st => st.tasks) : b.tasks) || [];
// "Block 1" says nothing a reader needs, so only real names are shown.
const realName = b => (b.name && !/^block\s*\d+$/i.test(b.name.trim()) ? b.name : "");

const fmtDate = iso => {
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? iso : d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

export function renderLibrary(root) {
  const redraw = () => { root.replaceChildren(); renderLibrary(root); };
  const list = store.all().slice().sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.updatedAt || 0) - (a.updatedAt || 0));
  const msg = el("p", { class: "error", hidden: true });

  const fileIn = el("input", { type: "file", accept: "application/json,.json", hidden: true, onchange: async e => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const items = Array.isArray(data) ? data : [data];
      if (!items.length || !items.every(w => w && Array.isArray(w.blocks))) throw new Error("bad");
      items.forEach(w => { if (!w.id || store.get(w.id)) w.id = store.uid(); store.put(w); });
      redraw();
    } catch (err) {
      msg.textContent = "That file isn't a workout export."; msg.hidden = false;
    }
  } });

  root.append(
    el("header", { class: "top" },
      el("h1", { class: "title" }, "HYROX Planner"),
      el("span", { class: "seg-count" }, list.length + (list.length === 1 ? " workout" : " workouts"))),
    el("div", { class: "row" },
      el("a", { class: "btn primary", href: "#/new" }, "+ New workout"),
      el("button", { onclick: () => fileIn.click() }, "Import"),
      list.length > 1 && el("button", { onclick: () => download("hyrox-workouts.json", JSON.stringify(store.all(), null, 2)) }, "Export all"),
      fileIn),
    msg,
    ...(list.length ? list.map(card) : [el("section", { class: "card empty muted" }, "No workouts yet. Tap New workout to plan one.")])
  );

  // Every movement in the main work, once each: what this session is, at a glance.
  function moveStrip(w) {
    const seen = new Map();
    w.blocks.filter(b => b.type !== "single").flatMap(blockTasks).forEach(([what]) => {
      const m = moveOf(what);
      if (m && !seen.has(m.id)) seen.set(m.id, m);
    });
    return seen.size > 0 && el("div", { class: "w-moves" }, [...seen.values()].map(m => moveIcon(m)));
  }

  // One bar, each block's share of the clock. Warm-up and cool-down are the quiet ends.
  function timeline(w) {
    return el("div", { class: "w-bar", "aria-hidden": "true" }, w.blocks.map(b =>
      el("span", { class: b.type === "single" ? "soft" : "", style: "flex-grow:" + blockDuration(b) })));
  }

  function planRow(b) {
    const dur = el("span", { class: "d" }, fmt(blockDuration(b)));
    if (b.type === "single") return el("li", { class: "wb soft" }, el("span", { class: "wb-fmt" }, b.name || b.label || "Timed piece"), dur);
    const name = realName(b);
    return el("li", { class: "wb" },
      el("span", { class: "wb-fmt" }, blockFormat(b), name && el("small", {}, name)), dur,
      el("ul", { class: "wb-tasks" }, blockTasks(b).map(([what, load]) => {
        const m = moveOf(what);
        return el("li", {}, m ? moveIcon(m) : el("span", { class: "mv none" }),
          el("span", { class: "t" }, shortTask(what)), load && el("span", { class: "load" }, load));
      })));
  }

  function card(w) {
    const steps = buildSession(w).length;
    const last = store.lastDone(w.id);
    const meta = [w.date && fmtDate(w.date), steps + " steps", last && "last done " + new Date(last.finishedAt).toLocaleDateString()].filter(Boolean).join(" · ");
    const del = twoTap(el("button", { class: "danger" }, "Delete"), "Tap again", () => { store.remove(w.id); redraw(); });
    return el("section", { class: "card w-card" },
      el("div", { class: "w-head" },
        el("h2", { class: "w-name" }, w.name || "Untitled workout"),
        el("span", { class: "w-dur" }, fmt(workoutDuration(w)))),
      el("p", { class: "w-meta" }, meta),
      w.notes && el("p", { class: "note", style: "margin:0" }, w.notes),
      moveStrip(w),
      timeline(w),
      el("ol", { class: "w-plan" }, w.blocks.map(planRow)),
      el("a", { class: "btn primary start", href: "#/run/" + w.id }, "Start"),
      el("div", { class: "row grow" },
        el("a", { class: "btn", href: "#/edit/" + w.id }, "Edit"),
        el("button", { onclick: () => {
          const copy = structuredClone(w);
          copy.id = store.uid(); copy.name = (w.name || "Workout") + " (copy)"; copy.date = new Date().toISOString().slice(0, 10);
          store.put(copy); location.hash = "#/edit/" + copy.id;
        } }, "Copy"),
        el("button", { onclick: () => download(slug(w.name) + ".json", JSON.stringify(w, null, 2)) }, "Export"),
        del)
    );
  }
}
