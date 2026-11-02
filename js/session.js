// Workout format -> flat list of timed steps (see hyrox-timer-spec §1).
//
// Workout: { id, name, date, notes, blocks: Block[] }
// Block, by type:
//   single: { name, label, dur, tasks, note }                 one timed piece (warm-up, cool-down)
//   every:  { name, interval, rounds, tasks, note }           every n min for R rounds (E3MOM etc.)
//   emom:   { name, interval, rounds, stations: [{ tasks, note }] }   rotating stations
//   amrap:  { name, label, dur, tasks, note }
// Task: [what, load], e.g. ["Sled pull 25 m", "103 kg total"]. Durations are seconds.

export const BLOCK_TYPES = {
  single: "Timed piece",
  every: "Every X min",
  emom: "EMOM stations",
  amrap: "AMRAP"
};

export const fmt = sec => {
  const s = Math.max(0, Math.ceil(sec));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};
export const fmtMs = ms => fmt(ms / 1000);
// Durations read as minutes ("14 min"), so they aren't mistaken for a time of day.
export const fmtMin = sec => (sec % 60 ? fmt(sec) : sec / 60 + " min");

// "3:30" -> 210, "12" -> 720 (plain numbers are minutes). Invalid -> NaN.
export function parseDur(str) {
  const t = String(str).trim();
  if (/^\d+(\.\d+)?$/.test(t)) return Math.round(parseFloat(t) * 60);
  const m = t.match(/^(\d+):([0-5]\d)$/);
  return m ? +m[1] * 60 + +m[2] : NaN;
}

export function blockFormat(b) {
  switch (b.type) {
    case "every": return b.interval === 60 ? "EMOM " + b.rounds : "Every " + fmt(b.interval) + " × " + b.rounds;
    case "emom": {
      const n = b.rounds * b.stations.length;
      return b.interval === 60 ? "EMOM " + n : "Every " + fmt(b.interval) + " × " + n;
    }
    case "amrap": return "AMRAP " + (b.dur % 60 ? fmt(b.dur) : b.dur / 60);
    default: return "";
  }
}

export const blockTitle = b => [b.name, blockFormat(b)].filter(Boolean).join(" · ") || "Untitled block";

export function blockDuration(b) {
  switch (b.type) {
    case "every": return b.interval * b.rounds;
    case "emom": return b.interval * b.rounds * b.stations.length;
    default: return b.dur;
  }
}

export const workoutDuration = w => w.blocks.reduce((a, b) => a + blockDuration(b), 0);

export function buildSession(w) {
  const steps = [];
  for (const b of w.blocks) {
    const block = blockTitle(b);
    if (b.type === "single" || b.type === "amrap") {
      const amrap = b.type === "amrap";
      steps.push({ block, dur: b.dur, gate: true, amrap,
        label: b.label || (amrap ? "As many rounds as possible" : b.name || "Go"),
        tasks: b.tasks || [], note: b.note || "" });
    } else if (b.type === "every") {
      for (let r = 1; r <= b.rounds; r++) {
        steps.push({ block, dur: b.interval, gate: r === 1, label: "Round " + r + " / " + b.rounds, round: [r, b.rounds],
          tasks: b.tasks || [], note: b.note || "" });
      }
    } else if (b.type === "emom") {
      const unit = b.interval === 60 ? "Minute" : "Station";
      for (let r = 1; r <= b.rounds; r++) {
        b.stations.forEach((st, m) => {
          steps.push({ block, dur: b.interval, gate: r === 1 && m === 0,
            label: "Round " + r + " / " + b.rounds + " · " + unit + " " + (m + 1), round: [r, b.rounds],
            tasks: st.tasks || [], note: st.note || "" });
        });
      }
    }
  }
  return steps;
}

// Editor helpers: tasks as "what | load" lines.
export const tasksToText = tasks => (tasks || []).map(([a, b]) => (b ? a + " | " + b : a)).join("\n");
export const textToTasks = text => text.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
  const [what, ...rest] = l.split("|");
  return [what.trim(), rest.join("|").trim()];
});

export function newBlock(type, name = "", tasks = [], note = "", dur) {
  switch (type) {
    case "single": return { type, name, label: "", dur: dur || 300, tasks, note };
    case "every": return { type, name, interval: 180, rounds: 4, tasks, note };
    case "emom": return { type, name, interval: 60, rounds: 5,
      stations: tasks.length ? tasks.map((t, k) => ({ tasks: [t], note: k === 0 ? note : "" })) : [{ tasks: [], note: "" }, { tasks: [], note: "" }] };
    case "amrap": return { type, name, label: "", dur: dur || 720, tasks, note };
  }
}

// Change a block's type, keeping its name, tasks, note and (where it applies) duration.
export function convertBlock(b, type) {
  const tasks = b.type === "emom" ? b.stations.flatMap(s => s.tasks) : b.tasks || [];
  const note = b.type === "emom" ? (b.stations[0] && b.stations[0].note) || "" : b.note || "";
  return newBlock(type, b.name, tasks, note, b.dur);
}
