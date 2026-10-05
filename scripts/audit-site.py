"""Audit SEO du site compilé (dist/) : maillage interne, sitemap, balises.
Usage : npx astro build && python3 scripts/audit-site.py
"""
import collections
import html
import os
import re

os.chdir(os.path.join(os.path.dirname(__file__), ".."))
DIST = "dist"
pages = {}
for root, _, files in os.walk(DIST):
    for f in files:
        if f == "index.html":
            url = "/" + os.path.relpath(root, DIST).replace("\\", "/") + "/"
            url = url.replace("/./", "/")
            pages[url] = open(os.path.join(root, f), encoding="utf-8").read()

def first(rx, s):
    m = re.search(rx, s, re.S)
    return html.unescape(m.group(1)).strip() if m else None

info = {}
for url, s in pages.items():
    body = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", s, flags=re.S)
    main = first(r"<main[^>]*>(.*)</main>", body) or ""
    links_all = re.findall(r'<a [^>]*href="(/[^"#?]*)', body)
    links_main = re.findall(r'<a [^>]*href="(/[^"#?]*)', main)
    text = re.sub(r"<[^>]+>", " ", main)
    info[url] = dict(
        title=first(r"<title>(.*?)</title>", s),
        desc=first(r'<meta name="description" content="([^"]*)"', s),
        robots=first(r'<meta name="robots" content="([^"]*)"', s) or "",
        canon=first(r'<link rel="canonical" href="([^"]*)"', s),
        h1=len(re.findall(r"<h1[\s>]", s)),
        words=len(text.split()),
        out_all=set(l for l in links_all if l != url),
        out_main=set(l for l in links_main if l != url),
    )

idx = {u for u, i in info.items() if i["robots"].startswith("index")}
noidx = set(info) - idx
inbound = collections.Counter()
inbound_main = collections.Counter()
inbound_from_idx = collections.Counter()
for u, i in info.items():
    for l in i["out_all"]:
        inbound[l] += 1
        if u in idx:
            inbound_from_idx[l] += 1
    for l in i["out_main"]:
        inbound_main[l] += 1

def kind(u):
    p = u.strip("/").split("/")[0] or "accueil"
    return p

print("=== Pages ===")
print("total", len(info), "| indexables", len(idx), "| noindex", len(noidx))
print("par section (indexables / total):", {k: f"{sum(1 for u in info if kind(u)==k and u in idx)}/{sum(1 for u in info if kind(u)==k)}" for k in sorted({kind(u) for u in info})})

print("\n=== Liens cassés ===")
broken = collections.Counter()
for u, i in info.items():
    for l in i["out_all"]:
        if l not in info and not re.search(r"\.(webp|svg|png|json|xml|txt)$", l) and not l.startswith("/api/"):
            broken[l] += 1
print(broken.most_common(10) or "aucun")

print("\n=== Maillage contextuel (liens dans <main>, hors menu/pied) vers les pages indexables ===")
for u in sorted(idx, key=lambda x: inbound_main[x]):
    pass
low = sorted(((inbound_main[u], u) for u in idx))
print("les 15 pages indexables les moins liées dans le contenu :")
for n, u in low[:15]:
    print(f"  {n:4d}  {u}")
orph = [u for u in info if inbound[u] == 0 and u != "/"]
print("orphelines (aucun lien entrant) :", len(orph), orph[:10])

print("\n=== Où va le jus : liens contextuels sortant des pages indexables ===")
tot = collections.Counter()
for u in idx:
    for l in info[u]["out_main"]:
        tot["vers indexable" if l in idx else "vers noindex"] += 1
print(dict(tot))

print("\n=== Profondeur de clic depuis l'accueil (liens dans <main> uniquement) ===")
depth = {"/": 0}
q = collections.deque(["/"])
while q:
    u = q.popleft()
    for l in info.get(u, {}).get("out_main", ()):
        if l in info and l not in depth:
            depth[l] = depth[u] + 1
            q.append(l)
dc = collections.Counter(depth.get(u, 99) for u in info)
print("pages par profondeur :", dict(sorted(dc.items())))
fiches = [u for u in info if u.startswith("/avis/")]
print("fiches /avis/ non atteignables par le contenu :", sum(1 for u in fiches if u not in depth))
duels_ = [u for u in info if u.startswith("/comparatif/") and u != "/comparatif/"]
print("duels :", len(duels_), "| liens entrants médians :", sorted(inbound[u] for u in duels_)[len(duels_)//2] if duels_ else 0)

print("\n=== Sitemap ===")
sm = open(f"{DIST}/sitemap.xml", encoding="utf-8").read()
locs = re.findall(r"<loc>https://bien-equipe\.com([^<]*)</loc>", sm)
print("URLs :", len(locs), "| avec lastmod :", sm.count("<lastmod>"))
print("dans le sitemap mais noindex :", [l for l in locs if l in noidx])
print("dans le sitemap mais 404 :", [l for l in locs if l not in info])
print("indexables absentes du sitemap :", sorted(idx - set(locs)))
lm = collections.Counter(re.findall(r"<lastmod>([^<]*)</lastmod>", sm))
print("lastmod distincts :", dict(lm))

print("\n=== Balises ===")
for field in ("title", "desc"):
    c = collections.Counter(info[u][field] for u in idx)
    print(f"{field} dupliqués (indexables) :", [(v[:60], n) for v, n in c.items() if n > 1][:5] or "aucun")
long_t = [(u, len(info[u]["title"])) for u in idx if len(info[u]["title"] or "") > 65]
print("titles > 65 car. (indexables) :", len(long_t), long_t[:8])
long_d = [(u, len(info[u]["desc"])) for u in idx if len(info[u]["desc"] or "") > 160]
print("descriptions > 160 car. :", len(long_d), long_d[:5])
print("H1 != 1 :", [(u, info[u]["h1"]) for u in info if info[u]["h1"] != 1][:8])
bad_canon = [u for u in info if info[u]["canon"] != "https://bien-equipe.com" + u]
print("canonical incohérentes :", bad_canon[:5] or "aucune")
thin = sorted((info[u]["words"], u) for u in idx)[:8]
print("indexables les plus courtes (mots dans <main>) :", thin)
