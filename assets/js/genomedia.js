/**
 * Gene_Z Genomedia Page Logic (Student & Details View - Auto Embed Fixed)
 * تم الإصلاح: فتح الملف الأول تلقائياً للمعاينة المباشرة، مع حظر التنزيل والطباعة وإخفاء زر الـ Pop-out نهائياً
 */
(function () {
  const STORAGE_KEY = "genez_genomedia";
  const LIKED_TOPICS_KEY = "gene_z_genomedia_likes";
  
  // دالة ذكية لاستخراج معرف الملف (ID) وحل مشكلة الصورة المكسورة/البيضاء نهائياً
  function getDirectImageUrl(driveUrl) {
    if (!driveUrl) return "../assets/img/logo.jpeg";
    const match = driveUrl.match(/[-\w]{25,}/);
    return match ? `https://drive.google.com/thumbnail?id=${match[0]}&sz=w1200` : driveUrl;
  }

  // دالة تحويل رابط جوجل درايف إلى وضع المعاينة الصارم (إضافة rm=minimal لإخفاء شريط الأدوات)
  function getStrictPreviewUrl(url) {
    if (!url) return "";
    const match = url.match(/[-\w]{25,}/);
    if (match) {
      // استخدام رمزي rm=minimal و ui=2 لتقليل القوائم وإخفاء أزرار التنزيل قدر الإمكان
      return `https://drive.google.com/file/d/${match[0]}/preview?rm=minimal&ui=2`;
    }
    return url;
  }

  function getTopics() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  function saveTopics(topics) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(topics));
  }

  function hasUserLiked(topicId) {
    const liked = JSON.parse(localStorage.getItem(LIKED_TOPICS_KEY) || "[]");
    return liked.includes(Number(topicId));
  }

  function setUserLiked(topicId) {
    const liked = JSON.parse(localStorage.getItem(LIKED_TOPICS_KEY) || "[]");
    if (!liked.includes(Number(topicId))) {
      liked.push(Number(topicId));
      localStorage.setItem(LIKED_TOPICS_KEY, JSON.stringify(liked));
    }
  }

  function removeUserLiked(topicId) {
    let liked = JSON.parse(localStorage.getItem(LIKED_TOPICS_KEY) || "[]");
    liked = liked.filter(id => id !== Number(topicId));
    localStorage.setItem(LIKED_TOPICS_KEY, JSON.stringify(liked));
  }

  // ========== 1. صفحة القائمة والبحث (news.html) ==========
  function renderGenoGrid(searchQuery = "") {
    const grid = document.getElementById("geno-grid");
    if (!grid) return;

    const topics = getTopics();
    const currentLang = document.documentElement.getAttribute("lang") === "en" ? "en" : "ar";
    const q = searchQuery.toLowerCase().trim();

    const filtered = topics.filter(t => {
      const title = currentLang === "en" ? (t.titleEn || t.titleAr) : (t.titleAr || t.titleEn);
      const content = currentLang === "en" ? (t.contentEn || t.contentAr) : (t.contentAr || t.contentEn);
      return title.toLowerCase().includes(q) || content.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="col-span-full text-center p-12 card border-dashed border-2 border-theme rounded-2xl">
        <p class="text-muted font-medium">${currentLang === "en" ? "No news articles found." : "لا توجد أخبار أو مقالات منشورة حالياً."}</p>
      </div>`;
      return;
    }

    filtered.sort((a, b) => b.id - a.id);

    grid.innerHTML = filtered.map(topic => {
      const title = currentLang === "en" ? (topic.titleEn || topic.titleAr) : (topic.titleAr || topic.titleEn);
      const img = getDirectImageUrl(topic.previewUrl || topic.imageUrl);
      const isLiked = hasUserLiked(topic.id);

      return `
        <article 
          class="card bg-surface-secondary border border-theme rounded-2xl overflow-hidden cursor-pointer hover:border-accent hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
          onclick="window.location.href='news-details.html?id=${topic.id}'"
        >
          <div class="h-[360px] sm:h-[400px] w-full overflow-hidden bg-surface flex items-center justify-center border-b border-theme relative">
            <img src="${img}" alt="${title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" onerror="this.src='../assets/img/logo.jpeg'">
            <span class="absolute top-3.5 right-3.5 bg-accent/90 text-white text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-sm shadow-sm">✍️ ${topic.author || 'Gene_Z'}</span>
          </div>

          <div class="p-6 flex-1 flex flex-col justify-between bg-card">
            <div>
              <div class="flex items-center justify-between text-xs text-muted font-mono mb-2.5">
                <span>📅 ${topic.date || '2026'}</span>
              </div>
              <h2 class="text-lg sm:text-xl font-bold text-content group-hover:text-accent transition-colors leading-snug line-clamp-2">${title}</h2>
            </div>

            <div class="flex items-center justify-between mt-6 border-t border-theme pt-4">
                <div class="flex items-center gap-2 mt-4 text-muted text-sm">
                 <svg class="w-5 h-5 ${hasUserLiked(topic.id) ? 'text-red-500 fill-current' : 'text-red-500'}" fill="${hasUserLiked(topic.id) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                 <span class="font-bold">${topic.likes} </span>
               </div>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  // ========== 2. صفحة التفاصيل (news-details.html) ==========
  function renderGenoDetails() {
    const container = document.getElementById("geno-content");
    if (!container) return;

    const currentLang = document.documentElement.getAttribute("lang") === "en" ? "en" : "ar";
    const urlParams = new URLSearchParams(window.location.search);
    const topicId = Number(urlParams.get("id")) || urlParams.get("id");
    
    let topics = getTopics();
    const topicIndex = topics.findIndex(t => t.id == topicId);

    if (topicIndex === -1) {
      container.innerHTML = `<div class="text-center py-20 card border-theme rounded-2xl"><p class="text-red-500 font-bold text-lg">${currentLang === "en" ? "Article not found!" : "الخبر غير موجود أو تم حذفه!"}</p></div>`;
      return;
    }

    const topic = topics[topicIndex];
    const userAlreadyLiked = hasUserLiked(topic.id);
    const title = currentLang === "en" ? (topic.titleEn || topic.titleAr) : (topic.titleAr || topic.titleEn);
    const content = currentLang === "en" ? (topic.contentEn || topic.contentAr) : (topic.contentAr || topic.contentEn);
    const img = getDirectImageUrl(topic.previewUrl || topic.imageUrl);

    const langFiles = topic.files ? topic.files.filter(f => f.langKey === currentLang) : [];
    
    let filesHTML = `<p class="text-xs text-muted italic text-center py-4">${currentLang === "en" ? "No files attached for this language." : "لا توجد ملفات أو مرفقات لهذه اللغة حالياً."}</p>`;
    
    // إعداد حاوية العرض التلقائي (مع حاجز حماية الـ Pop-out ومنع التنزيل)
    let autoEmbedContainer = "";
    if (langFiles.length > 0) {
      const firstFile = langFiles[0];
      const firstStrictUrl = getStrictPreviewUrl(firstFile.url);

      // لاحظ خاصية sandbox والـ div الشفاف المضاف لتغطية الزر العلوي
      autoEmbedContainer = `
        <div id="embedded-viewer-container" class="card p-4 bg-surface border-2 border-accent rounded-2xl space-y-3 shadow-2xl transition-all mt-6">
          <div class="flex items-center justify-between border-b border-theme pb-2">
            <h4 id="viewer-title" class="font-bold text-sm text-accent truncate"> 📄: ${firstFile.name}</h4>
          </div>
          <div class="w-full h-[600px] rounded-xl overflow-hidden bg-[#121212] relative select-none">
            
            <!-- حاجز شفاف علوي لحجب ضغطات الماوس عن شريط أدوات جوجل درايف وزر فتح النافذة الخارجية -->
            <div class="absolute top-0 right-0 left-0 h-14 bg-transparent z-10 cursor-not-allowed" title="المعاينة المباشرة فقط - التنزيل غير متاح"></div>
            
            <!-- إطار العرض مع تقييد الصلاحيات sandbox لمكافحة فتح التبويبات الخارجية -->
            <iframe id="viewer-iframe" 
                    class="w-full h-full border-0 pointer-events-auto" 
                    src="${firstStrictUrl}" 
                    sandbox="allow-scripts allow-same-origin"
                    allowfullscreen>
            </iframe>
          </div>
        </div>
      `;

      filesHTML = langFiles.map((file) => {
        const strictUrl = getStrictPreviewUrl(file.url);
        return `
          <div class="p-4 bg-surface rounded-xl border border-theme flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:border-accent transition-all">
            <div class="flex items-center gap-3 min-w-0">
              <span class="text-accent text-2xl">📄</span>
              <div class="min-w-0">
                <h4 class="font-bold text-sm text-content truncate">${file.name}</h4>
                <span class="text-[11px] text-muted font-mono">👤 ${file.contributor || topic.author || 'Google Drive Sync'}</span>
              </div>
            </div>
            <button type="button" onclick="openEmbeddedViewer('${strictUrl}', '${file.name}')" class="btn-primary py-2 px-5 text-xs rounded-lg font-bold shrink-0 flex items-center gap-2 shadow-sm">
              <span>👁️</span>
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
            <div class="flex items-center gap-3 text-xs text-muted">
              <span class="bg-accent/10 text-accent font-bold px-3 py-1 rounded-full">✍️ ${topic.author || 'Gene_Z'}</span>
              <span class="font-mono">📅 ${topic.date || '2026'}</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-content leading-tight">${title}</h1>
          </div>
          
          <div class="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
           <button id="like-btn" class="flex items-center gap-2 px-4 py-2 bg-surface-secondary border border-theme rounded-full hover:bg-red-50 hover:border-red-200 transition-all focus:outline-none ${userAlreadyLiked ? 'border-red-200 bg-red-50' : ''}">
            <svg id="heart-icon" class="w-6 h-6 text-red-500 transition-all duration-300 ${userAlreadyLiked ? 'fill-current scale-110' : ''}" fill="${userAlreadyLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
            <span id="like-counter" class="font-bold ${userAlreadyLiked ? 'text-red-600' : 'text-muted'}">${topic.likes}</span>
           </button>

           <button id="share-btn" class="flex items-center gap-2 px-4 py-2 bg-surface-secondary border border-theme rounded-full hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all focus:outline-none text-muted">
            <span>🔗</span>
            <span id="share-text" class="font-bold text-sm">مشاركة</span>
           </button>
          </div>
        </div>

        <div class="card p-6 sm:p-8 bg-surface-secondary border border-theme rounded-2xl leading-relaxed text-base sm:text-lg text-content whitespace-pre-line shadow-sm border-r-4 border-r-accent">
          ${content}
        </div>

        <!-- إطار العرض التلقائي المحمي -->
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
      const title = document.getElementById("viewer-title");
      if (container && iframe) {
        title.innerText = ` 📄: ${name}`;
        iframe.src = url;
        container.classList.remove("hidden");
        container.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    const likeBtn = document.getElementById("like-btn");
    const heartIcon = document.getElementById("heart-icon");
    const likeCounter = document.getElementById("like-counter");

    likeBtn?.addEventListener("click", () => {
      if (hasUserLiked(topic.id)) {
        topic.likes -= 1;
        topics[topicIndex] = topic;
        saveTopics(topics);
        removeUserLiked(topic.id);

        likeCounter.textContent = topic.likes;
        likeCounter.classList.remove('text-red-600');
        likeCounter.classList.add('text-muted');
        heartIcon.setAttribute("fill", "none");
        heartIcon.classList.remove("scale-110");
        likeBtn.classList.remove('border-red-200', 'bg-red-50');
      } else {
        topic.likes += 1;
        topics[topicIndex] = topic;
        saveTopics(topics);
        setUserLiked(topic.id);

        likeCounter.textContent = topic.likes;
        likeCounter.classList.remove('text-muted');
        likeCounter.classList.add('text-red-600');
        heartIcon.setAttribute("fill", "currentColor");
        heartIcon.classList.add("scale-110");
        likeBtn.classList.add('border-red-200', 'bg-red-50');
      }
    });

    const shareBtn = document.getElementById("share-btn");
    const shareText = document.getElementById("share-text");

    shareBtn?.addEventListener("click", () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
        const orig = shareText.innerHTML;
        shareText.innerHTML = `${currentLang === "en" ? "Copied!" : "تم النسخ!"} ✅`;
        setTimeout(() => { shareText.innerHTML = orig; }, 2000);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("geno-grid")) {
      renderGenoGrid();
      document.getElementById("geno-search")?.addEventListener("input", (e) => renderGenoGrid(e.target.value));
      window.addEventListener("genez:lang-changed", () => renderGenoGrid(document.getElementById("geno-search")?.value || ""));
    }
    if (document.getElementById("geno-content")) {
      renderGenoDetails();
      window.addEventListener("genez:lang-changed", () => renderGenoDetails());
    }
  });

})();