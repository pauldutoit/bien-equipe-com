"""Test des résultats du calculateur (recommandations, quasi-compatibles, puces). Serveur dev :4330."""
from playwright.sync_api import sync_playwright

B = "http://localhost:4330/outils/quel-frigo-rentre/"
OUT = "/tmp/be-shots"
with sync_playwright() as p:
    br = p.chromium.launch()
    pg = br.new_page(viewport={"width": 1366, "height": 1000})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))

    pg.goto(B + "?w=60&h=190&d=70", wait_until="networkidle")
    pg.wait_for_selector("#reco:not([hidden])")
    print("CAS 1 :", pg.inner_text("#count"))
    for c in pg.locator("#reco .pcard").all():
        print("  reco :", c.locator(".pick-tag").inner_text(), "|", c.locator("h3").inner_text(), "|", c.locator("p.small").first.inner_text())
    print("  puces :", pg.inner_text("#typechips").replace("\n", " · "))
    print("  quasi :", pg.inner_text("#near-title") if pg.is_visible("#near") else "aucun")
    for c in pg.locator("#near-list .pcard").all()[:3]:
        print("    ", c.locator("h3").inner_text(), "|", c.locator(".warn-line").inner_text())
    pg.screenshot(path=f"{OUT}/p5-cas1.png", full_page=True)

    # Puce de type : filtre la liste, les compteurs restent.
    pg.locator("#typechips button[data-type='une-porte']").click()
    print("  puce 1 porte :", pg.inner_text("#count"), "| select t =", pg.input_value("#t"))
    pg.locator("#typechips button[data-type='']").click()

    # Voir chez moi sur un quasi-compatible : le schéma doit le montrer en « ne rentre pas ».
    if pg.locator("#near-list [data-show]").count():
        pg.locator("#near-list [data-show]").first.click()
        pg.wait_for_timeout(300)
        print("  schéma quasi :", pg.inner_text("#scene-title"), "|", pg.inner_text("#scene-margins"))

    pg.goto(B + "?w=60&h=178&d=65&v=350", wait_until="networkidle")
    pg.wait_for_timeout(500)
    print("CAS 2 :", pg.inner_text("#count"), "| reco visible :", pg.is_visible("#reco"))
    print("  quasi :", pg.inner_text("#near-title") if pg.is_visible("#near") else "aucun")
    for c in pg.locator("#near-list .pcard").all()[:4]:
        print("    ", c.locator("h3").inner_text(), "|", c.locator(".warn-line").inner_text())
    print("  schéma :", pg.inner_text("#scene-title") if pg.is_visible("#scene") else "masqué")
    pg.locator("#out").screenshot(path=f"{OUT}/p5-cas2.png")

    m = br.new_page(viewport={"width": 390, "height": 900})
    m.goto(B + "?w=60&h=190&d=70", wait_until="networkidle")
    m.wait_for_timeout(500)
    print("mobile scrollWidth :", m.evaluate("document.documentElement.scrollWidth"))
    m.locator("#reco").screenshot(path=f"{OUT}/p5-mobile.png")
    print("erreurs JS :", errs or "aucune")
    br.close()
