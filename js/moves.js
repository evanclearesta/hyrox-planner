// HYROX movements: an illustration in icons/moves/ and a pattern that spots it in a task's text.
// Order matters: the first match wins ("SkiErg" before "row", "sled push" before "sled").
import { el } from "./dom.js";

export const MOVES = [
  { id: "skierg", label: "SkiErg", re: /ski\s*-?erg|\bski\b/i },
  { id: "rowerg", label: "RowErg", re: /\brow(erg|ing)?\b/i },
  { id: "sled-push", label: "Sled push", re: /sled\s*push/i },
  { id: "sled-pull", label: "Sled pull", re: /sled\s*pull/i },
  { id: "wall-ball", label: "Wall balls", re: /wall\s*ball/i },
  { id: "burpee", label: "Burpee", re: /burpee/i },
  { id: "farmers-carry", label: "Farmers carry", re: /farmer/i },
  { id: "sandbag-lunge", label: "Lunges", re: /lunge/i },
  { id: "kettlebell", label: "Kettlebell", re: /kettle\s*bell|\bkb\b/i },
  { id: "run", label: "Run", re: /\brun(ning)?\b|\bjog\b/i }
];

export const moveOf = text => MOVES.find(m => m.re.test(text || "")) || null;

// The illustration is a CSS mask, so it takes the text colour of wherever it sits.
const src = m => new URL("../icons/moves/" + m.id + ".svg", import.meta.url).href;
export const moveIcon = (m, cls = "") =>
  el("span", { class: ("mv " + cls).trim(), role: "img", "aria-label": m.label, style: "--mv:url(" + src(m) + ")" });

// "Sled pull 25 m (2 lengths), fast walk-back" -> "Sled pull 25 m".
export const shortTask = what => what.split(/[,(]| at /)[0].trim();

// One reading order for every row: the work, the movement, the load.
// ("Sled pull 25 m", "103 kg total") -> { amount: "25 m", move: "Sled pull", load: "103 kg total" }
// ("Wall balls", "6 kg × 15")        -> { amount: "15 ×", move: "Wall balls", load: "6 kg" }
export function splitTask(what, load = "") {
  let move = shortTask(what), amount = "";
  const dist = move.match(/\s*\b(\d+(?:\.\d+)?)\s*(m|km|cal)\b/i);
  if (dist) { amount = dist[1] + " " + dist[2]; move = move.replace(dist[0], ""); }
  const reps = /\s*×\s*(\d+)\s*$/;
  if (!amount && reps.test(move)) { amount = move.match(reps)[1] + " ×"; move = move.replace(reps, ""); }
  if (!amount && reps.test(load)) { amount = load.match(reps)[1] + " ×"; load = load.replace(reps, ""); }
  return { amount, move: move.trim(), load: load.trim() };
}
