// assets/js/admin/admin-courses.js
import { fetchDriveAPI, showToast } from "./admin-core.js";
import { db } from "../firebase-init.js";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let currentCategoryFilter = "all";
let currentSearchQuery = "";
const activeUploadLocks = {};
let cloudAdminCourses = []; // تخزين قائمة المواد القادمة من السحابة

// دالة تسجيل النشاطات في مجموعة activity_logs
async function logAdminActivity(actionType, targetName) {
  try {
    const adminEmail = sessionStorage.getItem("adminEmail") || "مشرف غير معروف";
    const logRef = doc(collection(db, "activity_logs"));
    await setDoc(logRef, {
      adminEmail: adminEmail,
      action: actionType,
      targetName: targetName,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error("⚠️ لم يتم حفظ سجل النشاط:", err);
  }
}

function getDirectImageUrl(driveUrl, fileId = null) {
  if (!driveUrl && !fileId) return "https://placehold.co/600x400?text=No+Image";
  let id = fileId;
  if (!id && driveUrl) {
    const match = driveUrl.match(/[-\w]{25,}/);
    id = match ? match[0] : null;
  }
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1200` : driveUrl;
}

export function initCoursesManager() {
  const addCourseForm = document.getElementById('add-course-form');
  const courseSearchInput = document.getElementById('course-search-input');
  const categoryTabs = document.querySelectorAll('#course-category-tabs .cat-tab');

  // 1. الاستماع اللحظي للخطط الدراسية
  initStudyPlanCloudListener();

  // 2. الاستماع اللحظي لمواد لوحة التحكم
  initAdminCoursesCloudListener();

  document.getElementById('upload-tree-plan')?.addEventListener('change', (e) => handlePlanUpload(e.target, 'tree'));
  document.getElementById('upload-table-plan')?.addEventListener('change', (e) => handlePlanUpload(e.target, 'table'));

  addCourseForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameAr = document.getElementById('course-name-ar').value.trim();
    const nameEn = document.getElementById('course-name-en').value.trim();
    const code = document.getElementById('course-code').value.trim();
    const type = document.getElementById('course-type').value;
    const details = document.getElementById('course-details')?.value.trim() || '';
    const saveBtn = document.getElementById('save-course-btn');

    saveBtn.disabled = true; 
    saveBtn.innerText = "⏳ جاري الإنشاء في Google Drive والسحابة...";
    
    try {
      // إنشاء المجلدات في Google Drive
      const driveResult = await fetchDriveAPI('courses', 'create', { folderName: `${nameAr} (${code})`, category: type });

      if (driveResult?.success) {
        const newId = Date.now();
        const newCourseData = { 
          id: newId, 
          nameAr, 
          nameEn, 
          code, 
          type, 
          mainFolderId: driveResult.mainFolderId, 
          subFolders: driveResult.subFolders, 
          files: [],
          details: details,
          views: 0,       // ✅ تهيئة عداد مشاهدات المادة بصفر
          downloads: 0,   // ✅ تهيئة عداد التحميلات بصفر
          createdAt: serverTimestamp()
        };

        // الحفظ في Cloud Firestore
        await setDoc(doc(db, "genez_courses", String(newId)), newCourseData);
        
        await logAdminActivity("[قسم المواد] إضافة مادة دراسية جديدة", `[${code}] ${nameAr}`);
        
        showToast("✅ تم إنشاء المادة ومجلداتها السحابية بنجاح", "success");
        addCourseForm.reset(); 
      } else {
        showToast("❌ فشل إنشاء المجلدات في Google Drive", "error");
      }
    } catch (err) {
      console.error("Error creating course:", err);
      showToast("❌ حدث خطأ أثناء الحفظ السحابي", "error");
    } finally {
      saveBtn.disabled = false; 
      saveBtn.innerText = "إنشاء المادة ومجلداتها السحابية 🚀";
    }
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

function initAdminCoursesCloudListener() {
  const coursesRef = collection(db, "genez_courses");
  onSnapshot(coursesRef, (snapshot) => {
    cloudAdminCourses = [];
    snapshot.forEach((docSnap) => {
      cloudAdminCourses.push({ id: docSnap.id, ...docSnap.data() });
    });
    cloudAdminCourses.sort((a, b) => (b.id || 0) - (a.id || 0));
    renderCoursesAdminList();
  }, (err) => {
    console.error("❌ خطأ في الاستماع لمواد لوحة التحكم:", err);
  });
}

function initStudyPlanCloudListener() {
  const planRef = doc(db, "genez_settings", "study_plan");
  onSnapshot(planRef, (docSnap) => {
    if (docSnap.exists()) {
      const plan = docSnap.data();
      renderStudyPlanUI(plan);
    }
  });
}

function renderStudyPlanUI(plan) {
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
  
  showToast("⏳ جاري رفع الخطة إلى Google Drive وحفظها في Firestore...", "info");
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const result = await fetchDriveAPI('courses', 'upload', { 
        targetFolderId: "1EKQhP7Wb2EVDqIpXvUYxS9KurNtbFVHu", 
        fileName: file.name, 
        mimeType: file.type, 
        base64Data: e.target.result.split(',')[1] 
      });

      if (result?.success) {
        const directImageUrl = getDirectImageUrl(result.fileUrl, result.fileId);
        const planData = { 
          name: result.fileName, 
          url: result.fileUrl,
          previewUrl: directImageUrl,
          downloadUrl: result.downloadUrl 
        };
        
        const planRef = doc(db, "genez_settings", "study_plan");
        await setDoc(planRef, { [type]: planData }, { merge: true });
        
        await logAdminActivity(`[قسم المواد] تحديث الخطة الدراسية (${type === 'tree' ? 'الشجرية' : 'الجدولية'})`, result.fileName);
        showToast("✅ تم تحديث الخطة وحفظها سحابياً بنجاح", "success");
      } else {
        showToast("❌ فشل الرفع إلى Google Drive", "error");
      }
    } catch (err) {
      console.error("Error saving study plan:", err);
      showToast("❌ حدث خطأ في حفظ الخطة سحابياً", "error");
    }
  };
  reader.readAsDataURL(file);
}

function renderCoursesAdminList() {
  const coursesAdminList = document.getElementById('courses-admin-list');
  if (!coursesAdminList) return;

  const filteredCourses = cloudAdminCourses.filter(course => {
    const matchesCategory = currentCategoryFilter === "all" || course.type === currentCategoryFilter;
    const matchesSearch = !currentSearchQuery || 
                          (course.nameAr || "").toLowerCase().includes(currentSearchQuery) || 
                          (course.nameEn || "").toLowerCase().includes(currentSearchQuery) || 
                          (course.code || "").toLowerCase().includes(currentSearchQuery);
    return matchesCategory && matchesSearch;
  });

  const countBadge = document.getElementById('courses-count-badge');
  if (countBadge) countBadge.innerText = `${filteredCourses.length} مادة`;

  if (!filteredCourses.length) {
    coursesAdminList.innerHTML = `<p class="text-muted text-center py-8 text-xs sm:col-span-2 lg:col-span-3 font-medium">لا توجد مواد مطابقة للبحث أو التصنيف الحالي في السحابة.</p>`; 
    return;
  }

  const catLabels = { "major-req": "تخصص إجباري", "major-opt": "تخصص اختياري", "college-req": "كلية إجبارية", "college-opt": "كلية اختيارية" };

  coursesAdminList.innerHTML = filteredCourses.map(course => {
    const filesCount = course.files ? course.files.length : 0;
    const filesHTML = filesCount > 0 ? course.files.map(file => `
      <div class="p-1.5 bg-surface rounded border border-theme flex items-center justify-between text-[11px] gap-1">
        <div class="flex items-center gap-1 min-w-0 flex-1">
          <span class="text-accent font-bold shrink-0">👤 ${file.contributor || 'Gene_Z'}:</span>
          <span class="font-semibold truncate text-content block" title="${file.name}">${file.name}</span>
          <span class="text-muted text-[10px] shrink-0">(${file.sectionName || ''})</span>
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
            <span class="font-mono bg-accent/10 text-accent font-bold px-1.5 py-0.5 rounded text-[11px]">${course.code || ''}</span>
            <span class="bg-surface px-1.5 py-0.5 rounded text-muted text-[10px] border border-theme">${catLabels[course.type] || 'عام'}</span>
          </div>
          <h4 class="font-bold text-sm mt-1.5 text-content truncate" title="${course.nameAr || ''}">${course.nameAr || ''}</h4>
        </div>

        <!-- ✅ شريط عدادات In-Card Stats (المشاهدات والتحميلات) الخاص بالمشرف -->
        <div class="flex items-center gap-3 text-[11px] font-mono bg-surface px-2.5 py-1 rounded border border-theme w-fit shadow-inner">
          <span title="عدد المشاهدات والزيارات" class="flex items-center gap-1 text-blue-500 font-bold">
            👁️ ${course.views || 0}
          </span>
          <span class="text-theme">|</span>
          <span title="إجمالي مرات تنزيل الملفات" class="flex items-center gap-1 text-green-600 font-bold">
            📥 ${course.downloads || 0}
          </span>
        </div>

        <div class="flex gap-1.5 pt-1 border-t border-theme flex-wrap">
          <button type="button" onclick="toggleUploadBox(${course.id})" class="btn-primary flex-1 py-1 text-[11px] font-semibold rounded min-w-[70px]" ${isLocked ? 'disabled' : ''}>${uploadBtnText}</button>
          <button type="button" onclick="openEditDetailsModal(${course.id})" class="btn-outline text-amber-600 border-amber-200 hover:bg-amber-50 py-1 px-2 text-[11px] rounded">✏️ تفاصيل</button>
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
          <input type="file" id="file-input-${course.id}" class="form-input w-full p-1 rounded border border-theme bg-surface text-[10px]" accept=".pdf,.png,.jpg,.zip,.mp4,.mov,.avi,.mkv,.webm,.m4v" />
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

window.toggleUploadBox = (courseId) => { 
  document.getElementById(`upload-box-${courseId}`)?.classList.toggle('hidden'); 
};

window.executeFileUpload = async (courseId) => {
  if (activeUploadLocks[courseId]) { showToast("⏳ يرجى الانتظار...", "info"); return; }
  const course = cloudAdminCourses.find(c => String(c.id) === String(courseId));
  if (!course) return;

  const fileInput = document.getElementById(`file-input-${courseId}`);
  const file = fileInput?.files[0];
  if (!file) { showToast("اختر ملفاً", "error"); return; }
  if (file.size > 100 * 1024 * 1024) {
    showToast("⚠️ حجم الملف تجاوز 100MB! ارفعه يدوياً على Drive ثم اضغط مزامنة 🔄", "error"); 
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
        const updatedFiles = course.files || [];
        updatedFiles.push({ 
          id: uploadResult.fileId, 
          name: uploadResult.fileName, 
          url: uploadResult.fileUrl, 
          downloadUrl: uploadResult.downloadUrl, 
          sectionKey, 
          sectionName: course.subFolders[sectionKey].name, 
          contributor: document.getElementById(`contributor-${courseId}`).value.trim() || "فريق Gene_Z" 
        });
        
        await updateDoc(doc(db, "genez_courses", String(courseId)), { files: updatedFiles });
        
        await logAdminActivity("[قسم المواد] رفع ملف جديد", `[${course.code}] ${course.nameAr} -> ${file.name}`);
        
        showToast("✅ تم رفع الملف وحفظه سحابياً بنجاح", "success");
      } else {
        showToast("❌ فشل الرفع إلى Google Drive", "error");
      }
    } catch (err) {
      console.error("File upload error:", err);
      showToast("❌ حدث خطأ أثناء الرفع السحابي", "error");
    } finally { 
      activeUploadLocks[courseId] = false; 
      renderCoursesAdminList(); 
    }
  };
  reader.readAsDataURL(file);
};

window.syncCourseFiles = async (courseId) => {
  if (activeUploadLocks[courseId]) { showToast("⏳ يرجى الانتظار، هناك عملية قيد التنفيذ لهذه المادة...", "info"); return; }
  const course = cloudAdminCourses.find(c => String(c.id) === String(courseId));
  if (!course || !course.subFolders) return;

  activeUploadLocks[courseId] = true;
  showToast("🔄 جاري مزامنة المجلدات مع Google Drive...", "info");
  try {
    const result = await fetchDriveAPI('courses', 'syncFolder', { subFolders: course.subFolders });
    if (result?.success && result.syncedFiles) {
      const processedFiles = result.syncedFiles.map(file => {
          if (file.contributor === "مرفوع عبر Drive ☁️") file.contributor = "(فريق Gene_Z)";
          return file;
      });
      await updateDoc(doc(db, "genez_courses", String(courseId)), { files: processedFiles });
      
      await logAdminActivity("[قسم المواد] مزامنة مجلدات المادة", `[${course.code}] ${course.nameAr}`);
      
      showToast("✅ تمت المزامنة وتحديث الملفات في Firestore بنجاح!", "success");
    } else {
      showToast("❌ فشل جلب المزامنة من Drive", "error");
    }
  } catch (err) {
    console.error("Sync error:", err);
    showToast("❌ حدث خطأ أثناء المزامنة السحابية", "error");
  } finally {
    activeUploadLocks[courseId] = false;
  }
};

window.deleteEntireCourse = async (courseId, mainFolderId) => {
  if (activeUploadLocks[courseId]) { showToast("⏳ يرجى الانتظار، هناك عملية قيد التنفيذ لهذه المادة...", "info"); return; }
  if (!confirm("تأكيد حذف المادة ونقلها لسلة المهملات السحابية في Google Drive وحذفها من Firestore؟")) return;
  
  activeUploadLocks[courseId] = true;
  try {
    const courseToDelete = cloudAdminCourses.find(c => String(c.id) === String(courseId));
    if (mainFolderId && mainFolderId !== 'undefined') {
      await fetchDriveAPI('courses', 'deleteFolder', { folderId: mainFolderId });
    }
    if (courseToDelete && window.deductStatsOnDelete) {
      await window.deductStatsOnDelete(courseToDelete);
    }
    
    await deleteDoc(doc(db, "genez_courses", String(courseId)));
    
    if (courseToDelete) await logAdminActivity("[قسم المواد] حذف مادة دراسية", `[${courseToDelete.code}] ${courseToDelete.nameAr}`);
    
    showToast("🗑️ تم حذف المادة ومجلداتها بنجاح", "success");
  } catch (err) {
    console.error("Error deleting course:", err);
    showToast("❌ حدث خطأ أثناء حذف المادة", "error");
  } finally {
    activeUploadLocks[courseId] = false;
  }
};

window.deleteCourseFile = async (courseId, fileId) => {
  if (activeUploadLocks[courseId]) { showToast("⏳ يرجى الانتظار، هناك عملية قيد التنفيذ لهذه المادة...", "info"); return; }
  if (!confirm("تأكيد النقل لسلة مهملات السحابة؟")) return;
  
  activeUploadLocks[courseId] = true;
  try {
    const result = await fetchDriveAPI('courses', 'deleteFile', { fileId: fileId });
    if (result?.success) {
      const course = cloudAdminCourses.find(c => String(c.id) === String(courseId));
      if (course) { 
        const updatedFiles = course.files.filter(f => f.id !== fileId); 
        await updateDoc(doc(db, "genez_courses", String(courseId)), { files: updatedFiles });
        
        await logAdminActivity("[قسم المواد] حذف ملف من مادة", `[${course.code}] ${course.nameAr} -> تم حذف ملف`);
        
        showToast("🗑️ تم حذف الملف من السحابة بنجاح", "success");
      }
    } else {
      showToast("❌ فشل حذف الملف من Drive", "error");
    }
  } catch (err) {
    console.error("Error deleting file:", err);
    showToast("❌ حدث خطأ أثناء حذف الملف", "error");
  } finally {
    activeUploadLocks[courseId] = false;
  }
};

let currentEditingCourseId = null;

window.openEditDetailsModal = (courseId) => {
  const course = cloudAdminCourses.find(c => String(c.id) === String(courseId));
  if (!course) return;
  currentEditingCourseId = courseId;
  const inputEl = document.getElementById('edit-course-details-input');
  if (inputEl) inputEl.value = course.details || '';
  document.getElementById('edit-course-details-modal')?.classList.remove('hidden');
};

window.closeEditDetailsModal = () => {
  currentEditingCourseId = null;
  document.getElementById('edit-course-details-modal')?.classList.add('hidden');
};

document.getElementById('save-course-details-btn')?.addEventListener('click', async () => {
  if (!currentEditingCourseId) return;
  const newDetails = document.getElementById('edit-course-details-input').value.trim();
  const btn = document.getElementById('save-course-details-btn');
  btn.disabled = true;
  btn.innerText = "⏳ جاري الحفظ...";

  try {
    const courseRef = doc(db, "genez_courses", String(currentEditingCourseId));
    await updateDoc(courseRef, { details: newDetails });
    const course = cloudAdminCourses.find(c => String(c.id) === String(currentEditingCourseId));
    if(course) await logAdminActivity("[قسم المواد] تحديث تفاصيل", `[${course.code}] ${course.nameAr}`);
    showToast("✅ تم حفظ التفاصيل بنجاح", "success");
    window.closeEditDetailsModal();
  } catch (error) {
    console.error(error);
    showToast("❌ حدث خطأ أثناء حفظ التفاصيل", "error");
  } finally {
    btn.disabled = false;
    btn.innerText = "حفظ التعديلات";
  }
});