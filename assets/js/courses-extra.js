/**
 * Gene_Z Extra Courses Page Logic (Student View - Cloud Firestore Integrated)
 * متوافق بالكامل مع Firestore اللحظي مع الحفاظ على الشارات وترجمة الساعات والتاريخ وتتبع الإحصائيات الحية
 */
import { db } from "./firebase-init.js";
import { 
  collection, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
// ✅ استيراد محرك التتبع الإحصائي اللحظي
import { trackEvent } from "./admin/admin-analytics.js";

(function () {
  let cloudExtraCourses = []; // التخزين البرمجي للدورات القادمة من السحابة

  // دالة تحويل الروابط النصية إلى روابط قابلة للضغط
  function linkify(text) {
    if (!text) return "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
      return `<a href="${url}" target="_blank" class="text-blue-500 hover:text-blue-700 underline font-bold transition-colors" dir="ltr" onclick="event.stopPropagation()">${url}</a>`;
    });
  }

  const BADGE_CONFIG = {
    "with-cert": { 
      ar: "مع شهادة", en: "With Certificate", 
      classes: "bg-green-100 text-green-800 border-green-200" 
    },
    "no-cert": { 
      ar: "بدون شهادة", en: "No Certificate", 
      classes: "bg-red-100 text-red-800 border-red-200" 
    },
    "online": { 
      ar: "أونلاين", en: "Online", 
      classes: "bg-blue-100 text-blue-800 border-blue-200" 
    },
    "recorded": { 
      ar: "مسجلة", en: "Recorded", 
      classes: "bg-yellow-100 text-yellow-800 border-yellow-200" 
    }
  };

  /**
   * تهيئة الاستماع اللحظي من Cloud Firestore
   */
  function initCloudExtraCoursesListener() {
    const extraRef = collection(db, "genez_extra_courses");
    onSnapshot(extraRef, (snapshot) => {
      cloudExtraCourses = [];
      snapshot.forEach((docSnap) => {
        cloudExtraCourses.push({ id: docSnap.id, ...docSnap.data() });
      });

      renderGrid(document.getElementById("extra-search")?.value || "");
    }, (error) => {
      console.error("❌ خطأ في جلب الدورات الإضافية من السحابة:", error);
    });
  }

  function renderGrid(searchQuery = "") {
    const grid = document.getElementById("extra-grid");
    if (!grid) return;

    const currentLang = document.documentElement.getAttribute("lang") === "en" ? "en" : "ar";
    const q = searchQuery.toLowerCase().trim();
    const hoursLabel = currentLang === "en" ? "Hours" : "ساعات";
    
    const filtered = cloudExtraCourses.filter(c => {
      const title = currentLang === "en" ? (c.titleEn || c.titleAr || "") : (c.titleAr || c.titleEn || "");
      const content = currentLang === "en" ? (c.contentEn || c.contentAr || "") : (c.contentAr || c.contentEn || "");
      return title.toLowerCase().includes(q) || content.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<p class="col-span-full text-center text-muted p-12 card border-dashed border-2 border-theme rounded-2xl">${currentLang === "en" ? "No courses found matching your search." : "لا توجد دورات مطابقة للبحث."}</p>`;
      return;
    }

    filtered.sort((a, b) => (b.id || 0) - (a.id || 0));

    grid.innerHTML = filtered.map(course => {
      const title = currentLang === "en" ? (course.titleEn || course.titleAr) : (course.titleAr || course.titleEn);
      let content = currentLang === "en" ? (course.contentEn || course.contentAr) : (course.contentAr || course.contentEn);
      
      content = linkify(content);

      const certConf = BADGE_CONFIG[course.certBadge || 'with-cert'];
      const typeConf = BADGE_CONFIG[course.typeBadge || 'recorded'];

      const badgesHtml = `
        <span class="px-2.5 py-1 text-[11px] font-bold rounded-full border shadow-sm ${certConf.classes}">${certConf[currentLang]}</span>
        <span class="px-2.5 py-1 text-[11px] font-bold rounded-full border shadow-sm ${typeConf.classes}">${typeConf[currentLang]}</span>
      `;

      const dateHtml = (course.typeBadge === 'online' && course.startDate) ? `
        <div class="flex items-center gap-1.5 text-xs font-bold text-accent bg-surface px-2.5 py-1.5 rounded-lg border border-theme shadow-sm">
          <span>📅</span> <span dir="ltr">${course.startDate}</span>
        </div>
      ` : `<div></div>`;

      return `
      <!-- ✅ تم تعديل دالة onclick لتسجيل النقرة (clicks) في محرك الإحصائيات قبل فتح رابط التسجيل -->
      <div onclick="trackEvent('genez_extra_courses', '${course.id}', 'clicks'); window.open('${course.url || '#'}', '_blank');" class="card p-6 flex flex-col justify-between hover:shadow-xl hover:border-accent transition-all duration-300 group cursor-pointer bg-surface-secondary border border-theme rounded-2xl h-full" data-course-id="${course.id}">
        
        <div class="flex gap-2 mb-4 justify-between items-center flex-wrap">
          <!-- ✅ عرض عداد المشاهدات للطلاب في الدورة -->
          <div class="flex gap-1.5">
            ${badgesHtml}
          </div>
        </div>

        <div class="mb-4">
          <h3 class="text-xl font-bold group-hover:text-accent transition-colors leading-snug mb-3">${title}</h3>
          <p class="text-sm font-medium text-muted leading-relaxed whitespace-pre-line" style="word-break: break-word;">${content}</p>
        </div>

        <div class="flex justify-between items-center border-t border-theme pt-4 mt-auto">
          <div class="flex items-center gap-1.5 text-sm font-bold text-muted bg-surface px-3 py-1.5 rounded-lg border border-theme shadow-sm">
            <span>⏱️</span>
            <span dir="ltr">${course.hours || '0'}</span>
            <span>${hoursLabel}</span>
          </div>
          ${dateHtml}
        </div>

      </div>
    `;
    }).join("");

    // ✅ تسجيل حدث مشاهدة (views) لمرة واحدة فقط لكل دورة ظاهرة على الشاشة
    if (!window.hasTrackedExtraCoursesViews) {
      filtered.forEach(c => {
        trackEvent("genez_extra_courses", String(c.id), "views");
      });
      window.hasTrackedExtraCoursesViews = true;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("extra-search");
    if (document.getElementById("extra-grid")) {
      initCloudExtraCoursesListener();
      
      if (searchInput) {
        searchInput.addEventListener("input", (e) => renderGrid(e.target.value));
      }

      window.addEventListener("genez:lang-changed", () => {
        renderGrid(searchInput ? searchInput.value : "");
      });
    }
  });
})();