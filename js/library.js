import { el, download, slug, isoDay, addDays, toast, menu, pickDate } from "./dom.js";
import * as store from "./store.js";
import { blockFormat, blockDuration, workoutDuration, fmtMin } from "./session.js";
import { moveOf, moveIcon, splitTask } from "./moves.js";

const blockTasks = b => (b.type === "emom" ? b.stations.flatMap(st => st.tasks) : b.tasks) || [];
// Warm-up and cool-down are the only timed pieces left out; a sim's runs and stations are main work.
const isBookend = b => b.type === "single" && /warm|cool/i.test(b.name || b.label || "");
const mainBlocks = w => w.blocks.filter(b => !isBookend(b));
// "Block 1" says nothing a reader needs, so only real names are shown.
const realName = b => (b.name && !/^block\s*\d+$/i.test(b.name.trim()) ? b.name : "");

const fmtDate = (iso, year) => {
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? iso : d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: year ? "numeric" : undefined });
};

const dayDate = new Date(Date.UTC(2000, 0, 1));
const weekday = (iso, style) => { dayDate.setTime(Date.parse(iso + "T00:00:00Z")); return dayDate.toLocaleDateString(undefined, { weekday: style, timeZone: "UTC" }); };
// Monday of the week the day falls in (getDay: Sun = 0).
const mondayOf = iso => addDays(iso, -((new Date(iso + "T00:00:00").getDay() + 6) % 7));
const daysBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);

// Each movement in the main work, once.
function movesOf(w) {
  const seen = new Map();
  mainBlocks(w).flatMap(blockTasks).forEach(([what]) => {
    const m = moveOf(what);
    if (m && !seen.has(m.id)) seen.set(m.id, m);
  });
  return [...seen.values()];
}

// Planned running in the main work. An AMRAP's rounds aren't known ahead, so it only adds a "+".
function running(w) {
  let m = 0, more = false;
  for (const b of mainBlocks(w)) {
    const times = b.type === "amrap" ? 0 : b.rounds || 1;
    for (const [what, load] of blockTasks(b)) {
      if (moveOf(what)?.id !== "run") continue;
      const a = splitTask(what, load).amount.match(/^([\d.]+) (m|km)$/);
      if (b.type === "amrap") more = true;
      else if (a) m += parseFloat(a[1]) * (a[2] === "km" ? 1000 : 1) * times;
    }
  }
  if (!m) return more ? "Running in the AMRAP" : "No running";
  return +(m / 1000).toFixed(1) + " km run" + (more ? "+" : "");
}

// The facts that decide whether this is the right session: how long, which stations, how much running.
const summary = w => [fmtMin(workoutDuration(w)), movesOf(w).length + " stations", running(w)];

// Each block's share of the clock, labelled so it can't be read as a progress bar.
export function timeline(w) {
  const parts = w.blocks.map(b => {
    const min = fmtMin(blockDuration(b));
    if (b.type === "single") {
      const n = b.name || b.label || "Timed piece";
      // A sim is a long run of short pieces; labelling each one would only overlap.
      const m = Math.round(blockDuration(b) / 60);
      const label = isBookend(b) ? (/warm/i.test(n) ? "WU " : "CD ") + m : m >= 8 ? String(m) : "";
      return { b, label, spoken: n + " " + min };
    }
    // "EMOM 15" and "AMRAP 12" already carry their minutes; "Every 3:30 × 4" becomes "E3:30 · 14".
    const f = blockFormat(b), every = f.match(/^Every (\S+) × \d+$/);
    return { b, label: every ? "E" + every[1] + " · " + min.replace(" min", "") : f, spoken: f + ", " + min };
  });
  return el("div", { class: "w-tl", role: "img", "aria-label": "Timeline: " + parts.map(p => p.spoken).join("; ") },
    el("div", { class: "w-bar" }, parts.map(p => el("span", { class: p.b.type === "single" ? "soft" : "", style: "flex-grow:" + blockDuration(p.b) }))),
    el("div", { class: "w-tl-lab", "aria-hidden": "true" }, parts.map(p => el("span", { style: "flex-grow:" + blockDuration(p.b) }, p.label.trim()))));
}

