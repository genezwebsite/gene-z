(function () {
  let activeCategory = "dept-mandatory";
  let searchQuery = "";

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
      if (!isGlobalSearch && c.category !== activeCategory) return false;
      if (!q) return true;

      const titleEn = (c.titleEn || c.title || "").toLowerCase();
      const titleAr = (c.titleAr || c.title || "").toLowerCase();
      const descEn = (c.descriptionEn || c.description || "").toLowerCase();
      const descAr = (c.descriptionAr || c.description || "").toLowerCase();

      return (
        titleEn.includes(qLower) ||
        titleAr.includes(qLower) ||
        descEn.includes(qLower) ||
        descAr.includes(qLower)
      );
    });
  }

  function navigateToCourse(courseId) {
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
    const courses = filterCourses(GeneZCourses.getCourses());
    
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
        const rawTitle = lang === "en" ? (course.titleEn || course.title) : (course.titleAr || course.title);
        const rawDesc = lang === "en" ? (course.descriptionEn || course.description) : (course.descriptionAr || course.description);
        
        const title = escapeHtml(rawTitle);
        const desc = escapeHtml(rawDesc);
        
        const catObj = GeneZCourses.CATEGORIES[course.category];
        const categoryLabel = escapeHtml(lang === "en" ? catObj.labelEn : catObj.labelAr);

        return `
      <article
        class="card p-6 flex flex-col gap-3 course-card cursor-pointer hover:border-accent transition-colors group"
        data-course-id="${course.id}"
        role="link"
        tabindex="0"
        aria-label="${lang === "en" ? 'View details for' : 'عرض تفاصيل'} ${title}"
      >
        <div>
          <h3 class="text-lg font-semibold leading-snug group-hover:text-accent transition-colors">${title}</h3>
          ${
            isGlobalSearch
              ? `<span class="inline-block px-2 py-1 bg-surface-secondary text-xs rounded border border-theme w-fit text-muted mt-2">${categoryLabel}</span>`
              : ""
          }
        </div>
        <p class="text-sm text-muted leading-relaxed line-clamp-3 mt-1">${desc}</p>
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
    GeneZCourses.seedIfEmpty();
    renderTabs();
    renderCourses();
    initSearch();

    window.addEventListener("genez:courses-updated", () => {
      renderCourses();
    });

    window.addEventListener("genez:lang-changed", () => {
      renderTabs();
      renderCourses();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();