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
    # every page file comes from the parent folder, except the three that have a demo version in this folder
    OWN = ("maintenance.js", "export-all.js", "demo-backend.js")
    def up(m):
        return m.group(0) if m.group(2) in OWN or m.group(2).startswith("http") else '%s="../%s%s"' % (m.group(1), m.group(2), m.group(3) or '')
    s = re.sub(r'(href|src)="([A-Za-z0-9_\-]+\.(?:js|css))(\?v=\d+)?"', up, s)
    s = s.replace('<script src="../photo.js', '<script src="demo-backend.js?v=13"></script>\n<script src="../photo.js', 1)
    # the demo versions of maintenance.js and export-all.js replace the real ones, which only run on the real administrator page
    s = re.sub(r'<script src="maintenance\.js[^"]*"></script>', '<script src="maintenance.js?v=12"></script>', s)
    s = re.sub(r'<script src="export-all\.js[^"]*"></script>', '<script src="export-all.js?v=7"></script>', s)
    if name == 'resident.html' and 'maintenance.js' not in s:
        s = re.sub(r'(<script src="\.\./resident\.js[^"]*"></script>)', r'\1\n<script src="maintenance.js?v=12"></script>', s, count=1)
    s = s.replace('<title>', '<title>DEMO · ', 1)
    s = s.replace('<head>', '<head>\n<meta name="robots" content="noindex">', 1)
    open(os.path.join(here, name), "w", encoding="utf-8").write(s)
    print("wrote demo/" + name)
