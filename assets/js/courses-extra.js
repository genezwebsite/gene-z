/**
 * Gene_Z Extra Courses Page Logic
 */
(function () {
  const STORAGE_KEY = "gene_z_extra_courses";
  
  // بيانات تجريبية بناءً على التصميم المطلوب
  const DUMMY_COURSES = [
    {
      id: "ext_001",
      title: "بايثون للمعلوماتية الحيوية",
      type: "خاصة بالتخصص",
      hours: "15 ساعة",
      date: "20 آب 2026", // تاريخ للدورات الأونلاين
      url: "https://www.coursera.org", // الرابط اللي بتوجه عليه البطاقة
      badges: ["certificate", "online"] // أخضر وأزرق
    },
    {
      id: "ext_002",
      title: "تقنية كريسبر",
      type: "خاص بالتخصص",
      hours: "5 ساعات",
      date: "", // فاضي لأنها مسجلة وما إلها تاريخ محدد
      url: "https://youtu.be/QsnkkP3jPDk?si=oAetLLAkhDe1z4Os",
      badges: ["no-certificate", "recorded"] // أحمر وأصفر
    },
    {
      id: "ext_003",
      title: "أساسيات السلامة المخبرية",
      type: "خاصة بالتخصص",
      hours: "3 ساعات",
      date: "",
      url: "https://www.futurelearn.com",
      badges: ["certificate", "recorded"] // أخضر وأصفر
    },
    {
      id: "ext_004",
      title: "إدارة الوقت للطلبة",
      type: "مهارات ناعمة",
      hours: "ساعتان",
      date: "1 أيلول 2026",
      url: "https://www.udemy.com",
      badges: ["no-certificate", "online"] // أحمر وأزرق
    }
  ];

  // إعدادات الألوان والنصوص للشارات (Badges)
  const BADGE_CONFIG = {
    "certificate": { label: "مع شهادة", classes: "bg-green-100 text-green-800 border-green-200" },
    "no-certificate": { label: "بدون شهادة", classes: "bg-red-100 text-red-800 border-red-200" },
    "online": { label: "أونلاين", classes: "bg-blue-100 text-blue-800 border-blue-200" },
    "recorded": { label: "مسجلة", classes: "bg-yellow-100 text-yellow-800 border-yellow-200" }
  };

  function getCourses() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DUMMY_COURSES));
      return DUMMY_COURSES;
    }
    return JSON.parse(stored);
  }

  function renderGrid(searchQuery = "") {
    const grid = document.getElementById("extra-grid");
    if (!grid) return;

    const courses = getCourses();
    const q = searchQuery.toLowerCase().trim();
    const filtered = courses.filter(c => 
      c.title.toLowerCase().includes(q) || 
      c.type.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      grid.innerHTML = `<p class="col-span-full text-center text-muted p-8 card border-dashed border-2">لا توجد دورات مطابقة للبحث.</p>`;
      return;
    }

    grid.innerHTML = filtered.map(course => {
      // تجهيز الشارات (Badges)
      const badgesHtml = course.badges.map(bKey => {
        const conf = BADGE_CONFIG[bKey];
        return `<span class="px-2 py-1 text-xs font-bold rounded-full border ${conf.classes}">${conf.label}</span>`;
      }).join("");

      // إظهار التاريخ فقط إذا كان موجوداً
      const dateHtml = course.date ? `
        <div class="flex items-center gap-1 text-xs font-medium text-accent bg-surface px-2 py-1 rounded-md border border-theme">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          ${course.date}
        </div>
      ` : `<div></div>`; // ديف فاضي عشان يحافظ على التنسيق

      return `
      <a href="${course.url}" target="_blank" class="card p-6 block hover:shadow-lg hover:border-accent transition-all duration-300 group">
        
        <div class="flex gap-2 mb-4">
          ${badgesHtml}
        </div>

        <h3 class="text-xl font-bold group-hover:text-accent transition-colors leading-snug mb-1">${course.title}</h3>
        <p class="text-sm font-medium text-muted mb-6">${course.type}</p>

        <div class="flex justify-between items-end border-t border-theme pt-4 mt-auto">
          <div class="flex items-center gap-1 text-sm font-bold text-muted">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            ${course.hours}
          </div>
          ${dateHtml}
        </div>

      </a>
    `;
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("extra-search");
    if (searchInput) {
      renderGrid();
      searchInput.addEventListener("input", (e) => renderGrid(e.target.value));
    }
  });

})();