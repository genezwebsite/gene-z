// assets/js/admin/admin-updates.js
import { showToast } from "./admin-core.js";

// متغير لتتبع ما إذا كنا في وضع التعديل (يحمل ID الإعلان) أم الإضافة (null)
let editingUpdateId = null;

export function initUpdatesManager() {
  const updateForm = document.getElementById('update-form');
  const submitBtn = updateForm?.querySelector('button[type="submit"]');
  
  // تعيين تاريخ اليوم كقيمة افتراضية لحقل الجدولة عند فتح الصفحة
  const scheduleDateInput = document.getElementById('update-schedule-date');
  if (scheduleDateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    scheduleDateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  renderUpdatesList();

  updateForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const scheduledDateVal = document.getElementById('update-schedule-date')?.value;
    const publishDate = scheduledDateVal ? new Date(scheduledDateVal) : new Date();
    const formattedDate = publishDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });

    let updates = JSON.parse(localStorage.getItem('genez_updates') || '[]');
    
    // البيانات الجديدة أو المعدلة
    const newData = {
      titleAr: document.getElementById('update-title').value.trim(), 
      titleEn: document.getElementById('update-title-en').value.trim(), 
      contentAr: document.getElementById('update-content').value.trim(), 
      contentEn: document.getElementById('update-content-en').value.trim(), 
      tag: document.getElementById('update-tag').value, 
      date: formattedDate,
      scheduledTimestamp: publishDate.getTime()
    };

    if (editingUpdateId) {
      // 💡 نحن في وضع التعديل: نبحث عن الإعلان ونحدث بياناته
      const index = updates.findIndex(up => up.id === editingUpdateId);
      if (index !== -1) {
        updates[index] = { ...updates[index], ...newData }; // دمج البيانات الجديدة مع الـ ID القديم
      }
      
      // إنهاء وضع التعديل وإرجاع الزر لشكله الطبيعي
      editingUpdateId = null;
      if (submitBtn) submitBtn.innerText = "نشر / جدولة الإعلان 🔔";
      showToast("تم تعديل الإعلان بنجاح ✏️", "success");
      
    } else {
      // 💡 نحن في وضع الإضافة: ننشئ إعلاناً جديداً
      newData.id = Date.now();
      updates.push(newData);
      showToast("تم جدولة/نشر الإعلان بنجاح 🔔", "success");
    }
    
    localStorage.setItem('genez_updates', JSON.stringify(updates));
    updateForm.reset(); 
    
    // إعادة تعيين تاريخ اليوم بعد الإرسال
    if (scheduleDateInput) {
       const today = new Date();
       scheduleDateInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    renderUpdatesList(); 
  });
}

function renderUpdatesList() {
  const updatesList = document.getElementById('updates-list');
  if (!updatesList) return;
  const updates = JSON.parse(localStorage.getItem('genez_updates') || '[]');
  
  if (!updates.length) { 
    updatesList.innerHTML = `<p class="text-muted text-center py-4 text-xs">لا توجد إعلانات منشورة بعد.</p>`; 
    return; 
  }
  
  updates.sort((a, b) => b.scheduledTimestamp - a.scheduledTimestamp);
  const now = Date.now();

  updatesList.innerHTML = updates.map(up => {
    const badges = { exams: '🔴 اختبارات', grades: '🟢 علامات', events: '🟡 أنشطة', general: '🔵 عام' };
    const isScheduledForFuture = up.scheduledTimestamp > now;
    const statusBadge = isScheduledForFuture 
      ? `<span class="bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded text-[10px] font-bold">⏳ مجدول</span>` 
      : `<span class="bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded text-[10px] font-bold">✅ نشط</span>`;

    return `<div class="p-3.5 rounded-lg bg-surface-secondary border ${isScheduledForFuture ? 'border-dashed border-theme opacity-80' : 'border-theme'} flex justify-between items-center gap-3">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          ${statusBadge}
          <span class="bg-surface px-2 py-0.5 rounded text-[11px] font-bold border border-theme">${badges[up.tag] || '🔵 عام'}</span>
          <span class="text-[11px] text-muted font-mono" title="تاريخ النشر">📅 ${up.date}</span>
        </div>
        <h4 class="font-bold text-xs">${up.titleAr} <span class="text-[11px] text-muted font-normal">| ${up.titleEn}</span></h4>
      </div>
      
      <!-- أزرار التحكم (تعديل وحذف) -->
      <div class="flex items-center gap-1.5 shrink-0">
        <button type="button" class="btn-outline text-blue-600 border-blue-200 hover:bg-blue-50 text-[11px] py-1 px-2.5 rounded font-bold" onclick="editUpdate(${up.id})">تعديل ✏️</button>
        <button type="button" class="btn-outline text-red-600 border-red-200 hover:bg-red-50 text-[11px] py-1 px-2.5 rounded font-bold" onclick="deleteUpdate(${up.id})">حذف 🗑️</button>
      </div>
    </div>`;
  }).join('');
}

// دالة سحب بيانات الإعلان ووضعها في الفورم للتعديل
window.editUpdate = (id) => {
  const updates = JSON.parse(localStorage.getItem('genez_updates') || '[]');
  const updateToEdit = updates.find(up => up.id === id);
  if (!updateToEdit) return;

  // تعبئة الحقول بالبيانات القديمة
  document.getElementById('update-title').value = updateToEdit.titleAr || "";
  document.getElementById('update-title-en').value = updateToEdit.titleEn || "";
  document.getElementById('update-content').value = updateToEdit.contentAr || "";
  document.getElementById('update-content-en').value = updateToEdit.contentEn || "";
  document.getElementById('update-tag').value = updateToEdit.tag || "general";
  
  // ضبط تاريخ الجدولة
  const scheduleDateInput = document.getElementById('update-schedule-date');
  if (scheduleDateInput && updateToEdit.scheduledTimestamp) {
     const d = new Date(updateToEdit.scheduledTimestamp);
     scheduleDateInput.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // تفعيل وضع التعديل وتغيير اسم الزر
  editingUpdateId = id;
  const submitBtn = document.getElementById('update-form')?.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.innerText = "حفظ التعديلات 💾";
  
  // التمرير التلقائي لأعلى الصفحة للبدء بالتعديل
  document.getElementById('updates-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.deleteUpdate = (id) => {
  if (!confirm("هل أنت متأكد من حذف هذا الإعلان؟")) return;
  const updates = JSON.parse(localStorage.getItem('genez_updates') || '[]');
  localStorage.setItem('genez_updates', JSON.stringify(updates.filter(up => up.id !== id))); 
  
  // إذا كنا نحذف الإعلان الذي نقوم بتعديله حالياً، نلغي وضع التعديل
  if (editingUpdateId === id) {
     editingUpdateId = null;
     document.getElementById('update-form')?.reset();
     const submitBtn = document.getElementById('update-form')?.querySelector('button[type="submit"]');
     if (submitBtn) submitBtn.innerText = "نشر / جدولة الإعلان 🔔";
  }

  renderUpdatesList(); 
  showToast("تم حذف الإعلان", "info");
};