// assets/js/admin/admin-news.js
import { fetchDriveAPI, showToast } from "./admin-core.js";
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

const activeNewsLocks = {};
let editingNewsId = null; 

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

// دالة مساعدة لجلب كافة مقالات جينوميديا من السحابة
async function getCloudNewsList() {
  const querySnapshot = await getDocs(collection(db, "genez_genomedia"));
  const list = [];
  querySnapshot.forEach((docSnap) => {
    list.push({ id: docSnap.id, ...docSnap.data() });
  });
  return list.sort((a, b) => (b.id || 0) - (a.id || 0));
}

export function initNewsManager() {
  renderNewsList();

  const newsForm = document.getElementById('news-form');
  newsForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (activeNewsLocks['new_article']) {
      showToast("⏳ يرجى الانتظار، جاري معالجة الطلب...", "info");
      return;
    }

    const titleAr = document.getElementById('news-title-ar').value.trim();
    const titleEn = document.getElementById('news-title-en').value.trim();
    const contentAr = document.getElementById('news-content-ar').value.trim();
    const contentEn = document.getElementById('news-content-en').value.trim();
    const author = document.getElementById('news-author').value.trim() || "فريق Gene_Z";
    
    const imageInput = document.getElementById('news-image-input');
    const imageFile = imageInput.files[0];

    const fileInputAr = document.getElementById('news-file-ar');
    const fileAr = fileInputAr?.files[0];
    const fileInputEn = document.getElementById('news-file-en');
    const fileEn = fileInputEn?.files[0];

    const saveBtn = e.target.querySelector('button[type="submit"]');

    try {
      activeNewsLocks['new_article'] = true;
      saveBtn.disabled = true;

      if (editingNewsId) {
        saveBtn.innerText = "⏳ جاري حفظ التعديلات سحابياً...";
        const docRef = doc(db, "genez_genomedia", String(editingNewsId));
        const newsList = await getCloudNewsList();
        const currentArticle = newsList.find(n => String(n.id) === String(editingNewsId));
        if (!currentArticle) throw new Error("المقال غير موجود في السحابة");

        let updatedImageUrl = currentArticle.imageUrl || "";
        let updatedImageId = currentArticle.imageId || "";

        if (imageFile) {
          if (imageFile.size > 12 * 1024 * 1024) {
            showToast("⚠️ حجم الصورة تجاوز 12MB! سيتم الحفظ بدون تعديل الصورة.", "error");
          } else {
            saveBtn.innerText = "⏳ جاري تحديث الغلاف في Drive...";
            if (currentArticle.imageId) {
              await fetchDriveAPI('genomedia', 'deleteFile', { fileId: currentArticle.imageId });
            }
            const base64Image = await toBase64(imageFile);
            const imgRes = await fetchDriveAPI('genomedia', 'upload', {
              targetFolderId: currentArticle.mainFolderId,
              fileName: `COVER_${Date.now()}_${imageFile.name}`,
              mimeType: imageFile.type,
              base64Data: base64Image
            });
            if (imgRes?.success) {
              updatedImageUrl = imgRes.fileUrl;
              updatedImageId = imgRes.fileId;
            }
          }
        }

        await updateDoc(docRef, {
          titleAr, titleEn, contentAr, contentEn, author,
          imageUrl: updatedImageUrl,
          imageId: updatedImageId
        });
        
        await logAdminActivity("[قسم جينوميديا] تعديل مقال/خبر", titleAr);
        editingNewsId = null;
        showToast("✅ تم تعديل المقال سحابياً بنجاح", "success");
      } 
      else {
        saveBtn.innerText = "⏳ جاري إنشاء المجلدات في Google Drive...";
        const folderRes = await fetchDriveAPI('genomedia', 'create', {
          folderName: `${titleAr} - ${Date.now()}`
        });

        if (!folderRes || !folderRes.success) {
          showToast("❌ فشل إنشاء المجلدات السحابية للمقال", "error");
          return;
        }

        let imageUrl = "";
        let imageId = "";
        const attachedFiles = [];

        if (imageFile && imageFile.size <= 12 * 1024 * 1024) {
          saveBtn.innerText = "⏳ جاري رفع صورة الغلاف...";
          const base64Image = await toBase64(imageFile);
          const imgRes = await fetchDriveAPI('genomedia', 'upload', {
            targetFolderId: folderRes.mainFolderId,
            fileName: `COVER_${Date.now()}_${imageFile.name}`,
            mimeType: imageFile.type,
            base64Data: base64Image
          });

          if (imgRes?.success) {
            imageUrl = imgRes.fileUrl; 
            imageId = imgRes.fileId;
          }
        }

        if (fileAr && fileAr.size <= 100 * 1024 * 1024) {
          saveBtn.innerText = "⏳ جاري رفع الملف العربي...";
          const base64Ar = await toBase64(fileAr);
          const arRes = await fetchDriveAPI('genomedia', 'upload', {
            targetFolderId: folderRes.subFolders['ar'].id,
            fileName: fileAr.name,
            mimeType: fileAr.type,
            base64Data: base64Ar
          });
          if (arRes?.success) attachedFiles.push({ id: arRes.fileId, name: arRes.fileName, url: arRes.fileUrl, langKey: 'ar', contributor: author });
        }

        if (fileEn && fileEn.size <= 100 * 1024 * 1024) {
          saveBtn.innerText = "⏳ جاري رفع الملف الإنجليزي...";
          const base64En = await toBase64(fileEn);
          const enRes = await fetchDriveAPI('genomedia', 'upload', {
            targetFolderId: folderRes.subFolders['en'].id,
            fileName: fileEn.name,
            mimeType: fileEn.type,
            base64Data: base64En
          });
          if (enRes?.success) attachedFiles.push({ id: enRes.fileId, name: enRes.fileName, url: enRes.fileUrl, langKey: 'en', contributor: author });
        }

        const newId = Date.now();
        const newDocRef = doc(db, "genez_genomedia", String(newId));
        
        // ✅ إضافة حقول الإحصائيات الأولية للعدادات عند الإنشاء
        await setDoc(newDocRef, {
          id: newId,
          titleAr, titleEn, contentAr, contentEn, author,
          imageUrl, imageId,
          mainFolderId: folderRes.mainFolderId,
          subFolders: folderRes.subFolders,
          files: attachedFiles,
          date: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }),
          views: 0,
          likes: 0,
          shares: 0
        });

        await logAdminActivity("[قسم جينوميديا] إضافة مقال/خبر جديد", titleAr);
        showToast("✅ تم نشر المقال وإنشاء مجلداته السحابية بنجاح", "success");
      }

      newsForm.reset();
      await renderNewsList();

    } catch (err) {
      console.error("News process error:", err);
      showToast("❌ حدث خطأ أثناء المعالجة السحابية", "error");
    } finally {
      activeNewsLocks['new_article'] = false;
      saveBtn.disabled = false;
      saveBtn.innerText = "نشر المقال في جينوميديا 🚀";
      
      document.getElementById('news-file-ar')?.parentElement.classList.remove('hidden');
      document.getElementById('news-file-en')?.parentElement.classList.remove('hidden');
    }
  });
}

