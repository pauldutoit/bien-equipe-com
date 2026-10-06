// « Ma sélection » : favoris stockés dans le navigateur (localStorage), sans compte.
const KEY = "be-selection";

export function readSelection(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* stockage indisponible (navigation privée) : on ignore */
  }
  document.dispatchEvent(new CustomEvent("selection:change", { detail: ids }));
}

export function toggleSelection(id: string): boolean {
  const ids = readSelection();
  const i = ids.indexOf(id);
  if (i >= 0) ids.splice(i, 1);
  else ids.push(id);
  write(ids);
  return i < 0;
}

function paint() {
  const ids = readSelection();
  document.querySelectorAll<HTMLElement>("[data-sel-count]").forEach((el) => {
    el.textContent = String(ids.length);
    el.hidden = ids.length === 0;
  });
  document.querySelectorAll<HTMLButtonElement>("[data-sel-toggle]").forEach((b) => {
    const on = ids.includes(b.dataset.selToggle || "");
    b.setAttribute("aria-pressed", String(on));
    // data-short : libellé court pour les cartes étroites (calculateur).
    b.textContent = "short" in b.dataset ? (on ? "★ Sélectionné" : "☆ Ma sélection") : on ? "★ Dans ma sélection" : "☆ Ajouter à ma sélection";
  });
}

export function initSelection() {
  document.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-sel-toggle]");
    if (!b) return;
    e.preventDefault();
    toggleSelection(b.dataset.selToggle || "");
  });
  document.addEventListener("selection:change", paint);
  paint();
}
