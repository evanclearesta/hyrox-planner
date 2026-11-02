// Workouts loaded on first visit. After that, everything lives in localStorage.
const SLED = "103 kg total";
const PUSH = "152 kg total";
const BRACE = "Brace, flat back from hips to shoulders, hips low but not below shoulders, short fast steps. Each length unbroken.";
const BACK = "Back rule: pain up to 3/10 is fine if it's no worse next morning. Above 3/10, stop this movement for 48 h.";
const SIM_RUN = "Runs 5:25–5:35/km. No run over HR 178.";

const warmup = () => ({ type: "single", name: "Warm-up", label: "Warm-up", dur: 600,
  tasks: [["Easy row", ""], ["Leg swings, hip openers", ""], ["Run drills", ""]], note: "" });
const cooldown = () => ({ type: "single", name: "Cool-down", label: "Cool-down", dur: 300,
  tasks: [["Easy erg or walk", ""]], note: "" });
const simRun = (n, pace, note) => ({ type: "single", name: "Run " + n, label: "Run " + n, dur: 330,
  tasks: [["Run 1 km at " + pace + "/km", ""]], note });
const station = (name, label, dur, task, note) => ({ type: "single", name, label, dur, tasks: [task], note });

export const SEED = [{
  id: "2026-11-02",
  name: "Sled, EMOM, AMRAP",
  date: "2026-11-02",
  notes: "",
  blocks: [
    { type: "single", name: "Warm-up", label: "Warm-up", dur: 600,
      tasks: [["5 min easy row or SkiErg", ""], ["Leg swings, hip openers, 10 air squats", ""], ["5 easy broad jumps", ""], ["2 sled pull build-up lengths", "~60 kg total"]],
      note: "Load the sled for Block 1 during the last minutes." },
    { type: "every", name: "Block 1", interval: 210, rounds: 4,
      tasks: [["SkiErg 250 m at ~2:10/500", "damper 5–7"], ["Sled pull 25 m (2 lengths), fast walk-back and rope reset", SLED], ["Burpee broad jumps", "× 5"]],
      note: "Pull hand over hand from a sitting-back stance. Jog the walk-back and lay the rope straight. If 25 m takes over 1:45, drop to ~90 kg total." },
    { type: "emom", name: "Block 2", interval: 60, rounds: 5, stations: [
      { tasks: [["Farmers carry 50 m, zero put-downs", "2 × 28 kg"]], note: "If you must put the handles down, 5 seconds at most." },
      { tasks: [["Sandbag lunges 20 m", "20 kg"]], note: "" },
      { tasks: [["Burpee broad jumps", "× 8"]], note: "" }
    ] },
    { type: "amrap", name: "Block 3", label: "", dur: 720,
      tasks: [["Row 300 m", "damper 5–7"], ["Farmers carry 50 m", "2 × 24 kg"], ["Sandbag lunges 20 m", "20 kg"], ["Burpee broad jumps", "× 6"]],
      note: "Race effort, not all-out. Tap + after each full round." },
    { type: "single", name: "Cool-down", label: "Easy erg, then stretch", dur: 300,
      tasks: [["Easy erg, HR under 130", ""], ["Stretch calves, hips, forearms", ""]], note: "" }
  ]
}, {
  // "2026-11-03" and "2026-11-03b" were earlier drafts; devices have already seen those ids.
  id: "2026-11-03c",
  name: "Sled test, EMOM, wall balls",
  date: "2026-11-03",
  notes: "Own session, no class. About 80% effort: the back comes first this week. Optional PM: easy 30 min run, HR under 145.",
  blocks: [
    { type: "single", name: "Warm-up", label: "Warm-up", dur: 600,
      tasks: [["Easy row", ""], ["Cat-cow, glute bridges, dead bugs", ""], ["Leg swings, hip openers", ""]],
      note: "Wake the trunk up before the sled." },
    { type: "single", name: "Sled push test", label: "Sled test", dur: 180,
      tasks: [["Sled push 12.5 m (1 length)", "~100 kg total"], ["Sled push 12.5 m (1 length)", PUSH]],
      note: "Back check after last week's strain. Do the sled sets only if both lengths are pain-free. " + BACK },
    { type: "every", name: "Sled push", interval: 120, rounds: 3,
      tasks: [["Sled push 12.5 m, no stop mid-length", PUSH]],
      note: BRACE + " Interval is an estimate. Skip this block if the test hurt." },
    { type: "emom", name: "Main · EMOM 15", interval: 60, rounds: 5, stations: [
      { tasks: [["SkiErg 12 cal", ""]], note: "Hard but repeatable pace." },
      { tasks: [["Wall balls × 12", "6 kg"]], note: "Unbroken, full depth." },
      { tasks: [["Burpee broad jumps × 6", ""]], note: "Steady rhythm. Step up if the back complains." }
    ] },
    { type: "every", name: "Goblet squat", interval: 90, rounds: 3,
      tasks: [["Kettlebell goblet squat", "× 8"]],
      note: "Replaces the back squat this week to spare the lower back. Interval is an estimate." },
    { type: "every", name: "Wall balls", interval: 120, rounds: 3,
      tasks: [["Wall balls × 10, five breaths, then × 10", "6 kg"]],
      note: "Full depth every rep. Interval is an estimate." },
    cooldown()
  ]
}, {
  id: "2026-11-04",
  name: "Run + SkiErg intervals",
  date: "2026-11-04",
  notes: "Morning session. This replaces the Wednesday tempo and is your quality run of the week.",
  blocks: [
    { type: "single", name: "Warm-up", label: "Warm-up", dur: 600,
      tasks: [["Run 1 km easy jog", ""], ["Leg swings, run drills", ""]], note: "" },
    { type: "every", name: "Block 1", interval: 540, rounds: 4,
      tasks: [["Run 1 km at 5:15/km", ""], ["SkiErg 500 m at 2:05–2:10/500", ""]],
      note: "Rest is the ~90 s walk left in each 9:00. Last km no faster than the first. Ski harder than on 11 Oct: hinge from the hips." },
    { type: "single", name: "Cool-down", label: "Cool-down", dur: 360,
      tasks: [["Run 1 km easy jog", ""]], note: "" }
  ]
}, {
  id: "2026-11-05",
  name: "Grip, farmers, Z2 row",
  date: "2026-11-05",
  notes: "Morning session. Optional PM: easy 5 km run.",
  blocks: [
    { type: "every", name: "Dead hang", interval: 120, rounds: 3,
      tasks: [["Dead hang, max hold", ""]], note: "Aim for 60 s+. Interval is an estimate." },
    { type: "every", name: "Farmers carry", interval: 90, rounds: 3,
      tasks: [["Farmers carry 50 m, brisk walk", "2 × 28 kg"]], note: "Heavier than race weight. Interval is an estimate." },
    { type: "single", name: "Zone 2 row", label: "Z2 row", dur: 1200,
      tasks: [["Row, HR 125–140", "damper 4–6"]], note: "22–24 strokes/min, conversational." }
  ]
}, {
  id: "2026-11-06",
  name: "Light AMRAP",
  date: "2026-11-06",
  notes: "Own session, no class. Keep it at 70%: sim on Sunday. No grip work to failure.",
  blocks: [
    warmup(),
    { type: "amrap", name: "Main · AMRAP 15", label: "", dur: 900,
      tasks: [["Row 250 m", ""], ["Farmers carry 50 m", "2 × 24 kg"], ["Wall balls × 10", "6 kg"], ["Sandbag lunges 20 m", "20 kg"]],
      note: "Conversational effort, smooth transitions. Rehearse the movements, don't chase rounds." },
    cooldown()
  ]
}, {
  id: "2026-11-07",
  name: "Easy run + strides",
  date: "2026-11-07",
  notes: "Day before sim 2. Carbs up, off your feet, no late night.",
  blocks: [
    { type: "single", name: "Easy run", label: "Easy 5 km", dur: 1800,
      tasks: [["Run 5 km easy", ""]], note: "HR under 145." },
    { type: "every", name: "Strides", interval: 60, rounds: 4,
      tasks: [["Run 20 s stride, walk back", ""]], note: "Quick and relaxed, not a sprint." }
  ]
}, {
  id: "2026-11-08",
  name: "Full sim 2",
  date: "2026-11-08",
  notes: "Correct race order. Target 1:22–1:27. Go only on a green day, or amber because of sleep alone, and only if Tuesday's sled test was pain-free. Otherwise swap with the 15 Nov half sim. Lap the watch, don't pause it. Block timers are target times; keep going if one runs out.",
  blocks: [
    { type: "single", name: "Warm-up", label: "Warm-up", dur: 900,
      tasks: [["Run 1 km easy", ""], ["Easy row", ""], ["Build-ups: SkiErg, sled push, wall balls", ""]], note: "" },
    simRun(1, "5:25–5:35", "Run 1 no faster than 5:20/km. " + SIM_RUN),
    station("1. SkiErg", "SkiErg", 260, ["SkiErg 1000 m", ""], "Target 4:20. About 2:10/500. Harder than 11 Oct; HR 175–180 is fine."),
    simRun(2, "5:25–5:35", SIM_RUN),
    station("2. Sled push", "Sled push", 150, ["Sled push 50 m (4 lengths)", PUSH],
      "Target 2:30. " + BRACE + " If you must stop, 3 s, not 10. " + BACK),
    simRun(3, "5:25–5:35", SIM_RUN),
    station("3. Sled pull", "Sled pull", 240, ["Sled pull 50 m (4 lengths)", SLED], "Target 4:00. Drop the rope, walk fast to the far end, pull again within 5 s."),
    simRun(4, "5:25–5:35", SIM_RUN + " Run 4: hold back, no spike."),
    station("4. Burpee broad jumps", "Burpee broad jumps", 360, ["Burpee broad jumps 80 m", ""], "Target 6:00. Steady rhythm, step up if needed, no standing breaks."),
    simRun(5, "5:25–5:35", SIM_RUN),
    station("5. Row", "Row", 285, ["Row 1000 m", ""], "Target 4:45. Note the rower's time."),
    simRun(6, "5:25–5:35", SIM_RUN),
    station("6. Farmers carry", "Farmers carry", 165, ["Farmers carry 200 m", "2 × 24 kg"], "Target 2:45. Brisk walk. If you must put down, once at 100 m for 5 s."),
    simRun(7, "5:25–5:35", SIM_RUN),
    station("7. Sandbag lunges", "Sandbag lunges", 315, ["Sandbag lunges 100 m", "20 kg"], "Target 5:15. Steady; maintenance station."),
    simRun(8, "5:25–5:35", SIM_RUN),
    station("8. Wall balls", "Wall balls", 435, ["Wall balls × 100, 10 sets of 10, five breaths between", "6 kg"], "Target 7:15. Full depth every rep. No 45 s stops."),
    cooldown()
  ]
}, {
  id: "2026-11-10",
  name: "Sled push, E4MOM, wall balls",
  date: "2026-11-10",
  notes: "Own session, no class. Optional PM: easy 30 min run.",
  blocks: [
    { type: "single", name: "Warm-up", label: "Warm-up", dur: 600,
      tasks: [["Easy row", ""], ["Glute bridges, dead bugs", ""], ["2 sled push build-up lengths", "~100 kg total"]], note: "" },
    { type: "every", name: "Sled push", interval: 120, rounds: 4,
      tasks: [["Sled push 12.5 m, unbroken", PUSH]],
      note: BRACE + " " + BACK + " Interval is an estimate." },
    { type: "every", name: "Main · E4MOM × 5", interval: 240, rounds: 5,
      tasks: [["SkiErg 250 m at ~2:05/500", ""], ["Sandbag lunges 20 m", "20 kg"], ["Burpee broad jumps × 6", ""]],
      note: "Race effort on the ski, steady on the rest. Rest is what's left of each 4:00." },
    { type: "every", name: "Squat", interval: 120, rounds: 3,
      tasks: [["Back squat", "~75% × 5"]],
      note: "Only if the back is pain-free; otherwise goblet squat × 8. Interval is an estimate." },
    { type: "every", name: "Wall balls", interval: 150, rounds: 4,
      tasks: [["Wall balls × 25, as 10 / 10 / 5 with five breaths", "6 kg"]], note: "Interval is an estimate." },
    { type: "every", name: "Burpee broad jumps", interval: 120, rounds: 2,
      tasks: [["Burpee broad jumps 40 m, race rhythm", ""]], note: "Interval is an estimate." },
    cooldown()
  ]
}, {
  id: "2026-11-11",
  name: "Run + worst four stations",
  date: "2026-11-11",
  notes: "Morning session. Default stations shown; swap in the four that cost most on sim 2 if it happened.",
  blocks: [
    warmup(),
    { type: "single", name: "Round 1", label: "Run + pull", dur: 600,
      tasks: [["Run 1 km at 5:10/km", ""], ["Sled pull 50 m (4 lengths)", SLED]], note: "Race effort. Fast walk-back and rope reset." },
    { type: "single", name: "Round 2", label: "Run + BBJ", dur: 720,
      tasks: [["Run 1 km at 5:10/km", ""], ["Burpee broad jumps 80 m", ""]], note: "Race rhythm, no standing." },
    { type: "single", name: "Round 3", label: "Run + farmers", dur: 540,
      tasks: [["Run 1 km at 5:10/km", ""], ["Farmers carry 200 m", "2 × 24 kg"]], note: "Brisk walk, one 5 s put-down at most." },
    { type: "single", name: "Round 4", label: "Run + wall balls", dur: 780,
      tasks: [["Run 1 km at 5:10/km", ""], ["Wall balls × 100, sets of 10", "6 kg"]], note: "Five breaths between sets." },
    cooldown()
  ]
}, {
  id: "2026-11-12",
  name: "Grip, Z2 SkiErg",
  date: "2026-11-12",
  notes: "Morning session. Optional PM: easy 6 km run.",
  blocks: [
    { type: "every", name: "Dead hang", interval: 120, rounds: 3,
      tasks: [["Dead hang, max hold", ""]], note: "Interval is an estimate." },
    { type: "single", name: "Zone 2 SkiErg", label: "Z2 SkiErg", dur: 1200,
      tasks: [["SkiErg, HR 125–140", ""]], note: "Hinge from the hips." }
  ]
}, {
  id: "2026-11-13",
  name: "Sled pull, EMOM, farmers",
  date: "2026-11-13",
  notes: "Own session, no class.",
  blocks: [
    { type: "single", name: "Warm-up", label: "Warm-up", dur: 600,
      tasks: [["Easy row", ""], ["Band pull-aparts, scap pull-ups", ""], ["2 sled pull build-up lengths", "~60 kg total"]], note: "" },
    { type: "every", name: "Sled pull", interval: 330, rounds: 3,
      tasks: [["Sled pull 50 m (4 lengths), race format", SLED]],
      note: "Each under 4:00 including turnarounds. Interval is an estimate." },
    { type: "emom", name: "Main · EMOM 12", interval: 60, rounds: 4, stations: [
      { tasks: [["Row 14 cal", ""]], note: "Race pace." },
      { tasks: [["Farmers carry 50 m", "2 × 28 kg"]], note: "Brisk walk, no put-down." },
      { tasks: [["Wall balls × 12", "6 kg"]], note: "Unbroken." }
    ] },
    { type: "every", name: "Farmers carry", interval: 300, rounds: 2,
      tasks: [["Farmers carry 200 m, unbroken", "2 × 24 kg"]], note: "Interval is an estimate." },
    { type: "every", name: "Pull-ups", interval: 90, rounds: 4,
      tasks: [["Pull-ups", "× 5"]], note: "Interval is an estimate." },
    cooldown()
  ]
}, {
  id: "2026-11-14",
  name: "Easy run",
  date: "2026-11-14",
  notes: "The one standalone run to keep this week.",
  blocks: [
    { type: "single", name: "Easy run", label: "Easy run", dur: 3300,
      tasks: [["Run 8–10 km easy", ""]], note: "HR under 145." }
  ]
}, {
  id: "2026-11-15",
  name: "Back-half sim",
  date: "2026-11-15",
  notes: "Race pace. If sim 2 slipped to today, do the full sim instead and keep the next week easy. Block timers are target times.",
  blocks: [
    { type: "single", name: "Warm-up", label: "Warm-up", dur: 900,
      tasks: [["Run 1 km easy", ""], ["Easy row", ""], ["Build-ups: farmers, wall balls", ""]], note: "" },
    simRun(1, "5:20–5:30", ""),
    station("Row", "Row", 285, ["Row 1000 m", ""], "Target 4:45."),
    simRun(2, "5:20–5:30", ""),
    station("Farmers carry", "Farmers", 165, ["Farmers carry 200 m", "2 × 24 kg"], "Target 2:45, one 5 s put-down at most."),
    simRun(3, "5:20–5:30", ""),
    station("Sandbag lunges", "Lunges", 315, ["Sandbag lunges 100 m", "20 kg"], "Target 5:15."),
    simRun(4, "5:20–5:30", ""),
    station("Wall balls", "Wall balls", 435, ["Wall balls × 100, 10 sets of 10", "6 kg"], "Target 7:15, five breaths between sets."),
    cooldown()
  ]
}, {
  id: "2026-11-17",
  name: "Sled push, E3MOM",
  date: "2026-11-17",
  notes: "Own session, no class. About 70% effort. Optional PM: easy 30 min run.",
  blocks: [
    warmup(),
    { type: "every", name: "Sled push", interval: 120, rounds: 3,
      tasks: [["Sled push 20 m", PUSH]], note: BRACE + " Interval is an estimate." },
    { type: "every", name: "Main · E3MOM × 4", interval: 180, rounds: 4,
      tasks: [["SkiErg 200 m", ""], ["Wall balls × 10", "6 kg"], ["Burpee broad jumps × 5", ""]],
      note: "Smooth, not hard. Rest is what's left of each 3:00." },
    { type: "every", name: "Wall balls", interval: 60, rounds: 3,
      tasks: [["Wall balls × 10", "6 kg"]], note: "" },
    cooldown()
  ]
}, {
  id: "2026-11-18",
  name: "Run + ergs + wall balls",
  date: "2026-11-18",
  notes: "Morning session.",
  blocks: [
    warmup(),
    { type: "emom", name: "Block 1", interval: 540, rounds: 1, stations: [
      { tasks: [["Run 1 km at 5:00/km", ""], ["SkiErg 500 m at race pace", ""]], note: "Walk the rest of the 9:00." },
      { tasks: [["Run 1 km at 5:00/km", ""], ["Row 500 m at race pace", ""]], note: "Walk the rest of the 9:00." },
      { tasks: [["Run 1 km at 5:00/km", ""], ["Wall balls × 30", "6 kg"]], note: "Sets of 10, five breaths." }
    ] },
    cooldown()
  ]
}, {
  id: "2026-11-19",
  name: "Grip, Z2 erg",
  date: "2026-11-19",
  notes: "Morning session. Optional PM: easy 5 km run.",
  blocks: [
    { type: "every", name: "Dead hang", interval: 120, rounds: 2,
      tasks: [["Dead hang, not to failure", ""]], note: "Interval is an estimate." },
    { type: "single", name: "Zone 2 erg", label: "Z2 erg", dur: 900,
      tasks: [["Row or SkiErg, HR 125–140", ""]], note: "" }
  ]
}, {
  id: "2026-11-20",
  name: "Technique rotation",
  date: "2026-11-20",
  notes: "Own session, no class. About 60%, technique only. Nothing should feel hard.",
  blocks: [
    warmup(),
    { type: "emom", name: "Main · technique, every 3:00", interval: 180, rounds: 1, stations: [
      { tasks: [["Sled pull 12.5 m (1 length)", SLED]], note: "Practise the drop, walk and re-grip." },
      { tasks: [["Burpee broad jumps 10 m", ""]], note: "Find the rhythm you'll race at." },
      { tasks: [["Sandbag lunges 20 m", "20 kg"]], note: "Upright, knee kisses the floor." },
      { tasks: [["Wall balls × 10", "6 kg"]], note: "Target and depth, nothing more." }
    ] },
    cooldown()
  ]
}, {
  id: "2026-11-21",
  name: "Easy run + strides",
  date: "2026-11-21",
  notes: "",
  blocks: [
    { type: "single", name: "Easy run", label: "Easy 8 km", dur: 2880,
      tasks: [["Run 8 km easy", ""]], note: "HR under 145." },
    { type: "every", name: "Strides", interval: 60, rounds: 4,
      tasks: [["Run 20 s stride, walk back", ""]], note: "" }
  ]
}, {
  id: "2026-11-22",
  name: "Race-pace half stations",
  date: "2026-11-22",
  notes: "Stop while it still feels good. Sharp, not deep.",
  blocks: [
    warmup(),
    { type: "emom", name: "Block 1", interval: 540, rounds: 1, stations: [
      { tasks: [["Run 1 km at 5:20/km", ""], ["Sled push 25 m (2 lengths)", PUSH]], note: BRACE },
      { tasks: [["Run 1 km at 5:20/km", ""], ["Sled pull 25 m (2 lengths)", SLED]], note: "Fast rope reset." },
      { tasks: [["Run 1 km at 5:20/km", ""], ["Farmers carry 100 m", "2 × 24 kg"]], note: "Unbroken." },
      { tasks: [["Run 1 km at 5:20/km", ""], ["Wall balls × 30", "6 kg"]], note: "Sets of 10, five breaths." }
    ] },
    cooldown()
  ]
}, {
  id: "2026-11-24",
  name: "Mini session",
  date: "2026-11-24",
  notes: "20 minutes, then stop.",
  blocks: [
    { type: "single", name: "Warm-up", label: "Warm-up", dur: 300,
      tasks: [["Easy row", ""]], note: "" },
    { type: "every", name: "Sled push", interval: 90, rounds: 2,
      tasks: [["Sled push 15 m", PUSH]], note: BRACE },
    { type: "every", name: "Wall balls", interval: 60, rounds: 2,
      tasks: [["Wall balls × 10", "6 kg"]], note: "" },
    { type: "every", name: "SkiErg", interval: 120, rounds: 2,
      tasks: [["SkiErg 250 m at race pace", ""]], note: "" }
  ]
}, {
  id: "2026-11-25",
  name: "Openers",
  date: "2026-11-25",
  notes: "Morning.",
  blocks: [
    { type: "single", name: "Warm-up", label: "Easy 2 km", dur: 720,
      tasks: [["Run 2 km easy", ""]], note: "" },
    { type: "every", name: "Openers", interval: 210, rounds: 4,
      tasks: [["Run 400 m at 4:40/km", ""]], note: "Walk the rest of each 3:30 (~90 s)." },
    { type: "single", name: "Cool-down", label: "Cool-down", dur: 360,
      tasks: [["Run 1 km easy", ""]], note: "" }
  ]
}, {
  id: "2026-11-26",
  name: "Activation",
  date: "2026-11-26",
  notes: "Touch every movement, zero fatigue.",
  blocks: [
    { type: "single", name: "Activation", label: "Activation", dur: 900,
      tasks: [["SkiErg 500 m easy", ""], ["Wall balls × 20", "6 kg"], ["Sled push 20 m", PUSH], ["Farmers carry 100 m", "2 × 24 kg"]],
      note: "Easy throughout." }
  ]
}];
