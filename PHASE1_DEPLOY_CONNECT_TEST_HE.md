# BioPlay Multi-Instructor – מדריך פריסה, חיבור ובדיקות (שלב 1)

## תקציר קצר
מטרת המסמך: להפעיל בפועל את מה שכבר מומש בשלב 1 (ללא פיתוח פיצ'רים חדשים), כולל:
1. פריסת Backend ב-Google Apps Script על Google Sheet.
2. חיבור `admin.html` + `bioplay.html` לכתובת ה-Web App.
3. יצירת חדר בדיקה (`room`) וקבלת `teacherToken`.
4. הרצת בדיקות ידניות מסודרות ואישור דרישות שלב 1.

---

## הוראות פריסה ל־Sheet

### 1) יצירת Google Sheet חדש
1. פתח Google Drive.
2. צור קובץ חדש: **Google Sheets**.
3. תן שם ברור, למשל: `BioPlay Rooms Phase1`.

### 2) טאבים נדרשים / אופציונליים
- **חובה לשלב 1:** טאב בשם `rooms`.
- **אופציונלי לשלב 1:** כל טאב נוסף (למשל לוגים/ארכיון). הקוד בשלב 1 עובד רק מול `rooms`.

> אם הטאב `rooms` לא קיים, הקוד ינסה ליצור אותו אוטומטית.

### 3) כותרות העמודות המדויקות בטאב `rooms`
שורת הכותרות חייבת להיות בדיוק:

`roomId, teacherTokenHash, status, doorsCount, selectedDoors, createdAt, updatedAt`

פירוט:
- `roomId` – מזהה חדר (8 תווים, uppercase).
- `teacherTokenHash` – hash (SHA-256) של טוקן מדריך.
- `status` – `waiting` או `started`.
- `doorsCount` – מספר דלתות פעילות לחדר.
- `selectedDoors` – JSON array של מזהי דלתות, לדוגמה `[3,7,11,14,22]`.
- `createdAt` – זמן יצירת החדר בפורמט ISO.
- `updatedAt` – זמן עדכון אחרון בפורמט ISO.

### 4) תבנית מוכנה לשורת כותרות
ניתן להשתמש בקובץ התבנית:
- `apps_script/rooms_sheet_template.csv`

הקובץ מכיל בדיוק את הכותרת הנדרשת וניתן לייבא אותו ל-Sheet.

---

## הוראות פריסה ל־Apps Script

### 1) פתיחת פרויקט Apps Script חדש
1. פתח את ה-Google Sheet שיצרת.
2. בתפריט: **Extensions → Apps Script**.
3. ייפתח פרויקט Apps Script שמקושר ל-Sheet.

### 2) הדבקת הקוד
1. בקובץ ברירת המחדל (`Code.gs`) מחק את התוכן.
2. הדבק את התוכן המלא של `apps_script/Code.gs` מהריפו.
3. שמור.

### 3) האם צריך קבצים נוספים?
- לשלב 1: **לא חובה** קבצי `.gs` נוספים.
- הקובץ היחיד הנדרש ל-Backend הוא `Code.gs`.
- `apps_script/README.md` הוא קובץ הנחיות בלבד.

### 4) קונפיג ידני שחובה להגדיר
יש להגדיר Script Property:
- שם: `DOOR_IDS_JSON`
- ערך לדוגמה:
  - `[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]`

איך להגדיר:
1. ב-Apps Script: **Project Settings**.
2. ב-**Script properties** לחץ **Add script property**.
3. הזן `DOOR_IDS_JSON` והערך.
4. שמור.

### 5) איך הסקריפט יודע על ה-Sheet
בקוד יש שימוש ב-`SpreadsheetApp.getActiveSpreadsheet()`.
כלומר הסקריפט עובד על ה-Sheet שאליו הוא מקושר (container-bound script), ואין צורך להכניס ידנית Spreadsheet ID.

---

## הוראות Deploy

### 1) פריסה כ-Web App
1. ב-Apps Script לחץ **Deploy → New deployment**.
2. Type: בחר **Web app**.
3. Description: למשל `phase1-v1`.
4. Execute as: **Me**.
5. Who has access: **Anyone with the link**.
6. לחץ **Deploy** ואשר הרשאות.

### 2) קבלת כתובת Web App
- לאחר הפריסה יוצג שדה **Web app URL**.
- העתק את ה-URL במלואו (נראה כמו `/macros/s/.../exec`).

### 3) אימות גרסה פעילה
- בכל עדכון קוד: Deploy → **Manage deployments** → ערוך deployment קיים לגרסה חדשה (או צור deployment חדש והחלף URL בקליינט).
- בדיקה מהירה לגרסה:
  - שלח בקשת `status` עם `roomId` קיים וודא שהתגובה תואמת לקוד הנוכחי.

---

## הוראות חיבור Frontend

### 1) איפה מעדכנים ב-`admin.html`
חפש את הקבוע:
- `const APPS_URL = "...";`

והחלף את ה-URL ל-Web App החדש.

### 2) איפה מעדכנים ב-`bioplay.html`
חפש את הקבוע:
- `const APPS_SCRIPT_URL = "...";`

והחלף את ה-URL ל-Web App החדש.

### 3) האם יש עוד מקומות לעדכן?
לשלב 1 לפי המימוש הנוכחי:
- אין קובץ קונפיג נפרד נוסף שחובה לעדכן.
- אין צורך לעדכן query params מעבר ל-`?room=<ROOM_ID>` בקישורי הדפים.
- אין צורך לשנות `doors.json` לצורך עצם החיבור.

### 4) פורמט הקישורים אחרי חיבור
- מדריך: `admin.html?room=ROOM1234`
- תלמידים: `bioplay.html?room=ROOM1234`

---

## איך יוצרים room לבדיקה

### 1) יצירת חדר חדש
כן — מתבצע דרך endpoint:
- `POST action=create_room`

אין צורך לקרוא לפונקציה פנימית `createRoom_` ידנית, רק API חיצוני.

### 2) קלט נדרש
- חובה: `action=create_room`
- אופציונלי: `doorsCount` (אם לא שולחים, ברירת מחדל 5)

### 3) פלט צפוי
תגובה JSON תחזיר:
- `roomId`
- `teacherToken`
- `status` (`waiting`)
- `doorsCount`
- `selectedDoors` (ריק בשלב יצירה)

### 4) דוגמת Request/Response אמיתית

Request:
```bash
curl -X POST "<WEB_APP_URL>" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "action=create_room&doorsCount=6"
```

Response לדוגמה:
```json
{
  "ok": true,
  "roomId": "A1B2C3D4",
  "teacherToken": "6F2D8A11BC3E",
  "status": "waiting",
  "doorsCount": 6,
  "selectedDoors": [],
  "createdAt": "2026-03-13T10:00:00.000Z",
  "updatedAt": "2026-03-13T10:00:00.000Z"
}
```

### 5) איך מקבלים קישורי תלמידים/מדריך
ה-Backend הנוכחי מחזיר `roomId` + `teacherToken` (ולא מחזיר URLים מוכנים).
לכן בונים ידנית:
- `studentUrl = <BASE_URL>/bioplay.html?room=<roomId>`
- `adminUrl   = <BASE_URL>/admin.html?room=<roomId>`

---

## Checklist בדיקות ידניות

> סדר מומלץ: בצע סעיף-סעיף ואל תדלג.

### 1) יצירת room חדש
- מה לעשות: לקרוא `create_room` ב-POST.
- תוצאה צפויה: מתקבלים `roomId` ו-`teacherToken` תקינים.
- כישלון: אין `roomId`/`teacherToken`, או `ok=false`.

### 2) פתיחת `admin.html?room=...`
- מה לעשות: לפתוח את קישור המדריך עם ה-room.
- תוצאה צפויה: מוצג Room ID וקישור תלמידים בפאנל.
- כישלון: מוצג “חסר roomId” למרות שהפרמטר קיים.

### 3) פתיחת `bioplay.html?room=...`
- מה לעשות: לפתוח את קישור התלמידים עם אותו room.
- תוצאה צפויה: מסך המתנה עד הפעלה.
- כישלון: שגיאת room לא צפויה או תקיעה ללא polling.

### 4) בדיקת token מדריך
- מה לעשות: ב-admin להזין `teacherToken` נכון.
- תוצאה צפויה: התחברות לפאנל ושליטה פעילה.
- כישלון: token נכון נדחה.

### 5) בדיקת `start`
- מה לעשות: לחץ Start ב-admin (עם token נכון).
- תוצאה צפויה: סטטוס עובר ל-`started`, `selectedDoors` נוצר בשרת.
- כישלון: סטטוס נשאר `waiting` או שגיאת token/room לא נכונה.

### 6) בדיקת `reset`
- מה לעשות: לחץ Reset ב-admin.
- תוצאה צפויה: סטטוס חוזר ל-`waiting`, `selectedDoors` מתאפס ל-`[]`.
- כישלון: נשאר `started` או דלתות לא מתאפסות.

### 7) בדיקת polling
- מה לעשות: השאר admin ותלמיד פתוחים במקביל.
- תוצאה צפויה: שינויי start/reset מתעדכנים אוטומטית (ללא refresh).
- כישלון: אין סנכרון סטטוס בין המסכים.

### 8) בדיקת `selectedDoors`
- מה לעשות: אחרי Start, פתח שני דפדפנים/מכשירים באותו room.
- תוצאה צפויה: אותה רשימת דלתות בשניהם (אותו סט חדרי).
- כישלון: כל תלמיד מקבל סט שונה באותו room.

### 9) שני תלמידים באותו חדר
- מה לעשות: פתח שני לקוחות תלמיד עם אותו room.
- תוצאה צפויה: שניהם מושפעים מאותו status ואותן selectedDoors.
- כישלון: חוסר עקביות בין שני הלקוחות.

### 10) שני חדרים שונים במקביל
- מה לעשות: צור שני חדרים, הפעל Start רק באחד.
- תוצאה צפויה: רק החדר שהופעל יתחיל.
- כישלון: זליגה בין חדרים.

### 11) שגיאה כשאין `roomId`
- מה לעשות: פתח `admin.html` ו-`bioplay.html` בלי `?room=`.
- תוצאה צפויה: הודעת שגיאה ברורה וחסימת פעולה.
- כישלון: המערכת מנסה לפעול ללא roomId.

### 12) שגיאה עם token שגוי
- מה לעשות: שלח Start/Reset עם token שגוי.
- תוצאה צפויה: `INVALID_TEACHER_TOKEN`.
- כישלון: פעולה מתקבלת עם token שגוי.

### 13) בדיקת UI של `admin.html` במחשב
- מה לעשות: פתח admin במסך Desktop רגיל.
- תוצאה צפויה: פאנל קומפקטי (לא full-width), קריא ושמיש.
- כישלון: פריסה מתוחה על כל הרוחב / שימושיות נמוכה.

---

## טבלת התאמה לדרישות שלב 1

| דרישה | בוצע? | איפה ממומש | מה לבדוק ידנית |
|---|---|---|---|
| אין יותר `main_game` | כן | קריאות API מבוססות `roomId` בפרונט + backend תומך `roomId` | לוודא שאין שימוש פעיל ב-`main_game` ושהכל עובד רק עם `?room=` |
| `roomId` נלקח מה-URL | כן | `admin.html`/`bioplay.html` קוראים query param `room` | לפתוח עם/בלי room ולוודא התנהגות נכונה |
| `teacherToken` נדרש לפעולות מדריך | כן | `start/reset` דורשים token ומאמתים hash | בדיקת token נכון ושגוי |
| `selectedDoors` נקבע רק בזמן `start` | כן | `create_room` יוצר `[]`, `start` מגריל ושומר, `reset` מאפס | לבדוק לפני/אחרי start/reset |
| תלמידים לא מקבלים token | כן | `status` מחזיר מידע ציבורי בלבד, בלי `teacherTokenHash/token` | לבדוק JSON של status |
| אין שמירת progress מפורט בשרת | כן (כנדרש לשלב 1) | מודל sheet כולל רק סטטוס חדר + selectedDoors | לוודא שאין עמודות progress פרטניות |
| `admin.html` קומפקטי ולא full-width | כן | CSS עם `max-width` למסגרת הפאנל | בדיקת UI בדסקטופ |
| local/session storage הם room-scoped | כן | מפתחות scoped לפי `roomId` ב-admin | לפתוח שני חדרים ולוודא שאין זליגה |
| אין שינוי חובה ב-`doors.json` בשלב 1 | כן | בחירת דלתות נעשית בשרת מ-`DOOR_IDS_JSON` | לוודא שהמערכת פועלת ללא שינוי doors.json |
| אין שינוי חובה ב-`index.html` בשלב 1 | כן | החיבור מתבצע ישירות דרך admin/bioplay עם room query | לוודא שניתן להפעיל בלי לשנות index |

---

## רשימת משימות ידניות לביצוע

### To Do למפעיל
1. ליצור Google Sheet חדש עבור שלב 1.
2. לוודא טאב `rooms` עם הכותרות המדויקות (או לייבא `rooms_sheet_template.csv`).
3. לפתוח Apps Script מתוך ה-Sheet.
4. להדביק `Code.gs` ולשמור.
5. להגדיר Script Property בשם `DOOR_IDS_JSON`.
6. לבצע Deploy כ-Web App עם הגדרות הגישה הנכונות.
7. להעתיק את URL ה-Web App.
8. לעדכן את ה-URL ב-`admin.html` (`APPS_URL`).
9. לעדכן את ה-URL ב-`bioplay.html` (`APPS_SCRIPT_URL`).
10. להעלות את קבצי ה-Frontend לשרת / GitHub Pages.
11. ליצור room בדיקה דרך `create_room`.
12. לפתוח קישורי admin + students עם אותו `roomId`.
13. לבצע Checklist בדיקות ידניות מלא.
14. לתעד תוצאות (Pass/Fail) ולאשר קבלה של שלב 1.

---

## מה עדיין לא בוצע

סעיפים שאינם חלק משלב 1 (במודע):
- אין שמירת progress מפורטת של תלמידים בשרת.
- אין realtime מבוסס WebSocket/Firebase (העדכון הוא polling).
- אין audit log ניהולי מלא (אם לא פותח בנפרד).
- אין token rotation אוטומטי.
- אין מעבר ל-Firebase/Supabase.
- אין דשבורד ניהולי מתקדם מעבר ל-admin הקיים.

---

## דגש מסכם
המסמך הזה מיועד **רק להפעלה בפועל של שלב 1**:
- לפרוס
- לחבר
- לבדוק
- לאשר

ללא פיצ'רים חדשים, ללא שינוי ארכיטקטורה, ללא ריפקטור נוסף, וללא פתיחת שלב 2.
