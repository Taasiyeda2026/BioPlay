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


---

## יא. החלטות יישום מחייבות לשלב 1

1. הפיתוח יתבצע בשלב ראשון על גבי **Google Apps Script + Google Sheet בלבד**.
2. אין מעבר בשלב זה ל־**Firebase** או **Supabase**.
3. אין בשלב זה שמירת **progress מפורט** של תלמידים בשרת.
4. השרת ישמור רק **room-level state**:
   - `roomId`
   - `teacherToken`
   - `status`
   - `doorsCount`
   - `selectedDoors`
   - `createdAt`
   - `updatedAt`
5. `selectedDoors` ייקבע בשרת בזמן **`start` בלבד** (ולא ב־`create_room`).
6. כל קריאות ה-client יעבדו עם `roomId` מה־URL, ללא `main_game` קשיח.
7. פעולות מדריך (`start` / `reset`) יחייבו `teacherToken` תקין.
8. קישור תלמידים לא יכלול token.
9. קישור מדריך יהיה עם `roomId` בלבד, והטוקן יוזן במסך המדריך (`admin.html?room=<ROOM_ID>`).
10. תאימות לקישורים ישנים תישמר רק אם פשוטה ליישום; אחרת יוחזר מסר שגיאה ברור כאשר `roomId` חסר.
11. לפני שינוי קוד בפועל תוגש רשימת קבצים סופית לביצוע.

### רשימת קבצים סופית לשינוי (לפני כתיבת קוד)
- `admin.html`
- `bioplay.html`
- Google Apps Script backend (קובץ הקוד של ה־Web App)
- Google Sheet schema/config המשויך ל־Apps Script

> הערה: בשלב 1 לא מתוכנן שינוי חובה ב־`doors.json` או `index.html`.

---

## יב. דרישת UI מחייבת לשלב 1 – לוח מדריך קומפקטי וממורכז (`admin.html`)

### עקרונות מחייבים
1. כל תוכן לוח הבקרה יוצג בתוך container מרכזי עם `max-width` בטווח **700–900px** (מומלץ: 820px).
2. אין פריסה מסוג full-width dashboard במסכי desktop גדולים.
3. כל האזורים יחולקו ל-cards/sections ברורים עם ריווח עקבי.
4. הכפתורים יהיו בולטים אך לא מרוחים; רוחב הכפתורים יוגבל ויהיה מותאם לתפעול מהיר.
5. ההיררכיה תהיה תפעולית (לא גרפית): מידע קריטי למעלה, מידע משני למטה.

### היררכיית תוכן מחייבת במסך
1. **פרטי חדר** (roomId, סטטוס token session, קישור תלמידים)
2. **סטטוס משחק** (waiting/started + חיווי ברור)
3. **פעולות מדריך** (`start` / `reset`)
4. **הגדרות פעילות** (`doorsCount`)
5. **מידע תפעולי משני** (טיפים, פעולות עזר, מידע לא קריטי)

### שיקולי UX בזמן הפעלה חיה
- התוכן הקריטי חייב להיות גלוי ללא גלילה ארוכה במסכי לפטופ נפוצים.
- error/success messages צריכים להיות קריאים וקצרים.
- יש להימנע מאנימציות או עומס ויזואלי שעלול להפריע לתפעול בזמן אמת.

**קריטי:** הדרישה הזו היא חלק אינטגרלי משלב 1 ואינה אופציונלית.

---

## יג. מפרט ביצוע מעשי ומדויק לקראת מימוש (ללא כתיבת קוד מלאה)

## 1) רשימת שינויים מפורטת לכל קובץ

### `admin.html`
**מה ישתנה בפועל (ספציפית):**
1. קריאת `roomId` מתוך query string (`?room=...`) כבר ב-bootstrap.
2. אם `roomId` חסר:
   - ניסיון fallback לקישור ישן רק אם פשוט (דגל/בלוק קטן),
   - אחרת שגיאה ברורה וחסימת פעולות מדריך.
3. ביטול תלות ב-`GAME_ID = "main_game"`; כל API call יעבור עם `roomId`.
4. פעולות `start/reset` יחייבו `teacherToken` שמוזן במסך המדריך (לא מה-URL).
5. `sessionStorage`/`localStorage` יעברו ל-room-scoped keys.
6. ארגון UI קומפקטי:
   - container מרכזי (`max-width`),
   - sections לפי היררכיה מחייבת,
   - כפתורים בגודל קומפקטי מותאם desktop-first.
7. עדכון הודעות שגיאה/סטטוס כדי להבחין בין:
   - room חסר,
   - token שגוי,
   - room לא קיים,
   - שגיאת רשת.

**מה לא ישתנה בשלב 1:**
- אין שמירת progress מפורט של תלמידים.
- אין מעבר ל-realtime socket.

---

