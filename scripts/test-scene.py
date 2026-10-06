"""Captures du schéma du calculateur (serveur dev sur :4330). Usage : python3 scripts/test-scene.py"""
from playwright.sync_api import sync_playwright

B = "http://localhost:4330/outils/quel-frigo-rentre/"
CASES = [
    ("libre", "?w=60&h=190&d=70", 1366),
    ("encastrable", "?mode=encastrable&w=56&h=178", 1366),
    ("sans-profondeur", "?w=92&h=185", 1366),
    ("mobile", "?w=60&h=190&d=70", 390),
]
with sync_playwright() as p:
    br = p.chromium.launch()
    for name, q, width in CASES:
        pg = br.new_page(viewport={"width": width, "height": 900})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(B + q, wait_until="networkidle")
        pg.wait_for_selector("#scene:not([hidden])", timeout=15000)
        print(name, "|", pg.inner_text("#scene-title"), "|", pg.inner_text("#scene-margins"), "| erreurs :", errs or "aucune",
              "| scrollWidth", pg.evaluate("document.documentElement.scrollWidth"))
        pg.locator("#scene").screenshot(path=f"/tmp/be-shots/scene-{name}.png")
        if name == "libre":
            # Choisir le 3e modèle de la liste : le schéma doit suivre.
            pg.locator("[data-show]").nth(2).click()
            pg.wait_for_timeout(300)
            print("  après clic 3e carte :", pg.inner_text("#scene-title"), "| carte surlignée :", pg.locator(".pcard.is-shown").count())
        pg.close()
    br.close()
