// Workouts loaded on first visit. After that, everything lives in localStorage.
const SLED = "103 kg total";
const PUSH = "152 kg total";

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
  id: "2026-11-03b",
  name: "Wall Ball Set, Sled Set",
  date: "2026-11-03",
  notes: "No running, ergs only. Set 1 is wall balls, set 2 is the sled; the other stations are secondary.",
  blocks: [
    { type: "single", name: "Warm-up", label: "Warm-up", dur: 600,
      tasks: [["5 min easy SkiErg or row", ""], ["Leg swings, hip openers, 10 air squats", ""], ["10 light wall balls", "4–6 kg"], ["2 sled push build-up lengths", "~100 kg total"]],
      note: "Load the sled to 152 kg total now, so it's ready for set 2." },
    { type: "emom", name: "Set 1 · Wall balls", interval: 60, rounds: 4, stations: [
      { tasks: [["Wall balls × 20, unbroken", "6 kg"]], note: "" },
      { tasks: [["Sandbag lunges 20 m", "20 kg"]], note: "Straight into the wall balls, like the end of the race." },
      { tasks: [["Wall balls × 10", "6 kg"]], note: "Tired legs: same depth, same target." },
      { tasks: [["SkiErg 12 cal", "damper 5–7"]], note: "Recovery minute: smooth, not a sprint." }
    ] },
    { type: "every", name: "Set 2 · Sled push", interval: 240, rounds: 4,
      tasks: [["Sled push 25 m (2 lengths)", PUSH], ["Farmers carry 50 m", "2 × 24 kg"], ["Row 250 m", "damper 5–7"]],
      note: "Low hips, short fast steps, don't stop mid-length. If one 12.5 m length takes over 45 s, drop to ~130 kg total. Grip still sore from the pull day? Carry 2 × 20 kg. Rest what's left of the 4:00." },
    { type: "amrap", name: "Finisher", label: "", dur: 540,
      tasks: [["Sled push 12.5 m (1 length)", PUSH], ["Wall balls", "6 kg × 15"], ["Broad jumps", "× 5"]],
      note: "Race effort, not all-out. Both focus stations back to back. Tap + after each full round." },
    { type: "single", name: "Cool-down", label: "Easy erg, then stretch", dur: 300,
      tasks: [["Easy erg, HR under 130", ""], ["Stretch quads, calves, hips, shoulders, forearms", ""]], note: "" }
  ]
}];
