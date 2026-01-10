import { Language } from "./types";

export const SERVICE_TYPES = [
  'טיפול שנתי',
  'טסט',
  'אישור בלמים',
  'בדיקת בלמים',
  'בדיקת מנוע',
  'בדיקת גיר',
  'רעשים',
  'טיפול במזגן',
  'הכנה לטסט',
  'הכנה לחורף',
  'מצבר',
  'נורת תקלה בלוח שעונים',
  'פחחות וצבע',
  'אחר (סיבה אחרת)'
];

export const ISRAELI_HOLIDAYS = [
  '2024-10-02', '2024-10-03', '2024-10-04',
  '2024-10-11', '2024-10-12',
  '2025-04-12', '2025-04-13', '2025-04-14'
];

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  [Language.HEBREW]: {
    appName: "Sklack",
    login: "כניסה",
    signup: "הרשמה",
    welcome: "ברוך הבא",
    tasks: "משימות",
    appointments: "תורים",
    organization: "צוות וניהול",
    settings: "הגדרות",
    vehicles: "רכבים",
    createTask: "משימה חדשה",
    editTask: "עריכת משימה",
    takeTask: "קח לטיפול שלי",
    finishTask: "סיום משימה",
    waiting: "בהמתנה",
    inProgress: "בטיפול",
    completed: "הושלם",
    customerApproval: "ממתין לאישור לקוח",
    vehicleTask: "רכב",
    generalTask: "כללי",
    unassigned: "טרם שוייך",
    reassign: "שייך מחדש",
    urgent: "דחוף",
    critical: "קריטי",
    normal: "רגיל"
  },
  [Language.ENGLISH]: {
    appName: "Sklack",
    login: "Login",
    signup: "Sign Up",
    tasks: "Tasks",
    appointments: "Appointments",
    organization: "Org",
    settings: "Settings"
  }
} as any;
