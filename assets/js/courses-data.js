/**
 * Gene_Z Courses Data Layer
 * -----------------------------------------------
 * يدعم الأقسام الأربعة الرسمية للمتطلبات، ويتصل بلوحة التحكم.
 */
(function () {
  // مفاتيح التخزين الموحدة مع لوحة التحكم
  const STORAGE_KEY = "genez_courses_data";
  const STUDY_PLAN_KEY = "genez_study_plan";

  const CATEGORIES = {
    "major-req": {
      id: "major-req",
      labelEn: "Major Mandatory",
      labelAr: "متطلبات تخصص اجبارية",
    },
    "major-opt": {
      id: "major-opt",
      labelEn: "Major Elective",
      labelAr: "متطلبات تخصص اختيارية",
    },
    "college-req": {
      id: "college-req",
      labelEn: "College Mandatory",
      labelAr: "متطلبات كلية اجبارية",
    },
    "college-opt": {
      id: "college-opt",
      labelEn: "College Elective",
      labelAr: "متطلبات كلية اختيارية",
    },
  };

  /* بيانات مبدئية في حال كان الموقع يفتح لأول مرة */
  const DEFAULT_COURSES = [
    {
      id: 1700000000001,
      nameAr: "مقدمة في التكنولوجيا الحيوية",
      nameEn: "Introduction to Biotechnology",
      code: "BIOT-101",
      type: "major-req",
      files: [
        {
          id: "f1",
          name: "سلايدات الشابتر الأول",
          url: "https://example.com/slide1.pdf",
          downloadUrl: "https://example.com/slide1.pdf",
          sectionKey: "chapters",
          sectionName: "شباتر المادة",
          contributor: "د. أحمد"
        }
      ]
    },
    {
      id: 1700000000002,
      nameAr: "الجينوميات والمعلوماتية الحيوية",
      nameEn: "Genomics & Bioinformatics",
      code: "BIOT-202",
      type: "major-req",
      files: []
    }
  ];

  function seedIfEmpty() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_COURSES));
    }
    if (!localStorage.getItem(STUDY_PLAN_KEY)) {
      localStorage.setItem(STUDY_PLAN_KEY, JSON.stringify({ tree: null, table: null }));
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
    window.dispatchEvent(new CustomEvent("genez:courses-updated"));
  }

  function getStudyPlan() {
    seedIfEmpty();
    try {
      return JSON.parse(localStorage.getItem(STUDY_PLAN_KEY)) || { tree: null, table: null };
    } catch {
      return { tree: null, table: null };
    }
  }

  window.GeneZCourses = {
    STORAGE_KEY,
    STUDY_PLAN_KEY,
    CATEGORIES,
    getCourses,
    saveCourses,
    getStudyPlan,
    seedIfEmpty,
  };
})();