### `bioplay.html`
**מה ישתנה בפועל (ספציפית):**
1. קריאת `roomId` מה-URL כחובה.
2. ביטול `GAME_ID = "main_game"` קשיח בכל polling.
3. `status` יקבל מהשרת גם `doorsCount` ו-`selectedDoors` לחדר.
4. ביטול בחירת `selectedDoors` רנדומלית לוקאלית כאשר התקבל ערך מהשרת.
5. שמירת cache מקומי (אם נדרש) תחת room-scoped key בלבד.
6. שגיאה ברורה אם `roomId` חסר / room לא קיים / room עדיין לא הופעל.

**מה לא ישתנה בשלב 1:**
- לוגיקת השאלות והמסכים הפדגוגיים עצמם.
- אין persistence של progress לשרת.

---

### Google Apps Script backend (Web App)
**מה ישתנה בפועל (ספציפית):**
1. הוספת endpoint `create_room`.
2. עדכון `status/start/reset` לעבוד לפי `roomId` ולא לפי game גלובלי.
3. ולידציית `teacherToken` בכל פעולת מדריך.
4. קביעת `selectedDoors` בזמן `start` בלבד (server-side).
5. עדכון `updatedAt` בכל שינוי room state.
6. החזרת שגיאות מובְנות (JSON עם `ok=false`, `errorCode`, `message`).

---

### Google Sheet schema/config
**מה ישתנה בפועל (ספציפית):**
1. יצירת sheet ייעודי ל-room states.
2. הגדרת כותרות עמודות קבועות לשלב 1.
3. שמירת `selectedDoors` בפורמט יציב (JSON string או CSV מוסכם).
4. אינדוקס לוגי/חיפוש מהיר לפי `roomId` (ואופציונלית timestamp sort).

---

## 2) מבנה נתונים מדויק ב-Google Sheet (שלב 1)

### גיליונות (Tabs)

#### Sheet: `rooms`
גיליון חובה לשלב 1.

| עמודה | שם | חובה בשלב 1 | תיאור |
|---|---|---|---|
| A | `roomId` | כן | מזהה חדר ייחודי |
| B | `teacherTokenHash` | כן | hash של token (לא token גלוי) |
| C | `status` | כן | `waiting` / `started` |
| D | `doorsCount` | כן | מספר דלתות לחדר |
| E | `selectedDoors` | כן | מזהי דלתות (JSON string/CSV) |
| F | `createdAt` | כן | זמן יצירת room |
| G | `updatedAt` | כן | זמן עדכון אחרון |

> הערה: לפי החלטות שלב 1 נשמרים רק נתוני room-level אלה.

#### Sheet: `audit_log` (מומלץ, לא חובה קשיחה)
לשימוש תפעולי בסיסי בלבד.

| עמודה | שם | חובה בשלב 1 | תיאור |
|---|---|---|---|
| A | `timestamp` | מומלץ | זמן אירוע |
| B | `roomId` | מומלץ | חדר רלוונטי |
| C | `action` | מומלץ | `create_room/start/reset` |
| D | `result` | מומלץ | `ok` / `error` |
| E | `errorCode` | אופציונלי | קוד שגיאה אם נכשל |

### נתונים לעתיד בלבד (לא בשלב 1)
- progress מפורט לפי תלמיד/צוות.
- דוחות למידה/היסטוריה פדגוגית מפורטת.

---

## 3) מפרט endpoint סופי ל-Apps Script (Phase 1)

### כללי תגובה אחידה
#### הצלחה
```json
{ "ok": true, "roomId": "R12345", "status": "waiting|started", "updatedAt": "ISO-8601" }
```
#### שגיאה
```json
{ "ok": false, "errorCode": "ROOM_NOT_FOUND", "message": "Room does not exist" }
```

### 3.1 `create_room`
**Method:** POST  
**הרשאה:** ללא `teacherToken` (יצירת חדר חדש)

**קלט:**
- `action=create_room`
- `doorsCount` (אופציונלי; אם חסר → ברירת מחדל 5)

**פלט הצלחה:**
- `ok`, `roomId`, `teacherToken` (חד-פעמי להצגה), `status=waiting`, `doorsCount`, `selectedDoors=[]`, `createdAt`, `updatedAt`

**מה נשמר/מתעדכן בשרת:**
- שורה חדשה ב-`rooms` עם token hash, waiting, doorsCount, selectedDoors ריק.

**שגיאות נדרשות:**
- `INVALID_DOORS_COUNT`
- `INTERNAL_ERROR`

---

### 3.2 `status`
**Method:** GET  
**הרשאה:** ציבורי לחדר (ללא token)

**קלט:**
- `action=status`
- `roomId`

**פלט הצלחה:**
- `ok`, `roomId`, `status`, `doorsCount`, `selectedDoors`, `updatedAt`

