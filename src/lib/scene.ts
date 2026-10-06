// Schéma à l'échelle du calculateur : l'emplacement de l'utilisateur et un frigo dedans.
// Unités du SVG = centimètres (viewBox) : tout est à l'échelle par construction.
// Les cotes sont sorties du dessin (chaînes de cotes en dessous et à gauche, comme un plan),
// et la taille du texte est calculée pour rester lisible quelle que soit la largeur affichée.

export interface SceneInput {
  mode: "libre" | "encastrable";
  w: number; h: number; d: number;   // emplacement (0 = non renseigné)
  tight: boolean;                     // « sans marge »
  fridge?: { name: string; type: string; w: number; h: number; d: number };
}

const C = {
  ink: "#161a33", sub: "#5d6380", wall: "#e4e7f2", wallLine: "#c9cee3", blue: "#3b5bff",
  good: "#1f9d6b", warn: "#d98a00", bad: "#d64545", person: "#d3d7e8", fill: "#eef1ff", ext: "#b8bed6",
};
const TEXT_PX = 13; // taille visée du texte à l'écran, en pixels
const fr = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

// Couleur d'une marge : rouge si ça ne rentre pas, orange si c'est très juste, vert sinon.
function marginColor(m: number, need: number) {
  if (m < 0) return C.bad;
  if (m < need) return C.warn;
  return C.good;
}

// Taille de police (en cm) pour obtenir ~TEXT_PX à l'écran.
// Largeur totale du dessin = base + k × fs ; on résout fs = total × TEXT_PX / px.
function fontFor(base: number, k: number, px: number) {
  const r = TEXT_PX / Math.max(px, 200);
  return Math.max(2.5, (base * r) / Math.max(0.2, 1 - k * r));
}
const textW = (s: string, fs: number) => s.length * fs * 0.56 + 1;

type Seg = { a: number; b: number; label: string; color: string; bold?: boolean };
type Bounds = { minX: number; maxX: number; minY: number };
const grow = (b: Bounds | undefined, x1: number, x2: number, y = Infinity) => {
  if (!b) return;
  b.minX = Math.min(b.minX, x1); b.maxX = Math.max(b.maxX, x2); b.minY = Math.min(b.minY, y);
};

// Chaîne de cotes horizontale : une ligne, des traits aux bornes, un libellé par segment
// (sorti à gauche ou à droite avec un renvoi quand le segment est trop étroit).
function chainH(y: number, segs: Seg[], fs: number, bnd?: Bounds) {
  if (!segs.length) return "";
  const xs = [...new Set(segs.flatMap((s) => [s.a, s.b]))];
  const x0 = Math.min(...xs), x1 = Math.max(...xs), t = fs * 0.35;
  let s = `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${C.sub}" stroke-width="${fs * 0.07}"/>`;
  for (const x of xs) s += `<line x1="${x - t}" y1="${y + t}" x2="${x + t}" y2="${y - t}" stroke="${C.sub}" stroke-width="${fs * 0.09}"/>`;
  segs.forEach((g, i) => {
    const w = Math.abs(g.b - g.a), mid = (g.a + g.b) / 2, ty = y + fs * 1.15;
    const weight = g.bold ? 700 : 600;
    const tw = textW(g.label, fs);
    // Libellé centré si le segment est assez large, ou si la chaîne n'a qu'un segment (cote totale).
    if (w >= tw || segs.length === 1) {
      s += `<text x="${mid}" y="${ty}" font-size="${fs}" text-anchor="middle" fill="${g.color}" font-weight="${weight}">${g.label}</text>`;
      grow(bnd, mid - tw / 2, mid + tw / 2);
    } else {
      // Segment étroit : libellé décalé à l'extérieur de la chaîne, avec un renvoi.
      const right = i === segs.length - 1 && segs.length > 1;
      const ex = right ? x1 + fs * 0.9 : x0 - fs * 0.9;
      s += `<line x1="${mid}" y1="${y}" x2="${ex}" y2="${ty - fs * 0.35}" stroke="${g.color}" stroke-width="${fs * 0.06}"/>`;
      const tx = right ? ex + fs * 0.2 : ex - fs * 0.2;
      s += `<text x="${tx}" y="${ty}" font-size="${fs}" text-anchor="${right ? "start" : "end"}" fill="${g.color}" font-weight="${weight}">${g.label}</text>`;
      grow(bnd, right ? tx : tx - tw, right ? tx + tw : tx);
    }
  });
  return s;
}

