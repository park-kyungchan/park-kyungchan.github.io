#!/usr/bin/env python3
# Bake content.json text into index.html (elements marked with data-copy).
# Usage:  py build.py        (Windows)   /   python3 build.py
#
# Edit your text in content.json, then run this once to apply it to index.html.
# Source is ASCII-only on purpose, so it runs no matter how your editor saves it.
# (The Korean text itself is read/written as UTF-8 via the explicit encoding= below.)
import json, re, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
html_path = os.path.join(HERE, "index.html")
json_path = os.path.join(HERE, "content.json")

copy = json.load(open(json_path, encoding="utf-8"))
html = open(html_path, encoding="utf-8").read()
orig = html

missing = []
for key, val in copy.items():
    pat = re.compile(
        r'(<(?P<t>[a-z0-9]+)\b[^>]*\sdata-copy="' + re.escape(key) + r'"[^>]*>)(.*?)(</(?P=t)>)',
        re.DOTALL,
    )
    html, n = pat.subn(lambda m: m.group(1) + val + m.group(4), html, count=1)
    if n == 0:
        missing.append(key)

if missing:
    print("ERROR: data-copy keys not found in index.html:", missing[:8])
    sys.exit(1)

html_keys = set(re.findall(r'data-copy="([^"]+)"', html))
orphans = sorted(html_keys - set(copy))
if orphans:
    print("WARNING: elements with no content.json entry:", orphans[:8])

if html != orig:
    open(html_path, "w", encoding="utf-8").write(html)
    print("build: index.html updated (%d strings applied)" % len(copy))
else:
    print("build: no change (%d strings already in sync)" % len(copy))
