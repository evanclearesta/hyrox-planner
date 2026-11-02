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

export function download(name, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el("a", { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const slug = s => (s || "workout").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workout";