// Chaîne de cotes verticale (libellés tournés, lus de bas en haut).
function chainV(x: number, segs: Seg[], fs: number, bnd?: Bounds) {
  if (!segs.length) return "";
  const ys = [...new Set(segs.flatMap((s) => [s.a, s.b]))];
  const y0 = Math.min(...ys), y1 = Math.max(...ys), t = fs * 0.35;
  let s = `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="${C.sub}" stroke-width="${fs * 0.07}"/>`;
  for (const y of ys) s += `<line x1="${x - t}" y1="${y + t}" x2="${x + t}" y2="${y - t}" stroke="${C.sub}" stroke-width="${fs * 0.09}"/>`;
  for (const g of segs) {
    const h = Math.abs(g.b - g.a), mid = (g.a + g.b) / 2, tx = x - fs * 0.45;
    const weight = g.bold ? 700 : 600;
    if (h >= textW(g.label, fs)) {
      s += `<text transform="translate(${tx} ${mid}) rotate(-90)" font-size="${fs}" text-anchor="middle" fill="${g.color}" font-weight="${weight}">${g.label}</text>`;
    } else {
      // Segment étroit (souvent le jeu au-dessus) : libellé décalé au-dessus de la chaîne.
      const ey = y0 - fs * 0.6;
      s += `<line x1="${x}" y1="${mid}" x2="${x}" y2="${ey}" stroke="${g.color}" stroke-width="${fs * 0.06}" stroke-dasharray="${fs * 0.15} ${fs * 0.15}"/>`;
      s += `<text transform="translate(${tx} ${ey}) rotate(-90)" font-size="${fs}" text-anchor="start" fill="${g.color}" font-weight="${weight}">${g.label}</text>`;
      grow(bnd, tx - fs, tx, ey - textW(g.label, fs));
    }
  }
  return s;
}

const ext = (x1: number, y1: number, x2: number, y2: number, fs: number) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.ext}" stroke-width="${fs * 0.05}" stroke-dasharray="${fs * 0.2} ${fs * 0.15}"/>`;

function fridgeFront(x: number, y: number, w: number, h: number, type: string, sw: number) {
  const r = Math.min(3, w / 12);
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#fff" stroke="${C.blue}" stroke-width="${sw}"/>`;
  const line = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.blue}" stroke-width="${sw * 0.75}"/>`;
  const handle = (hx: number, hy: number, hh: number) => `<line x1="${hx}" y1="${hy}" x2="${hx}" y2="${hy + hh}" stroke="${C.sub}" stroke-width="${sw * 1.4}" stroke-linecap="round"/>`;
  if (type === "americain") {
    s += line(x + w / 2, y, x + w / 2, y + h) + handle(x + w / 2 - 3, y + h * 0.3, h * 0.25) + handle(x + w / 2 + 3, y + h * 0.3, h * 0.25);
  } else if (type === "multiportes") {
    const split = y + h * 0.55;
    s += line(x + w / 2, y, x + w / 2, split) + line(x, split, x + w, split) + line(x, split + (h * 0.45) / 2, x + w, split + (h * 0.45) / 2);
    s += handle(x + w / 2 - 3, y + h * 0.2, h * 0.2) + handle(x + w / 2 + 3, y + h * 0.2, h * 0.2);
  } else if (type === "combine" || type === "encastrable") {
    const split = y + h * 0.62;
    s += line(x, split, x + w, split) + handle(x + w - 4, y + h * 0.35, h * 0.18) + handle(x + w - 4, split + 4, h * 0.1);
  } else if (type === "deux-portes") {
    const split = y + h * 0.27;
    s += line(x, split, x + w, split) + handle(x + w - 4, y + h * 0.12, h * 0.08) + handle(x + w - 4, split + 6, h * 0.2);
  } else {
    s += handle(x + w - 4, y + Math.min(h * 0.15, 20), Math.min(h * 0.25, 30));
  }
  return s;
}

