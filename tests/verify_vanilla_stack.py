#!/usr/bin/env python3
"""
verify_vanilla_stack.py — Compliance Audit for Vanilla HTML/CSS/JS Stack
Audits zero build tooling, static file hygiene, modern CSS compliance (@container, :has()),
and Google SERP tokens.
"""

import os
import sys
import re

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_HTML = os.path.join(ROOT_DIR, 'index.html')
STYLE_CSS = os.path.join(ROOT_DIR, 'style.css')
APP_JS = os.path.join(ROOT_DIR, 'app.js')

checks_passed = 0
checks_total = 0

def check(name, condition, error_msg=""):
    global checks_passed, checks_total
    checks_total += 1
    if condition:
        checks_passed += 1
        print(f"  [PASS] {name}")
    else:
        print(f"  [FAIL] {name} — {error_msg}")

print("============================================================================")
print("             VANILLA STACK & MODERN CSS COMPLIANCE AUDIT                    ")
print("============================================================================")

# 1. Core file existence
check("Core application files exist",
      os.path.isfile(INDEX_HTML) and os.path.isfile(STYLE_CSS) and os.path.isfile(APP_JS),
      "index.html, style.css, or app.js is missing")

# 2. No build tools
forbidden_build_files = [
    'webpack.config.js', 'vite.config.js', 'rollup.config.js', 'tsconfig.json',
    '.babelrc', 'next.config.js', 'nuxt.config.js', 'svelte.config.js', 'package.json'
]
found_build = [f for f in forbidden_build_files if os.path.exists(os.path.join(ROOT_DIR, f))]
check("No build tool configuration files exist in SEOMetaTool",
      len(found_build) == 0,
      f"Found build configs: {found_build}")

# 3. No node_modules
check("No node_modules directory in SEOMetaTool",
      not os.path.isdir(os.path.join(ROOT_DIR, 'node_modules')),
      "node_modules directory found in SEOMetaTool")

# 4. Only static extensions
allowed_exts = {'.html', '.css', '.js', '.mjs', '.py', '.sh', '.md', '.svg', '.png', '.jpg'}
non_static = []
for root, dirs, files in os.walk(ROOT_DIR):
    dirs[:] = [d for d in dirs if not d.startswith('.')]
    for f in files:
        if f.startswith('.'):
            continue
        _, ext = os.path.splitext(f)
        if ext.lower() not in allowed_exts:
            non_static.append(f)
check("All files in SEOMetaTool have static extensions",
      len(non_static) == 0,
      f"Non-static files found: {non_static}")

# 5. Zero external CDNs in index.html
with open(INDEX_HTML, 'r', encoding='utf-8') as f:
    html_text = f.read()

has_cdn = bool(re.search(r'https?://(cdn|unpkg|cdnjs|jsdelivr|fonts\.googleapis)', html_text, re.I))
check("Zero external CDN scripts or remote styles in index.html",
      not has_cdn,
      "Found external CDN URLs in index.html")

# 6. Local scripts & styles linked in index.html
check("index.html links local style.css and app.js",
      bool(re.search(r'href=["\']style\.css["\']', html_text)) and
      bool(re.search(r'src=["\']app\.js["\']', html_text)),
      "Local style.css or app.js link missing in index.html")

# 7. 15 required DOM element IDs in index.html
required_ids = [
    'input-title', 'title-counter', 'title-progress', 'input-url',
    'input-description', 'desc-counter', 'desc-progress', 'btn-desktop',
    'btn-mobile', 'serp-preview', 'preview-favicon', 'preview-site-name',
    'preview-breadcrumb', 'preview-title', 'preview-description'
]
missing_ids = [i for i in required_ids if f'id="{i}"' not in html_text and f"id='{i}'" not in html_text]
check("All 15 required contract DOM element IDs present in index.html",
      len(missing_ids) == 0,
      f"Missing IDs: {missing_ids}")

# Read style.css
with open(STYLE_CSS, 'r', encoding='utf-8') as f:
    css_text = f.read()

# 8. Google Red color variable defined
check("Google Red color variable defined in style.css",
      '--google-red: #d93025;' in css_text or '#d93025' in css_text,
      "--google-red (#d93025) not found in style.css")

# 9. .error and .truncated selectors styled with red
check(".error and .truncated counter states styled with red",
      ('.counter-badge.error' in css_text or '#title-counter.error' in css_text) and
      ('.counter-badge.truncated' in css_text or '#title-counter.truncated' in css_text),
      "Error/truncated selectors missing in style.css")

# 10. Modern layout: Container Queries present in style.css
check("Modern layout: @container query rules present in style.css",
      '@container' in css_text and 'container-type:' in css_text,
      "@container queries missing in style.css")

# 11. Old preview @media queries replaced by @container queries
old_media_preview = bool(re.search(r'@media[^{]+\{[^}]*(?:\.serp-card|#serp-preview)[^}]*\}', css_text, re.I))
check("Preview card does not use old viewport @media queries",
      not old_media_preview,
      "Found old @media queries for preview card in style.css")

# 12. Parent validation highlighting via :has() present in style.css
check("Parent validation highlighting uses modern :has() pseudo-class in style.css",
      ':has(' in css_text and ('.form-group:has' in css_text or ':has(input.error)' in css_text),
      ":has() rules for form groups missing in style.css")

# 13. Dark mode theme rules present in style.css
check("Dark theme rules present in style.css (body.dark)",
      'body.dark' in css_text,
      "body.dark styling missing in style.css")

# 14. SERP preview card strictly retains light styling in dark mode
check("SERP preview card strictly retains white background in dark mode",
      bool(re.search(r'(?:body\.dark\s+#serp-preview|body\.dark\s+\.serp-card)[^{]*\{[^}]*#ffffff\s*!important', css_text, re.I)),
      "SERP card does not enforce white background in dark mode")

# 15. Balanced CSS braces
open_braces = css_text.count('{')
close_braces = css_text.count('}')
check("Balanced CSS braces in style.css",
      open_braces == close_braces and open_braces > 0,
      f"Unbalanced braces: {open_braces} open vs {close_braces} close")

print("----------------------------------------------------------------------------")
print(f"Summary: {checks_passed}/{checks_total} checks passed ({checks_total - checks_passed} failed)")
print("============================================================================")

if checks_passed == checks_total:
    print("✔ Vanilla Stack & Modern CSS Compliance Audit: PASSED")
    sys.exit(0)
else:
    print("✖ Vanilla Stack & Modern CSS Compliance Audit: FAILED")
    sys.exit(1)
