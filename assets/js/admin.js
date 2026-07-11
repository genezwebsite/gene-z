/**
 * Gene-Z Admin Dashboard
 * -----------------------------------------------
 * Firebase Authentication & Firestore RBAC
 * Google Drive API Integration
 * Local CRUD for Courses
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// 1. Firebase Config (غيّرها لاحقاً بمعلومات مشروعك)
// ==========================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// 2. Drive APIs Config
// ==========================================
const DRIVE_APIS = {
  courses: "https://script.google.com/macros/s/AKfycbykX6LYMVTnVRKvtTfRToSqZvlWgzeBHoIyjyM683jr0Z0n8ypWHo-lx9LHSo6hdgmD/exec",
  life: "https://script.google.com/macros/s/AKfycbwLnxaBS2buz796FdWRckzQnIEHkFUWdkrzdJ0LGqIz6YCIO0NYhyfSXkDBF5jxioVt/exec",
  genomedia: "https://script.google.com/macros/s/AKfycbzVQsbGcgqlzhEnK8PDfXyH_Tf5_kKX4q3me20ESe6T7jkw_pJvfHljoVbG-Jnqj0jUvw/exec"
};

// ==========================================
// 3. Global Variables & DOM Elements
// ==========================================
let editingCourseId = null;

const loginForm = document.getElementById('login-form');
const loginGate = document.getElementById('admin-gate');
const adminPanel = document.getElementById('admin-panel');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');
const adminWelcomeName = document.getElementById('admin-welcome-name');
const adminRoleBadge = document.getElementById('admin-role-badge');
const adminTabs = document.querySelectorAll('.admin-tab');
const sections = document.querySelectorAll('.admin-section');

// ==========================================
// 4. Authentication & Dashboard Setup
// ==========================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      // جلب بيانات وصلاحيات المستخدم من فايربيس
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setupDashboard(userDoc.data());
      } else {
        // حالة مؤقتة للمطورين: في حال لم نقم بإعداد قاعدة البيانات بعد، نسمح بالدخول كأدمن عام مؤقتاً
        console.warn("User document not found in Firestore. Granting temporary access for development.");
        setupDashboard({ name: "عيسى (Test)", role: "super_admin", roleTitle: "مدير عام (مؤقت)" });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  } else {
    showGate();
  }
});

// استبدل الجزء الخاص بالـ submit بـ هذا الكود لتجاوز تسجيل الدخول
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // تجاوز التحقق (Mock Login)
  console.log("تم التجاوز مؤقتاً...");
  
  // نحاكي بيانات مستخدم "مدير عام"
  const mockUserData = { 
    name: "عيسى", 
    role: "super_admin", 
    roleTitle: "مدير عام (تجريبي)" 
  };
  
  setupDashboard(mockUserData);
});

logoutBtn?.addEventListener('click', () => {
  signOut(auth);
});

function showGate() {
  loginGate?.classList.remove("hidden");
  adminPanel?.classList.add("hidden");
}

function setupDashboard(userData) {
  loginGate?.classList.add('hidden');
  adminPanel?.classList.remove('hidden');
  
  adminWelcomeName.innerText = `مرحباً، ${userData.name || 'أدمن'}`;
  adminRoleBadge.innerText = userData.roleTitle || 'مشرف';

  // إعداد الصلاحيات والتبويبات
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

  // تشغيل دوال الـ CRUD القديمة
  renderAdminCourseList();
  populateCategorySelect();
}

// تفعيل التنقل بين التبويبات (Tabs Logic)
adminTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    adminTabs.forEach(t => { 
      t.classList.remove('active', 'bg-surface-secondary'); 
      t.classList.add('border-transparent'); 
    });
    tab.classList.add('active');
    
    const target = tab.getAttribute('data-target');
    sections.forEach(sec => sec.classList.add('hidden'));
    document.getElementById(target)?.classList.remove('hidden');
  });
});

// ==========================================
// 5. Drive API Implementation
// ==========================================
async function fetchFolderInfo(section, folderName) {
  const url = DRIVE_APIS[section];
  if (!url) {
    showToast("القسم غير صالح أو لا يملك رابط API", "error");
    return null;
  }

  try {
    showToast("جاري إنشاء المجلد على Google Drive...", "info");
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ folderName: folderName })
    });

    const data = await response.json();

    if (data.success === true) {
      showToast("تم إنشاء المجلد بنجاح!", "success");
      return { folderId: data.folderId, embedUrl: data.embedUrl };
    } else {
      throw new Error(data.error || "حدث خطأ غير معروف في خادم جوجل");
    }
  } catch (error) {
    console.error("Drive API Error:", error);
    showToast("فشل الاتصال بـ Google Drive", "error");
    return null;
  }
}

// زر تجربة الدرايف
const testBtn = document.getElementById('test-create-folder-btn');
const testInput = document.getElementById('test-folder-name');
const testResult = document.getElementById('test-result');

testBtn?.addEventListener('click', async () => {
  const folderName = testInput.value.trim();
  if (!folderName) {
    showToast("الرجاء إدخال اسم المادة (المجلد)", "error");
    return;
  }

  testBtn.disabled = true;
  testBtn.innerText = "جاري الإنشاء...";
  testBtn.classList.add('opacity-70');
  testResult.classList.add('hidden');

  const result = await fetchFolderInfo('courses', folderName);

  if (result) {
    testResult.classList.remove('hidden');
    testResult.innerHTML = `
      <div class="flex items-center gap-2 text-green-600 font-bold mb-3">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        تم إنشاء المجلد بنجاح!
      </div>
      <div class="space-y-2 text-muted">
        <p><strong>ID المجلد:</strong> <span dir="ltr" class="bg-surface px-2 py-1 rounded border border-theme text-xs">${result.folderId}</span></p>
        <p><strong>رابط العرض (iFrame):</strong> <br> 
          <a href="${result.embedUrl}" target="_blank" class="text-blue-500 hover:underline break-all mt-1 inline-block" dir="ltr">${result.embedUrl}</a>
        </p>
      </div>
    `;
    testInput.value = ''; 
  }

  testBtn.disabled = false;
  testBtn.innerText = "إنشاء المجلد";
  testBtn.classList.remove('opacity-70');
});

// ==========================================
// 6. UI Helpers
// ==========================================
function showToast(msg, type = "success") {
  const toast = document.getElementById("admin-toast");
  if (!toast) return;
  
  toast.textContent = msg;
  toast.classList.remove('bg-green-500', 'bg-red-500', 'bg-blue-500', 'hidden', 'opacity-0');
  
  if (type === "error") toast.classList.add('bg-red-500');
  else if (type === "info") toast.classList.add('bg-blue-500');
  else toast.classList.add('bg-green-500');

  setTimeout(() => toast.classList.add("opacity-0"), 2500);
  setTimeout(() => toast.classList.add("hidden"), 3000);
}

// ==========================================
// 7. Legacy Course CRUD (From original admin.js)
// ==========================================
function populateCategorySelect() {
  const select = document.getElementById("course-category");
  if (!select || !window.GeneZCourses) return;
  select.innerHTML = Object.values(window.GeneZCourses.CATEGORIES)
    .map(c => `<option value="${c.id}">${c.labelEn} — ${c.labelAr}</option>`)
    .join("");
}

function renderAdminCourseList() {
  const list = document.getElementById("admin-course-list");
  if (!list || !window.GeneZCourses) return;

  const courses = window.GeneZCourses.getCourses();
  if (!courses.length) {
    list.innerHTML = `<p class="text-sm text-muted p-4">لا توجد مواد بعد.</p>`;
    return;
  }

  list.innerHTML = courses.map(c => {
    const cat = window.GeneZCourses.CATEGORIES[c.category];
    return `
    <div class="flex items-center justify-between gap-4 p-4 border-b border-theme last:border-0">
      <div class="min-w-0 flex-1">
        <p class="font-medium truncate">${c.title}</p>
        <p class="ar-text text-xs text-muted">${c.titleAr || ""}</p>
        <p class="text-xs text-accent mt-1">${cat ? cat.labelAr : c.category}</p>
      </div>
      <div class="flex gap-2 shrink-0">
        <button type="button" class="btn-danger" data-delete="${c.id}">حذف</button>
      </div>
    </div>`;
  }).join("");

  list.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => deleteCourse(btn.dataset.delete));
  });
}

function deleteCourse(id) {
  if (!confirm("هل أنت متأكد من حذف هذه المادة؟")) return;
  const filtered = window.GeneZCourses.getCourses().filter((c) => c.id !== id);
  window.GeneZCourses.saveCourses(filtered);
  renderAdminCourseList();
  showToast("تم حذف المادة.", "success");
}

// تشغيل بعض المهام عند تحميل الصفحة إذا كان GeneZCourses موجوداً
document.addEventListener("DOMContentLoaded", () => {
  if (window.GeneZCourses) {
    window.GeneZCourses.seedIfEmpty();
  }
});