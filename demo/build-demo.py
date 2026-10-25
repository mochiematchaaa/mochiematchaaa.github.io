#!/usr/bin/env python3
"""Rebuilds demo/admin.html and demo/resident.html from the real ../admin.html and ../resident.html.
Run it after the real pages change (for example after a ?v= cache-busting bump):  python3 demo/build-demo.py
The demo pages load the real CSS and JavaScript from the parent folder; only the backend is swapped for demo-backend.js."""
import re, os
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
for name in ("admin.html", "resident.html"):
    s = open(os.path.join(root, name), encoding="utf-8").read()
    s = re.sub(r'<script src="https://cdn\.jsdelivr\.net/npm/@supabase/[^"]*"></script>\n?', '', s)
    s = re.sub(r'<script src="supabase-config\.js"></script>\n?', '', s)
    s = re.sub(r'(href|src)="((?:shared|core|admin|admin-more|resident)\.js|[a-z-]+\.css)(\?v=\d+)?"', lambda m: '%s="../%s%s"' % (m.group(1), m.group(2), m.group(3) or ''), s)
    s = s.replace('<script src="../shared.js', '<script src="demo-backend.js?v=6"></script>\n<script src="../shared.js', 1)
    last = '../admin-more.js' if name == 'admin.html' else '../resident.js'
    s = re.sub(r'(<script src="%s[^"]*"></script>)' % re.escape(last), r'\1\n<script src="maintenance.js?v=6"></script>', s, count=1)
    if name == 'admin.html':
        s = s.replace('<script src="maintenance.js?v=6"></script>', '<script src="maintenance.js?v=6"></script>\n<script src="export-all.js?v=6"></script>', 1)
    s = s.replace('<title>', '<title>DEMO · ', 1)
    s = s.replace('<head>', '<head>\n<meta name="robots" content="noindex">', 1)
    open(os.path.join(here, name), "w", encoding="utf-8").write(s)
    print("wrote demo/" + name)
