// el("button", { class: "x", onclick: fn }, "Label", child, [more]) — text is always set as text, never HTML.
export function el(tag, props, ...kids) {
  const n = document.createElement(tag);
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) n.append(c.nodeType ? c : String(c));
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (k === "class") n.className = v;
    else if (k in n) n[k] = v;
    else n.setAttribute(k, v === true ? "" : v);
  }
  return n;
}

// Two-tap confirm (confirm() is blocked in some embedded browsers): first tap arms for 3 s.
export function twoTap(btn, armedLabel, fn) {
  const label = btn.textContent;
  let timer = null;
  btn.addEventListener("click", () => {
    if (!timer) {
      btn.textContent = armedLabel;
      timer = setTimeout(() => { timer = null; btn.textContent = label; }, 3000);
      return;
    }
    clearTimeout(timer); timer = null; btn.textContent = label;
    fn();
  });
  return btn;
}

// A short message at the bottom of the screen, with an optional action such as Undo.
let toastEl = null, toastTimer = null;
export function toast(text, action, fn) {
  toastEl?.remove(); clearTimeout(toastTimer);
  const hide = () => { toastEl?.remove(); toastEl = null; };
  toastEl = el("div", { class: "toast", role: "status" }, el("span", {}, text),
    action && el("button", { onclick: () => { hide(); fn(); } }, action));
  document.body.append(toastEl);
  toastTimer = setTimeout(hide, 6000);
}

// "⋯" menu: items are [label, fn, class]. A <details> so it opens and closes without script.
export function menu(label, items) {
  const d = el("details", { class: "menu" }, el("summary", { "aria-label": label }, "⋯"),
    el("div", { class: "menu-panel" }, items.filter(Boolean).map(([text, fn, cls]) =>
      el("button", { class: cls || "", onclick: e => fn(e, d) }, text))));
  return d;
}
document.addEventListener("click", e => {
  document.querySelectorAll("details.menu[open]").forEach(d => { if (!d.contains(e.target)) d.open = false; });
});

export function download(name, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el("a", { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const slug = s => (s || "workout").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workout";

// Dates are local calendar days as "YYYY-MM-DD", so "today" is today where the phone is.
export const isoDay = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return isoDay(d); };

// Open the browser's own date picker straight away, without a visible field. The input sits
// invisibly inside `anchor` (which needs position: relative) so the picker pops up next to it.
// Must be called from a tap: browsers only open pickers on a user gesture.
let pickerEl = null;
export function pickDate(anchor, value, onPick) {
  pickerEl?.remove();
  const inp = pickerEl = el("input", { type: "date", class: "date-pop", value: value || "", tabindex: "-1", "aria-hidden": "true" });
  inp.addEventListener("change", () => { const v = inp.value; inp.remove(); if (v) onPick(v); });
  anchor.append(inp);
  try { inp.showPicker(); } catch (e) { inp.focus(); inp.click(); }
}
