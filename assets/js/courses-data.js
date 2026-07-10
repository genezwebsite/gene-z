/**
 * Gene_Z Courses Data Layer
 * -----------------------------------------------
 * PUBLIC users read from localStorage (seeded with defaults).
 * ADMIN panel writes via saveCourses() — no source-code edits needed.
 *
 * Backend-ready: replace getCourses/saveCourses with fetch() to your API.
 */
(function () {
  const STORAGE_KEY = "gene_z_courses";

  const CATEGORIES = {
    "dept-mandatory": {
      id: "dept-mandatory",
      labelEn: "Department Mandatory",
      labelAr: "مواد تخصص اجبارية",
    },
    "dept-elective": {
      id: "dept-elective",
      labelEn: "Department Elective",
      labelAr: "مواد تخصص اختيارية",
    },
    "college-mandatory": {
      id: "college-mandatory",
      labelEn: "College Mandatory",
      labelAr: "متطلبات كلية اجبارية",
    },
    "college-elective": {
      id: "college-elective",
      labelEn: "College Elective",
      labelAr: "متطلبات كلية اختيارية",
    },
  };

  /* Seed data — copied to localStorage on first visit */
  const DEFAULT_COURSES = [
    {
      id: "bio101",
      title: "Introduction to Biotechnology",
      titleAr: "مقدمة في التقنية الحيوية",
      category: "dept-mandatory",
      description: "Foundational principles of molecular biology, genetics, and lab safety.",
      descriptionAr: "مبادئ أساسية في علم الأحياء الجزيئي والوراثة وسلامة المختبر.",
      resources: [
        {
          id: "r1",
          type: "link",
          name: "Course Syllabus (PDF)",
          url: "https://example.com/syllabus-bio101.pdf",
        },
        {
          id: "r2",
          type: "video",
          name: "Lab Safety Overview",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        },
      ],
    },
    {
      id: "gen202",
      title: "Genomics & Bioinformatics",
      titleAr: "الجينوميات والمعلوماتية الحيوية",
      category: "dept-mandatory",
      description: "Sequence analysis, databases, and computational tools for genomic data.",
      descriptionAr: "تحليل التسلسلات وقواعد البيانات والأدوات الحاسوبية للبيانات الجينومية.",
      resources: [
        {
          id: "r3",
          type: "link",
          name: "NCBI Resources",
          url: "https://www.ncbi.nlm.nih.gov/",
        },
      ],
    },
    {
      id: "ele301",
      title: "CRISPR Applications",
      titleAr: "تطبيقات CRISPR",
      category: "dept-elective",
      description: "Gene editing techniques and ethical considerations in modern biotech.",
      descriptionAr: "تقنيات تحرير الجينات والاعتبارات الأخلاقية في التقنية الحيوية الحديثة.",
      resources: [],
    },
    {
      id: "col101",
      title: "Academic Writing",
      titleAr: "الكتابة الأكاديمية",
      category: "college-mandatory",
      description: "Scientific communication, citation standards, and research ethics.",
      descriptionAr: "التواصل العلمي ومعايير الاقتباس وأخلاقيات البحث.",
      resources: [],
    },
    {
      id: "col201",
      title: "Innovation & Entrepreneurship",
      titleAr: "الابتكار وريادة الأعمال",
      category: "college-elective",
      description: "Translating biotech research into viable products and startups.",
      descriptionAr: "تحويل أبحاث التقنية الحيوية إلى منتجات viable وشركات ناشئة.",
      resources: [],
    },
  ];

  function seedIfEmpty() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_COURSES));
    }
  }

  function getCourses() {
    seedIfEmpty();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [...DEFAULT_COURSES];
    }
  }

  function saveCourses(courses) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
    /* Dispatch event so courses.html re-renders if open in another tab */
    window.dispatchEvent(new CustomEvent("genez:courses-updated"));
  }

  function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  window.GeneZCourses = {
    STORAGE_KEY,
    CATEGORIES,
    DEFAULT_COURSES,
    getCourses,
    saveCourses,
    generateId,
    seedIfEmpty,
  };
})();
