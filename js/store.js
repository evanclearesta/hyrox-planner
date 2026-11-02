// All data stays on this device in localStorage. If storage is blocked (private mode),
// the in-memory cache keeps the app working for the visit.
import { SEED } from "./seed.js";

const KEY = "hyrox.workouts.v1";
const HIST = "hyrox.history.v1";
const PREFS = "hyrox.prefs.v1";

function read(k, fallback) {
  try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
}
function write(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
}

// Seed ids this device has already been offered. A built-in workout is added once, so new
// ones in seed.js show up after a deploy, while deleted or edited ones are left alone.
const SEEN = "hyrox.seedSeen.v1";

let cache = null;
export function all() {
  if (!cache) {
    cache = read(KEY, null);
    if (!Array.isArray(cache)) cache = [];
    const seen = new Set(read(SEEN, []));
    let added = false;
    for (const w of SEED) {
      if (seen.has(w.id)) continue;
      seen.add(w.id);
      if (!cache.some(x => x.id === w.id)) { cache.push(structuredClone(w)); added = true; }
    }
    write(SEEN, [...seen]);
    if (added || read(KEY, null) === null) write(KEY, cache);
  }
  return cache;
}
export const get = id => all().find(w => w.id === id) || null;
export function put(w) {
  const list = all();
  const k = list.findIndex(x => x.id === w.id);
  w.updatedAt = Date.now();
  if (k >= 0) list[k] = w; else list.push(w);
  write(KEY, list);
}
export function remove(id) {
  cache = all().filter(w => w.id !== id);
  write(KEY, cache);
}
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

let hist = null;
export function history() { if (!hist) hist = read(HIST, []); return hist; }
export function addHistory(entry) {
  history().unshift(entry);
  hist = hist.slice(0, 100);
  write(HIST, hist);
}
export const lastDone = id => history().find(h => h.workoutId === id) || null;

let prefs = null;
export function pref(k, fallback) { if (!prefs) prefs = read(PREFS, {}); return k in prefs ? prefs[k] : fallback; }
export function setPref(k, v) { pref(k); prefs[k] = v; write(PREFS, prefs); }
