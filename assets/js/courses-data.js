/**
 * Gene_Z Courses Data Layer (Cloud Firestore Integrated)
 * -----------------------------------------------
 * يدعم الأقسام الرسمية للمتطلبات، ويتكامل مع التحديث اللحظي في السحابة.
 */
(function () {
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

  /* بيانات مبدئية في حال كانت قاعدة البيانات السحابية فارغة تماماً */
  const DEFAULT_COURSES = [
    {
      id: 1700000000001,
      nameAr: "مقدمة في التكنولوجيا الحيوية",
      nameEn: "Introduction to Biotechnology",
      code: "BIOT-101",
      type: "major-req",
      files: []
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

  window.GeneZCourses = {
    CATEGORIES,
    DEFAULT_COURSES,
  };
})();