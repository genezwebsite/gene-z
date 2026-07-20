// assets/js/admin/admin-updates.js
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

let editingUpdateId = null;
let isProcessing = false; 

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

// دالة مساعدة لجلب كافة الإعلانات والتنبيهات من السحابة
async function getCloudUpdatesList() {
  const querySnapshot = await getDocs(collection(db, "genez_updates"));
  const list = [];
  querySnapshot.forEach((docSnap) => {
    list.push({ id: docSnap.id, ...docSnap.data() });
  });
  return list.sort((a, b) => (b.scheduledTimestamp || 0) - (a.scheduledTimestamp || 0));
}

export function initUpdatesManager() {
  const updateForm = document.getElementById('update-form');
  const submitBtn = updateForm?.querySelector('button[type="submit"]');
  
  const scheduleDateInput = document.getElementById('update-schedule-date');
  if (scheduleDateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    scheduleDateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  renderUpdatesList();

  updateForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isProcessing) {
      showToast("⏳ يتم الآن معالجة الطلب، يرجى الانتظار...", "info");
      return;
    }
    
    const scheduledDateVal = document.getElementById('update-schedule-date')?.value;
    let publishDate = new Date();
    
    if (scheduledDateVal) {
      const selectedDate = new Date(scheduledDateVal);
      const today = new Date();
      // إذا كان التاريخ المختار هو اليوم، نستخدم الوقت الحالي بالدقة (ساعات ودقائق)
      if (selectedDate.toDateString() === today.toDateString()) {
         publishDate = today;
      } else {
         // إذا كان يوماً آخر، نستخدم منتصف ليل ذلك اليوم
         publishDate = selectedDate;
      }
    }

    const formattedDate = publishDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });

    const newData = {
      titleAr: document.getElementById('update-title').value.trim(), 
      titleEn: document.getElementById('update-title-en').value.trim(), 
      contentAr: document.getElementById('update-content').value.trim(), 
      contentEn: document.getElementById('update-content-en').value.trim(), 
      tag: document.getElementById('update-tag').value, 
      date: formattedDate,
      scheduledTimestamp: publishDate.getTime()
    };

    try {
      isProcessing = true;
      if (submitBtn) submitBtn.disabled = true;

      if (editingUpdateId) {
        if (submitBtn) submitBtn.innerText = "⏳ جاري حفظ التعديلات سحابياً...";
        const docRef = doc(db, "genez_updates", String(editingUpdateId));
        await updateDoc(docRef, newData);
        
        await logAdminActivity("[قسم الإعلانات] تعديل إعلان", newData.titleAr);
        
        editingUpdateId = null;
        if (submitBtn) submitBtn.innerText = "نشر / جدولة الإعلان 🔔";
        showToast("تم تعديل الإعلان سحابياً بنجاح ✏️", "success");
        
      } else {
        if (submitBtn) submitBtn.innerText = "⏳ جاري نشر/جدولة الإعلان...";
        const newId = Date.now();
        newData.id = newId;
        newData.views = 0;   // ✅ تهيئة مشاهدات الإعلان
        newData.clicks = 0;  // ✅ تهيئة نقرات التفاعل على الروابط
        const newDocRef = doc(db, "genez_updates", String(newId));
        
        await setDoc(newDocRef, newData);
        
        await logAdminActivity("[قسم الإعلانات] نشر إعلان جديد", newData.titleAr);
        
        showToast("تم جدولة/نشر الإعلان سحابياً بنجاح 🔔", "success");
      }
      
      updateForm.reset(); 
      
      if (scheduleDateInput) {
         const today = new Date();
         scheduleDateInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      }

      await renderUpdatesList(); 
    } catch (err) {
      console.error("Updates process error:", err);
      showToast("❌ حدث خطأ أثناء المعالجة السحابية", "error");
    } finally {
      isProcessing = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        if (!editingUpdateId) submitBtn.innerText = "نشر / جدولة الإعلان 🔔";
      }
    }
  });
}

