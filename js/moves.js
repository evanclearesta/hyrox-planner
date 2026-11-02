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
