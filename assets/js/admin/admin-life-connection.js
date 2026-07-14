// assets/js/admin/admin-life-connection.js
// إدارة الربط مع الحياة: إنشاء المجلدات (عربي/إنجليزي)، التصنيفات، الرفع والمزامنة

import { fetchDriveAPI, showToast } from "./admin-core.js";

const activeLifeLocks = {};

export function initLifeConnectionManager() {
  renderLifeList();

  const lifeForm = document.getElementById('life-form');
  lifeForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // فحص القفل التزامني لمنع التكرار
    if (activeLifeLocks['new_life_topic']) {
      showToast("⏳ يتم الآن إنشاء الموضوع في السحابة، يرجى الانتظار...", "info");
      return;
    }

    const titleAr = document.getElementById('life-title-ar').value.trim();
    const titleEn = document.getElementById('life-title-en').value.trim();
    const contentAr = document.getElementById('life-content-ar').value.trim();
    const contentEn = document.getElementById('life-content-en').value.trim();
    const author = document.getElementById('life-author').value.trim() || "فريق Gene_Z";
    
    const imageInput = document.getElementById('life-image-input');
    const imageFile = imageInput.files[0];

    const fileInputAr = document.getElementById('life-file-ar');
    const fileAr = fileInputAr?.files[0];
    const fileInputEn = document.getElementById('life-file-en');
    const fileEn = fileInputEn?.files[0];

    const saveBtn = e.target.querySelector('button[type="submit"]');

    try {
      activeLifeLocks['new_life_topic'] = true;
      saveBtn.disabled = true;
      saveBtn.innerText = "⏳ جاري إنشاء المجلدات في Google Drive...";

      // 1. إنشاء المجلد الرئيسي للموضوع مع المجلدات الفرعية (ar, en)
      const folderRes = await fetchDriveAPI('life', 'create', {
        folderName: `${titleAr} - ${Date.now()}`
      });

      if (!folderRes || !folderRes.success) {
        showToast("❌ فشل إنشاء المجلدات السحابية للموضوع", "error");
        return;
      }

      let imageUrl = "";
      let imageId = "";
      const attachedFiles = [];

      // 2. رفع صورة الغلاف (إن وُجدت)
      if (imageFile) {
        if (imageFile.size > 12 * 1024 * 1024) {
          showToast("⚠️ حجم الصورة تجاوز 12MB! سيتم الحفظ بدون الصورة.", "error");
        } else {
          saveBtn.innerText = "⏳ جاري رفع صورة الغلاف...";
          const base64Image = await toBase64(imageFile);
          const imgRes = await fetchDriveAPI('life', 'upload', {
            targetFolderId: folderRes.mainFolderId,
            fileName: `LIFE_COVER_${category}_${Date.now()}_${imageFile.name}`,
            mimeType: imageFile.type,
            base64Data: base64Image
          });

          if (imgRes?.success) {
            imageUrl = imgRes.fileUrl; 
            imageId = imgRes.fileId;
          }
        }
      }

      // 3. رفع الملف العربي
      if (fileAr) {
        if (fileAr.size <= 12 * 1024 * 1024) {
          saveBtn.innerText = "⏳ جاري رفع الملف العربي...";
          const base64Ar = await toBase64(fileAr);
          const arRes = await fetchDriveAPI('life', 'upload', {
            targetFolderId: folderRes.subFolders['ar'].id,
            fileName: fileAr.name,
            mimeType: fileAr.type,
            base64Data: base64Ar
          });
          if (arRes?.success) {
            attachedFiles.push({
              id: arRes.fileId,
              name: arRes.fileName,
              url: arRes.fileUrl, 
              langKey: 'ar',
              contributor: author
            });
          }
        } else {
          showToast("⚠️ الملف العربي أكبر من 12MB، ارفعه يدوياً واضغط مزامنة 🔄", "info");
        }
      }

      // 4. رفع الملف الإنجليزي
      if (fileEn) {
        if (fileEn.size <= 12 * 1024 * 1024) {
          saveBtn.innerText = "⏳ جاري رفع الملف الإنجليزي...";
          const base64En = await toBase64(fileEn);
          const enRes = await fetchDriveAPI('life', 'upload', {
            targetFolderId: folderRes.subFolders['en'].id,
            fileName: fileEn.name,
            mimeType: fileEn.type,
            base64Data: base64En
          });
          if (enRes?.success) {
            attachedFiles.push({
              id: enRes.fileId,
              name: enRes.fileName,
              url: enRes.fileUrl, 
              langKey: 'en',
              contributor: author
            });
          }
        } else {
          showToast("⚠️ الملف الإنجليزي أكبر من 12MB، ارفعه يدوياً واضغط مزامنة 🔄", "info");
        }
      }

      // 5. حفظ الموضوع في الذاكرة / Firestore
      const lifeList = JSON.parse(localStorage.getItem('genez_life_connection') || '[]');
      lifeList.push({
        id: Date.now(),
        titleAr, titleEn, contentAr, contentEn, category, author,
        imageUrl, imageId,
        mainFolderId: folderRes.mainFolderId,
        subFolders: folderRes.subFolders,
        files: attachedFiles,
        date: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }),
        likes: 0
      });

      localStorage.setItem('genez_life_connection', JSON.stringify(lifeList));
      lifeForm.reset();
      renderLifeList();
      showToast("✅ تم نشر الموضوع وإنشاء مجلداته السحابية بنجاح", "success");

    } catch (err) {
      console.error("Life upload error:", err);
      showToast("❌ حدث خطأ أثناء نشر الموضوع", "error");
    } finally {
      activeLifeLocks['new_life_topic'] = false;
      saveBtn.disabled = false;
      saveBtn.innerText = "نشر الموضوع في الربط مع الحياة 🚀";
    }
  });
}

