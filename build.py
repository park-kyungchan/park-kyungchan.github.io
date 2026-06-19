#!/usr/bin/env python3
"""
content.json 의 텍스트를 index.html 에 박아 넣습니다(빌드).
- 편집은 content.json 만 하고, 이 스크립트를 한 번 실행하면 사이트에 반영됩니다.
- index.html 안에서 data-copy="키" 가 붙은 요소의 내용만 교체합니다(나머지는 그대로).
사용법:  python build.py
"""
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
    print("ERROR: 다음 키를 index.html 에서 찾지 못했습니다:", missing[:8])
    sys.exit(1)

# content.json 에 빠진 data-copy 요소 경고(있어도 진행)
html_keys = set(re.findall(r'data-copy="([^"]+)"', html))
orphans = sorted(html_keys - set(copy))
if orphans:
    print("주의: content.json 에 항목이 없는 요소:", orphans[:8])

if html != orig:
    open(html_path, "w", encoding="utf-8").write(html)
    print(f"build: index.html 갱신 완료 ({len(copy)}개 문구 적용)")
else:
    print(f"build: 변경 없음 ({len(copy)}개 문구 이미 동기화됨)")