**מה נשמר/מתעדכן בשרת:**
- אין שינוי נתונים (read only).

**שגיאות נדרשות:**
- `MISSING_ROOM_ID`
- `ROOM_NOT_FOUND`

---

### 3.3 `start`
**Method:** POST  
**הרשאה:** מדריך בלבד (חובה token)

**קלט:**
- `action=start`
- `roomId`
- `teacherToken`
- `doorsCount` (אופציונלי; אם נשלח תקין, מעדכן לפני יצירת selectedDoors)

**פלט הצלחה:**
- `ok`, `roomId`, `status=started`, `doorsCount`, `selectedDoors`, `updatedAt`

**מה נשמר/מתעדכן בשרת:**
- אימות token מול hash.
- עדכון doorsCount (אם נשלח).
- יצירת `selectedDoors` חדשה בזמן start.
- עדכון status ל-`started` + `updatedAt`.

**שגיאות נדרשות:**
- `MISSING_ROOM_ID`
- `MISSING_TEACHER_TOKEN`
- `ROOM_NOT_FOUND`
- `INVALID_TEACHER_TOKEN`
- `INVALID_DOORS_COUNT`
- `INTERNAL_ERROR`

---

### 3.4 `reset`
**Method:** POST  
**הרשאה:** מדריך בלבד (חובה token)

**קלט:**
- `action=reset`
- `roomId`
- `teacherToken`

**פלט הצלחה:**
- `ok`, `roomId`, `status=waiting`, `doorsCount`, `selectedDoors=[]`, `updatedAt`

**מה נשמר/מתעדכן בשרת:**
- אימות token.
- איפוס status ל-`waiting`.
- איפוס `selectedDoors` לריק (כדי ש-`start` הבא יקבע מחדש).
- עדכון `updatedAt`.

**שגיאות נדרשות:**
- `MISSING_ROOM_ID`
- `MISSING_TEACHER_TOKEN`
- `ROOM_NOT_FOUND`
- `INVALID_TEACHER_TOKEN`
- `INTERNAL_ERROR`

---

## 4) סדר ביצוע מומלץ בפיתוח

### שלב א – Backend foundation (חובה ראשון)
**מה לבצע:**
- בניית `rooms` sheet + helper functions לחיפוש/עדכון room.
- מימוש `create_room/status/start/reset` עם שגיאות מובנות.

**חסם יציאה לשלב הבא:**
- Postman/manual curl מוכיח בידוד בין שני rooms שונים.

### שלב ב – התאמת `admin.html`
**מה לבצע:**
- roomId מה-URL, token מה־UI, API calls room-based.
- UI קומפקטי וממורכז לפי סעיף יב.

**חסם יציאה לשלב הבא:**
- מדריך יכול לנהל room אחד בלי להשפיע על room אחר.

### שלב ג – התאמת `bioplay.html`
**מה לבצע:**
- roomId חובה, polling לפי room, selectedDoors מהשרת.
- טיפול שגיאות חסר room/room לא קיים.

**חסם יציאה לשלב הבא:**
- שני תלמידים באותו room רואים אותן דלתות.

### שלב ד – בדיקות סימולטניות E2E
**מה לבצע:**
- שני מדריכים + שתי קבוצות במקביל.
- תרחישי start/reset חוצים, refresh, latency.

**חסם סיום שלב 1:**
- אין זליגת מצב בין rooms.

### מה ניתן לדחות
- audit_log מלא.
- hardening מתקדם (expiry/rate limit מלא).
- שמירת progress מפורט.

---

## 5) נקודות סיכון טכניות לפני מימוש

### סיכוני state
- שימוש במפתחות storage לא-ממוסגרים לפי room יגרום זליגה מקומית.
- selectedDoors לא עקבי בין שרת/לקוח יגרום אי-אחידות בכיתה.

### סיכוני room isolation
- שימוש מקרי ב-fallback ל-`main_game` ישבור בידוד.
- cache של room ישן במסך מדריך עלול להפעיל חדר שגוי.

### סיכוני token
- שמירת token גלוי ב-URL או בלוגים תדליף הרשאות.
- אי שימוש ב-hash בשרת יחשוף סוד במאגר.

### סיכוני תאימות לקישורים ישנים
- fallback אגרסיבי מדי יגרום הפעלה לחדר שגוי.
- שגיאה לא ברורה תייצר עומס תפעולי בזמן שיעור.

### סיכוני UI/UX במסך מדריך
- עומס מידע מעל לקפל יאט תפעול בזמן אמת.
- כפתורים גדולים/מפוזרים מדי יפגעו במהירות ביצוע start/reset.
- חיווי סטטוס לא בולט מספיק ייצור טעויות הפעלה.

**קריטי:** כל החלטה במימוש בפועל חייבת להיצמד לסעיף יא (החלטות יישום מחייבות לשלב 1).