/** Vue de face. `px` = largeur d'affichage du schéma en pixels (pour la taille du texte). */
export function frontView(p: SceneInput, px = 600): string {
  const f = p.fridge;
  const needSide = p.mode === "libre" && !p.tight ? 1 : 0;
  const needTop = p.mode === "libre" && !p.tight ? 2 : 0;
  const W = p.w || (f ? f.w + 16 : 60);
  const H = p.h || (f ? f.h + 20 : 190);
  const wallT = 7, cabT = 12, person = 170, personW = 26;
  // Largeur = gauche (2 chaînes verticales ≈ 5,4 fs) + murs + emplacement + écart + personne.
  const base = 2 * wallT + W + 10 + personW + 4;
  const fs = fontFor(base, 5.4, px);
  const sw = fs * 0.12;
  const xWallL = fs * 5.4;
  const xN = xWallL + wallT;
  const topPad = fs * 1.6;
  const tallest = Math.max(H + cabT, person + fs * 1.6, f ? f.h : 0);
  const floor = topPad + tallest;
  const yTop = floor - H;
  const totalW = xWallL + base;
  const totalH = floor + fs * 5.6;
  const bnd: Bounds = { minX: 0, maxX: totalW, minY: 0 };
  let s = `<title>Vue de face à l'échelle de votre emplacement${f ? " avec le " + f.name : ""}</title>`;
  s += `<line x1="${xWallL - fs}" y1="${floor}" x2="${totalW}" y2="${floor}" stroke="${C.wallLine}" stroke-width="${sw}"/>`;
  const dashW = p.w ? "" : ` stroke-dasharray="${fs * 0.3} ${fs * 0.3}"`;
  const dashH = p.h ? "" : ` stroke-dasharray="${fs * 0.3} ${fs * 0.3}"`;
  s += `<rect x="${xWallL}" y="${yTop - cabT}" width="${wallT}" height="${H + cabT}" fill="${C.wall}" stroke="${C.wallLine}" stroke-width="${sw * 0.6}"${dashW}/>`;
  s += `<rect x="${xN + W}" y="${yTop - cabT}" width="${wallT}" height="${H + cabT}" fill="${C.wall}" stroke="${C.wallLine}" stroke-width="${sw * 0.6}"${dashW}/>`;
  s += `<rect x="${xWallL}" y="${yTop - cabT}" width="${W + 2 * wallT}" height="${cabT}" fill="${C.wall}" stroke="${C.wallLine}" stroke-width="${sw * 0.6}"${dashH}/>`;
  const cabLabel = p.mode === "encastrable" ? "meuble" : p.h ? "placard / obstacle" : "hauteur ?";
  if (textW(cabLabel, fs * 0.8) < W + 2 * wallT) s += `<text x="${xN + W / 2}" y="${yTop - cabT / 2 + fs * 0.3}" font-size="${fs * 0.8}" text-anchor="middle" fill="${C.sub}">${cabLabel}</text>`;

  const y1 = floor + fs * 1.4, y2 = floor + fs * 3.8;     // chaînes horizontales
  const x1 = xWallL - fs * 1.4, x2 = xWallL - fs * 3.9;   // chaînes verticales
  const hSegs: Seg[] = [], vSegs: Seg[] = [];
  if (f) {
    const fx = xN + (W - f.w) / 2, fy = floor - f.h;
    s += fridgeFront(fx, fy, f.w, f.h, f.type, sw);
    // Lignes de rappel vers les chaînes de cotes.
    s += ext(fx, floor, fx, y1 + fs * 0.4, fs) + ext(fx + f.w, floor, fx + f.w, y1 + fs * 0.4, fs);
    s += ext(fx, fy, x1 - fs * 0.4, fy, fs);
    if (p.w) {
      const side = (W - f.w) / 2, col = marginColor(side, needSide);
      if (side > 0) hSegs.push({ a: xN, b: fx, label: `${fr(side)} cm`, color: col, bold: true });
      hSegs.push({ a: fx, b: fx + f.w, label: `${fr(f.w)} cm`, color: side < 0 ? C.bad : C.ink });
      if (side > 0) hSegs.push({ a: fx + f.w, b: xN + W, label: `${fr(side)} cm`, color: col, bold: true });
    } else {
      hSegs.push({ a: fx, b: fx + f.w, label: `${fr(f.w)} cm`, color: C.ink });
    }
    const top = H - f.h;
    vSegs.push({ a: floor, b: fy, label: `${fr(f.h)} cm`, color: p.h && top < 0 ? C.bad : C.ink });
    if (p.h && top > 0) vSegs.push({ a: fy, b: yTop, label: `${fr(top)} cm`, color: marginColor(top, needTop), bold: true });
  }
  s += chainH(y1, hSegs, fs, bnd) + chainV(x1, vSegs, fs, bnd);
  // Cotes de l'emplacement (chaînes extérieures).
  if (p.w) {
    s += ext(xN, floor, xN, y2 + fs * 0.4, fs) + ext(xN + W, floor, xN + W, y2 + fs * 0.4, fs);
    s += chainH(y2, [{ a: xN, b: xN + W, label: `${fr(p.w)} cm disponibles`, color: C.sub }], fs, bnd);
  }
  if (p.h) {
    s += ext(xN, yTop, x2 - fs * 0.4, yTop, fs);
    s += chainV(x2, [{ a: floor, b: yTop, label: `${fr(p.h)} cm`, color: C.sub }], fs, bnd);
  }
  // Repère humain 1,70 m.
  const px0 = xN + W + wallT + 10 + personW / 2, sc = person / 170;
  s += `<g fill="${C.person}"><circle cx="${px0}" cy="${floor - person + 11 * sc}" r="${11 * sc}"/><rect x="${px0 - 12 * sc}" y="${floor - person + 25 * sc}" width="${24 * sc}" height="${72 * sc}" rx="${10 * sc}"/><rect x="${px0 - 10 * sc}" y="${floor - person + 92 * sc}" width="${9 * sc}" height="${78 * sc}" rx="${4 * sc}"/><rect x="${px0 + 1 * sc}" y="${floor - person + 92 * sc}" width="${9 * sc}" height="${78 * sc}" rx="${4 * sc}"/></g>`;
  s += `<text x="${px0}" y="${floor - person - fs * 0.5}" font-size="${fs * 0.85}" text-anchor="middle" fill="${C.sub}">1,70 m</text>`;
  return wrap(s, bnd, totalH, fs);
}

