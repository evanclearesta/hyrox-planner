import { el, twoTap, download, slug } from "./dom.js";
import * as store from "./store.js";
import { blockTitle, blockDuration, workoutDuration, buildSession, fmt } from "./session.js";

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
      el("ol", { class: "w-blocks" }, w.blocks.map(b => el("li", {}, blockTitle(b), " ", el("span", { class: "d" }, fmt(blockDuration(b)))))),
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
