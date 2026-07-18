/**
 * Gene_Z Courses Display & Filter Script (Cloud Firestore Integrated)
 * -----------------------------------------------
 * يتعامل مع عرض بطاقات المواد سحابياً، الفلترة الفورية، والبحث الشامل مع نظام الإحصائيات اللحظية.
 */
import { db } from "./firebase-init.js";
import { 
  collection, 
  doc, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
// ✅ استيراد محرك التتبع الإحصائي اللحظي
import { trackEvent } from "./admin/admin-analytics.js";

(function () {
  let activeCategory = "major-req";
  let searchQuery = "";
  let cloudCourses = []; // التخزين البرمجي للمواد القادمة من السحابة

  /**
   * تهيئة الاستماع اللحظي للمواد والخطة الدراسية من Cloud Firestore
   */
  function initCloudCoursesListener() {
    const coursesRef = collection(db, "genez_courses");
    onSnapshot(coursesRef, (snapshot) => {
      cloudCourses = [];
      snapshot.forEach((docSnap) => {
        cloudCourses.push({ id: docSnap.id, ...docSnap.data() });
      });

      if (cloudCourses.length === 0 && window.GeneZCourses?.DEFAULT_COURSES) {
        cloudCourses = [...window.GeneZCourses.DEFAULT_COURSES];
      }

      renderTabs();
      renderCourses();
    }, (error) => {
      console.error("❌ خطأ في جلب المواد من السحابة:", error);
    });

    const planRef = doc(db, "genez_settings", "study_plan");
    onSnapshot(planRef, (docSnap) => {
      if (docSnap.exists()) {
        const plan = docSnap.data();
        updatePublicStudyPlanUI(plan);
      }
    });
  }

  function updatePublicStudyPlanUI(plan) {
    ['tree', 'table'].forEach(type => {
      if (plan[type]) {
        const viewEl = document.getElementById(`public-${type}-view`);
        const downEl = document.getElementById(`public-${type}-download`);
        if (viewEl) { 
          viewEl.href = plan[type].url; 
          viewEl.classList.remove('hidden'); 
          // ✅ تسجيل المشاهدة عند الضغط على معاينة الخطة
          viewEl.onclick = () => trackEvent("genez_settings", "study_plan", "views");
        }
        if (downEl) { 
          downEl.href = plan[type].downloadUrl || plan[type].url; 
          downEl.classList.remove('hidden'); 
          // ✅ تسجيل التحميل عند الضغط على تحميل الخطة
          downEl.onclick = () => trackEvent("genez_settings", "study_plan", "downloads");
        }
      }
    });
  }

  function renderTabs() {
    const container = document.getElementById("course-tabs");
    if (!container || !window.GeneZCourses) return;

    const isSearching = searchQuery.trim().length > 0;
    const { CATEGORIES } = GeneZCourses;
    const lang = localStorage.getItem("gene_z_lang") || "ar";

    container.innerHTML = Object.values(CATEGORIES)
      .map((cat) => {
        const tabLabel = lang === "en" ? cat.labelEn : cat.labelAr;
        return `
        <button
          type="button"
          class="course-tab px-3 py-3 text-sm font-medium ${!isSearching && cat.id === activeCategory ? "active" : ""} ${isSearching ? "opacity-50 pointer-events-none" : ""}"
          data-category="${cat.id}"
          aria-selected="${!isSearching && cat.id === activeCategory}"
          ${isSearching ? "disabled" : ""}
        >
          ${tabLabel}
        </button>`;
      })
      .join("");

    container.querySelectorAll("[data-category]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeCategory = btn.dataset.category;
        renderTabs();
        renderCourses();
      });
    });
  }

  function filterCourses(courses) {
    const q = searchQuery.trim();
    const qLower = q.toLowerCase();
    const isGlobalSearch = q.length > 0;

    return courses.filter((c) => {
      const courseCat = c.type || c.category;
      if (!isGlobalSearch && courseCat !== activeCategory) return false;
      if (!q) return true;

      const nameEn = (c.nameEn || c.titleEn || c.title || "").toLowerCase();
      const nameAr = (c.nameAr || c.titleAr || c.title || "").toLowerCase();
      const code = (c.code || "").toLowerCase();

      return nameEn.includes(qLower) || nameAr.includes(qLower) || code.includes(qLower);
    });
  }

  function navigateToCourse(courseId) {
    // سيتم تسجيل المشاهدة داخل صفحة course-details.html لضمان اكتمال الطلب السحابي
    window.location.href = `course-details.html?id=${encodeURIComponent(courseId)}`;
  }

  function bindCardNavigation() {
    document.querySelectorAll(".course-card").forEach((card) => {
      const id = card.dataset.courseId;
      card.addEventListener("click", () => navigateToCourse(id));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigateToCourse(id);
        }
      });
    });
  }

  function renderCourses() {
    const grid = document.getElementById("courses-grid");
    const countEl = document.getElementById("courses-count");
    if (!grid || !window.GeneZCourses) return;

    const isGlobalSearch = searchQuery.trim().length > 0;
    const courses = filterCourses(cloudCourses);
    const lang = localStorage.getItem("gene_z_lang") || "ar";

    if (countEl) countEl.textContent = courses.length;

    renderTabs();

    if (courses.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full card p-8 text-center border-dashed border-2 border-theme">
          <p class="text-lg font-bold text-accent mb-2">
            ${lang === "en" ? "No matching courses 🧐" : "لا توجد مواد مطابقة 🧐"}
          </p>
          <p class="text-sm text-muted">
            ${lang === "en" ? "Try different search terms or choose another category." : "جرّب البحث باسم آخر أو اختر تصنيفاً مختلفاً."}
          </p>
        </div>`;
      return;
    }

    grid.innerHTML = courses
      .map((course) => {
        const title = escapeHtml(lang === "en" ? (course.nameEn || course.titleEn || course.title) : (course.nameAr || course.titleAr || course.title));
        const code = escapeHtml(course.code || "");
        
        const courseCat = course.type || course.category;
        const catObj = GeneZCourses.CATEGORIES[courseCat];
        const categoryLabel = escapeHtml(catObj ? (lang === "en" ? catObj.labelEn : catObj.labelAr) : "عام");

        const filesCount = course.files ? course.files.length : (course.resources ? course.resources.length : 0);
        const filesBadge = filesCount > 0 
          ? `<span class="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded font-semibold">📁 ${filesCount} ملفات</span>`
          : `<span class="text-xs text-muted bg-surface-secondary px-2 py-0.5 rounded">لا توجد ملفات بعد</span>`;

        return `
      <article
        class="card p-5 flex flex-col justify-between gap-4 course-card cursor-pointer hover:border-accent hover:shadow-md transition-all group rounded-xl bg-surface"
        data-course-id="${course.id}"
        role="link"
        tabindex="0"
        aria-label="عرض تفاصيل ${title}"
      >
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="font-mono bg-accent/10 text-accent font-bold px-2 py-0.5 rounded text-xs">${code}</span>
            ${isGlobalSearch ? `<span class="text-[11px] bg-surface-secondary px-2 py-0.5 rounded text-muted border border-theme">${categoryLabel}</span>` : ""}
          </div>
          <h3 class="text-base font-bold leading-snug group-hover:text-accent transition-colors pt-1">${title}</h3>
        </div>
        
        <!-- ✅ عرض عداد المشاهدات والتحميلات للطلاب في أسفل بطاقة المادة -->
        <div class="pt-3 border-t border-theme flex justify-between items-center text-xs">
          <div class="flex items-center gap-2">
            ${filesBadge}
      </article>`;
      })
      .join("");

    bindCardNavigation();
  }

  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function initSearch() {
    const input = document.getElementById("course-search");
    if (!input) return;
    input.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderCourses();
    });
  }

  function init() {
    initCloudCoursesListener();
    initSearch();

    window.addEventListener("genez:lang-changed", () => {
      renderTabs();
      renderCourses();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();