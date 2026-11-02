// Workouts loaded on first visit. After that, everything lives in localStorage.
const SLED = "103 kg total";

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
}];
