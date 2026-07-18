// assets/js/admin/admin-courses-extra.js
import { showToast } from "./admin-core.js";
import { db } from "../firebase-init.js";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let editingCourseId = null;
let isProcessing = false; // لمنع إرسال الطلب مرتين أثناء الاتصال بالسحابة

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

// دالة مساعدة لجلب كافة الدورات التدريبية الإضافية من السحابة
async function getCloudExtraCoursesList() {
  const querySnapshot = await getDocs(collection(db, "genez_extra_courses"));
  const list = [];
  querySnapshot.forEach((docSnap) => {
    list.push({ id: docSnap.id, ...docSnap.data() });
  });
  return list.sort((a, b) => (b.id || 0) - (a.id || 0));
}

export function initCoursesExtraManager() {
  const form = document.getElementById('extra-course-form');
  const typeBadgeSelect = document.getElementById('extra-type-badge');
  const dateInput = document.getElementById('extra-date');

  // تفعيل/تعطيل حقل التاريخ بناءً على اختيار (أونلاين/مسجلة)
  if (typeBadgeSelect && dateInput) {
    typeBadgeSelect.addEventListener('change', (e) => {
      if (e.target.value === 'online') {
        dateInput.disabled = false;
        dateInput.classList.remove('opacity-50', 'cursor-not-allowed');
        dateInput.required = true;
      } else {
        dateInput.disabled = true;
        dateInput.classList.add('opacity-50', 'cursor-not-allowed');
        dateInput.value = ""; 
        dateInput.required = false;
      }
    });
  }

  renderExtraCoursesList();

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isProcessing) {
      showToast("⏳ يتم الآن معالجة الطلب، يرجى الانتظار...", "info");
      return;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');

    const titleAr = document.getElementById('extra-title-ar').value.trim();
    const titleEn = document.getElementById('extra-title-en').value.trim();
    const contentAr = document.getElementById('extra-content-ar').value.trim();
    const contentEn = document.getElementById('extra-content-en').value.trim();
    const url = document.getElementById('extra-url').value.trim();
    const hours = document.getElementById('extra-hours').value.trim();
    const certBadge = document.getElementById('extra-cert-badge').value; 
    const typeBadge = document.getElementById('extra-type-badge').value; 
    
    let startDate = "";
    if (typeBadge === 'online' && dateInput.value) {
       const d = new Date(dateInput.value);
       startDate = d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    const newData = {
      titleAr, titleEn, contentAr, contentEn, url, hours, certBadge, typeBadge, startDate
    };

    try {
      isProcessing = true;
      if (submitBtn) submitBtn.disabled = true;

      if (editingCourseId) {
        if (submitBtn) submitBtn.innerText = "⏳ جاري حفظ التعديلات سحابياً...";
        const docRef = doc(db, "genez_extra_courses", String(editingCourseId));
        await updateDoc(docRef, newData);

        await logAdminActivity("[قسم الدورات التدريبية] تعديل دورة", titleAr);
        editingCourseId = null;
        if (submitBtn) submitBtn.innerText = "إضافة الدورة للموقع 🚀";
        showToast("تم تعديل الدورة سحابياً بنجاح ✏️", "success");
      } else {
        if (submitBtn) submitBtn.innerText = "⏳ جاري إضافة الدورة...";
        const newId = Date.now();
        newData.id = newId;
        newData.views = 0;   // ✅ تهيئة المشاهدات
        newData.clicks = 0;  // ✅ تهيئة النقرات على رابط التسجيل
        const newDocRef = doc(db, "genez_extra_courses", String(newId));
        
        await setDoc(newDocRef, newData);

        await logAdminActivity("[قسم الدورات التدريبية] إضافة دورة جديدة", titleAr);
        showToast("تمت إضافة الدورة سحابياً بنجاح 🎓", "success");
      }

      form.reset();
      
      if (dateInput) {
          dateInput.disabled = true;
          dateInput.classList.add('opacity-50', 'cursor-not-allowed');
      }

      await renderExtraCoursesList();
    } catch (err) {
      console.error("Extra course upload error:", err);
      showToast("❌ حدث خطأ أثناء المعالجة السحابية", "error");
    } finally {
      isProcessing = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        if (!editingCourseId) submitBtn.innerText = "إضافة الدورة للموقع 🚀";
      }
    }
  });
}

