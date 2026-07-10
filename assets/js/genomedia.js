/**
 * Gene_Z Genomedia Page Logic
 */
(function () {
  const STORAGE_KEY = "gene_z_genomedia_topics";
  const LIKED_TOPICS_KEY = "gene_z_genomedia_likes";
  
  // صور طولية (Portrait) مخصصة لتناسب التصميم الجديد
  const DUMMY_TOPICS = [
    {
      id: "geno_001",
      title: "الإنجاز العلمي الحديث: إسكات جين متلازمة داون",
      image: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=600&h=800&q=80",
      shortText: "دراسة حديثة تكشف عن إمكانية استخدام تقنيات التعديل الجيني المتقدمة لإسكات الكروموسوم الإضافي (الكروموسوم 21) المسؤول عن متلازمة داون في الخلايا الجذعية، مما يفتح آفاقاً جديدة وتاريخية للبحث الطبي.",
      likes: 120,
      driveEmbedUrl: "mock" 
    },
    {
      id: "geno_002",
      title: "موافقة تاريخية لعلاج فقر الدم المنجلي باستخدام CRISPR",
      image: "https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?auto=format&fit=crop&w=600&h=800&q=80",
      shortText: "وافقت هيئة الغذاء والدواء (FDA) على أول علاج جيني يعتمد على تقنية كريسبر للمرضى المصابين بفقر الدم المنجلي، في خطوة غير مسبوقة تنقل الطب الجيني من المختبرات إلى المستشفيات.",
      likes: 85,
      driveEmbedUrl: "" 
    },
    {
      id: "geno_003",
      title: "الذكاء الاصطناعي يفك شفرة ملايين البروتينات",
      image: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=600&h=800&q=80",
      shortText: "أداة ذكاء اصطناعي جديدة تنجح في التنبؤ بالهياكل ثلاثية الأبعاد لملايين البروتينات بدقة متناهية، مما يسرع من عملية تطوير الأدوية المستهدفة وفهم الأمراض الجينية المستعصية.",
      likes: 210,
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
  function renderGenoGrid(searchQuery = "") {
    const grid = document.getElementById("geno-grid");
    if (!grid) return;

    const topics = getTopics();
    const q = searchQuery.toLowerCase().trim();
    const filtered = topics.filter(t => t.title.toLowerCase().includes(q));

    if (filtered.length === 0) {
      grid.innerHTML = `<p class="col-span-full text-center text-muted p-8 card border-dashed border-2">لا توجد أخبار مطابقة للبحث.</p>`;
      return;
    }

    grid.innerHTML = filtered.map(topic => `
      <article 
        class="card overflow-hidden cursor-pointer hover:border-accent hover:shadow-xl transition-all duration-300 group flex flex-col"
        onclick="window.location.href='news-details.html?id=${topic.id}'"
      >
        <div class="h-[400px] w-full overflow-hidden bg-surface-secondary flex items-center justify-center border-b border-theme relative">
          <img src="${topic.image}" alt="${topic.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" onerror="this.src='../assets/img/logo.jpeg'">
        </div>
        <div class="p-6 flex-1 flex flex-col justify-between bg-card">
          <div>
            <h2 class="text-xl font-bold group-hover:text-accent transition-colors leading-snug">${topic.title}</h2>
          </div>
          <div class="flex items-center gap-2 mt-5 text-muted text-sm border-t border-theme pt-4">
            <svg class="w-5 h-5 ${hasUserLiked(topic.id) ? 'text-red-500 fill-current' : 'text-red-500'}" fill="${hasUserLiked(topic.id) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
            <span class="font-bold">${topic.likes} إعجاب</span>
          </div>
        </div>
      </article>
    `).join("");
  }

  // ========== صفحة التفاصيل ==========
  function renderGenoDetails() {
    const container = document.getElementById("geno-content");
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const topicId = urlParams.get("id");
    let topics = getTopics();
    const topicIndex = topics.findIndex(t => t.id === topicId);

    if (topicIndex === -1) {
      container.innerHTML = `<p class="text-center text-red-500 font-bold">الخبر غير موجود!</p>`;
      return;
    }

    const topic = topics[topicIndex];
    const userAlreadyLiked = hasUserLiked(topic.id);

    let iframeContent = `<p class="text-muted text-center p-4">لا توجد ملفات مرفوعة حالياً.</p>`;
    if (topic.driveEmbedUrl === "mock") {
      iframeContent = `<iframe srcdoc="<div style='display:flex; align-items:center; justify-content:center; height:100%; font-family:sans-serif; background:#f3f4f6; color:#4b5563; border-radius:10px;'>مساحة محجوزة لملفات جوجل درايف</div>" class="w-full h-full border-none" allowfullscreen></iframe>`;
    } else if (topic.driveEmbedUrl) {
      iframeContent = `<iframe src="${topic.driveEmbedUrl}" class="w-full h-full border-none" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    }

    container.innerHTML = `
      <div class="w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-sm border border-theme mb-8">
         <img src="${topic.image}" class="w-full h-full object-cover" onerror="this.src='../assets/img/logo.jpeg'">
      </div>

      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-theme pb-6">
        <h1 class="text-2xl sm:text-4xl font-bold text-accent flex-1 leading-tight">${topic.title}</h1>
        
        <div class="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end shrink-0">
          <button id="like-btn" class="flex items-center gap-2 px-5 py-2.5 bg-surface-secondary border border-theme rounded-full hover:bg-red-50 hover:border-red-200 transition-all focus:outline-none ${userAlreadyLiked ? 'border-red-200 bg-red-50' : ''}">
            <svg id="heart-icon" class="w-6 h-6 text-red-500 transition-all duration-300 ${userAlreadyLiked ? 'fill-current scale-110' : ''}" fill="${userAlreadyLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
            <span id="like-counter" class="font-bold ${userAlreadyLiked ? 'text-red-600' : 'text-muted'}">${topic.likes}</span>
          </button>

          <button id="share-btn" class="flex items-center gap-2 px-5 py-2.5 bg-surface-secondary border border-theme rounded-full hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all focus:outline-none text-muted">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span id="share-text" class="font-bold text-sm">مشاركة</span>
          </button>
        </div>
      </div>

      <div class="text-lg text-content leading-relaxed mb-10 bg-surface px-4 py-6 rounded-xl border-r-4 border-accent shadow-sm">
        ${topic.shortText}
      </div>

      <div>
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <span>🔬</span> التفاصيل والمرفقات
        </h2>
        <div class="w-full h-[500px] bg-card border-2 border-dashed border-theme rounded-xl flex items-center justify-center overflow-hidden p-2">
          ${iframeContent}
        </div>
      </div>
    `;

    const likeBtn = document.getElementById("like-btn");
    const heartIcon = document.getElementById("heart-icon");
    const likeCounter = document.getElementById("like-counter");

    likeBtn.addEventListener("click", () => {
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
    if (document.getElementById("geno-search")) {
      renderGenoGrid();
      document.getElementById("geno-search").addEventListener("input", (e) => renderGenoGrid(e.target.value));
    }
    if (document.getElementById("geno-content")) {
      renderGenoDetails();
    }
  });

})();