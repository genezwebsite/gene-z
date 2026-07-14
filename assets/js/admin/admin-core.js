// assets/js/admin/admin-core.js
import { initAuthManager } from "./admin-auth.js";
import { initUpdatesManager } from "./admin-updates.js";
import { initCoursesManager } from "./admin-courses.js";
import { initLifeConnectionManager } from "./admin-life-connection.js";
import { initNewsManager } from "./admin-news.js";
import { initCoursesExtraManager } from "./admin-courses-extra.js";

// متغيرات الحالة العامة للوحة
export const DRIVE_APIS = {
  courses: "https://script.google.com/macros/s/AKfycbykX6LYMVTnVRKvtTfRToSqZvlWgzeBHoIyjyM683jr0Z0n8ypWHo-lx9LHSo6hdgmD/exec",
  life: "https://script.google.com/macros/s/AKfycbwLnxaBS2buz796FdWRckzQnIEHkFUWdkrzdJ0LGqIz6YCIO0NYhyfSXkDBF5jxioVt/exec",
  genomedia: "https://script.google.com/macros/s/AKfycbzVQsbGcgqlzhEnK8PDfXyH_Tf5_kKX4q3me20ESe6T7jkw_pJvfHljoVbG-Jnqj0jUvw/exec"
};

document.addEventListener("DOMContentLoaded", () => {
  initAuthManager();
  initNavigation();
});

// نظام التنبيهات (Toast Notifications)
export function showToast(msg, type = "success") {
  const toast = document.getElementById("admin-toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `fixed bottom-6 left-6 text-white text-xs px-5 py-2.5 rounded-lg shadow-lg font-medium transition-all duration-300 z-50 ${
    type === "error" ? "bg-red-600" : type === "info" ? "bg-blue-600" : "bg-green-600"
  }`;
  toast.classList.remove("hidden", "opacity-0");
  
  setTimeout(() => toast.classList.add("opacity-0"), 2500);
  setTimeout(() => toast.classList.add("hidden"), 3000);
}

// محرك الاتصال بـ Google Apps Script
export async function fetchDriveAPI(section, action, uploadData = null) {
  const url = DRIVE_APIS[section];
  if (!url) { showToast("القسم غير صالح", "error"); return null; }
  try {
    let loadingMsg = "جاري الاتصال بالسحابة...";
    if (action === "create") loadingMsg = "جاري إنشاء المجلدات في Drive...";
    else if (action === "upload") loadingMsg = "جاري رفع الملف إلى Drive...";
    else if (action === "syncFolder") loadingMsg = "جاري المزامنة من Drive 🔄...";
    else if (action === "deleteFile") loadingMsg = "جاري حذف الملف من السحابة 🗑️...";
    
    showToast(loadingMsg, "info");
    
    const payload = { action, ...uploadData };
    const response = await fetch(url, { 
      method: "POST", 
      headers: { "Content-Type": "text/plain;charset=utf-8" }, 
      body: JSON.stringify(payload) 
    });
    return await response.json();
  } catch (error) { 
    console.error("Drive API Error:", error); 
    showToast("فشل الاتصال بـ Drive", "error"); 
    return null; 
  }
}

// نظام التنقل وإصلاح قائمة الموبايل
function initNavigation() {
  const adminTabs = document.querySelectorAll('.admin-tab');
  const sections = document.querySelectorAll('.admin-section');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const closeMobileMenuBtn = document.getElementById('close-mobile-menu');
  const sidebarNav = document.getElementById('sidebar-nav');
  const mobileOverlay = document.getElementById('mobile-overlay');

  function toggleMobileMenu(show) {
    if (show) {
      sidebarNav?.classList.remove('translate-x-full');
      mobileOverlay?.classList.remove('hidden');
    } else {
      sidebarNav?.classList.add('translate-x-full');
      mobileOverlay?.classList.add('hidden');
    }
  }

  mobileMenuBtn?.addEventListener('click', () => toggleMobileMenu(true));
  closeMobileMenuBtn?.addEventListener('click', () => toggleMobileMenu(false));
  mobileOverlay?.addEventListener('click', () => toggleMobileMenu(false));

  adminTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      adminTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      sections.forEach(sec => sec.classList.add('hidden'));
      const targetId = tab.getAttribute('data-target');
      document.getElementById(targetId)?.classList.remove('hidden');
      
      toggleMobileMenu(false);
    });
  });
}

// تفعيل موديولات الأقسام بمجرد التحقق من الصلاحيات بنجاح (معرفة مرة واحدة فقط)
export function setupDashboardModules() {
  initUpdatesManager();
  initCoursesManager();
  initNewsManager();
  initLifeConnectionManager();
  initCoursesExtraManager();
}