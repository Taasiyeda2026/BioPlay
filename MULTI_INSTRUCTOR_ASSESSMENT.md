# BioPlay – תוכנית טכנית מדויקת למעבר ל־Multi-Instructor (Room-Based)

> מטרת המסמך: מיפוי טכני מדויק של המצב הקיים + תוכנית יישום ללא שינוי קוד בפועל.

---

## א. מיפוי קבצים ורכיבים מושפעים

### 1) `bioplay.html` (מסך תלמידים)
**תפקיד היום**
- מסך פעילות תלמידים כולל polling לסטטוס משחק, כניסה למשחק, בחירת דלתות אקראית, והתקדמות מקומית (תשובות/קודים/דלתות שהושלמו).

**הבעיה היום**
- מוגדר `GAME_ID = "main_game"` גלובלי.
- קריאת `status` נשלחת תמיד עם אותו `game_id`.
- אין קריאת `roomId` מה־URL.
- בחירת דלתות (`selectedDoors`) נעשית אקראית לוקאלית בכל דפדפן.
- `doorsCount` נקרא מ־`localStorage` גלובלי (`bioplay_doors_count`) ולכן אינו room-scoped.

**שינוי עקרוני נדרש**
- החלפת `GAME_ID` קבוע ב־`roomId` דינמי מה־query params.
- polling לפי room.
- קבלת `selectedDoors` מהשרת (או seed משותף) כדי שכל תלמידים בחדר יראו אותו סט.
- מפתחות localStorage scoped לפי room (אם עדיין נדרש caching מקומי).

---

### 2) `admin.html` (לוח בקרה מדריך)
**תפקיד היום**
- הזדהות בקוד מדריך (דרך `start`), פעולות `start/reset`, הצגת סטטוס וטעינת `doors.json` להצגת קודים.

**הבעיה היום**
- מוגדר `GAME_ID = "main_game"` גלובלי.
- כל מדריך משפיע על אותה ישות גלובלית (אין isolation בין קבוצות).
- `sessionStorage` שומר קוד מדריך גלובלי, לא לפי room.
- `localStorage` של `doors_count` גלובלי.

**שינוי עקרוני נדרש**
- עבודה עם `roomId` ספציפי לכל פעילות.
- פעולות `start/reset` רק עם `teacherToken` של אותו room.
- session/local storage scoped לפי room.

---

### 3) Google Apps Script Backend (חיצוני לריפו)
**תפקיד היום**
- endpoint יחיד שמטפל לפחות ב־`status/start/reset` לפי `game_id`.

**הבעיה היום**
- בפועל, המערכת משתמשת ב־`game_id=main_game` קבוע מהקליינט.
- לא קיימת שכבת room management מובנית מהצד הקליינטי.

**שינוי עקרוני נדרש**
- הוספת room model: `create_room`, אחסון state לפי room, ולידציית token לפעולות מדריך.

---

### 4) `index.html` (כניסה למסלולים)
**תפקיד היום**
- ניווט סטטי למסלולים, כולל `bioplay.html`.

**הבעיה היום**
- אין מנגנון יצירת room או מעבר עם `roomId`.

**שינוי עקרוני נדרש**
- אופציונלי: להשאיר כמו היום, או להוסיף דף יצירת פעילות/חדר שמייצר קישורים ייחודיים.

---

### 5) `doors.json`
**תפקיד היום**
- מאגר תוכן דלתות, קודים, תשובות, summary.

**בעיה ביחס לריבוי מדריכים**
- לא בעייתי כשלעצמו; הבעיה היא מי בוחר אילו דלתות פעילות לכל חדר.

**שינוי עקרוני נדרש**
- אין חובה לשנות תוכן, אבל נדרש שהבחירה (`selectedDoors`) תהיה server-driven לכל room.

---

## ב. מיפוי מדויק של נקודות גלובליות ו־State קיים

## ב1. נקודות גלובליות (`main_game`) והנחת “משחק יחיד”

| נקודה | קובץ | מצב היום | השפעה |
|---|---|---|---|
| `GAME_ID = "main_game"` | `bioplay.html` | קבוע | כל תלמידים בכל מקום מאזינים לאותו סטטוס |
| `GAME_ID = "main_game"` | `admin.html` | קבוע | כל מדריכים שולחים start/reset לאותו יעד |
| `status?game_id=...` | שני הקבצים | תמיד game_id גלובלי | זליגת שליטה בין קבוצות |

