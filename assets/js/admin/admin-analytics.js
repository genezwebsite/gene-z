// assets/js/admin/admin-analytics.js
import { db } from '../firebase-init.js';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  where, 
  setDoc, 
  updateDoc,
  increment 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let analyticsChartInstance = null;

export async function initAnalyticsDashboard() {
  // الانتظار حتى يصبح عنصر الرسم البياني متاحاً في الـ DOM
  const waitForDOM = () => new Promise(resolve => {
    if (document.getElementById('analyticsGrowthChart')) {
      return resolve();
    }
    const observer = new MutationObserver((mutations, obs) => {
      if (document.getElementById('analyticsGrowthChart')) {
        obs.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

  await waitForDOM();

  await loadGeneralStats();
  await loadAnalyticsChart('7'); 
  await loadTopPerformingContent();
  setupFilterListeners();
}

async function loadGeneralStats() {
  try {
    const generalStatsRef = doc(db, "genez_analytics", "general_stats");
    
    // 1. الحساب الحي (Real-time Aggregation)
    let realLikes = 0;
    let realShares = 0;
    
    const collectionsToFetch = ["genez_genomedia", "genez_life_connection", "genez_courses", "genez_extra_courses"];
    for (const collName of collectionsToFetch) {
      const snap = await getDocs(collection(db, collName));
      snap.forEach(doc => {
        const data = doc.data();
        realLikes += parseInt(data.likes || 0);
        realShares += parseInt(data.shares || 0);
      });
    }

    const docSnap = await getDoc(generalStatsRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      
      const visitsEl = document.getElementById('stat-total-visits');
      const downloadsEl = document.getElementById('stat-total-downloads');
      const likesEl = document.getElementById('stat-total-likes');
      const sharesEl = document.getElementById('stat-total-shares');

      if(visitsEl) visitsEl.innerText = (data.total_visits || 0).toLocaleString('en-US');
      if(downloadsEl) downloadsEl.innerText = (data.total_downloads || 0).toLocaleString('en-US');
      if(likesEl) likesEl.innerText = realLikes.toLocaleString('en-US');
      if(sharesEl) sharesEl.innerText = realShares.toLocaleString('en-US');
      
      // Self-healing data
      if (data.total_likes !== realLikes || data.total_shares !== realShares) {
        await updateDoc(generalStatsRef, {
          total_likes: realLikes,
          total_shares: realShares
        });
      }
    } else {
      await setDoc(generalStatsRef, {
        total_visits: 0,
        total_downloads: 0,
        total_likes: realLikes,
        total_shares: realShares,
        total_clicks: 0
      });
      const likesEl = document.getElementById('stat-total-likes');
      const sharesEl = document.getElementById('stat-total-shares');
      if(likesEl) likesEl.innerText = realLikes.toLocaleString('en-US');
      if(sharesEl) sharesEl.innerText = realShares.toLocaleString('en-US');
    }
  } catch (error) {
    console.error("خطأ في جلب الإحصائيات العامة:", error);
  }
}

async function loadAnalyticsChart(range) {
  const statusEl = document.getElementById('chart-loading-status');
  if (statusEl) statusEl.innerText = "جاري جلب البيانات...";

  try {
    const analyticsColl = collection(db, "genez_analytics");
    let q;

    if (range === 'all') {
      q = query(analyticsColl, orderBy("date", "asc"), limit(60));
    } else {
      const days = parseInt(range, 10);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const dateString = startDate.toISOString().split('T')[0]; 

      q = query(
        analyticsColl, 
        where("date", ">=", dateString), 
        orderBy("date", "asc")
      );
    }

    const querySnapshot = await getDocs(q);
    const labels = [];
    const visitsData = [];
    const interactionsData = []; 

    querySnapshot.forEach((doc) => {
      if (doc.id !== "general_stats") {
        const data = doc.data();
        labels.push(data.date || doc.id.replace('daily_', ''));
        visitsData.push(data.visits || 0);
        interactionsData.push((data.likes || 0) + (data.shares || 0) + (data.downloads || 0) + (data.clicks || 0));
      }
    });

    renderChart(labels, visitsData, interactionsData);
    if (statusEl) statusEl.innerText = "";
  } catch (error) {
    console.error("خطأ في جلب بيانات الرسم البياني:", error);
    if (statusEl) statusEl.innerText = "فشل تحميل الرسم البياني";
  }
}

function renderChart(labels, visitsData, interactionsData) {
  const ctx = document.getElementById('analyticsGrowthChart')?.getContext('2d');
  if (!ctx) return;

  if (analyticsChartInstance) {
    analyticsChartInstance.destroy();
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  analyticsChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'زيارات الموقع',
          data: visitsData,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3
        },
        {
          label: 'التفاعل (إعجاب، مشاركة، تحميل، نقرات)',
          data: interactionsData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          borderWidth: 2,
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: textColor, font: { family: 'Noto Kufi Arabic', size: 12 } }
        }
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { family: 'Noto Kufi Arabic' } },
          grid: { color: gridColor }
        },
        y: {
          beginAtZero: true,
          ticks: { color: textColor, font: { family: 'Noto Kufi Arabic' } },
          grid: { color: gridColor }
        }
      }
    }
  });
}

function setupFilterListeners() {
  const buttons = document.querySelectorAll('.chart-filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      buttons.forEach(b => {
        b.classList.remove('active', 'bg-accent', 'text-white');
        b.classList.add('text-muted');
      });
      e.target.classList.add('active', 'bg-accent', 'text-white');
      e.target.classList.remove('text-muted');

      const range = e.target.getAttribute('data-range');
      loadAnalyticsChart(range);
    });
  });
}

