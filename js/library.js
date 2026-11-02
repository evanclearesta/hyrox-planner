import { el, twoTap, download, slug, isoDay, addDays } from "./dom.js";
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

const dayDate = new Date(Date.UTC(2000, 0, 1));
const weekday = (iso, style) => { dayDate.setTime(Date.parse(iso + "T00:00:00Z")); return dayDate.toLocaleDateString(undefined, { weekday: style, timeZone: "UTC" }); };
// Monday of the week the day falls in (getDay: Sun = 0).
const mondayOf = iso => addDays(iso, -((new Date(iso + "T00:00:00").getDay() + 6) % 7));

// The day picked in the week strip. Kept across redraws and edits; a fresh launch starts on today.
let selected = null;

export function renderLibrary(root) {
  const redraw = () => { root.replaceChildren(); renderLibrary(root); };
  const list = store.all().slice().sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.updatedAt || 0) - (a.updatedAt || 0));
  const msg = el("p", { class: "error", hidden: true });
  const today = isoDay();
  if (!selected) selected = today;
  const onDay = iso => list.filter(w => w.date === iso);

  const newBtn = el("a", { class: "btn primary", href: "#/new" }, "+ New workout");
  const monthLabel = el("span", { class: "month" });
  const todayBtn = el("button", { class: "today-btn", onclick: () => select(today, "smooth") }, "Back to today");
  const weekHead = el("div", { class: "week-head" }, monthLabel, todayBtn);
  const strip = weekStrip();
  const dayPane = el("div", { class: "day-pane" });
  const others = el("div", { class: "day-pane" });

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
      newBtn,
      el("button", { onclick: () => fileIn.click() }, "Import"),
      list.length > 1 && el("button", { onclick: () => download("hyrox-workouts.json", JSON.stringify(store.all(), null, 2)) }, "Export all"),
      fileIn),
    msg,
    weekHead, strip, dayPane, others
  );
  select(selected, "instant");

  // Week strip, Mon to Sun, a week per swipe. Eight weeks either side of today, stretched to
  // reach every planned workout, plus a day each end so the first and last weeks still peek.
  function weekStrip() {
    const dates = list.map(w => w.date).filter(Boolean).sort();
    let from = mondayOf(addDays(today, -56)), to = addDays(mondayOf(addDays(today, 56)), 6);
    if (dates.length && dates[0] < from) from = mondayOf(dates[0]);
    if (selected < from) from = mondayOf(selected);
    const last = [dates.at(-1), selected].filter(Boolean).sort().at(-1);
    if (last > to) to = addDays(mondayOf(last), 6);
    const days = [];
    for (let d = addDays(from, -1); d <= addDays(to, 1); d = addDays(d, 1)) days.push(d);
    return el("div", { class: "week", role: "listbox", "aria-label": "Pick a day" }, days.map(d => {
      const n = onDay(d).length;
      return el("button", {
        class: "day" + (d === mondayOf(d) ? " mon" : "") + (d === today ? " today" : "") + (n ? " has" : ""),
        "data-day": d, role: "option", "aria-label": weekday(d, "long") + " " + d + (n ? ", " + n + " planned" : ""),
        onclick: () => select(d)
      }, el("span", { class: "dow" }, weekday(d, "narrow")), el("span", { class: "num" }, String(+d.slice(8))), el("span", { class: "dot" }));
    }));
  }

  // Pick a day: highlight it, list its workouts, and (when asked) swipe the strip to its week.
  function select(iso, scroll) {
    selected = iso;
    strip.querySelectorAll(".day").forEach(b => {
      b.classList.toggle("sel", b.dataset.day === iso);
      b.setAttribute("aria-selected", b.dataset.day === iso);
    });
    const d = new Date(iso + "T00:00:00");
    monthLabel.textContent = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    todayBtn.hidden = iso === today;
    newBtn.href = "#/new/" + iso;
    const mine = onDay(iso);
    dayPane.replaceChildren(
      el("h2", { class: "day-title" }, iso === today ? "Today" : fmtDate(iso).replace(/,? \d{4}$/, "")),
      ...(mine.length ? mine.map(card) : [el("section", { class: "card empty muted" }, "Nothing planned. ",
        el("a", { href: "#/new/" + iso }, "Plan a workout"))]));
    const rest = list.filter(w => w.date !== iso);
    others.replaceChildren(...(rest.length ? [el("h2", { class: "day-title" }, "Other workouts"),
      el("ul", { class: "others" }, rest.map(w => el("li", {}, el("button", {
        onclick: () => w.date ? select(w.date, "smooth") : (location.hash = "#/edit/" + w.id)
      }, el("span", { class: "o-name" }, w.name || "Untitled workout"),
        el("span", { class: "o-date" }, w.date ? fmtDate(w.date) : "No date"),
        el("span", { class: "o-dur" }, fmt(workoutDuration(w)))))))] : []));
    if (scroll) strip.querySelector('[data-day="' + mondayOf(iso) + '"]')?.scrollIntoView({ behavior: scroll, inline: "start", block: "nearest" });
  }

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
