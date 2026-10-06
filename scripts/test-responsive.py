"""Captures du calculateur sur plusieurs largeurs d'écran (serveur dev :4330).
Vérifie : pas de défilement horizontal, taille réelle du texte du schéma, éléments qui débordent."""
from playwright.sync_api import sync_playwright

B = "http://localhost:4330/outils/quel-frigo-rentre/"
SIZES = [("mobile-s", 360), ("mobile", 390), ("tablette", 768), ("laptop", 1280), ("large", 1600)]
CASES = [("libre", "?w=60&h=190&d=70"), ("encastrable", "?mode=encastrable&w=56&h=178"), ("serre", "?w=60&h=186&d=66")]
OUT = "/tmp/be-shots"

JS_OVERFLOW = """() => {
  const vw = document.documentElement.clientWidth, bad = [];
  document.querySelectorAll('main *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width && (r.right > vw + 1 || r.left < -1)) bad.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + [...el.classList].join('.'));
  });
  return [...new Set(bad)].slice(0, 6);
}"""
JS_FONT = """() => {
  const out = {};
  for (const id of ['scene-front', 'scene-side']) {
    const svg = document.querySelector('#' + id + ' svg');
    if (!svg || !svg.getBoundingClientRect().width) continue;
    const vb = svg.viewBox.baseVal, scale = svg.getBoundingClientRect().width / vb.width;
    const sizes = [...svg.querySelectorAll('text')].map((t) => parseFloat(t.getAttribute('font-size')) * scale);
    out[id] = Math.round(Math.min(...sizes)) + '-' + Math.round(Math.max(...sizes)) + ' px';
  }
  return out;
}"""

with sync_playwright() as p:
    br = p.chromium.launch()
    for sname, w in SIZES:
        for cname, q in CASES:
            pg = br.new_page(viewport={"width": w, "height": 900})
            errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.goto(B + q, wait_until="networkidle")
            pg.wait_for_selector("#scene:not([hidden])")
            pg.wait_for_timeout(300)
            sw = pg.evaluate("document.documentElement.scrollWidth")
            print(f"{sname:9} {cname:12} scroll={sw}/{w} texte schéma={pg.evaluate(JS_FONT)} débordements={pg.evaluate(JS_OVERFLOW) or 'aucun'} erreurs={errs or 'aucune'}")
            if cname in ("libre", "serre") and sname in ("mobile", "tablette", "laptop"):
                pg.locator("#scene").screenshot(path=f"{OUT}/resp-{sname}-{cname}.png")
            if cname == "libre" and sname in ("mobile", "tablette"):
                pg.screenshot(path=f"{OUT}/resp-{sname}-page.png", full_page=True)
            pg.close()
    br.close()
