#!/usr/bin/env python3
"""Fail if any page on the site loads a script from another origin.

Other apps (genki) share the syoon291.github.io origin and keep secrets in
the browser, so every page here may run only code served from this repo.
Checks .html files for <script src>, <link rel=modulepreload|preload as=script>
and inline import()/importScripts of absolute URLs, and .js/.mjs files for
remote import / importScripts. Stylesheets and fonts are not scripts.
Run from the repo root: python3 .github/scripts/check_no_remote_scripts.py
"""
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

REMOTE = re.compile(r"^\s*(?:[a-z][a-z0-9+.-]*:|//|\\\\)", re.I)
SAFE_SCHEMES = re.compile(r"^\s*(?:data:|blob:)", re.I)  # not third-party code
JS_REMOTE = re.compile(
    r"""(?:\bimport\s*(?:\(|[^'"();]*?\bfrom\s*|\s)|\bimportScripts\s*\()\s*['"`]((?:[a-z][a-z0-9+.-]*:|//)[^'"`]*)""",
    re.I,
)
SKIP_DIRS = {".git", ".claude", "node_modules"}


def is_remote(url):
    return bool(url) and REMOTE.match(url) and not SAFE_SCHEMES.match(url)


class Finder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.hits = []
        self.in_script = False

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): (v or "") for k, v in attrs}
        line = self.getpos()[0]
        if tag == "script":
            self.in_script = True
            if is_remote(a.get("src")):
                self.hits.append((line, f'<script src="{a["src"]}">'))
        elif tag == "link":
            rel = a.get("rel", "").lower().split()
            if ("modulepreload" in rel or ("preload" in rel and a.get("as", "").lower() == "script")) and is_remote(a.get("href")):
                self.hits.append((line, f'<link rel="{a["rel"]}" href="{a["href"]}">'))

    def handle_endtag(self, tag):
        if tag == "script":
            self.in_script = False

    def handle_data(self, data):
        if self.in_script:
            base = self.getpos()[0]
            for m in JS_REMOTE.finditer(data):
                self.hits.append((base + data.count("\n", 0, m.start()), f"inline script loads {m.group(1)}"))


def main(root):
    problems = []
    for path in sorted(root.rglob("*")):
        if not path.is_file() or SKIP_DIRS.intersection(path.relative_to(root).parts):
            continue
        rel = path.relative_to(root)
        if path.suffix.lower() in {".html", ".htm"}:
            f = Finder()
            f.feed(path.read_text(encoding="utf-8", errors="replace"))
            problems += [(rel, line, what) for line, what in f.hits]
        elif path.suffix.lower() in {".js", ".mjs"}:
            text = path.read_text(encoding="utf-8", errors="replace")
            for m in JS_REMOTE.finditer(text):
                problems.append((rel, text.count("\n", 0, m.start()) + 1, f"loads {m.group(1)}"))
    for rel, line, what in problems:
        print(f"{rel}:{line}: remote script: {what}")
    if problems:
        print(f"\n{len(problems)} remote script(s) found. Vendor a pinned local copy instead.")
        return 1
    print("No remote scripts.")
    return 0


if __name__ == "__main__":
    sys.exit(main(Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()))