// The day picked in the week strip. Kept across redraws and edits; a fresh launch starts on today.
let selected = null;

export function renderLibrary(root) {
  const redraw = () => { const y = window.scrollY; root.replaceChildren(); renderLibrary(root); window.scrollTo(0, y); };
  const list = store.all().slice().sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.updatedAt || 0) - (b.updatedAt || 0));
  const msg = el("p", { class: "error", hidden: true });
  const today = isoDay();
  if (!selected) selected = today;
  const onDay = iso => list.filter(w => w.date === iso);
  const isDone = w => !!store.lastDone(w.id);

  const newBtn = el("a", { class: "head-btn plus", href: "#/new", "aria-label": "New workout" }, "+");
  const monthLabel = el("span", { class: "month" });
  const todayBtn = el("button", { class: "today-btn", onclick: () => select(today, "smooth") }, "Back to today");
  const weekHead = el("div", { class: "week-head" }, monthLabel, todayBtn);
  const strip = weekStrip();
  const dayPane = el("div", { class: "day-pane" });
  const others = el("div", { class: "day-pane" });
  const race = raceBand();

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

  const calBtn = el("button", { class: "head-btn", "aria-label": "Go to a date",
    onclick: () => pickDate(calBtn.parentNode, selected, iso => { selected = iso; redraw(); }) },
    el("span", { class: "cal-ic", "aria-hidden": "true" }));

  root.append(
    el("header", { class: "top" },
      el("h1", { class: "title" }, "HYROX Planner"),
      calBtn, newBtn,
      menu("More options", [
        ["Import workouts", (e, d) => { d.open = false; fileIn.click(); }],
        list.length > 1 && ["Export all", (e, d) => { d.open = false; download("hyrox-workouts.json", JSON.stringify(store.all(), null, 2)); }],
        [store.pref("race") ? "Change race" : "Set race date", (e, d) => { d.open = false; editRace(); }]
      ]),
      fileIn),
    msg, race,
    weekHead, strip, dayPane, others
  );
  select(selected, "instant");

  // Race countdown. Set from the header menu; hidden once the race day has passed.
  function raceBand() {
    const r = store.pref("race", null);
    const left = r && daysBetween(today, r.date);
    if (!r || left < 0) return el("div", { hidden: true });
    return el("button", { class: "race", onclick: editRace, "aria-label": "Race: " + (r.name || "HYROX") + ", " + fmtDate(r.date, true) + ", " + left + " days to go. Change" },
      el("span", { class: "race-what" }, "Race · ", el("b", {}, (r.name || "HYROX") + ", " + fmtDate(r.date))),
      el("span", { class: "race-days" }, left === 0 ? "Today" : [String(left), el("small", {}, left === 1 ? " day" : " days")]));
  }

  function editRace() {
    const r = store.pref("race", null) || {};
    const name = el("input", { type: "text", id: "race-name", value: r.name || "", placeholder: "HYROX Open, Hamburg" });
    const date = el("input", { type: "date", id: "race-date", value: r.date || "", min: today, required: true });
    const form = el("form", { class: "card race-form", onsubmit: e => {
      e.preventDefault();
      if (!date.value) return date.classList.add("invalid");
      store.setPref("race", { name: name.value.trim(), date: date.value }); redraw();
    } },
      el("label", { class: "field" }, el("span", {}, "Race"), name),
      el("label", { class: "field" }, el("span", {}, "Race day"), date),
      el("div", { class: "row grow" },
        r.date && el("button", { type: "button", class: "danger", onclick: () => { store.setPref("race", null); redraw(); } }, "Remove"),
        el("button", { type: "button", onclick: redraw }, "Cancel"),
        el("button", { type: "submit", class: "primary" }, "Save")));
    race.replaceWith(form);
    name.focus();
  }

  // Week strip, Mon to Sun, a week per swipe. Eight weeks either side of today, stretched to
  // reach every planned workout.
  function weekStrip() {
    const dates = list.map(w => w.date).filter(Boolean).sort();
    let from = mondayOf(addDays(today, -56)), to = addDays(mondayOf(addDays(today, 56)), 6);
    if (dates.length && dates[0] < from) from = mondayOf(dates[0]);
    if (selected < from) from = mondayOf(selected);
    const last = [dates.at(-1), selected].filter(Boolean).sort().at(-1);
    if (last > to) to = addDays(mondayOf(last), 6);
    const days = [];
    for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
    return el("div", { class: "week", role: "listbox", "aria-label": "Pick a day" }, days.map(d => {
      const mine = onDay(d), done = mine.length && mine.every(isDone);
      return el("button", {
        class: "day" + (d === mondayOf(d) ? " mon" : "") + (d === today ? " today" : "") + (mine.length ? " has" : "") + (done ? " done" : ""),
        "data-day": d, role: "option",
        "aria-label": weekday(d, "long") + " " + d + (done ? ", done" : mine.length ? ", " + mine.length + " planned" : ""),
        onclick: () => select(d)
      }, el("span", { class: "pill" },
        el("span", { class: "num" }, String(+d.slice(8))), el("span", { class: "dow" }, weekday(d, "short").slice(0, 2)), el("span", { class: "dot" })));
    }));
  }

  // Pick a day: highlight it, show its workouts in full, and (when asked) swipe the strip to its week.
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
    dayPane.replaceChildren(...(mine.length ? mine.map(card) : [
      el("section", { class: "card empty muted" },
        el("p", { class: "eyebrow" + (iso === today ? " is-today" : "") }, dayLabel(iso)),
        "Nothing planned. ", el("a", { href: "#/new/" + iso }, "Plan a workout"))]));
    const rest = list.filter(w => w.date !== iso);
    const ahead = rest.filter(w => w.date && w.date >= today);
    const past = rest.filter(w => w.date && w.date < today).reverse();
    const undated = rest.filter(w => !w.date);
    others.replaceChildren(
      ...group("Coming up", ahead), ...group("Earlier", past, past.length && past.filter(isDone).length + " of " + past.length + " done"),
      ...group("No date", undated));
    if (scroll) strip.querySelector('[data-day="' + mondayOf(iso) + '"]')?.scrollIntoView({ behavior: scroll, inline: "start", block: "nearest" });
  }

  function dayLabel(iso) { return (iso === today ? "Today · " : "") + fmtDate(iso); }

  // A collapsed list of other workouts. Tapping one jumps the strip to its day.
  function group(title, ws, aside) {
    if (!ws.length) return [];
    return [el("div", { class: "sect" }, el("h2", { class: "day-title" }, title), aside && el("span", {}, aside)),
      el("ul", { class: "others" }, ws.map(w => el("li", {}, el("button", {
        onclick: () => w.date ? select(w.date, "smooth") : (location.hash = "#/edit/" + w.id)
      },
        w.date ? el("span", { class: "o-date" }, el("span", { class: "dow" }, w.date === today ? "Today" : weekday(w.date, "short")), el("span", { class: "num" }, String(+w.date.slice(8))))
          : el("span", { class: "o-date" }, el("span", { class: "dow" }, "—")),
        el("span", { class: "o-text" }, el("span", { class: "o-name" }, w.name || "Untitled workout"), el("span", { class: "o-sum" }, summary(w).join(" · "))),
        isDone(w) ? el("span", { class: "status done" }, "Done") : el("span", { class: "chev", "aria-hidden": "true" }, "›")))))];
  }

  // Station icons with their names, so they read at a glance and to a screen reader.
  function moveStrip(w) {
    const ms = movesOf(w);
    return ms.length > 0 && el("ul", { class: "w-moves", "aria-label": "Stations" },
      ms.map(m => el("li", {}, moveIcon(m), el("span", {}, m.label))));
  }

  function card(w) {
    const last = store.lastDone(w.id);
    const isToday = w.date === today;
    const main = mainBlocks(w).flatMap(blockTasks);
    // Settings shared by every erg are said once, under the plan, not on each row.
    const dampers = [...new Set(main.map(([, l]) => l).filter(l => /^damper\b/i.test(l || "")))];
    const oneDamper = dampers.length === 1 && dampers[0];
    const sledTotal = main.some(([what, l]) => /sled/i.test(what) && /\btotal$/i.test(l || ""));

    const planRow = b => {
      const dur = el("span", { class: "d" }, fmtMin(blockDuration(b)));
      if (isBookend(b) || (b.type === "single" && !b.tasks?.length)) return el("li", { class: "wb soft" }, el("span", { class: "wb-fmt" }, b.name || b.label || "Timed piece"), dur);
      const name = realName(b);
      return el("li", { class: "wb" },
        el("span", { class: "wb-fmt" }, blockFormat(b) || name || b.label || "Timed piece", blockFormat(b) && name && el("small", {}, name)), dur,
        el("ul", { class: "wb-tasks" }, blockTasks(b).map(([what, load]) => {
          const m = moveOf(what);
          const t = splitTask(what, load === oneDamper ? "" : load);
          return el("li", {}, m ? moveIcon(m) : el("span", { class: "mv none" }),
            el("span", { class: "amt" }, t.amount), el("span", { class: "t" }, t.move),
            el("span", { class: "load" }, sledTotal ? t.load.replace(/\s*total$/i, "") : t.load));
        })));
    };

    const confirmDelete = (e, d) => {
      e.stopPropagation();
      d.querySelector(".menu-panel").replaceChildren(el("p", {}, "Delete this workout?"),
        el("div", { class: "row grow" },
          el("button", { onclick: () => { d.open = false; redraw(); } }, "Cancel"),
          el("button", { class: "danger", onclick: () => {
            store.remove(w.id); redraw();
            toast("Workout deleted", "Undo", () => { store.put(w); redraw(); });
          } }, "Delete")));
    };

    // Reschedule: the date picker opens straight from the menu, and the strip follows the workout.
    const move = iso => {
      if (iso === w.date) return;
      const from = w.date;
      w.date = iso; store.put(w); selected = iso; redraw();
      toast("Moved to " + fmtDate(iso), "Undo", () => { w.date = from; store.put(w); selected = from || today; redraw(); });
    };

    const settings = [oneDamper && "Ergs on " + oneDamper + ".", sledTotal && "Sled weights include the sled."].filter(Boolean).join(" ");
    const start = isToday
      ? el("a", { class: "btn primary start", href: "#/run/" + w.id }, "Start", el("small", {}, fmtMin(workoutDuration(w)) + " · first up: " + (w.blocks[0]?.name || blockFormat(w.blocks[0] || {}) || "block 1").toLowerCase()))
      : el("a", { class: "btn start-quiet", href: "#/run/" + w.id }, w.date > today ? "Start early" : "Start");

    const top = el("div", { class: "w-top" },
        el("p", { class: "eyebrow" + (isToday ? " is-today" : "") }, w.date ? dayLabel(w.date) : "No date"),
        menu("Workout options", [
          ["Edit", () => { location.hash = "#/edit/" + w.id; }],
          [w.date ? "Move to another day" : "Set a date", (e, d) => { d.open = false; pickDate(top, w.date || today, move); }],
          ["Duplicate", () => {
            const copy = structuredClone(w);
            copy.id = store.uid(); copy.name = (w.name || "Workout") + " (copy)"; copy.date = today;
            store.put(copy); location.hash = "#/edit/" + copy.id;
          }],
          ["Export", (e, d) => { d.open = false; download(slug(w.name) + ".json", JSON.stringify(w, null, 2)); }],
          ["Delete…", confirmDelete, "danger"]
        ]));
    return el("section", { class: "card w-card" + (isToday ? " is-today" : "") },
      top,
      el("h2", { class: "w-name" }, w.name || "Untitled workout"),
      el("ul", { class: "chips", "aria-label": "Summary" },
        summary(w).map((s, k) => el("li", { class: k === 0 ? "key" : "" }, s)),
        last && el("li", { class: "done" }, "Done " + new Date(last.finishedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }))),
      w.notes && el("p", { class: "callout" }, el("b", {}, "Note"), w.notes),
      moveStrip(w),
      timeline(w),
      el("ol", { class: "w-plan" }, w.blocks.map(planRow)),
      settings && el("p", { class: "w-settings" }, settings),
      start
    );
  }
}
