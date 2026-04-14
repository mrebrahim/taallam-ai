import AsyncStorage from '@react-native-async-storage/async-storage'

export type Lang = 'ar' | 'en'

export const translations = {
  ar: {
    // Common
    appName: 'تعلّم AI',
    loading: 'جاري التحميل...',
    error: 'حدث خطأ',
    back: '→',
    save: 'حفظ',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    close: 'إغلاق',
    logout: 'تسجيل الخروج',
    logoutConfirm: 'هل أنت متأكد من تسجيل الخروج؟',
    yes: 'نعم',
    no: 'لا',

    // Language screen
    langTitle: 'اختر لغتك',
    langSubtitle: 'يمكنك تغييرها لاحقاً من الملف الشخصي',
    langAr: 'العربية',
    langEn: 'English',
    langContinue: 'متابعة',

    // Auth
    login: 'تسجيل الدخول',
    signup: 'إنشاء حساب',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    fullName: 'الاسم الكامل',
    loginBtn: 'دخول',
    signupBtn: 'إنشاء الحساب',
    noAccount: 'ليس لديك حساب؟',
    hasAccount: 'لديك حساب؟',

    // Nav
    navHome: 'الرئيسية',
    navLearn: 'التعلم',
    navChallenges: 'التحديات',
    navLeaderboard: 'الترتيب',
    navProfile: 'ملفي',

    // Home
    streak: 'يوم متواصل',
    startToday: 'ابدأ اليوم',
    dailyChallenge: 'تحدي اليوم',
    minutes: 'دقائق فقط',
    completed: 'أكملت التحدي!',
    xpEarned: 'حصلت على',

    // Challenges
    challenges: 'التحديات',
    correct: '🎉 إجابة صحيحة!',
    wrong: '❌ إجابة خاطئة',
    correctAnswer: 'الإجابة الصحيحة:',
    confirmAnswer: 'تأكيد الإجابة',
    checking: 'جاري التحقق...',
    great: '🎉 رائع!',

    // Leaderboard
    leaderboard: 'الترتيب',
    yourRank: 'ترتيبك:',
    thisWeek: 'هذا الأسبوع',
    thisMonth: 'هذا الشهر',
    allTime: 'كل الوقت',

    // Profile
    profile: 'ملفي الشخصي',
    level: 'المستوى',
    xpToNext: 'XP للمستوى التالي',
    settings: 'الإعدادات',
    language: 'اللغة',
    changeLanguage: 'تغيير اللغة',

    // Sadaqat
    sadaqat: 'صدقة العلم',
    sadaqatSub: 'مجتمع التعلم الجماعي',
    browse: 'اكتشف',
    myGroups: 'مجموعاتي',
    createGroup: 'إنشاء مجموعة',
    joinGroup: 'انضم',
    leaveGroup: 'خروج',
    enterGroup: 'دخول المجموعة',
    groupFull: 'المجموعة ممتلئة',
    members: 'أعضاء',
    noGroups: 'لا توجد مجموعات',
    groupNamePlaceholder: 'اسم المجموعة *',
    descPlaceholder: 'وصف (اختياري)',
    groupType: 'نوع المجموعة',
    challenge: 'تحدي',
    study: 'دراسة',
    free: 'نقاش',
  },
  en: {
    // Common
    appName: 'Taallam AI',
    loading: 'Loading...',
    error: 'An error occurred',
    back: '←',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    logout: 'Log Out',
    logoutConfirm: 'Are you sure you want to log out?',
    yes: 'Yes',
    no: 'No',

    // Language screen
    langTitle: 'Choose Your Language',
    langSubtitle: 'You can change this later in your profile',
    langAr: 'العربية',
    langEn: 'English',
    langContinue: 'Continue',

    // Auth
    login: 'Login',
    signup: 'Sign Up',
    email: 'Email',
    password: 'Password',
    fullName: 'Full Name',
    loginBtn: 'Login',
    signupBtn: 'Create Account',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',

    // Nav
    navHome: 'Home',
    navLearn: 'Learn',
    navChallenges: 'Challenges',
    navLeaderboard: 'Ranking',
    navProfile: 'Profile',

    // Home
    streak: 'day streak',
    startToday: 'Start Today',
    dailyChallenge: "Today's Challenge",
    minutes: 'minutes only',
    completed: 'Challenge Complete!',
    xpEarned: 'You earned',

    // Challenges
    challenges: 'Challenges',
    correct: '🎉 Correct!',
    wrong: '❌ Wrong Answer',
    correctAnswer: 'Correct answer:',
    confirmAnswer: 'Confirm Answer',
    checking: 'Checking...',
    great: '🎉 Great!',

    // Leaderboard
    leaderboard: 'Leaderboard',
    yourRank: 'Your Rank:',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    allTime: 'All Time',

    // Profile
    profile: 'My Profile',
    level: 'Level',
    xpToNext: 'XP to next level',
    settings: 'Settings',
    language: 'Language',
    changeLanguage: 'Change Language',

    // Sadaqat
    sadaqat: 'Sadaqat Al-Ilm',
    sadaqatSub: 'Community Learning',
    browse: 'Browse',
    myGroups: 'My Groups',
    createGroup: 'Create Group',
    joinGroup: 'Join',
    leaveGroup: 'Leave',
    enterGroup: 'Enter Group',
    groupFull: 'Group is Full',
    members: 'members',
    noGroups: 'No groups available',
    groupNamePlaceholder: 'Group name *',
    descPlaceholder: 'Description (optional)',
    groupType: 'Group Type',
    challenge: 'Challenge',
    study: 'Study',
    free: 'Discussion',
  }
}

export type TranslationKey = keyof typeof translations.ar

let currentLang: Lang = 'ar'

export function setLang(lang: Lang) { currentLang = lang }
export function getLang(): Lang { return currentLang }
export function t(key: TranslationKey): string {
  return translations[currentLang][key] || translations.ar[key] || key
}

export const LANG_KEY = '@taallam_lang'
export const LANG_CHOSEN_KEY = '@taallam_lang_chosen'

export async function loadLang(): Promise<{ lang: Lang; chosen: boolean }> {
  const [lang, chosen] = await Promise.all([
    AsyncStorage.getItem(LANG_KEY),
    AsyncStorage.getItem(LANG_CHOSEN_KEY),
  ])
  const l = (lang as Lang) || 'ar'
  setLang(l)
  return { lang: l, chosen: chosen === 'true' }
}

export async function saveLang(lang: Lang) {
  setLang(lang)
  await Promise.all([
    AsyncStorage.setItem(LANG_KEY, lang),
    AsyncStorage.setItem(LANG_CHOSEN_KEY, 'true'),
  ])
}
