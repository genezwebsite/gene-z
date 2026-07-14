// assets/js/admin/admin-courses.js
import { fetchDriveAPI, showToast } from "./admin-core.js";

let currentCategoryFilter = "all";
let currentSearchQuery = "";
const activeUploadLocks = {};

// دالة مساعدة لاستخراج الـ ID من روابط جوجل درايف وتحويلها لرابط صورة مباشر (آمن وبدون شاشة بيضاء)
function getDirectImageUrl(driveUrl, fileId = null) {
  if (!driveUrl && !fileId) return "https://placehold.co/600x400?text=No+Image";
  
  let id = fileId;
  if (!id && driveUrl) {
    const match = driveUrl.match(/[-\w]{25,}/);
    id = match ? match[0] : null;
  }
  
  // إرجاع رابط Thumbnail رسمي ومباشر من سيرفرات جوجل يستطيع المتصفح قراءته كصورة فعلياً
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1200` : driveUrl;
}

export function initCoursesManager() {
  const addCourseForm = document.getElementById('add-course-form');
  const courseSearchInput = document.getElementById('course-search-input');
  const categoryTabs = document.querySelectorAll('#course-category-tabs .cat-tab');

  renderStudyPlan();
  renderCoursesAdminList();

  document.getElementById('upload-tree-plan')?.addEventListener('change', (e) => handlePlanUpload(e.target, 'tree'));
  document.getElementById('upload-table-plan')?.addEventListener('change', (e) => handlePlanUpload(e.target, 'table'));

  addCourseForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameAr = document.getElementById('course-name-ar').value.trim();
    const nameEn = document.getElementById('course-name-en').value.trim();
    const code = document.getElementById('course-code').value.trim();
    const type = document.getElementById('course-type').value;
    const saveBtn = document.getElementById('save-course-btn');

    saveBtn.disabled = true; 
    saveBtn.innerText = "جاري الإنشاء...";
    
    const driveResult = await fetchDriveAPI('courses', 'create', { folderName: `${nameAr} (${code})`, category: type });

    if (driveResult?.success) {
      const courses = JSON.parse(localStorage.getItem('genez_courses_data') || '[]');
      courses.push({ 
        id: Date.now(), 
        nameAr, 
        nameEn, 
        code, 
        type, 
        mainFolderId: driveResult.mainFolderId, 
        subFolders: driveResult.subFolders, 
        files: [] 
      });
      localStorage.setItem('genez_courses_data', JSON.stringify(courses));
      window.dispatchEvent(new CustomEvent("genez:courses-updated"));
      addCourseForm.reset(); 
      renderCoursesAdminList();
    }
    saveBtn.disabled = false; 
    saveBtn.innerText = "إنشاء المادة ومجلداتها السحابية 🚀";
  });

  courseSearchInput?.addEventListener('input', (e) => { 
    currentSearchQuery = e.target.value.trim().toLowerCase(); 
    renderCoursesAdminList(); 
  });

  categoryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      categoryTabs.forEach(t => { 
        t.classList.remove('active', 'bg-accent', 'text-white'); 
        t.classList.add('bg-surface-secondary', 'text-muted'); 
      });
      tab.classList.add('active', 'bg-accent', 'text-white'); 
      tab.classList.remove('bg-surface-secondary', 'text-muted');
      currentCategoryFilter = tab.getAttribute('data-cat'); 
      renderCoursesAdminList();
    });
  });
}

function renderStudyPlan() {
  const plan = JSON.parse(localStorage.getItem('genez_study_plan') || '{"tree":null,"table":null}');
  ['tree', 'table'].forEach(type => {
    if (plan[type]) {
      const nameEl = document.getElementById(`${type}-plan-name`);
      const viewEl = document.getElementById(`${type}-plan-view`);
      const downEl = document.getElementById(`${type}-plan-download`);
      if(nameEl) nameEl.innerText = plan[type].name;
      if(viewEl) { viewEl.href = plan[type].url; viewEl.classList.remove('hidden'); }
      if(downEl) { downEl.href = plan[type].downloadUrl || plan[type].url; downEl.classList.remove('hidden'); }
    }
  });
}

async function handlePlanUpload(fileInput, type) {
  const file = fileInput.files[0];
  if (!file) return;
  if (file.size > 12 * 1024 * 1024) {
    showToast("⚠️ حجم الملف تجاوز 12MB! ارفعه يدوياً.", "error"); 
    fileInput.value = ""; 
    return;
  }
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    const result = await fetchDriveAPI('courses', 'upload', { 
      targetFolderId: "1EKQhP7Wb2EVDqIpXvUYxS9KurNtbFVHu", 
      fileName: file.name, 
      mimeType: file.type, 
      base64Data: e.target.result.split(',')[1] 
    });

    if (result?.success) {
      const plan = JSON.parse(localStorage.getItem('genez_study_plan') || '{"tree":null,"table":null}');
      
      // نستخلص الرابط المباشر للصورة من جوجل درايف ونخزنه بشكل منفصل
      const directImageUrl = getDirectImageUrl(result.fileUrl, result.fileId);

      plan[type] = { 
        name: result.fileName, 
        url: result.fileUrl,            // الرابط الأصلي لمعاينة الصفحة كاملة في تبويب جديد
        previewUrl: directImageUrl,     // الرابط المباشر لوسم <img> بدون بيضاء أو قيود
        downloadUrl: result.downloadUrl 
      };
      
      localStorage.setItem('genez_study_plan', JSON.stringify(plan)); 
      renderStudyPlan();
      showToast("تم تحديث الخطة ومعاينتها بنجاح ✅", "success");
    }
  };
  reader.readAsDataURL(file);
}

function renderCoursesAdminList() {
  const coursesAdminList = document.getElementById('courses-admin-list');
  if (!coursesAdminList) return;
  const courses = JSON.parse(localStorage.getItem('genez_courses_data') || '[]');

  const filteredCourses = courses.filter(course => {
    const matchesCategory = currentCategoryFilter === "all" || course.type === currentCategoryFilter;
    const matchesSearch = !currentSearchQuery || 
                          course.nameAr.toLowerCase().includes(currentSearchQuery) || 
                          course.nameEn.toLowerCase().includes(currentSearchQuery) || 
                          course.code.toLowerCase().includes(currentSearchQuery);
    return matchesCategory && matchesSearch;
  });

  const countBadge = document.getElementById('courses-count-badge');
  if (countBadge) countBadge.innerText = `${filteredCourses.length} مادة`;

  if (!filteredCourses.length) {
    coursesAdminList.innerHTML = `<p class="text-muted text-center py-8 text-xs sm:col-span-2 lg:col-span-3 font-medium">لا توجد مواد مطابقة للبحث أو التصنيف الحالي.</p>`; 
    return;
  }

  const catLabels = { "major-req": "تخصص إجباري", "major-opt": "تخصص اختياري", "college-req": "كلية إجبارية", "college-opt": "كلية اختيارية" };

  coursesAdminList.innerHTML = filteredCourses.map(course => {
    const filesCount = course.files ? course.files.length : 0;
    const filesHTML = filesCount > 0 ? course.files.map(file => `
      <div class="p-1.5 bg-surface rounded border border-theme flex items-center justify-between text-[11px] gap-1">
        <div class="min-w-0">
          <span class="text-accent font-bold">👤 ${file.contributor || 'Gene_Z'}:</span>
          <span class="font-semibold truncate text-content">${file.name}</span>
          <span class="text-muted text-[10px]">(${file.sectionName})</span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <a href="${file.url}" target="_blank" class="text-blue-500 hover:underline">معاينة</a>
          <button type="button" onclick="deleteCourseFile(${course.id}, '${file.id}')" class="text-red-500 hover:bg-red-50 px-1 rounded" title="حذف نهائي">🗑️</button>
        </div>
      </div>
    `).join('') : '<p class="text-[11px] text-muted text-center py-1 font-medium">لا توجد ملفات مرفوعة.</p>';

    const isLocked = activeUploadLocks[course.id] === true;
    const uploadBtnText = isLocked ? "⏳ جاري الرفع..." : `➕ رفع ملف`;
    
    return `
      <div class="p-3 bg-surface-secondary rounded-lg border border-theme flex flex-col justify-between space-y-2.5 text-xs shadow-sm">
        <div>
          <div class="flex justify-between items-start gap-1">
            <span class="font-mono bg-accent/10 text-accent font-bold px-1.5 py-0.5 rounded text-[11px]">${course.code}</span>
            <span class="bg-surface px-1.5 py-0.5 rounded text-muted text-[10px] border border-theme">${catLabels[course.type] || 'عام'}</span>
          </div>
          <h4 class="font-bold text-sm mt-1.5 text-content truncate" title="${course.nameAr}">${course.nameAr}</h4>
        </div>

        <div class="flex gap-1.5 pt-1 border-t border-theme">
          <button type="button" onclick="toggleUploadBox(${course.id})" class="btn-primary flex-1 py-1 text-[11px] font-semibold rounded" ${isLocked ? 'disabled' : ''}>${uploadBtnText}</button>
          <button type="button" onclick="syncCourseFiles(${course.id})" class="btn-outline text-blue-600 border-blue-200 hover:bg-blue-50 py-1 px-2 text-[11px] rounded">🔄 مزامنة</button>
          <button type="button" onclick="deleteEntireCourse(${course.id}, '${course.mainFolderId}')" class="btn-outline text-red-600 border-red-200 hover:bg-red-50 py-1 px-2 text-[11px] rounded">🗑️</button>
        </div>

        <div id="upload-box-${course.id}" class="hidden p-2 bg-surface rounded border border-theme space-y-2 text-[11px]">
          <input type="text" id="contributor-${course.id}" placeholder="اسم المساهم" class="form-input w-full p-1.5 rounded border border-theme bg-surface text-[11px]" />
          <select id="section-select-${course.id}" class="form-input w-full p-1.5 rounded border border-theme bg-surface text-[11px]">
            <option value="chapters">شباتر المادة</option>
            <option value="summaries">ملخصات وشروحات</option>
            <option value="pastPapers">أسئلة سنوات سابقة</option>
          </select>
          <input type="file" id="file-input-${course.id}" class="form-input w-full p-1 rounded border border-theme bg-surface text-[10px]" accept=".pdf,.png,.jpg,.zip" />
          <button type="button" onclick="executeFileUpload(${course.id})" class="btn-primary w-full py-1.5 text-[11px] font-bold">بدء الرفع السحابي</button>
        </div>

        <details class="group border-t border-theme pt-1.5">
          <summary class="cursor-pointer font-semibold text-muted hover:text-content list-none flex justify-between items-center text-[11px]">
            <span>📁 عرض الملفات المرفوعة (${filesCount})</span><span class="group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div class="space-y-1.5 mt-2 max-h-48 overflow-y-auto pr-1">${filesHTML}</div>
        </details>
      </div>
    `;
  }).join('');
}

// تصدير الدوال لكائن window لتصل إليها أزرار الواجهة المضافة ديناميكياً
window.toggleUploadBox = (courseId) => { 
  document.getElementById(`upload-box-${courseId}`)?.classList.toggle('hidden'); 
};

window.executeFileUpload = async (courseId) => {
  if (activeUploadLocks[courseId]) { showToast("⏳ يرجى الانتظار...", "info"); return; }
  const courses = JSON.parse(localStorage.getItem('genez_courses_data') || '[]');
  const course = courses.find(c => c.id === courseId);
  if (!course) return;

  const fileInput = document.getElementById(`file-input-${courseId}`);
  const file = fileInput.files[0];
  if (!file) { showToast("اختر ملفاً", "error"); return; }
  if (course.files && course.files.some(f => f.name === file.name)) { 
    showToast("⚠️ هذا الملف موجود مسبقاً في المادة!", "error"); 
    return; 
  }
  if (file.size > 12 * 1024 * 1024 || file.type.includes("video/")) {
    showToast("⚠️ الفيديوهات والملفات الضخمة تُرفع من الدرايف مباشرة ثم اضغط مزامنة 🔄", "error"); 
    fileInput.value = ""; 
    return;
  }

  activeUploadLocks[courseId] = true; 
  renderCoursesAdminList();

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const sectionKey = document.getElementById(`section-select-${courseId}`).value;
      const uploadResult = await fetchDriveAPI('courses', 'upload', { 
        targetFolderId: course.subFolders[sectionKey].id, 
        fileName: file.name, 
        mimeType: file.type, 
        base64Data: e.target.result.split(',')[1] 
      });
      if (uploadResult?.success) {
        if(!course.files) course.files = [];
        course.files.push({ 
          id: uploadResult.fileId, 
          name: uploadResult.fileName, 
          url: uploadResult.fileUrl, 
          downloadUrl: uploadResult.downloadUrl, 
          sectionKey, 
          sectionName: course.subFolders[sectionKey].name, 
          contributor: document.getElementById(`contributor-${courseId}`).value.trim() || "فريق Gene_Z" 
        });
        localStorage.setItem('genez_courses_data', JSON.stringify(courses));
        window.dispatchEvent(new CustomEvent("genez:courses-updated"));
      }
    } finally { 
      activeUploadLocks[courseId] = false; 
      renderCoursesAdminList(); 
    }
  };
  reader.readAsDataURL(file);
};

window.syncCourseFiles = async (courseId) => {
  const courses = JSON.parse(localStorage.getItem('genez_courses_data') || '[]');
  const course = courses.find(c => c.id === courseId);
  if (!course || !course.subFolders) return;

  const result = await fetchDriveAPI('courses', 'syncFolder', { subFolders: course.subFolders });
  if (result?.success && result.syncedFiles) {
    course.files = result.syncedFiles; 
    localStorage.setItem('genez_courses_data', JSON.stringify(courses));
    window.dispatchEvent(new CustomEvent("genez:courses-updated"));
    renderCoursesAdminList();
  }
};

window.deleteEntireCourse = async (courseId, mainFolderId) => {
  if (!confirm("تأكيد حذف المادة ونقلها لسلة المهملات السحابية؟")) return;
  await fetchDriveAPI('courses', 'deleteFolder', { folderId: mainFolderId });
  const courses = JSON.parse(localStorage.getItem('genez_courses_data') || '[]');
  localStorage.setItem('genez_courses_data', JSON.stringify(courses.filter(c => c.id !== courseId)));
  window.dispatchEvent(new CustomEvent("genez:courses-updated"));
  renderCoursesAdminList(); 
};

window.deleteCourseFile = async (courseId, fileId) => {
  if (!confirm("تأكيد النقل لسلة مهملات السحابة؟")) return;
  const result = await fetchDriveAPI('courses', 'deleteFile', { fileId: fileId });
  if (result?.success) {
    const courses = JSON.parse(localStorage.getItem('genez_courses_data') || '[]');
    const course = courses.find(c => c.id === courseId);
    if (course) { 
      course.files = course.files.filter(f => f.id !== fileId); 
      localStorage.setItem('genez_courses_data', JSON.stringify(courses));
      window.dispatchEvent(new CustomEvent("genez:courses-updated"));
      renderCoursesAdminList(); 
    }
  }
};