**קריטי:** שינוי זה חובה לפני הפעלה מקבילית אמיתית.

---

## ב2. כל המקומות שבהם נשמר state

| סוג State | קובץ | היכן נשמר | מה נשמר | האם מבודד בין מדריכים? |
|---|---|---|---|---|
| סטטוס משחק (`started/waiting`) | `bioplay.html`, `admin.html` | שרת (Apps Script) | סטטוס לפי `game_id` | לא, כי `game_id` גלובלי |
| `doorsCount` | `admin.html` + קריאה ב־`bioplay.html` | `localStorage` | `bioplay_doors_count` | לא, מפתח גלובלי |
| קוד מדריך מחובר | `admin.html` | `sessionStorage` | `bioplay_admin_code` | חלקית (טאב), לא room-based |
| התקדמות תלמיד (תשובות/קודים/דלתות) | `bioplay.html` | זיכרון JS (`state`) | `selectedAnswers`, `stepCodesEntered`, `completedDoors` | מקומי לדפדפן בלבד |
| בחירת דלתות פעילות | `bioplay.html` | זיכרון JS | `selectedDoors` | לא, מחושב רנדומית לכל לקוח |

### מידע שלא נשמר כלל בשרת כיום
- `selectedDoors` בפועל לכל קבוצה.
- התקדמות קבוצה/תלמיד (שלבים, דלתות שהושלמו).
- קשר בין מדריך לקבוצת תלמידים ספציפית (room ownership).

**קריטי:** שמירת room-level status + selectedDoors בשרת.

**שיפור עתידי:** שמירת progress מפורטת (אם נדרש דוח/שחזור).

---

## ג. מיפוי קריאות API קיימות (as-is)

> הערה: Apps Script עצמו לא נמצא בריפו, לכן המיפוי מבוסס על הקריאות מהקליינט.

| פעולה | נשלחת מ־ | Method | פרמטרים נכנסים כיום | תגובה שמצופה בקליינט | שינוי נדרש ל־roomId |
|---|---|---|---|---|---|
| `status` | `bioplay.html` | GET | `action=status`, `game_id=main_game` | `status: started/waiting` | להחליף ל־`game_id=<roomId>` |
| `status` | `admin.html` | GET | `action=status`, `game_id=main_game` | `status: started/waiting` | להחליף ל־`game_id=<roomId>` |
| `start` | `admin.html` | POST | `action=start`, `game_id=main_game`, `code=<adminCode>` | `success/ok/status/result` | `game_id=<roomId>`, token ולוגיקת room |
| `reset` | `admin.html` | POST | `action=reset`, `game_id=main_game`, `code=<adminCode>` | בד"כ `success/ok` | `game_id=<roomId>`, token ולוגיקת room |

---

## ד. זרימת העבודה הקיימת (as-is)

### 1) Flow מדריך היום
1. נכנס ל־`admin.html`.
2. מזין קוד → הלקוח שולח `start` עם `game_id=main_game` כדי “לאמת”.
3. אם הצליח, נשמר `adminCode` ב־`sessionStorage`.
4. לחיצה על Activate שולחת שוב `start` ל־`main_game`.
5. לחיצה על Reset שולחת `reset` ל־`main_game`.
6. polling סטטוס כל 4 שניות מול אותו game יחיד.

### 2) Flow תלמיד היום
1. נכנס ל־`bioplay.html`.
2. polling סטטוס כל 3 שניות (`status` על `main_game`).
3. כשסטטוס נהיה `started` – כפתור התחלה נפתח.
4. בעת כניסה לדלתות מתבצעת בחירה אקראית מקומית (`buildSelectedDoors`).
5. כל ההתקדמות נשמרת ב־state מקומי בלבד.

### 3) איך תלמיד יודע שהמשחק התחיל
- רק דרך polling של `status` משרת.

### 4) איך בחירת הדלתות נעשית כרגע
- לקוח תלמיד מבצע `shuffle` מקומי על `doors.json` ובוחר לפי `doorsCount`.
- לכן שני תלמידים באותה כיתה יכולים לקבל סט דלתות שונה.

**קריטי:** selectedDoors חייב לעבור לשליטה חדרית (room-level) ולא לקוח בודד.

---

## ה. מודל מוצע – Room-Based Architecture

