// assets/js/updates.js

document.addEventListener("DOMContentLoaded", () => {
    renderPublicUpdates();
    
    // التحديث الفوري عند تغيير لغة الموقع
    window.addEventListener("genez:lang-changed", () => {
        renderPublicUpdates();
    });
});

// 💡 دالة ذكية لاكتشاف الروابط داخل النص وتحويلها إلى روابط قابلة للضغط
function linkify(text) {
    if (!text) return "";
    // يبحث عن أي نص يبدأ بـ http أو https وينتهي بمسافة
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
        return `<a href="${url}" target="_blank" class="text-blue-500 hover:text-blue-700 underline font-bold transition-colors" dir="ltr">${url}</a>`;
    });
}

function renderPublicUpdates() {
    const container = document.getElementById('public-updates-list');
    if (!container) return;

    const currentLang = document.documentElement.getAttribute("lang") === "en" ? "en" : "ar";
    const updates = JSON.parse(localStorage.getItem('genez_updates') || '[]');
    
    const now = Date.now();
    
    // الفلترة الذكية: عرض الإعلانات التي جاء موعدها فقط
    const activeUpdates = updates.filter(up => up.scheduledTimestamp <= now);

    if (activeUpdates.length === 0) {
        container.innerHTML = `
          <div class="card p-12 text-center border-dashed border-2 border-theme rounded-2xl bg-surface">
            <p class="text-muted font-medium text-lg">${currentLang === 'en' ? 'No new announcements at this time.' : 'لا توجد إعلانات أو تنبيهات جديدة في الوقت الحالي.'}</p>
          </div>`;
        return;
    }

    // ترتيب الإعلانات بحيث يظهر الأحدث أولاً
    activeUpdates.sort((a, b) => b.scheduledTimestamp - a.scheduledTimestamp);

    const badgesAr = { exams: '🔴 اختبارات', grades: '🟢 علامات', events: '🟡 فعاليات', general: '🔵 إعلان عام' };
    const badgesEn = { exams: '🔴 Exams', grades: '🟢 Grades', events: '🟡 Events', general: '🔵 General' };

    container.innerHTML = activeUpdates.map(up => {
        const title = currentLang === 'en' ? (up.titleEn || up.titleAr) : (up.titleAr || up.titleEn);
        let content = currentLang === 'en' ? (up.contentEn || up.contentAr) : (up.contentAr || up.contentEn);
        const badgeLabel = currentLang === 'en' ? (badgesEn[up.tag] || badgesEn.general) : (badgesAr[up.tag] || badgesAr.general);

        // 💡 تمرير نص التفاصيل على دالة اكتشاف الروابط قبل عرضه
        content = linkify(content);

        return `
        <div class="update-card card block p-6 rounded-2xl border border-theme bg-surface-secondary">
          <div class="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="text-[10px] font-bold px-2.5 py-1 bg-surface border border-theme rounded shadow-sm">${badgeLabel}</span>
              </div>
              <h2 class="text-xl font-bold text-accent leading-snug">${title}</h2>
            </div>
            <div class="flex items-center gap-1 shrink-0 bg-surface px-3 py-1.5 rounded-full border border-theme shadow-sm mt-2 sm:mt-0">
               <span class="text-muted text-sm">📅</span>
               <span class="text-xs font-semibold text-content" title="${currentLang === 'en' ? 'Publish Date' : 'تاريخ النشر'}">${up.date}</span>
            </div>
          </div>
          <!-- استخدمنا word-break لضمان عدم خروج الروابط الطويلة عن إطار البطاقة -->
          <p class="text-muted text-sm sm:text-base leading-relaxed whitespace-pre-line border-t border-theme pt-4" style="word-break: break-word;">${content}</p>
        </div>
        `;
    }).join('');
}