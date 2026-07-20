/**
 * Gene_Z Life Connections Page Logic (Student & Details View - Cloud Firestore Integrated)
 * متوافق بالكامل مع Firestore اللحظي ومقاوم لثغرات الإعجاب اللانهائي ومزود بنظام مشاركة ذكي
 */
import { db } from "./firebase-init.js";
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  increment 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
// استيراد محرك التتبع الإحصائي اللحظي
import { trackEvent } from "./admin/admin-analytics.js";

(function () {
  const LIKED_TOPICS_KEY = "genez_life_likes";
  let cloudLifeTopics = []; // تخزين المواضيع القادمة من السحابة برمجياً
  let isProcessingLike = false;
  
  function getDirectImageUrl(driveUrl) {
    if (!driveUrl) return "../assets/img/logo.jpeg";
    const match = driveUrl.match(/[-\w]{25,}/);
    return match ? `https://drive.google.com/thumbnail?id=${match[0]}&sz=w1200` : driveUrl;
  }

  function getStrictPreviewUrl(url) {
    if (!url) return "";
    const match = url.match(/[-\w]{25,}/);
    return match ? `https://drive.google.com/file/d/${match[0]}/preview?rm=minimal&ui=2` : url;
  }

  function hasUserLiked(topicId) {
    const liked = JSON.parse(localStorage.getItem(LIKED_TOPICS_KEY) || "[]");
    return liked.includes(String(topicId));
  }

  // ✅ دالة تسمح بالإضافة والإزالة بحرية
  function toggleUserLikedLocal(topicId) {
    let liked = JSON.parse(localStorage.getItem(LIKED_TOPICS_KEY) || "[]");
    const strId = String(topicId);
    if (liked.includes(strId)) {
      liked = liked.filter(id => id !== strId);
      localStorage.setItem(LIKED_TOPICS_KEY, JSON.stringify(liked));
      return false; // تمت الإزالة
    } else {
      liked.push(strId);
      localStorage.setItem(LIKED_TOPICS_KEY, JSON.stringify(liked));
      return true; // تمت الإضافة
    }
  }

  const catNames = {
    med: "🔴 طبي والصيدلة",
    agri: "🟢 زراعي وغذاء",
    env: "🔵 بيئي وصناعي",
    forensic: "🟡 جنائي وـDNA"
  };

  /**
   * تهيئة الاستماع اللحظي من Cloud Firestore
   */
  function initCloudListener() {
    const lifeRef = collection(db, "genez_life_connection");
    
    onSnapshot(lifeRef, (snapshot) => {
      cloudLifeTopics = [];
      snapshot.forEach((docSnap) => {
        cloudLifeTopics.push({ id: String(docSnap.id), ...docSnap.data() });
      });

      cloudLifeTopics.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));

      if (document.getElementById("life-grid")) {
        renderLifeGrid(document.getElementById("life-search")?.value || "");
      }
      if (document.getElementById("life-content")) {
        renderLifeDetails();
      }
    }, (error) => {
      console.error("❌ خطأ في جلب مواضيع الربط مع الحياة من السحابة:", error);
    });
  }

  // ========== 1. صفحة القائمة والبحث (life-connection.html) ==========
  function renderLifeGrid(searchQuery = "") {
    const grid = document.getElementById("life-grid");
    if (!grid) return;

    const currentLang = document.documentElement.getAttribute("lang") === "en" ? "en" : "ar";
    const q = searchQuery.toLowerCase().trim();

    const filtered = cloudLifeTopics.filter(t => {
      const title = currentLang === "en" ? (t.titleEn || t.titleAr || "") : (t.titleAr || t.titleEn || "");
      const content = currentLang === "en" ? (t.contentEn || t.contentAr || "") : (t.contentAr || t.contentEn || "");
      return title.toLowerCase().includes(q) || content.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="col-span-full text-center p-12 card border-dashed border-2 border-theme rounded-2xl">
        <p class="text-muted font-medium">${currentLang === "en" ? "No topics found." : "لا توجد مواضيع منشورة حالياً."}</p>
      </div>`;
      return;
    }

    grid.innerHTML = filtered.map(topic => {
      const title = currentLang === "en" ? (topic.titleEn || topic.titleAr) : (topic.titleAr || topic.titleEn);
      const img = getDirectImageUrl(topic.imageUrl);
      const isLiked = hasUserLiked(topic.id);

      return `
        <article 
          class="card bg-surface-secondary border border-theme rounded-2xl overflow-hidden cursor-pointer hover:border-accent hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
          onclick="window.location.href='life-details.html?id=${topic.id}'"
        >
          <div class="h-56 w-full overflow-hidden bg-surface flex items-center justify-center border-b border-theme relative">
            <img src="${img}" alt="${title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" onerror="this.src='../assets/img/logo.jpeg'">
          </div>

          <div class="p-6 flex-1 flex flex-col justify-between bg-card">
            <div>
              <div class="flex items-center justify-between text-xs text-muted font-mono mb-2.5">
                <span>📅 ${topic.date || '2026'}</span>
              </div>
              <h2 class="text-lg sm:text-xl font-bold text-content group-hover:text-accent transition-colors leading-snug line-clamp-2">${title}</h2>
            </div>
              
            <div class="flex items-center justify-between mt-6 border-t border-theme pt-4">
              <div class="flex items-center gap-4 mt-4 text-muted text-sm font-mono">
                <div class="flex items-center gap-1.5" title="${currentLang === 'en' ? 'Likes' : 'الإعجابات'}">
                  <svg class="w-5 h-5 ${isLiked ? 'text-red-500 fill-current' : 'text-red-500'}" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                  <span class="font-bold">${topic.likes || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  // ========== 2. صفحة التفاصيل (life-details.html) ==========
  function renderLifeDetails() {
    const container = document.getElementById("life-content");
    if (!container) return;

    const currentLang = document.documentElement.getAttribute("lang") === "en" ? "en" : "ar";
    const urlParams = new URLSearchParams(window.location.search);
    const topicId = String(urlParams.get("id"));
    
    const topic = cloudLifeTopics.find(t => String(t.id) === topicId);

    if (!topic) {
      container.innerHTML = `<div class="text-center py-20 card border-theme rounded-2xl"><p class="text-red-500 font-bold text-lg">${currentLang === "en" ? "Loading topic or not found!" : "جاري تحميل الموضوع أو أنه غير موجود!"}</p></div>`;
      return;
    }

    if (!window.hasTrackedThisLifeView) {
      trackEvent("genez_life_connection", String(topic.id), "views");
      window.hasTrackedThisLifeView = true;
    }

    const userAlreadyLiked = hasUserLiked(topic.id);
    const title = currentLang === "en" ? (topic.titleEn || topic.titleAr) : (topic.titleAr || topic.titleEn);
    const content = currentLang === "en" ? (topic.contentEn || topic.contentAr) : (topic.contentAr || topic.contentEn);
    const img = getDirectImageUrl(topic.imageUrl);

    const langFiles = topic.files ? topic.files.filter(f => f.langKey === currentLang) : [];
    
    let filesHTML = `<p class="text-xs text-muted italic text-center py-4">${currentLang === "en" ? "No files attached for this language." : "لا توجد ملفات أو مرفقات لهذه اللغة حالياً."}</p>`;
    let autoEmbedContainer = "";

    if (langFiles.length > 0) {
      const firstFile = langFiles[0];
      const firstStrictUrl = getStrictPreviewUrl(firstFile.url);

      autoEmbedContainer = `
        <div id="embedded-viewer-container" class="card p-4 bg-surface border-2 border-accent rounded-2xl space-y-3 shadow-2xl transition-all mt-6">
          <div class="flex items-center justify-between border-b border-theme pb-2">
            <h4 id="viewer-title" class="font-bold text-sm text-accent truncate">📄: ${firstFile.name}</h4>
          </div>
          <div class="w-full h-[600px] rounded-xl overflow-hidden bg-[#121212] relative select-none">
            <div class="absolute top-0 right-0 left-0 h-14 bg-transparent z-10 cursor-not-allowed" title="المعاينة المباشرة فقط - التنزيل غير متاح"></div>
            <iframe id="viewer-iframe" 
                    class="w-full h-full border-0 pointer-events-auto" 
                    src="${firstStrictUrl}" 
                    sandbox="allow-scripts allow-same-origin"
                    allowfullscreen>
            </iframe>
          </div>
        </div>
      `;

      filesHTML = langFiles.map(file => {
        const strictUrl = getStrictPreviewUrl(file.url);
        return `
          <div class="p-4 bg-surface rounded-xl border border-theme flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:border-accent transition-all">
            <div class="flex items-center gap-3 min-w-0">
              <span class="text-accent text-2xl">📄</span>
              <div class="min-w-0">
                <h4 class="font-bold text-sm text-content" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;">${file.name}</h4>
                <span class="text-[11px] text-muted font-mono">👤 ${file.contributor || topic.author || 'Gene_Z'}</span>
              </div>
            </div>
            <button type="button" onclick="openEmbeddedViewer('${strictUrl}', '${file.name}')" class="btn-primary py-2 px-5 text-xs rounded-lg font-bold shrink-0 flex items-center gap-2 shadow-sm">
              <span>${currentLang === "en" ? "View in Frame" : "عرض للمعاينة"}</span>
            </button>
          </div>
        `;
      }).join('');
    }

    container.innerHTML = `
      <article class="space-y-8 animate-fade-in">
        <div class="w-full rounded-2xl overflow-hidden bg-surface border border-theme shadow-md flex items-center justify-center p-2">
           <img src="${img}" alt="${title}" class="w-full h-auto max-h-[650px] object-contain mx-auto rounded-xl" onerror="this.src='../assets/img/logo.jpeg'">
        </div>

        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-theme pb-6">
          <div class="space-y-2 flex-1">
            <div class="flex items-center gap-3 text-xs text-muted font-mono">
              <span class="bg-accent/10 text-accent font-bold px-3 py-1 rounded-full font-sans">✍️ ${topic.author || 'Gene_Z'}</span>
              <span>📅 ${topic.date || '2026'}</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-content leading-tight">${title}</h1>
          </div>
          
          <div class="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
           <button id="like-btn" class="flex items-center gap-2 px-4 py-2 bg-surface-secondary border border-theme rounded-full transition-all focus:outline-none ${userAlreadyLiked ? 'border-red-200 bg-red-50 text-red-600 cursor-default' : 'hover:bg-red-50 hover:border-red-200'}">
            <svg id="heart-icon" class="w-6 h-6 text-red-500 transition-all duration-300 ${userAlreadyLiked ? 'fill-current scale-110' : ''}" fill="${userAlreadyLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
            <span id="like-counter" class="font-bold ${userAlreadyLiked ? 'text-red-600' : 'text-muted'}">${topic.likes || 0}</span>
           </button>

           <button id="share-btn" class="flex items-center gap-2 px-4 py-2 bg-surface-secondary border border-theme rounded-full hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all focus:outline-none text-muted">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
            <span id="share-text" class="font-bold text-sm">مشاركة</span>
           </button>
          </div>
        </div>

        <div class="card p-6 sm:p-8 bg-surface-secondary border border-theme rounded-2xl leading-relaxed text-base sm:text-lg text-content whitespace-pre-line shadow-sm border-r-4 border-r-accent">
          ${content}
        </div>

        ${autoEmbedContainer}

        <div class="card p-6 bg-surface-secondary border border-theme rounded-2xl space-y-4">
          <h3 class="text-base font-bold text-accent flex items-center gap-2">
            <span>🔬</span>
            <span>${currentLang === "en" ? "Attached Files List" : "قائمة الملفات والمراجع المرفقة"}</span>
          </h3>
          <div class="space-y-3">
            ${filesHTML}
          </div>
        </div>
      </article>
    `;

    window.openEmbeddedViewer = (url, name) => {
      const container = document.getElementById("embedded-viewer-container");
      const iframe = document.getElementById("viewer-iframe");
      const titleEl = document.getElementById("viewer-title");
      if (container && iframe) {
        titleEl.innerText = `📄: ${name}`;
        iframe.src = url;
        container.classList.remove("hidden");
        container.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    // ✅ نظام الإعجاب (مع ميزة الإزالة) المفصول عن تعارض محرك الإحصائيات
    const likeBtn = document.getElementById("like-btn");
    likeBtn?.addEventListener("click", async () => {
      if (isProcessingLike) return; 
      isProcessingLike = true;
      
      const isNowLiked = toggleUserLikedLocal(topic.id);
      const docRef = doc(db, "genez_life_connection", String(topic.id));

      try {
        // تحديث الرقم في المستند (يسمح بالزيادة والنقصان بحرية)
        await updateDoc(docRef, { likes: increment(isNowLiked ? 1 : -1) });
        
        // إرسال الإحصائية للرسم البياني بهدوء (دون التأثير على المستند لمنع التكرار)
        if (isNowLiked) {
           const analyticsKey = `genez_stats_liked_life_${topic.id}`;
           if (!localStorage.getItem(analyticsKey)) {
               trackEvent(null, null, "likes"); // المعاملات null تمنعه من لمس المستند!
               localStorage.setItem(analyticsKey, "true");
           }
        }
      } catch (err) {
        console.error("❌ فشل تحديث الإعجاب:", err);
        toggleUserLikedLocal(topic.id); // التراجع في حال الفشل
      } finally {
        isProcessingLike = false;
      }
    });

    // ✅ معالجة المشاركة المتطورة (Native Web Share) مع الـ Fallback
    const shareBtn = document.getElementById("share-btn");
    const shareText = document.getElementById("share-text");
    shareBtn?.addEventListener("click", async () => {
      const shareData = {
        title: title,
        text: currentLang === "en" ? `Check out this application on Gene_Z!` : `شاهد هذا التطبيق العلمي في موقع Gene_Z!`,
        url: window.location.href
      };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          trackEvent("genez_life_connection", String(topic.id), "shares");
        } catch (err) {
          if (err.name !== "AbortError") {
            fallbackCopyLink();
          }
        }
      } else {
        fallbackCopyLink();
      }
    });

    function fallbackCopyLink() {
      navigator.clipboard.writeText(window.location.href).then(() => {
        const orig = shareText.innerHTML;
        shareText.innerHTML = `${currentLang === "en" ? "Copied!" : "تم النسخ!"} ✅`;
        setTimeout(() => { shareText.innerHTML = orig; }, 2000);
        trackEvent("genez_life_connection", String(topic.id), "shares");
      }).catch(err => {
        console.error("Could not copy link:", err);
      });
    }
  }

  // تشغيل الاستماع فور تحميل الصفحة
  document.addEventListener("DOMContentLoaded", () => {
    initCloudListener();
    document.getElementById("life-search")?.addEventListener("input", (e) => renderLifeGrid(e.target.value));
    window.addEventListener("genez:lang-changed", () => {
      if (document.getElementById("life-grid")) renderLifeGrid(document.getElementById("life-search")?.value || "");
      if (document.getElementById("life-content")) renderLifeDetails();
    });
  });
})();