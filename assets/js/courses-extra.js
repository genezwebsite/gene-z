/**
 * Gene_Z Extra Courses Page Logic (Student View)
 */
(function () {
  const STORAGE_KEY = "genez_extra_courses";

  // دالة تحويل الروابط النصية إلى روابط قابلة للضغط (مع إيقاف انتشار الحدث لكي لا تتضارب مع البطاقة)
  function linkify(text) {
    if (!text) return "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
      return `<a href="${url}" target="_blank" class="text-blue-500 hover:text-blue-700 underline font-bold transition-colors" dir="ltr" onclick="event.stopPropagation()">${url}</a>`;
    });
  }

  function getCourses() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  }

  // إعدادات الشارات (الألوان والنصوص باللغتين)
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

  function renderGrid(searchQuery = "") {
    const grid = document.getElementById("extra-grid");
    if (!grid) return;

    const courses = getCourses();
    const currentLang = document.documentElement.getAttribute("lang") === "en" ? "en" : "ar";
    const q = searchQuery.toLowerCase().trim();
    const hoursLabel = currentLang === "en" ? "Hours" : "ساعات";
    
    const filtered = courses.filter(c => {
      const title = currentLang === "en" ? (c.titleEn || c.titleAr) : (c.titleAr || c.titleEn);
      const content = currentLang === "en" ? (c.contentEn || c.contentAr) : (c.contentAr || c.contentEn);
      return title.toLowerCase().includes(q) || content.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<p class="col-span-full text-center text-muted p-12 card border-dashed border-2 border-theme rounded-2xl">${currentLang === "en" ? "No courses found matching your search." : "لا توجد دورات مطابقة للبحث."}</p>`;
      return;
    }

    // ترتيب الدورات الأحدث أولاً
    filtered.sort((a, b) => b.id - a.id);

    grid.innerHTML = filtered.map(course => {
      const title = currentLang === "en" ? (course.titleEn || course.titleAr) : (course.titleAr || course.titleEn);
      let content = currentLang === "en" ? (course.contentEn || course.contentAr) : (course.contentAr || course.contentEn);
      
      // تحويل الروابط في الوصف إلى Clickable Links
      content = linkify(content);

      // تجهيز الشارات (الشهادة والنوع)
      const certConf = BADGE_CONFIG[course.certBadge || 'with-cert'];
      const typeConf = BADGE_CONFIG[course.typeBadge || 'recorded'];

      const badgesHtml = `
        <span class="px-2.5 py-1 text-[11px] font-bold rounded-full border shadow-sm ${certConf.classes}">${certConf[currentLang]}</span>
        <span class="px-2.5 py-1 text-[11px] font-bold rounded-full border shadow-sm ${typeConf.classes}">${typeConf[currentLang]}</span>
      `;

      // إظهار التاريخ فقط إذا كانت الدورة "أونلاين"
      const dateHtml = (course.typeBadge === 'online' && course.startDate) ? `
        <div class="flex items-center gap-1.5 text-xs font-bold text-accent bg-surface px-2.5 py-1.5 rounded-lg border border-theme shadow-sm">
          <span>📅</span> <span dir="ltr">${course.startDate}</span>
        </div>
      ` : `<div></div>`;

      return `
      <!-- جعلنا البطاقة div بميزة onclick تفتح رابط الدورة (url) -->
      <div onclick="window.open('${course.url || '#'}', '_blank')" class="card p-6 flex flex-col justify-between hover:shadow-xl hover:border-accent transition-all duration-300 group cursor-pointer bg-surface-secondary border border-theme rounded-2xl h-full">
        
        <div class="flex gap-2 mb-4 justify-end flex-wrap">
          ${badgesHtml}
        </div>

        <div class="mb-4">
          <h3 class="text-xl font-bold group-hover:text-accent transition-colors leading-snug mb-3">${title}</h3>
          <!-- الوصف بستايل يحافظ على المسافات -->
          <p class="text-sm font-medium text-muted leading-relaxed whitespace-pre-line" style="word-break: break-word;">${content}</p>
        </div>

        <div class="flex justify-between items-center border-t border-theme pt-4 mt-auto">
          <div class="flex items-center gap-1.5 text-sm font-bold text-muted bg-surface px-3 py-1.5 rounded-lg border border-theme shadow-sm">
            <span>⏱️</span>
            <span dir="ltr">${course.hours}</span>
            <span>${hoursLabel}</span>
          </div>
          ${dateHtml}
        </div>

      </div>
    `;
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("extra-search");
    if (document.getElementById("extra-grid")) {
      renderGrid();
      
      if (searchInput) {
        searchInput.addEventListener("input", (e) => renderGrid(e.target.value));
      }

      window.addEventListener("genez:lang-changed", () => {
        renderGrid(searchInput ? searchInput.value : "");
      });
    }
  });

})();