// assets/js/admin/admin-auth.js
import { auth, db } from "../firebase-init.js";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  setPersistence, 
  browserSessionPersistence 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  setDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showToast, setupDashboardModules } from "./admin-core.js";

let modulesInitialized = false;

// 💡 دالة ذكية وسريعة لتوليد بصمة فريدة لجهاز/متصفح المشرف (Device Fingerprint)
function getDeviceFingerprint() {
  const nav = window.navigator;
  const screen = window.screen;
  // دمج معلومات الشاشة، التوقيت المحلي، اللغة، ونظام التشغيل لخلق معرف لا يتغير لنفس المتصفح
  const rawString = `${nav.userAgent}_${screen.width}x${screen.height}_${nav.language}_${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
  
  // تحويل النص لرمز فريد قصير (Hash)
  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    const char = rawString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return "DEV-" + Math.abs(hash).toString(16).toUpperCase();
}

// دالة لجلب معلومات مبسطة عن اسم المتصفح والنظام (لعرضها للمالك في الإشعار)
function getDeviceInfoText() {
  const ua = window.navigator.userAgent;
  let os = "OS غير معروف";
  if (ua.indexOf("Win") !== -1) os = "Windows";
  if (ua.indexOf("Mac") !== -1) os = "MacOS / iOS";
  if (ua.indexOf("Android") !== -1) os = "Android";
  if (ua.indexOf("Linux") !== -1) os = "Linux";

  let browser = "متصفح";
  if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
  else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
  else if (ua.indexOf("Safari") !== -1 && ua.indexOf("Chrome") === -1) browser = "Safari";
  else if (ua.indexOf("Edge") !== -1) browser = "Edge";

  return `${browser} على (${os})`;
}

// دالة لتسجيل النشاطات في Firestore
async function logSecurityActivity(email, action, target) {
  try {
    await setDoc(doc(collection(db, "activity_logs")), {
      adminEmail: email,
      action: action,
      targetName: target,
      timestamp: serverTimestamp()
    });
  } catch (err) { console.error("Log error:", err); }
}

export function initAuthManager() {
  const loginForm = document.getElementById('login-form');
  const logoutBtn = document.getElementById('logout-btn');
  const adminGate = document.getElementById('admin-gate');
  const adminPanel = document.getElementById('admin-panel');
  const errorMsg = document.getElementById('login-error');

  // 💡 1. تفعيل الجلسة المؤقتة (تنتهي بإغلاق نافذة المتصفح)
  setPersistence(auth, browserSessionPersistence).catch(err => console.error("Persistence error:", err));

  // 2. مراقبة حالة المصادقة وفحص بصمة الجهاز
  onAuthStateChanged(auth, async (user) => {
    if (user && db) {
      try {
        sessionStorage.setItem("adminEmail", user.email);
        localStorage.setItem("adminEmail", user.email);

        const docRef = doc(db, "admin_roles", user.email.toLowerCase());
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const roleData = docSnap.data();
          const currentDeviceId = getDeviceFingerprint();
          const currentDeviceInfo = `${getDeviceInfoText()} [ID: ${currentDeviceId}]`;

          let allowedDevices = roleData.allowedDevices || [];

          // أ. حالة أول جهاز يدخل منه المشرف (يتم اعتماده تلقائياً في المصفوفة)
          if (allowedDevices.length === 0) {
            allowedDevices = [currentDeviceId];
            await updateDoc(docRef, { allowedDevices });
            await logSecurityActivity(user.email, "تسجيل دخول أول واعتماد الجهاز تلقائياً 🛡️", currentDeviceInfo);
          } 
          // ب. حالة الدخول من جهاز معتمد مسبقاً
          else if (allowedDevices.includes(currentDeviceId)) {
            // تسجيل دخول عادي ونجاح
          } 
          // ج. حالة الدخول من جهاز غريب (غير موجود في قائمة allowedDevices)
          else {
            // إرسال أو تحديث طلب معلق (pendingDevice) في حسابه ليراه المالك في الغرفة السرية
            await updateDoc(docRef, {
              pendingDevice: {
                id: currentDeviceId,
                info: currentDeviceInfo,
                requestedAt: serverTimestamp()
              }
            });

            await logSecurityActivity(user.email, "🚨 محاولة دخول محظورة من جهاز غريب (بانتظار اعتماد المالك)", currentDeviceInfo);
            
            // طرد المشرف فوراً ومنع وصوله للوحة التحكم
            await signOut(auth);
            if (errorMsg) {
              errorMsg.innerHTML = `⚠️ <b>تم حظر الدخول:</b> هذا الجهاز (${currentDeviceInfo}) غير معتمد لحسابك.<br>تم إرسال طلب اعتماد للمالك (عيسى)، يرجى الانتظار حتى تتم الموافقة عليه.`;
              errorMsg.classList.remove('hidden');
            }
            return;
          }

          // فتح البوابة وتطبيق الصلاحيات
          applyRolePermissions(roleData, user.email);
          if (adminGate) adminGate.classList.add('hidden');
          if (adminPanel) adminPanel.classList.remove('hidden');
          
          if (!modulesInitialized) {
            setupDashboardModules(); 
            modulesInitialized = true;
          }
        } else {
          // حساب غير موجود في جداول المشرفين
          await signOut(auth);
          if (errorMsg) {
            errorMsg.innerText = "عذراً، ليس لديك صلاحية إدارية للوصول للوحة التحكم.";
            errorMsg.classList.remove('hidden');
          }
        }
      } catch (error) {
        console.error("❌ خطأ في جلب الصلاحيات:", error);
        showToast("حدث خطأ في جلب الصلاحيات من السحابة", "error");
      }
    } else {
      if (adminGate) adminGate.classList.remove('hidden');
      if (adminPanel) adminPanel.classList.add('hidden');
      sessionStorage.removeItem("adminEmail");
      localStorage.removeItem("adminEmail");
      modulesInitialized = false;
    }
  });

  // 3. تسجيل الدخول الحقيقي
  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value.trim();
    const pass = document.getElementById('login-password')?.value;
    const btn = loginForm.querySelector('button');

    if (btn) {
      btn.disabled = true;
      btn.innerText = "جاري التحقق من السحابة...";
    }
    if (errorMsg) errorMsg.classList.add('hidden');

    signInWithEmailAndPassword(auth, email, pass)
      .then(() => {
        if (btn) btn.innerText = "نجاح! جاري فحص بصمة الجهاز...";
        showToast("جاري فحص أمان الجهاز...", "info");
      })
      .catch((error) => {
        if (btn) {
          btn.disabled = false;
          btn.innerText = "تسجيل الدخول";
        }
        if (errorMsg) {
          errorMsg.innerText = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
          errorMsg.classList.remove('hidden');
        }
      });
  });

  logoutBtn?.addEventListener('click', () => {
    signOut(auth).then(() => {
      sessionStorage.removeItem("adminEmail");
      localStorage.removeItem("adminEmail");
      showToast("تم تسجيل الخروج من السحابة", "info");
      setTimeout(() => window.location.reload(), 1000);
    });
  });
}

function applyRolePermissions(roleData, email) {
  const adminNameEl = document.getElementById('admin-welcome-name');
  const roleBadge = document.getElementById('admin-role-badge');
  const allTabs = document.querySelectorAll('.admin-tab');
  
  if (adminNameEl) adminNameEl.innerText = roleData.name || email.split('@')[0];
  
  if (roleData.role === 'owner') {
    if (roleBadge) {
      roleBadge.innerText = "المالك (Owner)";
      roleBadge.classList.replace('bg-accent', 'bg-red-600');
    }
    allTabs.forEach(tab => tab.style.display = 'block');
  } else {
    if (roleBadge) {
      roleBadge.innerText = "مشرف قسم";
      roleBadge.classList.replace('bg-red-600', 'bg-accent');
    }
    const allowedSections = roleData.allowedSections || [];
    allTabs.forEach(tab => {
      const target = tab.getAttribute('data-target');
      if (target === 'dashboard-section' || allowedSections.includes(target)) {
        tab.style.display = 'block'; 
      } else {
        tab.style.display = 'none';
      }
    });
  }
}