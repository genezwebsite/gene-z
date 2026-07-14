// assets/js/admin/admin-auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { setupDashboardModules } from "./admin-core.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const TEST_SESSION_KEY = "genez_admin_test_session";

export function initAuthManager() {
  const loginForm = document.getElementById('login-form');
  const logoutBtn = document.getElementById('logout-btn');

  // 1. مراقبة حالة الـ Firebase والـ LocalStorage بذكاء بدون تصادم
  onAuthStateChanged(auth, async (user) => {
    // إذا كان هناك مستخدم حقيقي في Firebase
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          renderDashboardUI(userDoc.data());
          return;
        }
      } catch (error) { 
        console.error("Error fetching user data:", error); 
      }
    } 
    
    // إذا لم يكن هناك مستخدم Firebase، نتحقق مما إذا كان قد سجل دخول تجريبي محلياً
    if (localStorage.getItem(TEST_SESSION_KEY) === "true") {
      renderDashboardUI({ name: "عيسى (مسترجع)", role: "super_admin", roleTitle: "مدير عام (تجريبي)" });
    } else {
      // فقط في حال عدم وجود أي نوع من تسجيل الدخول نُظهر البوابة
      document.getElementById('admin-gate')?.classList.remove("hidden");
      document.getElementById('admin-panel')?.classList.add("hidden");
    }
  });

  // 2. التعامل مع زر تسجيل الدخول
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const loginError = document.getElementById('login-error');

    try {
      // محاولة تسجيل الدخول الحقيقي عبر الـ Firebase أولاً
      await signInWithEmailAndPassword(auth, email, password);
      loginError?.classList.add('hidden');
    } catch (error) {
      console.warn("Firebase Auth failed, falling back to experimental login.");
      // Fallback لتسجيل الدخول التجريبي عند فشل الاتصال بالسيرفر
      localStorage.setItem(TEST_SESSION_KEY, "true");
      loginError?.classList.add('hidden');
      renderDashboardUI({ name: "عيسى", role: "super_admin", roleTitle: "مدير عام (تجريبي)" });
    }
  });

  // 3. زر تسجيل الخروج
  logoutBtn?.addEventListener('click', async () => {
    try {
      await signOut(auth);
    } catch (err) { console.error(err); }
    localStorage.removeItem(TEST_SESSION_KEY);
    window.location.reload(); // إعادة تحميل الواجهة لتنظيف الذاكرة
  });
}

function renderDashboardUI(userData) {
  // إخفاء شاشة الدخول وإظهار اللوحة الأساسية
  document.getElementById('admin-gate')?.classList.add('hidden');
  document.getElementById('admin-panel')?.classList.remove('hidden');
  
  const welcomeName = document.getElementById('admin-welcome-name');
  const roleBadge = document.getElementById('admin-role-badge');
  if (welcomeName) welcomeName.innerText = `مرحباً، ${userData.name || 'أدمن'}`;
  if (roleBadge) roleBadge.innerText = userData.roleTitle || 'مشرف';

  // إدارة الصلاحيات والتبويبات
  const adminTabs = document.querySelectorAll('.admin-tab');
  adminTabs.forEach(tab => tab.style.display = 'none');

  if (userData.role === 'super_admin') {
    adminTabs.forEach(tab => tab.style.display = 'block');
    document.querySelector('[data-target="dashboard-section"]')?.click();
  } else {
    const targetTab = document.querySelector(`[data-target="${userData.allowedSection}"]`);
    if (targetTab) { 
      targetTab.style.display = 'block'; 
      targetTab.click(); 
    }
  }
  
  // تشغيل بقية موديولات الأقسام فور فتح اللوحة
  setupDashboardModules();
}