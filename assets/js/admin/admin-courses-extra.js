// assets/js/admin/admin-courses-extra.js
import { showToast } from "./admin-core.js";

let editingCourseId = null;

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
        dateInput.value = ""; // مسح التاريخ إذا رجع لمسجلة
        dateInput.required = false;
      }
    });
  }

  renderExtraCoursesList();

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // جلب قيم الحقول الجديدة
    const titleAr = document.getElementById('extra-title-ar').value.trim();
    const titleEn = document.getElementById('extra-title-en').value.trim();
    const contentAr = document.getElementById('extra-content-ar').value.trim();
    const contentEn = document.getElementById('extra-content-en').value.trim();
    const url = document.getElementById('extra-url').value.trim();
    const hours = document.getElementById('extra-hours').value.trim();
    const certBadge = document.getElementById('extra-cert-badge').value; // with-cert | no-cert
    const typeBadge = document.getElementById('extra-type-badge').value; // recorded | online
    
    // إذا الدورة أونلاين نأخذ التاريخ وننسقه، وإذا مسجلة نتركه فارغاً
    let startDate = "";
    if (typeBadge === 'online' && dateInput.value) {
       const d = new Date(dateInput.value);
       startDate = d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    const newData = {
      titleAr, titleEn, contentAr, contentEn, url, hours, certBadge, typeBadge, startDate
    };

    let list = JSON.parse(localStorage.getItem('genez_extra_courses') || '[]');

    if (editingCourseId) {
      // وضع التعديل
      const index = list.findIndex(c => c.id === editingCourseId);
      if (index !== -1) {
        list[index] = { ...list[index], ...newData };
      }
      editingCourseId = null;
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.innerText = "إضافة الدورة للموقع 🚀";
      showToast("تم تعديل الدورة بنجاح ✏️", "success");
    } else {
      // وضع الإضافة
      newData.id = Date.now();
      list.push(newData);
      showToast("تمت إضافة الدورة بنجاح 🎓", "success");
    }

    localStorage.setItem('genez_extra_courses', JSON.stringify(list));
    form.reset();
    
    // إعادة قفل التاريخ بعد الإرسال لأنه يرجع (مسجلة) افتراضياً
    if (dateInput) {
        dateInput.disabled = true;
        dateInput.classList.add('opacity-50', 'cursor-not-allowed');
    }

    renderExtraCoursesList();
  });
}

function renderExtraCoursesList() {
  const container = document.getElementById('extra-courses-list');
  if (!container) return;
  const list = JSON.parse(localStorage.getItem('genez_extra_courses') || '[]');

  if (!list.length) {
    container.innerHTML = `<p class="text-muted text-center py-6 text-xs font-medium">لا توجد دورات مضافة.</p>`;
    return;
  }
  
  list.sort((a, b) => b.id - a.id);

  // مسميات الشارات المعروضة في لوحة الإدمن فقط
  const certLabels = { 'with-cert': '✅ شهادة', 'no-cert': '❌ بلا شهادة' };
  const typeLabels = { 'recorded': '📼 مسجلة', 'online': '💻 أونلاين' };

  container.innerHTML = list.map(item => `
    <div class="p-3.5 bg-surface-secondary border border-theme rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
      <div class="space-y-1.5 w-full">
        <div class="flex items-center gap-2 flex-wrap mb-1">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded border bg-surface border-theme">${certLabels[item.certBadge]}</span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded border bg-surface border-theme">${typeLabels[item.typeBadge]}</span>
         <span class="text-[10px] text-muted font-mono flex items-center gap-1">⏱️ ${item.hours} ساعات</span>
          ${item.startDate ? `<span class="text-[10px] text-muted font-mono bg-accent/10 text-accent px-1.5 rounded">📅 ${item.startDate}</span>` : ''}
        </div>
        <h4 class="font-bold text-sm text-content">${item.titleAr} <span class="text-[11px] text-muted font-normal">| ${item.titleEn}</span></h4>
      </div>
      
      <div class="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end border-t sm:border-none border-theme pt-2 sm:pt-0 mt-2 sm:mt-0">
        <button type="button" onclick="editExtraCourse(${item.id})" class="btn-outline text-blue-600 border-blue-200 hover:bg-blue-50 py-1 px-3 text-[11px] font-bold rounded">تعديل ✏️</button>
        <button type="button" onclick="deleteExtraCourse(${item.id})" class="btn-outline text-red-600 border-red-200 hover:bg-red-50 py-1 px-3 text-[11px] font-bold rounded">حذف 🗑️</button>
      </div>
    </div>
  `).join('');
}

// دالة التعديل
window.editExtraCourse = (id) => {
  const list = JSON.parse(localStorage.getItem('genez_extra_courses') || '[]');
  const course = list.find(c => c.id === id);
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
          // تحويل صيغة التاريخ المعروض (ar-EG) إلى yyyy-mm-dd ليتوافق مع input type="date" صعب قليلاً محلياً، سنتركه فارغاً ليقوم بإعادة إدخاله أو نقوم بعمل حقل نصي. 
          // لتجنب الأخطاء سنتركه يدوياً للمشرف أثناء التعديل
      } else {
          dateInput.disabled = true;
          dateInput.classList.add('opacity-50', 'cursor-not-allowed');
          dateInput.required = false;
      }
  }

  editingCourseId = id;
  const submitBtn = document.getElementById('extra-course-form')?.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.innerText = "حفظ التعديلات 💾";
  
  document.getElementById('extra-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.deleteExtraCourse = (id) => {
  if (!confirm("هل أنت متأكد من حذف هذه الدورة من قائمة التدريب؟")) return;
  const list = JSON.parse(localStorage.getItem('genez_extra_courses') || '[]');
  localStorage.setItem('genez_extra_courses', JSON.stringify(list.filter(c => c.id !== id)));
  
  if (editingCourseId === id) {
     editingCourseId = null;
     document.getElementById('extra-course-form')?.reset();
     const submitBtn = document.getElementById('extra-course-form')?.querySelector('button[type="submit"]');
     if (submitBtn) submitBtn.innerText = "إضافة الدورة للموقع 🚀";
  }

  renderExtraCoursesList();
  showToast("تم الحذف بنجاح", "info");
};