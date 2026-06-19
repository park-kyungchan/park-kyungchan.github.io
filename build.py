#!/usr/bin/env python3
# Bake content.json text into index.html (elements marked with data-copy).
# Usage:  py build.py   /   python3 build.py
# Edit text in content.json, then run this to apply it to index.html.
import json, re, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
html_path = os.path.join(HERE, "index.html")
json_path = os.path.join(HERE, "content.json")
with open(json_path, encoding="utf-8") as f:
    copy = json.load(f)
with open(html_path, encoding="utf-8") as f:
    html = f.read()
orig = html
missing = []
for key, val in copy.items():
    pat = re.compile(r'(<(?P<t>[a-z0-9]+)\b[^>]*\sdata-copy="' + re.escape(key) + r'"[^>]*>)(.*?)(</(?P=t)>)', re.DOTALL)
    html, n = pat.subn(lambda m: m.group(1) + val + m.group(4), html, count=1)
    if n == 0:
        missing.append(key)
if missing:
    print("ERROR: data-copy keys not found in index.html:", missing[:8])
    sys.exit(1)
if html != orig:
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    with open(html_path, encoding="utf-8") as f:
        check = f.read()
    if check != html:
        print("ERROR: write verification failed.")
        sys.exit(1)
    print("build: index.html updated (%d strings applied)" % len(copy))
else:
    print("build: no change (%d strings already in sync)" % len(copy))