async function renderNewsList() {
  const container = document.getElementById('genomedia-list');
  if (!container) return;
  
  container.innerHTML = `<p class="text-muted text-center py-8 text-xs font-medium">⏳ جاري جلب المقالات من Cloud Firestore...</p>`;
  
  try {
    const newsList = await getCloudNewsList();

    if (!newsList.length) {
      container.innerHTML = `<p class="text-muted text-center py-8 text-xs font-medium">لا توجد مقالات منشورة في جينوميديا بعد.</p>`;
      return;
    }

    container.innerHTML = newsList.map(item => {
      const filesCount = item.files ? item.files.length : 0;
      const isLocked = activeNewsLocks[item.id] === true;
      const uploadBtnText = isLocked ? "⏳ جاري الرفع..." : "➕ رفع ملف إضافي";

      const filesHTML = filesCount > 0 ? item.files.map(file => `
        <div class="p-2 bg-surface rounded border border-theme flex items-center justify-between text-[11px] gap-2">
          <div class="min-w-0 flex items-center gap-1.5 flex-1">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${file.langKey === 'en' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'} shrink-0">${file.langKey === 'en' ? 'EN' : 'AR'}</span>
            <span class="font-semibold truncate text-content block" title="${file.name}">${file.name}</span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <a href="${file.url}" target="_blank" class="text-blue-500 hover:underline font-bold text-[11px]">معاينة</a>
            <button type="button" onclick="deleteNewsFile(${item.id}, '${file.id}')" class="text-red-500 hover:bg-red-50 p-1 rounded" title="حذف الملف نهائياً">🗑️</button>
          </div>
        </div>
      `).join('') : '<p class="text-[11px] text-muted text-center py-2">لا توجد ملفات مرفوعة في هذا المقال.</p>';

      return `
        <div class="p-4 bg-surface-secondary rounded-xl border border-theme flex flex-col space-y-3 shadow-sm">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-[10px] bg-accent/10 text-accent font-bold px-2 py-0.5 rounded">✍️ ${item.author || 'Gene_Z'}</span>
                <span class="text-[10px] text-muted font-mono">${item.date}</span>
              </div>
              <h4 class="font-bold text-sm text-content">${item.titleAr} <span class="text-xs text-muted font-normal">| ${item.titleEn}</span></h4>
            </div>
            
            <div class="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
              <button type="button" onclick="editNewsItem(${item.id})" class="btn-outline text-blue-600 border-blue-200 hover:bg-blue-50 py-1 px-2.5 text-[11px] rounded font-bold">تعديل ✏️</button>
              <button type="button" onclick="syncNewsFiles(${item.id})" class="btn-outline text-green-600 border-green-200 hover:bg-green-50 py-1 px-2.5 text-[11px] rounded font-bold" title="جلب الملفات من Drive">🔄 مزامنة</button>
              <button type="button" onclick="deleteEntireNews(${item.id}, '${item.mainFolderId}')" class="btn-outline text-red-600 border-red-200 hover:bg-red-50 py-1 px-2.5 text-[11px] rounded font-bold">🗑️ حذف</button>
            </div>
          </div>

          <!-- ✅ إضافة شريط عدّادات In-Card Stats اللحظية على البطاقة -->
          <div class="flex items-center gap-4 text-[11px] font-mono bg-surface px-3 py-1.5 rounded-lg border border-theme w-fit shadow-inner">
            <span title="عدد المشاهدات" class="flex items-center gap-1 text-blue-500 font-bold">
              👁️ ${item.views || 0}
            </span>
            <span class="text-theme">|</span>
            <span title="عدد الإعجابات" class="flex items-center gap-1 text-red-500 font-bold">
              ❤️ ${item.likes || 0}
            </span>
            <span class="text-theme">|</span>
            <span title="عدد المشاركات" class="flex items-center gap-1 text-yellow-600 font-bold">
              🔗 ${item.shares || 0}
            </span>
          </div>

          <div class="pt-2 border-t border-theme flex flex-wrap items-center gap-2">
            <button type="button" onclick="toggleNewsUploadBox(${item.id})" class="btn-primary py-1 px-3 text-[11px] font-semibold rounded" ${isLocked ? 'disabled' : ''}>${uploadBtnText}</button>
            <span class="text-[11px] text-muted">إجمالي الملفات: <span class="font-mono font-bold text-accent">${filesCount}</span></span>
          </div>

          <div id="news-upload-box-${item.id}" class="hidden p-3 bg-surface rounded-lg border border-theme space-y-2 text-[11px]">
            <div class="grid sm:grid-cols-2 gap-2">
              <select id="news-lang-select-${item.id}" class="form-input w-full p-1.5 rounded border border-theme bg-surface text-[11px]">
                <option value="ar">المجلد العربي (Arabic Files)</option>
                <option value="en">المجلد الإنجليزي (English Files)</option>
              </select>
              <input type="file" id="news-file-input-${item.id}" class="form-input w-full p-1 rounded border border-theme bg-surface text-[10px]" accept=".pdf,.doc,.docx,.png,.jpg,.zip" />
            </div>
            <button type="button" onclick="executeNewsFileUpload(${item.id})" class="btn-primary w-full py-1.5 text-[11px] font-bold">بدء الرفع السحابي للملف 🚀</button>
          </div>

          <details class="group border-t border-theme pt-2">
            <summary class="cursor-pointer font-semibold text-muted hover:text-content list-none flex justify-between items-center text-[11px]">
              <span>📁 عرض الملفات المرفوعة للمقال (${filesCount})</span>
              <span class="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div class="space-y-1.5 mt-2 max-h-48 overflow-y-auto pr-1">
              ${filesHTML}
            </div>
          </details>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error("Error rendering news list:", err);
    container.innerHTML = `<p class="text-red-500 text-center py-8 text-xs font-medium">❌ حدث خطأ في جلب البيانات من السحابة.</p>`;
  }
}

window.editNewsItem = async (id) => {
  const newsList = await getCloudNewsList();
  const article = newsList.find(n => String(n.id) === String(id));
  if (!article) return;

  document.getElementById('news-title-ar').value = article.titleAr || "";
  document.getElementById('news-title-en').value = article.titleEn || "";
  document.getElementById('news-content-ar').value = article.contentAr || "";
  document.getElementById('news-content-en').value = article.contentEn || "";
  document.getElementById('news-author').value = article.author || "";

  document.getElementById('news-file-ar')?.parentElement.classList.add('hidden');
  document.getElementById('news-file-en')?.parentElement.classList.add('hidden');

  editingNewsId = id;
  const submitBtn = document.getElementById('news-form')?.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.innerText = "حفظ التعديلات 💾";
  
  document.getElementById('genomedia-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.toggleNewsUploadBox = (id) => {
  document.getElementById(`news-upload-box-${id}`)?.classList.toggle('hidden');
};

window.executeNewsFileUpload = async (id) => {
  if (activeNewsLocks[id]) { showToast("⏳ يرجى الانتظار...", "info"); return; }
  const newsList = await getCloudNewsList();
  const item = newsList.find(n => String(n.id) === String(id));
  if (!item || !item.subFolders) return;

  const fileInput = document.getElementById(`news-file-input-${id}`);
  const file = fileInput?.files[0];
  if (!file) { showToast("⚠️ يرجى اختيار ملف للرفع", "error"); return; }
  
  activeNewsLocks[id] = true;
  await renderNewsList();

  try {
    const langKey = document.getElementById(`news-lang-select-${id}`).value;
    const targetFolderId = item.subFolders[langKey].id;
    const base64Data = await toBase64(file);

    const uploadRes = await fetchDriveAPI('genomedia', 'upload', {
      targetFolderId: targetFolderId,
      fileName: file.name,
      mimeType: file.type,
      base64Data: base64Data
    });

    if (uploadRes?.success) {
      const updatedFiles = item.files || [];
      updatedFiles.push({
        id: uploadRes.fileId,
        name: uploadRes.fileName,
        url: uploadRes.fileUrl, 
        langKey: langKey,
        contributor: item.author || "Gene_Z"
      });
      
      const docRef = doc(db, "genez_genomedia", String(id));
      await updateDoc(docRef, { files: updatedFiles });
      
      await logAdminActivity("[قسم جينوميديا] رفع ملف جديد", `${item.titleAr} -> ${file.name}`);
      showToast("✅ تم رفع الملف وحفظه سحابياً بنجاح", "success");
    }
  } catch (err) {
    showToast("❌ فشل الرفع", "error");
  } finally {
    activeNewsLocks[id] = false;
    await renderNewsList();
  }
};

window.syncNewsFiles = async (id) => {
  const newsList = await getCloudNewsList();
  const item = newsList.find(n => String(n.id) === String(id));
  if (!item || !item.subFolders) return;

  showToast("🔄 جاري مزامنة المجلدات مع Google Drive...", "info");
  const res = await fetchDriveAPI('genomedia', 'syncFolder', { subFolders: item.subFolders });
  if (res?.success && res.syncedFiles) {
    const docRef = doc(db, "genez_genomedia", String(id));
    await updateDoc(docRef, { files: res.syncedFiles });
    
    await logAdminActivity("[قسم جينوميديا] مزامنة المجلدات", item.titleAr);
    await renderNewsList();
    showToast("✅ تمت المزامنة بنجاح وحفظها في Firestore!", "success");
  }
};

window.deleteEntireNews = async (id, mainFolderId) => {
  if (!confirm("⚠️ تأكيد حذف المقال ونقله لسلة المهملات في Drive وحذفه من السحابة؟")) return;
  const newsList = await getCloudNewsList();
  const item = newsList.find(n => String(n.id) === String(id));

  if (mainFolderId && mainFolderId !== 'undefined') {
    await fetchDriveAPI('genomedia', 'deleteFolder', { folderId: mainFolderId });
  }
  
  if (item && window.deductStatsOnDelete) {
    await window.deductStatsOnDelete(item);
  }
  
  await deleteDoc(doc(db, "genez_genomedia", String(id)));
  
  if (item) await logAdminActivity("[قسم جينوميديا] حذف مقال/خبر", item.titleAr || "");
  
  if(editingNewsId === id) {
      editingNewsId = null;
      document.getElementById('news-form')?.reset();
      const submitBtn = document.getElementById('news-form')?.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.innerText = "نشر المقال 🚀";
  }
  await renderNewsList();
  showToast("🗑️ تم حذف المقال بنجاح", "success");
};

window.deleteNewsFile = async (newsId, fileId) => {
  if (!confirm("تأكيد حذف الملف من السحابة و Google Drive؟")) return;
  const res = await fetchDriveAPI('genomedia', 'deleteFile', { fileId: fileId });
  if (res?.success) {
    const newsList = await getCloudNewsList();
    const item = newsList.find(n => String(n.id) === String(newsId));
    if (item) {
      const updatedFiles = item.files.filter(f => f.id !== fileId);
      await updateDoc(doc(db, "genez_genomedia", String(newsId)), { files: updatedFiles });
      
      await logAdminActivity("[قسم جينوميديا] حذف ملف", `${item.titleAr} -> تم الحذف`);
      await renderNewsList();
      showToast("🗑️ تم حذف الملف بنجاح", "success");
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