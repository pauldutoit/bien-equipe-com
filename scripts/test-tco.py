"""Test de bout en bout du coût total (fiche + Ma sélection) sur dist/ servi en local.
Usage : npx astro build && python3 scripts/test-tco.py
"""
import functools
import http.server
import os
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(__file__), "..", "dist")
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
handler.log_message = lambda *a: None
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 4399), handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
B = "http://127.0.0.1:4399"
A, Z = "bosch-kgn362i1f", "samsung-rb34c600csa"

with sync_playwright() as p:
    br = p.chromium.launch()
    pg = br.new_page(viewport={"width": 1366, "height": 900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    # Fiche A : prix saisi -> coût total affiché, mis en sélection.
    pg.goto(f"{B}/avis/{A}/")
    pg.fill("#tco-price", "899")
    print("fiche A :", pg.inner_text("[data-out]").replace("\n", " ")[:230])
    pg.click(f"button[data-sel-toggle='{A}'] >> nth=0")
    # Fiche B : prix plus bas.
    pg.goto(f"{B}/avis/{Z}/")
    pg.fill("#tco-price", "749")
    pg.click(f"button[data-sel-toggle='{Z}'] >> nth=0")
    # Ma sélection : prix repris, coût total et verdict.
    pg.goto(f"{B}/ma-selection/")
    pg.wait_for_selector("[data-tco-id]")
    print("prix repris :", [pg.input_value(f"[data-price-id='{i}']") for i in (A, Z)])
    print("totaux 10 ans :", [pg.inner_text(f"[data-tco-id='{i}']") for i in (A, Z)])
    print("verdict :", pg.inner_text("#verdict"))
    pg.select_option("#years", "15")
    print("totaux 15 ans :", [pg.inner_text(f"[data-tco-id='{i}']") for i in (A, Z)])
    # Saisie dans le tableau : le champ garde le focus.
    pg.fill(f"[data-price-id='{Z}']", "999")
    print("focus conservé :", pg.evaluate("document.activeElement.dataset.priceId"))
    print("verdict après modif :", pg.inner_text("#verdict"))
    pg.screenshot(path="/tmp/be-shots/selection.png", full_page=True)
    pg.goto(f"{B}/avis/{A}/")
    pg.locator("[data-tco]").screenshot(path="/tmp/be-shots/tco.png")
    print("erreurs JS :", errs or "aucune")
    br.close()
srv.shutdown()
