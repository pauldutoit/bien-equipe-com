"""Test du bouton « Les inclure » / « Rétablir la marge » (serveur dev :4330)."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1366, "height": 1000})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:4330/outils/quel-frigo-rentre/?w=60&h=190&d=70", wait_until="networkidle")
    pg.wait_for_selector("#near-cta:not([hidden])")
    print("avant :", pg.inner_text("#count"), "| meilleur :", pg.locator("#reco .pcard").first.locator("h3").inner_text(), "|", pg.inner_text("#near-cta-count"))
    pg.locator("#near").screenshot(path="/tmp/be-shots/tight-cta.png")
    pg.click("button[data-tight='1']")
    pg.wait_for_timeout(400)
    print("après « Les inclure » :", pg.inner_text("#count"), "| meilleur :", pg.locator("#reco .pcard").first.locator("h3").inner_text(),
          "| bandeau :", pg.is_visible("#tight-note"), "| case cochée :", pg.is_checked("input[name=tight]"), "| URL :", pg.url.split("?")[1])
    pg.locator("#out").screenshot(path="/tmp/be-shots/tight-on.png", clip=None) if False else None
    box = pg.locator("#out").bounding_box()
    pg.screenshot(path="/tmp/be-shots/tight-on.png", full_page=True, clip={"x": 0, "y": box["y"] - 10, "width": 1366, "height": 700})
    pg.click("button[data-tight='0']")
    pg.wait_for_timeout(400)
    print("après « Rétablir » :", pg.inner_text("#count"), "| bandeau :", pg.is_visible("#tight-note"))
    m = b.new_page(viewport={"width": 390, "height": 900})
    m.goto("http://localhost:4330/outils/quel-frigo-rentre/?w=60&h=190&d=70", wait_until="networkidle")
    m.wait_for_timeout(500)
    print("mobile scrollWidth :", m.evaluate("document.documentElement.scrollWidth"))
    print("erreurs JS :", errs or "aucune")
    b.close()
