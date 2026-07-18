/**
 * Gene_Z Public Updates & Announcements Logic (Student View - Cloud Firestore Integrated)
 * متوافق بالكامل مع Firestore اللحظي مع الاحتفاظ بالفلترة الزمنية للجدولة وتتبع المشاهدات والنقرات الحية
 */
import { db } from "./firebase-init.js";
import { 
  collection, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
// ✅ استيراد محرك التتبع الإحصائي اللحظي
import { trackEvent } from "./admin/admin-analytics.js";

let cloudUpdates = []; // تخزين التنبيهات القادمة من السحابة برمجياً

// 💡 دالة ذكية لاكتشاف الروابط داخل النص وتحويلها إلى روابط تفاعلية تسجل النقرات (clicks)
function linkify(text, updateId) {
    if (!text) return "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
        // ✅ عند النقر على الرابط يتم إرسال نبضة تفاعل (clicks) لمحرك الإحصائيات قبل الفتح
        return `<a href="${url}" target="_blank" onclick="trackEvent('genez_updates', '${updateId}', 'clicks'); event.stopPropagation();" class="text-blue-500 hover:text-blue-700 underline font-bold transition-colors" dir="ltr">${url}</a>`;
    });
}

/**
 * تهيئة الاستماع اللحظي من Cloud Firestore
 */
function initCloudUpdatesListener() {
    const updatesRef = collection(db, "genez_updates");
    
    onSnapshot(updatesRef, (snapshot) => {
        cloudUpdates = [];
        snapshot.forEach((docSnap) => {
            cloudUpdates.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderPublicUpdates();
    }, (error) => {
        console.error("❌ خطأ في جلب التنبيهات والإعلانات من السحابة:", error);
    });
}

function renderPublicUpdates() {
    const container = document.getElementById('public-updates-list');
    if (!container) return;

    const currentLang = document.documentElement.getAttribute("lang") === "en" ? "en" : "ar";
    const now = Date.now();
    
    const activeUpdates = cloudUpdates.filter(up => (up.scheduledTimestamp || 0) <= now);

    if (activeUpdates.length === 0) {
        container.innerHTML = `
          <div class="card p-12 text-center border-dashed border-2 border-theme rounded-2xl bg-surface">
            <p class="text-muted font-medium text-lg">${currentLang === 'en' ? 'No new announcements at this time.' : 'لا توجد إعلانات أو تنبيهات جديدة في الوقت الحالي.'}</p>
          </div>`;
        return;
    }

    activeUpdates.sort((a, b) => (b.scheduledTimestamp || 0) - (a.scheduledTimestamp || 0));

    const badgesAr = { exams: '🔴 اختبارات', grades: '🟢 علامات', events: '🟡 فعاليات', general: '🔵 إعلان عام' };
    const badgesEn = { exams: '🔴 Exams', grades: '🟢 Grades', events: '🟡 Events', general: '🔵 General' };

    container.innerHTML = activeUpdates.map(up => {
        const title = currentLang === 'en' ? (up.titleEn || up.titleAr) : (up.titleAr || up.titleEn);
        let content = currentLang === 'en' ? (up.contentEn || up.contentAr) : (up.contentAr || up.contentEn);
        const badgeLabel = currentLang === 'en' ? (badgesEn[up.tag] || badgesEn.general) : (badgesAr[up.tag] || badgesAr.general);

        // 💡 تمرير نص التفاصيل ورقم الإعلان على دالة اكتشاف الروابط وتتبع التفاعل
        content = linkify(content, up.id);

        return `
        <div class="update-card card block p-6 rounded-2xl border border-theme bg-surface-secondary">
          <div class="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="text-[10px] font-bold px-2.5 py-1 bg-surface border border-theme rounded shadow-sm">${badgeLabel}</span>
              </div>
              <h2 class="text-xl font-bold text-accent leading-snug">${title}</h2>
            </div>
            <div class="flex items-center gap-2 shrink-0 bg-surface px-3 py-1.5 rounded-full border border-theme shadow-sm mt-2 sm:mt-0">
               <!-- ✅ عرض عداد المشاهدات للطلاب بجانب التاريخ -->
               <span class="text-theme">|</span>
               <span class="text-muted text-sm">📅</span>
               <span class="text-xs font-semibold text-content" title="${currentLang === 'en' ? 'Publish Date' : 'تاريخ النشر'}">${up.date || ''}</span>
            </div>
          </div>
          <p class="text-muted text-sm sm:text-base leading-relaxed whitespace-pre-line border-t border-theme pt-4" style="word-break: break-word;">${content}</p>
        </div>
        `;
    }).join('');

    // ✅ تسجيل حدث مشاهدة (views) لمرة واحدة فقط لكل إعلان ظاهر على الشاشة
    if (!window.hasTrackedUpdatesViews) {
      activeUpdates.forEach(up => {
        trackEvent("genez_updates", String(up.id), "views");
      });
      window.hasTrackedUpdatesViews = true;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initCloudUpdatesListener();
    
    window.addEventListener("genez:lang-changed", () => {
        renderPublicUpdates();
    });
});