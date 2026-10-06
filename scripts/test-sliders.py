"""Test des curseurs du calculateur (serveur dev :4330). Usage : python3 scripts/test-sliders.py"""
from playwright.sync_api import sync_playwright

B = "http://localhost:4330/outils/quel-frigo-rentre/"
OUT = "/tmp/be-shots"

def set_range(pg, field, val):
    pg.evaluate("""([f, v]) => { const r = document.querySelector(`input.range[data-for="${f}"]`); r.value = v; r.dispatchEvent(new Event('input', {bubbles: true})); }""", [field, val])

with sync_playwright() as p:
    br = p.chromium.launch()
    pg = br.new_page(viewport={"width": 1366, "height": 1000})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(B, wait_until="networkidle")
    print("page vierge, curseurs grisés :", pg.locator("input.range.unset").count(), "/ 3")
    pg.fill("#w", "60"); pg.fill("#h", "190")
    print("champ -> curseur : w", pg.input_value("input.range[data-for=w]"), "| h", pg.input_value("input.range[data-for=h]"))
    c1 = pg.inner_text("#count")
    set_range(pg, "h", "200")
    print("curseur -> champ : h =", pg.input_value("#h"), "|", c1, "->", pg.inner_text("#count"))
    pg.click("button.tick[data-set=h][data-val='178']")
    print("repère 178 cliqué : h =", pg.input_value("#h"), "| curseur", pg.input_value("input.range[data-for=h]"), "|", pg.inner_text("#count"))
    set_range(pg, "d", "65")
    print("profondeur via curseur : d =", pg.input_value("#d"), "| vue de côté visible :", pg.is_visible("#side-wrap"))
    pg.evaluate("() => { const r = document.getElementById('v'); r.value = 350; r.dispatchEvent(new Event('input', {bubbles: true})); }")
    print("volume 350 :", pg.inner_text("#v-out"), "|", pg.inner_text("#count"), "| URL :", pg.url.split('?')[1])
    pg.locator("#calc").screenshot(path=f"{OUT}/sliders-form.png")
    # Rechargement : l'URL restaure champs et curseurs.
    pg.goto(pg.url, wait_until="networkidle")
    print("après rechargement : h =", pg.input_value("#h"), "| curseur h", pg.input_value("input.range[data-for=h]"), "| volume", pg.inner_text("#v-out"))
    print("erreurs JS :", errs or "aucune")
    m = br.new_page(viewport={"width": 390, "height": 900})
    m.goto(B + "?w=60&h=190&d=70", wait_until="networkidle")
    print("mobile scrollWidth :", m.evaluate("document.documentElement.scrollWidth"))
    m.locator("#calc").screenshot(path=f"{OUT}/sliders-mobile.png")
    br.close()