## ה1. ישויות מרכזיות
- `roomId`: מזהה פעילות ייחודי (למשל `R8K2P9`).
- `teacherToken`: סוד ניהול של החדר (לא לתלמידים).
- `status`: `waiting | started`.
- `doorsCount`: מספר דלתות לחדר.
- `selectedDoors`: מערך מזהי דלתות אחיד לכל תלמידי החדר.
- `progress` (אופציונלי): סטטוס לפי צוות/תלמיד.

## ה2. דוגמת מבנה נתונים (שרת)
```json
{
  "roomId": "R8K2P9",
  "teacherTokenHash": "...",
  "status": "waiting",
  "doorsCount": 6,
  "selectedDoors": [3, 7, 11, 14, 22, 29],
  "createdAt": "2026-03-12T10:00:00Z",
  "updatedAt": "2026-03-12T10:05:00Z",
  "progress": {
    "teamA": { "completedDoors": [3, 7] },
    "teamB": { "completedDoors": [11] }
  }
}
```

**קריטי:** `roomId`, `teacherToken`, `status`, `doorsCount`, `selectedDoors`.

**שיפור עתידי:** `progress` מפורט לצורך דוחות ושחזור.

---

## ו. טיוטת API עתידי (מומלץ)

## 1) `create_room`
**מי קורא:** מדריך/ממשק ניהול בלבד  
**Method:** POST

### פרמטרים נכנסים
- `teacherName` (אופציונלי)
- `doorsCountDefault` (אופציונלי, ברירת מחדל 5)

### תשובה צפויה
```json
{
  "ok": true,
  "roomId": "R8K2P9",
  "teacherToken": "TKN_...",
  "studentUrl": "https://host/bioplay.html?room=R8K2P9",
  "adminUrl": "https://host/admin.html?room=R8K2P9"
}
```

### הרשאות
- לא דורש `teacherToken` (כי הוא נוצר כאן).

---

## 2) `status`
**מי קורא:** תלמידים + מדריך  
**Method:** GET

### פרמטרים נכנסים
- `action=status`
- `roomId`

### תשובה צפויה
```json
{
  "ok": true,
  "roomId": "R8K2P9",
  "status": "started",
  "doorsCount": 6,
  "selectedDoors": [3,7,11,14,22,29]
}
```

### הרשאות
- ללא token לתלמידים (מידע ציבורי של חדר, בלי מידע ניהולי).

---

## 3) `start`
**מי קורא:** מדריך בלבד  
**Method:** POST

### פרמטרים נכנסים
- `action=start`
- `roomId`
- `teacherToken`
- `doorsCount` (אופציונלי, אם משנים בזמן הפעלה)

### תשובה צפויה
```json
{
  "ok": true,
  "roomId": "R8K2P9",
  "status": "started",
  "doorsCount": 6,
  "selectedDoors": [3,7,11,14,22,29]
}
```

### הרשאות
- דורש `teacherToken` תקין של אותו room.

---

## 4) `reset`
**מי קורא:** מדריך בלבד  
**Method:** POST

### פרמטרים נכנסים
- `action=reset`
- `roomId`
- `teacherToken`

### תשובה צפויה
```json
{
  "ok": true,
  "roomId": "R8K2P9",
  "status": "waiting"
}
```

### הרשאות
- דורש `teacherToken` תקין של אותו room.

---

## ז. מבנה קישורים מומלץ

### תלמידים
- `bioplay.html?room=<ROOM_ID>`

### מדריך – שתי חלופות
1. **נוחות תפעול גבוהה**  
   `admin.html?room=<ROOM_ID>&token=<TOKEN>`
2. **אבטחה עדיפה (מומלץ)**  
   `admin.html?room=<ROOM_ID>` ואז הזנת token בשדה מאובטח (לא ב־URL).

### המלצת איזון אבטחה/נוחות
- להפעלה בשטח (כיתות/הדרכה): עדיף חלופה 2.  
- אם חייבים קישור “מוכן לשימוש”, אפשר חלופה 1 עם token קצר־חיים + החלפה תכופה.

**קריטי:** לא לחשוף token קבוע ארוך טווח ב־URL.

---

## ח. תוכנית יישום בשלבים (פרקטית)

## שלב 1 – Backend Room Model (קריטי)
**מה עושים**
- מוסיפים מבנה rooms ב־Apps Script + storage (Sheet/Properties).
- מגדירים `create_room/status/start/reset` לפי room.

