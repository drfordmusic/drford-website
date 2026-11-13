"""Tell Bing, Yandex, Seznam and Naver (via IndexNow) which drford.com pages changed.

Usage: python3 indexnow.py [changed files...]
With no arguments, submits every URL in sitemap.xml.
Only pages are submitted (index.html files, robots.txt and llms.txt changes trigger
the home page); assets and noindex ad pages (/go/) are skipped.
"""
import json, re, sys, urllib.request, pathlib

HOST = "www.drford.com"
KEY = "4be1f8c6f36ab0d89e3d43a5abcd29f6"
ROOT = pathlib.Path(__file__).resolve().parents[2]


def sitemap_urls():
    return re.findall(r"<loc>(https://[^<]+/)</loc>", (ROOT / "sitemap.xml").read_text())


def to_url(path):
    p = path.strip().lstrip("./")
    if p.startswith("go/") or not p.endswith(".html"):
        return None
    if p == "index.html":
        return f"https://{HOST}/"
    if p.endswith("/index.html"):
        return f"https://{HOST}/{p[:-len('index.html')]}"
    return None


def main(files):
    urls = sitemap_urls() if not files else sorted({u for u in map(to_url, files) if u})
    if files and any(f.strip() in ("robots.txt", "llms.txt", "sitemap.xml") for f in files):
        urls = sorted(set(urls) | {f"https://{HOST}/"})
    indexable = set(sitemap_urls())
    urls = [u for u in urls if u in indexable]
    if not urls:
        print("Nothing to submit.")
        return
    body = json.dumps({
        "host": HOST,
        "key": KEY,
        "keyLocation": f"https://{HOST}/{KEY}.txt",
        "urlList": urls,
    }).encode()
    req = urllib.request.Request("https://api.indexnow.org/indexnow", data=body,
                                 headers={"Content-Type": "application/json; charset=utf-8"})
    with urllib.request.urlopen(req, timeout=30) as r:
        print(r.status, "submitted:", *urls, sep="\n  ")


if __name__ == "__main__":
    main(sys.argv[1:])
