# Alcaraz Business Tracker

Free, simple sales and expense tracker for small businesses. By Jesse Alcaraz, CPA.
Data is stored only on each user's device (no server, no login).

## Files
- `index.html`: the app
- `sw.js`: offline support (service worker)
- `manifest.webmanifest` and `icons/`: makes the app installable
- `gcash-qr.png`: support QR
- `_headers`: Netlify caching rules so updates reach users

## Releasing an update
1. Edit `index.html` and bump `version` in `CONFIG` (e.g. 0.6.0 → 0.6.1).
2. Update `releaseNote` in `CONFIG` (shown once to users), or set it to "".
3. Upload the changed files to this repo. Netlify redeploys automatically.

Users' data is not affected by updates as long as the site address stays the same.
