# Bio-Magic – חדר בריחה ביו-מימטיקה

## סקירה
משחק חדר בריחה מבוסס דפדפן עם ממשק ניהול מדריך. כל הלוגיקה רצה ב-Node.js אחד ללא תלויות חיצוניות.

## ארכיטקטורה
- **שרת:** `server.js` – שרת HTTP טהור (ללא express), פורט 5000, host 0.0.0.0
- **פרונטאנד:** קבצים סטטיים תחת `public/` ו-`index.html` בשורש
- **נתונים:** `data/` – קבצי JSON עם תוכן המשחק
- **מצב:** In-memory store (שחקנים, ניקוד, סטטוס משחק) – לא נשמר לדיסק

## API Routes
- `GET /api/status` – סטטוס משחק
- `GET /api/scores` – רשימת שחקנים (לאדמין)
- `POST /api/start` – התחלת משחק (קוד אדמין: BIO2026)
- `POST /api/end` – סיום משחק
- `POST /api/reset` – איפוס
- `POST /api/join` – הצטרפות שחקן
- `POST /api/score` – עדכון ניקוד

## הרצה
```bash
node server.js
```

## Deployment
- Target: **vm** (כי יש in-memory state)
- Run: `node server.js`