// En-tête SVG avec une viewBox qui englobe le dessin et tous les libellés.
function wrap(body: string, b: Bounds, totalH: number, fs: number) {
  const pad = fs * 0.4;
  const x0 = Math.min(0, b.minX - pad), y0 = Math.min(0, b.minY - pad);
  const w = Math.max(b.maxX + pad, 0) - x0, h = totalH - y0;
  return `<svg viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}" data-fs="${fs.toFixed(3)}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="Inter, system-ui, sans-serif">${body}</svg>`;
}

/** Vue de côté (si une profondeur est saisie). La hauteur est raccourcie (trait de coupure) :
 *  cette vue sert à lire la profondeur, pas la hauteur, qui est cotée sur la vue de face. */
export function sideView(p: SceneInput, px = 400): string {
  const f = p.fridge;
  if (!p.d) return "";
  const vent = p.mode === "libre" && !p.tight ? 5 : 0;
  const wallT = 7;
  const D = p.d;
  const span = Math.max(D, (f?.d || 0) + vent);
  const base = wallT + span + 4;
  const fs = fontFor(base, 2, px);
  const sw = fs * 0.12;
  const left = fs * 1;
  const Hd = Math.min(Math.max(f?.h || 0, 60), Math.max(55, span * 0.75)); // hauteur dessinée
  const topPad = fs * 2.2;
  const floor = topPad + Hd;
  const x0 = left + wallT;
  const totalW = left + base + fs;
  const totalH = floor + fs * 5.6;
  const bnd: Bounds = { minX: 0, maxX: totalW, minY: 0 };
  let s = `<title>Vue de côté : profondeur disponible et jeu d'aération</title>`;
  s += `<line x1="0" y1="${floor}" x2="${totalW}" y2="${floor}" stroke="${C.wallLine}" stroke-width="${sw}"/>`;
  s += `<rect x="${left}" y="${floor - Hd - fs * 0.8}" width="${wallT}" height="${Hd + fs * 0.8}" fill="${C.wall}" stroke="${C.wallLine}" stroke-width="${sw * 0.6}"/>`;
  s += `<text transform="translate(${left + wallT / 2 + fs * 0.3} ${floor - Hd / 2}) rotate(-90)" font-size="${fs * 0.75}" text-anchor="middle" fill="${C.sub}">mur</text>`;
  s += `<line x1="${x0 + D}" y1="${floor - Hd - fs * 0.6}" x2="${x0 + D}" y2="${floor}" stroke="${C.sub}" stroke-width="${sw * 0.6}" stroke-dasharray="${fs * 0.4} ${fs * 0.3}"/>`;
  s += `<text x="${x0 + D}" y="${floor - Hd - fs * 0.9}" font-size="${fs * 0.8}" text-anchor="middle" fill="${C.sub}">passage</text>`;
  const y1 = floor + fs * 1.4, y2 = floor + fs * 3.8;
  if (f) {
    const fx = x0 + vent;
    if (vent) {
      s += `<rect x="${x0}" y="${floor - Hd}" width="${vent}" height="${Hd}" fill="${C.fill}"/>`;
      s += `<text transform="translate(${x0 + vent / 2 + fs * 0.25} ${floor - Hd / 2}) rotate(-90)" font-size="${Math.min(fs * 0.7, vent * 0.9)}" text-anchor="middle" fill="${C.blue}">aération</text>`;
    }
    s += `<rect x="${fx}" y="${floor - Hd}" width="${f.d}" height="${Hd}" rx="2" fill="#fff" stroke="${C.blue}" stroke-width="${sw}"/>`;
    if (f.h > Hd) {
      // Trait de coupure : la hauteur réelle n'est pas à l'échelle sur cette vue.
      const yb = floor - Hd * 0.55, a = fs * 0.5;
      s += `<rect x="${fx - sw}" y="${yb - a}" width="${f.d + 2 * sw}" height="${2 * a}" fill="#fbfcff"/>`;
      s += `<path d="M${fx - sw} ${yb - a * 0.4} l${f.d / 3} ${-a * 0.5} l${f.d / 3} ${a} l${f.d / 3 + 2 * sw} ${-a * 0.5}" fill="none" stroke="${C.blue}" stroke-width="${sw * 0.7}"/>`;
      s += `<path d="M${fx - sw} ${yb + a * 0.4} l${f.d / 3} ${-a * 0.5} l${f.d / 3} ${a} l${f.d / 3 + 2 * sw} ${-a * 0.5}" fill="none" stroke="${C.blue}" stroke-width="${sw * 0.7}"/>`;
    }
    s += ext(fx, floor, fx, y1 + fs * 0.4, fs) + ext(fx + f.d, floor, fx + f.d, y1 + fs * 0.4, fs);
    const front = D - (vent + f.d);
    const segs: Seg[] = [];
    if (vent) segs.push({ a: x0, b: fx, label: `${vent} cm`, color: C.blue });
    segs.push({ a: fx, b: fx + f.d, label: `${fr(f.d)} cm`, color: front < 0 ? C.bad : C.ink });
    if (front > 0) segs.push({ a: fx + f.d, b: x0 + D, label: `${fr(front)} cm`, color: marginColor(front, 0), bold: true });
    s += chainH(y1, segs, fs, bnd);
  }
  s += ext(x0 + D, floor, x0 + D, y2 + fs * 0.4, fs) + ext(x0, floor, x0, y2 + fs * 0.4, fs);
  s += chainH(y2, [{ a: x0, b: x0 + D, label: `${fr(D)} cm disponibles`, color: C.sub }], fs, bnd);
  return wrap(s, bnd, totalH, fs);
}

// Verdict texte des marges, affiché au-dessus du schéma.
export function marginsText(p: SceneInput): { ok: boolean; parts: string[] } {
  const f = p.fridge;
  if (!f) return { ok: false, parts: [] };
  const parts: string[] = [];
  let ok = true;
  if (p.w) {
    const side = (p.w - f.w) / 2;
    if (side < 0) ok = false;
    parts.push(side < 0 ? `trop large de ${fr(-side * 2)} cm` : `${fr(side)} cm de chaque côté`);
  }
  if (p.h) {
    const top = p.h - f.h;
    if (top < 0) ok = false;
    parts.push(top < 0 ? `trop haut de ${fr(-top)} cm` : `${fr(top)} cm au-dessus`);
  }
  if (p.d) {
    const vent = p.mode === "libre" && !p.tight ? 5 : 0;
    const front = p.d - f.d - vent;
    if (front < 0) ok = false;
    parts.push(front < 0 ? `trop profond de ${fr(-front)} cm` : vent ? `${fr(front)} cm devant, après 5 cm d'aération derrière` : `${fr(front)} cm devant`);
  }
  return { ok, parts };
}