async function renderExtraCoursesList() {
  const container = document.getElementById('extra-courses-list');
  if (!container) return;

  container.innerHTML = `<p class="text-muted text-center py-6 text-xs font-medium">⏳ جاري جلب الدورات من Cloud Firestore...</p>`;
  
  try {
    const list = await getCloudExtraCoursesList();

    if (!list.length) {
      container.innerHTML = `<p class="text-muted text-center py-6 text-xs font-medium">لا توجد دورات مضافة حالياً.</p>`;
      return;
    }

    const certLabels = { 'with-cert': '✅ شهادة', 'no-cert': '❌ بلا شهادة' };
    const typeLabels = { 'recorded': '📼 مسجلة', 'online': '💻 أونلاين' };

    container.innerHTML = list.map(item => `
      <div class="p-3.5 bg-surface-secondary border border-theme rounded-xl flex flex-col space-y-3 shadow-sm">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div class="space-y-1.5 w-full">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded border bg-surface border-theme">${certLabels[item.certBadge] || '✅ شهادة'}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded border bg-surface border-theme">${typeLabels[item.typeBadge] || '📼 مسجلة'}</span>
              <span class="text-[10px] text-muted font-mono flex items-center gap-1">⏱️ ${item.hours || '0'} ساعات</span>
              ${item.startDate ? `<span class="text-[10px] text-muted font-mono bg-accent/10 text-accent px-1.5 rounded">📅 ${item.startDate}</span>` : ''}
            </div>
            <h4 class="font-bold text-sm text-content">${item.titleAr || ''} <span class="text-[11px] text-muted font-normal">| ${item.titleEn || ''}</span></h4>
          </div>
          
          <div class="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end border-t sm:border-none border-theme pt-2 sm:pt-0">
            <button type="button" onclick="editExtraCourse(${item.id})" class="btn-outline text-blue-600 border-blue-200 hover:bg-blue-50 py-1 px-3 text-[11px] font-bold rounded">تعديل ✏️</button>
            <button type="button" onclick="deleteExtraCourse(${item.id})" class="btn-outline text-red-600 border-red-200 hover:bg-red-50 py-1 px-3 text-[11px] font-bold rounded">حذف 🗑️</button>
          </div>
        </div>

        <!-- ✅ شريط عدادات In-Card Stats (مشاهدات البطاقة | النقرات على رابط التسجيل) -->
        <div class="flex items-center gap-4 text-[11px] font-mono bg-surface px-3 py-1.5 rounded-lg border border-theme w-fit shadow-inner">
          <span title="مشاهدات الدورة" class="flex items-center gap-1 text-blue-500 font-bold">
            👁️ ${item.views || 0}
          </span>
          <span class="text-theme">|</span>
          <span title="النقرات على رابط التسجيل الخارجي" class="flex items-center gap-1 text-yellow-600 font-bold">
            🎯 ${item.clicks || 0}
          </span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error("Error rendering extra courses:", err);
    container.innerHTML = `<p class="text-red-500 text-center py-6 text-xs font-medium">❌ حدث خطأ في جلب البيانات من السحابة.</p>`;
  }
}

window.editExtraCourse = async (id) => {
  const list = await getCloudExtraCoursesList();
  const course = list.find(c => String(c.id) === String(id));
  if (!course) return;

  document.getElementById('extra-title-ar').value = course.titleAr || "";
  document.getElementById('extra-title-en').value = course.titleEn || "";
  document.getElementById('extra-content-ar').value = course.contentAr || "";
  document.getElementById('extra-content-en').value = course.contentEn || "";
  document.getElementById('extra-url').value = course.url || "";
  document.getElementById('extra-hours').value = course.hours || "";
  document.getElementById('extra-cert-badge').value = course.certBadge || "with-cert";
  
  const typeSelect = document.getElementById('extra-type-badge');
  const dateInput = document.getElementById('extra-date');
  
  if (typeSelect && dateInput) {
      typeSelect.value = course.typeBadge || "recorded";
      if (course.typeBadge === 'online') {
          dateInput.disabled = false;
          dateInput.classList.remove('opacity-50', 'cursor-not-allowed');
          dateInput.required = true;
      } else {
          dateInput.disabled = true;
          dateInput.classList.add('opacity-50', 'cursor-not-allowed');
          dateInput.required = false;
      }
  }

  editingCourseId = id;
  const submitBtn = document.getElementById('extra-course-form')?.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.innerText = "حفظ التعديلات 💾";
  
  document.getElementById('extra-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.deleteExtraCourse = async (id) => {
  if (!confirm("هل أنت متأكد من حذف هذه الدورة من قائمة التدريب في السحابة؟")) return;
  try {
    const list = await getCloudExtraCoursesList();
    const courseToDelete = list.find(c => String(c.id) === String(id));
    
    await deleteDoc(doc(db, "genez_extra_courses", String(id)));
    
    if (courseToDelete) await logAdminActivity("[قسم الدورات التدريبية] حذف دورة", courseToDelete.titleAr || "");
    
    if (editingCourseId === id) {
       editingCourseId = null;
       document.getElementById('extra-course-form')?.reset();
       const submitBtn = document.getElementById('extra-course-form')?.querySelector('button[type="submit"]');
       if (submitBtn) submitBtn.innerText = "إضافة الدورة للموقع 🚀";
    }

    await renderExtraCoursesList();
    showToast("تم الحذف سحابياً بنجاح", "info");
  } catch (err) {
    console.error("Error deleting extra course:", err);
    showToast("❌ حدث خطأ أثناء الحذف من السحابة", "error");
  }
};