function renderLifeList() {
  const container = document.getElementById('life-list-container');
  if (!container) return;
  const lifeList = JSON.parse(localStorage.getItem('genez_life_connection') || '[]');

  if (!lifeList.length) {
    container.innerHTML = `<p class="text-muted text-center py-8 text-xs font-medium">لا توجد مواضيع مضافة في الربط مع الحياة بعد.</p>`;
    return;
  }

  lifeList.sort((a, b) => b.id - a.id);
  
  const catNames = { med: "🔴 طبي والصيدلة", agri: "🟢 زراعي وغذاء", env: "🔵 بيئي وصناعي", forensic: "🟡 جنائي وـDNA" };

  container.innerHTML = lifeList.map(item => {
    const filesCount = item.files ? item.files.length : 0;
    const isLocked = activeLifeLocks[item.id] === true;
    const uploadBtnText = isLocked ? "⏳ جاري الرفع..." : "➕ رفع ملف إضافي";

    const filesHTML = filesCount > 0 ? item.files.map(file => `
      <div class="p-2 bg-surface rounded border border-theme flex items-center justify-between text-[11px] gap-2">
        <div class="min-w-0 flex items-center gap-1.5">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${file.langKey === 'en' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}">${file.langKey === 'en' ? 'EN' : 'AR'}</span>
          <span class="font-semibold truncate text-content" title="${file.name}">${file.name}</span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <a href="${file.url}" target="_blank" class="text-blue-500 hover:underline font-bold text-[11px]">معاينة</a>
          <button type="button" onclick="deleteLifeFile(${item.id}, '${file.id}')" class="text-red-500 hover:bg-red-50 p-1 rounded" title="حذف الملف نهائياً">🗑️</button>
        </div>
      </div>
    `).join('') : '<p class="text-[11px] text-muted text-center py-2">لا توجد ملفات مرفوعة في هذا الموضوع.</p>';

    return `
      <div class="p-4 bg-surface-secondary rounded-xl border border-theme flex flex-col space-y-3 shadow-sm">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold px-2 py-0.5 bg-surface border border-theme rounded">${catNames[item.category] || "⚪ عام"}</span>
              <span class="text-[10px] bg-accent/10 text-accent font-bold px-2 py-0.5 rounded">✍️ ${item.author || 'Gene_Z'}</span>
              <span class="text-[10px] text-muted font-mono">${item.date}</span>
            </div>
            <h4 class="font-bold text-sm text-content">${item.titleAr} <span class="text-xs text-muted font-normal">| ${item.titleEn}</span></h4>
          </div>
          
          <div class="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
            ${item.imageUrl ? `<a href="${item.imageUrl}" target="_blank" class="btn-outline text-blue-600 border-blue-200 hover:bg-blue-50 py-1 px-2.5 text-[11px] rounded font-bold">الغلاف 🖼️</a>` : ''}
            <button type="button" onclick="syncLifeFiles(${item.id})" class="btn-outline text-green-600 border-green-200 hover:bg-green-50 py-1 px-2.5 text-[11px] rounded font-bold" title="جلب الملفات التي رُفعت يدوياً من Drive">🔄 مزامنة</button>
            <button type="button" onclick="deleteEntireLife(${item.id}, '${item.mainFolderId}')" class="btn-outline text-red-600 border-red-200 hover:bg-red-50 py-1 px-2.5 text-[11px] rounded font-bold" title="حذف الموضوع ومجلداته">🗑️ حذف الموضوع</button>
          </div>
        </div>

        <div class="pt-2 border-t border-theme flex flex-wrap items-center gap-2">
          <button type="button" onclick="toggleLifeUploadBox(${item.id})" class="btn-primary py-1 px-3 text-[11px] font-semibold rounded" ${isLocked ? 'disabled' : ''}>${uploadBtnText}</button>
          <span class="text-[11px] text-muted">إجمالي الملفات المرفقة: font-mono font-bold text-accent (${filesCount})</span>
        </div>

        <div id="life-upload-box-${item.id}" class="hidden p-3 bg-surface rounded-lg border border-theme space-y-2 text-[11px]">
          <div class="grid sm:grid-cols-2 gap-2">
            <select id="life-lang-select-${item.id}" class="form-input w-full p-1.5 rounded border border-theme bg-surface text-[11px]">
              <option value="ar">المجلد العربي (Arabic Files)</option>
              <option value="en">المجلد الإنجليزي (English Files)</option>
            </select>
            <input type="file" id="life-file-input-${item.id}" class="form-input w-full p-1 rounded border border-theme bg-surface text-[10px]" accept=".pdf,.doc,.docx,.png,.jpg,.zip" />
          </div>
          <button type="button" onclick="executeLifeFileUpload(${item.id})" class="btn-primary w-full py-1.5 text-[11px] font-bold">بدء الرفع السحابي للملف 🚀</button>
        </div>

        <details class="group border-t border-theme pt-2">
          <summary class="cursor-pointer font-semibold text-muted hover:text-content list-none flex justify-between items-center text-[11px]">
            <span>📁 عرض الملفات المرفوعة للموضوع (${filesCount})</span>
            <span class="group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div class="space-y-1.5 mt-2 max-h-48 overflow-y-auto pr-1">
            ${filesHTML}
          </div>
        </details>
      </div>
    `;
  }).join('');
}