async function renderUpdatesList() {
  const updatesList = document.getElementById('updates-list');
  if (!updatesList) return;
  
  updatesList.innerHTML = `<p class="text-muted text-center py-4 text-xs">⏳ جاري جلب الإعلانات والتنبيهات من Cloud Firestore...</p>`;
  
  try {
    const updates = await getCloudUpdatesList();
    
    if (!updates.length) { 
      updatesList.innerHTML = `<p class="text-muted text-center py-4 text-xs">لا توجد إعلانات منشورة بعد.</p>`; 
      return; 
    }
    
    const now = Date.now();

    updatesList.innerHTML = updates.map(up => {
      const badges = { exams: '🔴 اختبارات', grades: '🟢 علامات', events: '🟡 أنشطة', general: '🔵 عام' };
      const isScheduledForFuture = (up.scheduledTimestamp || 0) > now;
      const statusBadge = isScheduledForFuture 
        ? `<span class="bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded text-[10px] font-bold">⏳ مجدول</span>` 
        : `<span class="bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded text-[10px] font-bold">✅ نشط</span>`;

      return `<div class="p-3.5 rounded-lg bg-surface-secondary border ${isScheduledForFuture ? 'border-dashed border-theme opacity-80' : 'border-theme'} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            ${statusBadge}
            <span class="bg-surface px-2 py-0.5 rounded text-[11px] font-bold border border-theme">${badges[up.tag] || '🔵 عام'}</span>
            <span class="text-[11px] text-muted font-mono" title="تاريخ النشر">📅 ${up.date || ''}</span>
          </div>
          <h4 class="font-bold text-xs">${up.titleAr || ''} <span class="text-[11px] text-muted font-normal">| ${up.titleEn || ''}</span></h4>
          
          <!-- ✅ شريط عدادات In-Card Stats (المشاهدات | النقرات على الروابط في الإعلان) -->
          <div class="flex items-center gap-3 text-[10px] font-mono bg-surface px-2 py-1 rounded border border-theme w-fit mt-1 shadow-inner">
            <span title="عدد المشاهدات والوصول" class="flex items-center gap-1 text-blue-500 font-bold">
              👁️ ${up.views || 0}
            </span>
            <span class="text-theme">|</span>
            <span title="النقرات على الروابط المرفقة في الإعلان" class="flex items-center gap-1 text-yellow-600 font-bold">
              🎯 ${up.clicks || 0}
            </span>
          </div>
        </div>
        
        <div class="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
          <button type="button" class="btn-outline text-blue-600 border-blue-200 hover:bg-blue-50 text-[11px] py-1 px-2.5 rounded font-bold" onclick="editUpdate(${up.id})">تعديل ✏️</button>
          <button type="button" class="btn-outline text-red-600 border-red-200 hover:bg-red-50 text-[11px] py-1 px-2.5 rounded font-bold" onclick="deleteUpdate(${up.id})">حذف 🗑️</button>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    console.error("Error rendering updates list:", err);
    updatesList.innerHTML = `<p class="text-red-500 text-center py-4 text-xs font-medium">❌ حدث خطأ في جلب البيانات من السحابة.</p>`;
  }
}

window.editUpdate = async (id) => {
  const updates = await getCloudUpdatesList();
  const updateToEdit = updates.find(up => String(up.id) === String(id));
  if (!updateToEdit) return;

  document.getElementById('update-title').value = updateToEdit.titleAr || "";
  document.getElementById('update-title-en').value = updateToEdit.titleEn || "";
  document.getElementById('update-content').value = updateToEdit.contentAr || "";
  document.getElementById('update-content-en').value = updateToEdit.contentEn || "";
  document.getElementById('update-tag').value = updateToEdit.tag || "general";
  
  const scheduleDateInput = document.getElementById('update-schedule-date');
  if (scheduleDateInput && updateToEdit.scheduledTimestamp) {
     const d = new Date(updateToEdit.scheduledTimestamp);
     scheduleDateInput.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  editingUpdateId = id;
  const submitBtn = document.getElementById('update-form')?.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.innerText = "حفظ التعديلات 💾";
  
  document.getElementById('updates-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.deleteUpdate = async (id) => {
  if (!confirm("هل أنت متأكد من حذف هذا الإعلان من السحابة؟")) return;
  try {
    const updates = await getCloudUpdatesList();
    const updateToDelete = updates.find(up => String(up.id) === String(id));
    
    await deleteDoc(doc(db, "genez_updates", String(id)));
    
    if (updateToDelete) await logAdminActivity("[قسم الإعلانات] حذف إعلان", updateToDelete.titleAr || "");
    
    if (editingUpdateId === id) {
       editingUpdateId = null;
       document.getElementById('update-form')?.reset();
       const submitBtn = document.getElementById('update-form')?.querySelector('button[type="submit"]');
       if (submitBtn) submitBtn.innerText = "نشر / جدولة الإعلان 🔔";
    }

    await renderUpdatesList(); 
    showToast("تم حذف الإعلان سحابياً بنجاح 🗑️", "info");
  } catch (err) {
    console.error("Error deleting update:", err);
    showToast("❌ حدث خطأ أثناء حذف الإعلان", "error");
  }
};