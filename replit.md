# Bio-Magic – Biomimicry Escape Room

## Overview
A static HTML/JS biomimicry escape room game. Served via a minimal Node.js HTTP server.

## Structure
- `index.html` – main game entry point (Hebrew)
- `bioplay.html`, `biohebrew.html`, `bioarab.html` – additional game pages
- `admin.html`, `admin-dev.html` – admin interfaces
- `src/` – game JS modules (main.js, game-engine.js, data-loader.js, flow-router.js, game-state.js, styles.css)
- `data/` – JSON data files (game-config.json, mcq-stages.json, matching-tasks.json, image-tasks.json, final-cipher.json)
- `images/` – game images
- `scripts/` – build/data scripts (Node.js + Python)
- `apps_script/` – Google Apps Script integration

## Server
`server.js` – simple Node.js static file server on port 5000 (0.0.0.0)

## Run
```
node server.js
```

## Notes
- Project is managed on GitHub; Replit is used only for preview/testing
- No build step required; all assets are static