**תוצר**
- API שמסוגל להחזיק כמה חדרים במקביל.

**סיכון**
- תקלות ולידציה token/room יכולות לשבור הפעלה.

---

## שלב 2 – התאמת קריאות API ב־Frontend (קריטי)
**מה עושים**
- `admin.html` ו־`bioplay.html` שולחים `roomId` במקום `main_game`.
- הוספת קריאת query params ושגיאה ברורה אם room חסר.

**תוצר**
- כל לקוח “קשור” לחדר ספציפי.

**סיכון**
- קישורים ישנים בלי room יפסיקו לעבוד עד fallback.

---

## שלב 3 – אחידות selectedDoors פר חדר (קריטי)
**מה עושים**
- בחירת הדלתות נעשית בשרת ב־`start` (או seed קבוע) ונשלחת ללקוחות.

**תוצר**
- כל תלמידי אותו room רואים אותו סט דלתות.

**סיכון**
- אם selectedDoors לא חוזר ב־status, הלקוח עלול להישאר ללא קונפיג.

---

## שלב 4 – Storage scoping בלקוח (קריטי)
**מה עושים**
- מעבר למפתחות כגון `bioplay_doors_count_<ROOM_ID>` ו־`admin_code_<ROOM_ID>`.

**תוצר**
- מניעת זליגת הגדרות בין חדרים באותו מחשב.

**סיכון**
- נתונים ישנים ב-localStorage יגרמו להתנהגות ביניים אם לא מטפלים במיגרציה.

---

## שלב 5 – בדיקות סימולטניות (קריטי)
**מה עושים**
- בדיקות E2E ידניות: 2 מדריכים, 2 חדרים, כמה תלמידים בכל חדר.
- תרחישים: start/reset במקביל, רענון דפדפן, ניתוק רשת זמני.

**תוצר**
- אימות בידוד מלא בין פעילויות.

**סיכון**
- race conditions ב־polling (פחות קריטי, אך צריך ודאות סטטוס).

---

## שלב 6 – הקשחה בסיסית (שיפור עתידי קרוב)
**מה עושים**
- token expiry, rate-limit בסיסי, לוגים של פעולות מדריך.

**תוצר**
- אבטחה ותפעול משופרים.

**סיכון**
- הקשחה חלקית מדי תיתן תחושת ביטחון שגויה.

---

## שלב 7 – Progress קבוצתי מלא (שיפור עתידי)
**מה עושים**
- שמירת התקדמות לפי צוות/תלמיד בשרת.

**תוצר**
- שחזור פעילות, דוחות, ניתוח למידה.

**סיכון**
- עומס מורכבות אם עושים מוקדם מדי.

---

## ט. נקודות קריטיות מול שיפורים עתידיים

## קריטי
1. מעבר מ־`main_game` ל־`roomId` בכל הקריאות.
2. הפרדת הרשאות מדריך עם `teacherToken` לכל room.
3. selectedDoors אחיד ברמת room (לא רנדום פר תלמיד).
4. scoping של local/session storage לפי room.
5. בדיקות סימולטניות של בידוד start/reset/status.

## שיפור עתידי
1. שמירת progress מפורטת בשרת.
2. מעבר מ־polling ל־realtime.
3. דשבורד ניהולי מתקדם (היסטוריה/דוחות).
4. token קצר־חיים עם רוטציה אוטומטית.

---

## י. המלצה סופית (מבוססת הקוד הקיים)

### המלצה לשלב ראשון
**להישאר עם Google Apps Script + Sheet** ולעשות Room-Based בצורה מינימלית אך נכונה.

**למה**
- הקוד הקיים כבר מחובר ל־Apps Script.
- שינוי מהיר יותר משמעותית מול מעבר פלטפורמה.
- מאפשר להשיג בידוד קבוצות אמיתי בזמן קצר.

### מתי לשקול מעבר ל־Firebase/Supabase
- אם נדרש realtime משמעותי, דוחות, היסטוריה מלאה, הרבה חדרים במקביל, ואבטחה ברמה גבוהה יותר.

### מסקנה פרקטית
- **Phase 1 (מהיר ויציב מספיק):** Apps Script Room-Based.
- **Phase 2 (סקייל/מוצר):** מעבר הדרגתי ל־Firebase/Supabase לפי עומס וצרכים.

