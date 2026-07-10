/**
 * Gene_Z Life Connections Page Logic
 */
(function () {
  const STORAGE_KEY = "gene_z_life_topics";
  const LIKED_TOPICS_KEY = "gene_z_user_likes";
  
  // استخدمنا صورة محلية (اللوجو) و iFrame وهمي عشان ما يعلق المتصفح بالتحميل
  const DUMMY_TOPICS = [
    {
      id: "life_001",
      title: "ترابط التخصصات: التكنولوجيا الحيوية والذكاء الاصطناعي",
      image: "../assets/img/logo.jpeg", 
      shortText: "مقال قصير يوضح كيف يتم استخدام خوارزميات الذكاء الاصطناعي في تحليل تسلسلات الـ DNA وتوقع الطفرات الجينية بشكل أسرع من الطرق التقليدية.",
      likes: 0,
      // استخدمنا srcdoc لعمل إطار وهمي يشتغل بدون إنترنت لغايات التجربة
      driveEmbedUrl: "../assets/img/v1.mp4" 
    },
    {
      id: "life_002",
      title: "تقنية كريسبر (CRISPR) والأخلاقيات",
      image: "../assets/img/logo.jpeg",
      shortText: "نقاش ////حول حدود التعديل الجيني وأين يجب أن يقف العلم للحفاظ على التوازن البيئي والأخلاقي.",
      likes: 0,
      driveEmbedUrl: "" 
    }
  ];

  function getTopics() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DUMMY_TOPICS));
      return DUMMY_TOPICS;
    }
    return JSON.parse(stored);
  }

  function saveTopics(topics) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(topics));
  }

  // دوال التحقق من الإعجاب وإضافته وإزالته
  function hasUserLiked(topicId) {
    const liked = JSON.parse(localStorage.getItem(LIKED_TOPICS_KEY) || "[]");
    return liked.includes(topicId);
  }

  function setUserLiked(topicId) {
    const liked = JSON.parse(localStorage.getItem(LIKED_TOPICS_KEY) || "[]");
    if (!liked.includes(topicId)) {
      liked.push(topicId);
      localStorage.setItem(LIKED_TOPICS_KEY, JSON.stringify(liked));
    }
  }

  function removeUserLiked(topicId) {
    let liked = JSON.parse(localStorage.getItem(LIKED_TOPICS_KEY) || "[]");
    liked = liked.filter(id => id !== topicId);
    localStorage.setItem(LIKED_TOPICS_KEY, JSON.stringify(liked));
  }

  // ========== صفحة القائمة والبحث ==========
  function renderLifeGrid(searchQuery = "") {
    const grid = document.getElementById("life-grid");
    if (!grid) return;

    const topics = getTopics();
    const q = searchQuery.toLowerCase().trim();
    const filtered = topics.filter(t => t.title.toLowerCase().includes(q));

    if (filtered.length === 0) {
      grid.innerHTML = `<p class="col-span-full text-center text-muted p-8 card border-dashed border-2">لا توجد مواضيع مطابقة للبحث.</p>`;
      return;
    }

    grid.innerHTML = filtered.map(topic => `
      <article 
        class="card overflow-hidden cursor-pointer hover:border-accent hover:shadow-lg transition-all duration-300 group flex flex-col"
        onclick="window.location.href='life-details.html?id=${topic.id}'"
      >
        <div class="h-48 w-full overflow-hidden bg-surface-secondary flex items-center justify-center">
          <img src="${topic.image}" alt="${topic.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='../assets/img/plan1.jpg'">
        </div>
        <div class="p-5 flex-1 flex flex-col justify-between bg-card">
          <h2 class="text-xl font-bold group-hover:text-accent transition-colors leading-snug">${topic.title}</h2>
          <div class="flex items-center gap-2 mt-4 text-muted text-sm">
            <svg class="w-5 h-5 ${hasUserLiked(topic.id) ? 'text-red-500 fill-current' : 'text-red-500'}" fill="${hasUserLiked(topic.id) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
            <span class="font-bold">${topic.likes} إعجاب</span>
          </div>
        </div>
      </article>
    `).join("");
  }

  // ========== صفحة التفاصيل (life-details.html) ==========
  function renderLifeDetails() {
    const container = document.getElementById("life-content");
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const topicId = urlParams.get("id");
    let topics = getTopics();
    const topicIndex = topics.findIndex(t => t.id === topicId);

    if (topicIndex === -1) {
      container.innerHTML = `<p class="text-center text-red-500 font-bold">الموضوع غير موجود!</p>`;
      return;
    }

    const topic = topics[topicIndex];
    const userAlreadyLiked = hasUserLiked(topic.id);

    // تجهيز الإطار الوهمي أو الحقيقي
    let iframeContent = `<p class="text-muted text-center p-4">لا توجد ملفات مرفوعة حالياً.</p>`;
    if (topic.driveEmbedUrl === "mock") {
      iframeContent = `<iframe srcdoc="<div style='display:flex; align-items:center; justify-content:center; height:100%; font-family:sans-serif; background:#f3f4f6; color:#4b5563; border-radius:10px;'>هذا محاكي لملف جوجل درايف - يعمل محلياً بدون إنترنت</div>" class="w-full h-full border-none" allowfullscreen></iframe>`;
    } else if (topic.driveEmbedUrl) {
      iframeContent = `<iframe src="${topic.driveEmbedUrl}" class="w-full h-full border-none" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    }

    container.innerHTML = `
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-theme pb-6">
        <h1 class="text-2xl sm:text-3xl font-bold text-accent flex-1 leading-snug">${topic.title}</h1>
        
        <div class="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
          <button id="like-btn" class="flex items-center gap-2 px-4 py-2 bg-surface-secondary border border-theme rounded-full hover:bg-red-50 hover:border-red-200 transition-all focus:outline-none ${userAlreadyLiked ? 'border-red-200 bg-red-50' : ''}">
            <svg id="heart-icon" class="w-6 h-6 text-red-500 transition-all duration-300 ${userAlreadyLiked ? 'fill-current scale-110' : ''}" fill="${userAlreadyLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
            <span id="like-counter" class="font-bold ${userAlreadyLiked ? 'text-red-600' : 'text-muted'}">${topic.likes}</span>
          </button>

          <button id="share-btn" class="flex items-center gap-2 px-4 py-2 bg-surface-secondary border border-theme rounded-full hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all focus:outline-none text-muted">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span id="share-text" class="font-bold text-sm">مشاركة</span>
          </button>
        </div>
      </div>

      <div class="card p-6 mb-8 bg-surface-secondary border-r-4 border-r-accent rounded-l-2xl rounded-r-sm">
        <p class="text-muted leading-relaxed">${topic.shortText}</p>
      </div>

      <div>
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <span>📁</span> الملفات والمرفقات
        </h2>
        <div class="w-full h-[500px] bg-card border-2 border-dashed border-theme rounded-xl flex items-center justify-center overflow-hidden p-2">
          ${iframeContent}
        </div>
      </div>
    `;

    // تفعيل الإعجاب وإزالته
    const likeBtn = document.getElementById("like-btn");
    const heartIcon = document.getElementById("heart-icon");
    const likeCounter = document.getElementById("like-counter");

    likeBtn.addEventListener("click", () => {
      if (hasUserLiked(topic.id)) {
        // إزالة الإعجاب
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
        // إضافة الإعجاب
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

    // تفعيل زر المشاركة
    const shareBtn = document.getElementById("share-btn");
    const shareText = document.getElementById("share-text");

    shareBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
        const originalText = shareText.textContent;
        shareText.textContent = "تم النسخ!";
        shareBtn.classList.add("text-green-600", "bg-green-50", "border-green-200");
        
        setTimeout(() => {
          shareText.textContent = originalText;
          shareBtn.classList.remove("text-green-600", "bg-green-50", "border-green-200");
        }, 2000);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("life-search")) {
      renderLifeGrid();
      document.getElementById("life-search").addEventListener("input", (e) => renderLifeGrid(e.target.value));
    }
    if (document.getElementById("life-content")) {
      renderLifeDetails();
    }
  });

})();