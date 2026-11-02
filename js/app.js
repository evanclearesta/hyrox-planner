// Hash routes, so any static host works: #/  #/new  #/new/:date  #/edit/:id  #/run/:id
import * as store from "./store.js";
import { renderLibrary } from "./library.js";
import { renderEditor } from "./editor.js";
import { runTimer } from "./timer.js";

const root = document.getElementById("app");
let cleanup = null;
// A screen with unsaved work (the editor) can hold the user on it: guard(target) returns false to stay.
let guard = null;
let here = location.hash;

function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  guard = null;
  root.replaceChildren();
  document.title = "HYROX Planner";
  window.scrollTo(0, 0);
  const [view, id] = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  if (view === "new") guard = renderEditor(root, null, id);
  else if (view === "edit") guard = renderEditor(root, id);
  else if (view === "run") {
    const w = store.get(id);
    if (w) cleanup = runTimer(root, w);
    else root.innerHTML = '<p>That workout isn\'t on this device. <a href="#/">Back to workouts</a></p>';
  } else renderLibrary(root);
}

window.addEventListener("hashchange", () => {
  // Put the address back without another hashchange; the guard asks whether to discard.
  if (guard && !guard(location.hash || "#/")) { history.replaceState(null, "", here || "#/"); return; }
  here = location.hash;
  route();
});
route();

// Offline support. Skipped on localhost so edits show up straight away while developing.
if ("serviceWorker" in navigator && location.hostname !== "localhost") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
