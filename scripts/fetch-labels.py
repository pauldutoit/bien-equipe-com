"""Télécharge l'étiquette énergie officielle (EPREL) de chaque modèle du catalogue.

Sortie : public/labels/{eprel}.webp (420 px de large, ~15 Ko) et public/labels/{eprel}-s.webp (120 px,
vignette des listes). Idempotent : saute les fichiers déjà présents. Usage :
  python3 scripts/fetch-labels.py
"""
import io
import json
import os
import time
import urllib.request

from PIL import Image

os.chdir(os.path.join(os.path.dirname(__file__), ".."))
OUT = "public/labels"
os.makedirs(OUT, exist_ok=True)
fridges = json.load(open("src/data/fridges.json", encoding="utf-8"))
URL = "https://eprel.ec.europa.eu/api/products/refrigeratingappliances2019/{}/labels?format=PNG"
ok = skip = fail = 0
for f in fridges:
    reg = f["eprel"]
    big, small = f"{OUT}/{reg}.webp", f"{OUT}/{reg}-s.webp"
    if os.path.exists(big) and os.path.exists(small):
        skip += 1
        continue
    try:
        req = urllib.request.Request(URL.format(reg), headers={"User-Agent": "Mozilla/5.0 (bien-equipe.com)"})
        data = urllib.request.urlopen(req, timeout=60).read()
        im = Image.open(io.BytesIO(data)).convert("RGB")
        for path, w, q in ((big, 420, 82), (small, 120, 78)):
            h = round(im.height * w / im.width)
            im.resize((w, h), Image.LANCZOS).save(path, "WEBP", quality=q, method=6)
        ok += 1
    except Exception as e:  # étiquette absente ou réseau : la fiche s'affiche sans image
        fail += 1
        print("échec", f["id"], reg, e)
    time.sleep(0.3)
print(f"téléchargées {ok}, déjà là {skip}, échecs {fail}")
