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
  increment 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let analyticsChartInstance = null;

export async function initAnalyticsDashboard() {
  await loadGeneralStats();
  await loadAnalyticsChart('7'); 
  await loadTopPerformingContent();
  setupFilterListeners();
}

async function loadGeneralStats() {
  try {
    const generalStatsRef = doc(db, "genez_analytics", "general_stats");
    const docSnap = await getDoc(generalStatsRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('stat-total-visits').innerText = (data.total_visits || 0).toLocaleString('en-US');
      document.getElementById('stat-total-downloads').innerText = (data.total_downloads || 0).toLocaleString('en-US');
      document.getElementById('stat-total-likes').innerText = (data.total_likes || 0).toLocaleString('en-US');
      document.getElementById('stat-total-shares').innerText = (data.total_shares || 0).toLocaleString('en-US');
    } else {
      await setDoc(generalStatsRef, {
        total_visits: 0,
        total_downloads: 0,
        total_likes: 0,
        total_shares: 0,
        total_clicks: 0
      });
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