// أزرار الواجهة والدوال المتاحة عبر كائن window
window.toggleLifeUploadBox = (id) => {
  document.getElementById(`life-upload-box-${id}`)?.classList.toggle('hidden');
};

window.executeLifeFileUpload = async (id) => {
  if (activeLifeLocks[id]) { showToast("⏳ يرجى الانتظار، جاري الرفع...", "info"); return; }
  const lifeList = JSON.parse(localStorage.getItem('genez_life_connection') || '[]');
  const item = lifeList.find(n => n.id === id);
  if (!item || !item.subFolders) return;

  const fileInput = document.getElementById(`life-file-input-${id}`);
  const file = fileInput?.files[0];
  if (!file) { showToast("⚠️ يرجى اختيار ملف للرفع", "error"); return; }
  if (file.size > 12 * 1024 * 1024 || file.type.includes("video/")) {
    showToast("⚠️ الفيديوهات والملفات الضخمة (>12MB) تُرفع من الدرايف مباشرة ثم اضغط مزامنة 🔄", "error");
    fileInput.value = ""; return;
  }

  activeLifeLocks[id] = true;
  renderLifeList();

  try {
    const langKey = document.getElementById(`life-lang-select-${id}`).value;
    const targetFolderId = item.subFolders[langKey].id;
    const base64Data = await toBase64(file);

    const uploadRes = await fetchDriveAPI('life', 'upload', {
      targetFolderId: targetFolderId,
      fileName: file.name,
      mimeType: file.type,
      base64Data: base64Data
    });

    if (uploadRes?.success) {
      if (!item.files) item.files = [];
      item.files.push({
        id: uploadRes.fileId,
        name: uploadRes.fileName,
        url: uploadRes.fileUrl, 
        langKey: langKey,
        contributor: item.author || "Gene_Z"
      });
      localStorage.setItem('genez_life_connection', JSON.stringify(lifeList));
      showToast("✅ تم رفع الملف بنجاح", "success");
    }
  } catch (err) {
    console.error(err);
    showToast("❌ فشل الرفع السحابي للملف", "error");
  } finally {
    activeLifeLocks[id] = false;
    renderLifeList();
  }
};

window.syncLifeFiles = async (id) => {
  const lifeList = JSON.parse(localStorage.getItem('genez_life_connection') || '[]');
  const item = lifeList.find(n => n.id === id);
  if (!item || !item.subFolders) return;

  showToast("🔄 جاري مزامنة المجلدات السحابية...", "info");
  const res = await fetchDriveAPI('life', 'syncFolder', { subFolders: item.subFolders });
  
  if (res?.success && res.syncedFiles) {
    item.files = res.syncedFiles;
    localStorage.setItem('genez_life_connection', JSON.stringify(lifeList));
    renderLifeList();
    showToast("✅ تمت المزامنة بنجاح!", "success");
  }
};

window.deleteEntireLife = async (id, mainFolderId) => {
  if (!confirm("⚠️ هل أنت متأكد من حذف هذا الموضوع نهائياً ونقل مجلداته السحابية إلى سلة المهملات؟")) return;
  
  if (mainFolderId && mainFolderId !== 'undefined') {
    await fetchDriveAPI('life', 'deleteFolder', { folderId: mainFolderId });
  }
  const lifeList = JSON.parse(localStorage.getItem('genez_life_connection') || '[]');
  localStorage.setItem('genez_life_connection', JSON.stringify(lifeList.filter(n => n.id !== id)));
  renderLifeList();
  showToast("🗑️ تم حذف الموضوع بنجاح", "info");
};

window.deleteLifeFile = async (topicId, fileId) => {
  if (!confirm("تأكيد حذف الملف ونقله لسلة مهملات السحابة؟")) return;
  const res = await fetchDriveAPI('life', 'deleteFile', { fileId: fileId });
  if (res?.success) {
    const lifeList = JSON.parse(localStorage.getItem('genez_life_connection') || '[]');
    const item = lifeList.find(n => n.id === topicId);
    if (item) {
      item.files = item.files.filter(f => f.id !== fileId);
      localStorage.setItem('genez_life_connection', JSON.stringify(lifeList));
      renderLifeList();
      showToast("🗑️ تم حذف الملف من السحابة", "info");
    }
  }
};

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
}