async function loadTopPerformingContent() {
  try {
    const genomediaQ = query(collection(db, "genez_genomedia"), orderBy("views", "desc"), limit(5));
    const genomediaSnap = await getDocs(genomediaQ);
    const genomediaContainer = document.getElementById('top-genomedia-list');
    if (genomediaContainer) {
      genomediaContainer.innerHTML = '';
      if (genomediaSnap.empty) {
        genomediaContainer.innerHTML = '<p class="text-muted text-center py-2">لا توجد بيانات تفاعل بعد.</p>';
      } else {
        genomediaSnap.forEach(doc => {
          const data = doc.data();
          genomediaContainer.innerHTML += `
            <div class="flex justify-between items-center p-2 rounded bg-surface-secondary border border-theme">
              <span class="font-medium truncate max-w-[70%]">${data.title_ar || data.titleAr || 'مقال بدون عنوان'}</span>
              <span class="font-mono text-accent bg-accent/10 px-2 py-0.5 rounded text-[11px] font-bold">👁️ ${data.views || 0}</span>
            </div>
          `;
        });
      }
    }

    // ✅ התعديل هنا: جلب "الربط مع الحياة" بدل "المواد الدراسية"
    const lifeQ = query(collection(db, "genez_life_connection"), orderBy("views", "desc"), limit(5));
    const lifeSnap = await getDocs(lifeQ);
    const lifeContainer = document.getElementById('top-life-list');
    if (lifeContainer) {
      lifeContainer.innerHTML = '';
      if (lifeSnap.empty) {
        lifeContainer.innerHTML = '<p class="text-muted text-center py-2">لا توجد بيانات تفاعل بعد.</p>';
      } else {
        lifeSnap.forEach(doc => {
          const data = doc.data();
          lifeContainer.innerHTML += `
            <div class="flex justify-between items-center p-2 rounded bg-surface-secondary border border-theme">
              <span class="font-medium truncate max-w-[70%]">${data.title_ar || data.titleAr || 'موضوع بدون عنوان'}</span>
              <span class="font-mono text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded text-[11px] font-bold">👁️ ${data.views || 0}</span>
            </div>
          `;
        });
      }
    }
  } catch (error) {
    console.error("خطأ في جلب أفضل المحتويات:", error);
  }
}

/**
 * محرك العدّاد السحابي (Counter Engine) - مع منع التكرار
 */
export async function trackEvent(collectionName, docId, actionType) {
  // مفتاح فريد للتخزين المحلي لمنع التكرار لنفس الطالب
  const storageKey = `genez_tracked_${collectionName}_${docId}_${actionType}`;
  
  // نفحص إذا الحدث تم تسجيله مسبقاً من نفس الجهاز 
  if (['views', 'shares', 'visits', 'clicks', 'downloads'].includes(actionType)) {
    if (localStorage.getItem(storageKey)) {
      return; 
    }
    localStorage.setItem(storageKey, "true");
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const dailyDocRef = doc(db, "genez_analytics", `daily_${todayStr}`);
  const generalStatsRef = doc(db, "genez_analytics", "general_stats");

  try {
    if (collectionName && docId && actionType !== 'visits') {
      const itemRef = doc(db, collectionName, docId);
      await setDoc(itemRef, { [actionType]: increment(1) }, { merge: true });
    }

    const dailyUpdateData = { date: todayStr };
    dailyUpdateData[actionType] = increment(1);
    await setDoc(dailyDocRef, dailyUpdateData, { merge: true });

    if (['visits', 'downloads', 'likes', 'shares', 'clicks'].includes(actionType)) {
      const generalField = `total_${actionType}`;
      await setDoc(generalStatsRef, { [generalField]: increment(1) }, { merge: true });
    }
  } catch (error) {
    console.warn("Analytics Engine Notice:", error.message);
  }
}

// ✅ ربط الدالة بالـ window عشان تقدر أزرار الـ HTML اللي فيها (onclick) تستدعيها بدون مشاكل
window.trackEvent = trackEvent;

/**
 * دالة لخصم الإحصائيات عند حذف عنصر (مادة، خبر، الخ)
 * لضمان عدم تراكم أرقام وهمية بعد الحذف.
 */
export async function deductStatsOnDelete(item) {
  if (!item) return;
  try {
    const statsRef = doc(db, "genez_analytics", "general_stats");
    const views = parseInt(item.views || 0);
    const likes = parseInt(item.likes || 0);
    const shares = parseInt(item.shares || 0);
    const downloads = parseInt(item.downloads || 0);
    const clicks = parseInt(item.clicks || 0);

    if (views === 0 && likes === 0 && shares === 0 && downloads === 0 && clicks === 0) return;

    const snap = await getDoc(statsRef);
    if (snap.exists()) {
       const currentStats = snap.data();
       const updates = {};
       
       if (views > 0) updates.total_views = Math.max(0, (currentStats.total_views || 0) - views);
       if (likes > 0) updates.total_likes = Math.max(0, (currentStats.total_likes || 0) - likes);
       if (shares > 0) updates.total_shares = Math.max(0, (currentStats.total_shares || 0) - shares);
       if (downloads > 0) updates.total_downloads = Math.max(0, (currentStats.total_downloads || 0) - downloads);
       if (clicks > 0) updates.total_clicks = Math.max(0, (currentStats.total_clicks || 0) - clicks);
       
       if (Object.keys(updates).length > 0) {
         await updateDoc(statsRef, updates);
       }
    }
  } catch (error) {
    console.warn("Analytics Cleanup Notice:", error.message);
  }
}
window.deductStatsOnDelete = deductStatsOnDelete;