// assets/js/admin/admin-activity.js
import { auth, db } from "../firebase-init.js";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  getDocs, 
  deleteDoc, 
  doc,
  getDoc,
  updateDoc, 
  setDoc, 
  serverTimestamp,
  deleteField 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  setPersistence, 
  browserSessionPersistence 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

function escapeHTML(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

let allLogs = []; 
let currentSearchQuery = "";
let unsubscribeLogs = null;
let unsubscribeDevices = null;

function initSecretGate() {
  const loginGate = document.getElementById("secret-login-gate");
  const dashboard = document.getElementById("monitor-dashboard");
  const authForm = document.getElementById("monitor-auth-form");
  const errorMsg = document.getElementById("login-error-msg");
  const logoutBtn = document.getElementById("logout-monitor-btn");

  if (!loginGate || !dashboard) return;

  setPersistence(auth, browserSessionPersistence).catch(err => console.error("Persistence error:", err));

  onAuthStateChanged(auth, async (user) => {
    if (user && db) {
      try {
        const docRef = doc(db, "admin_roles", user.email.toLowerCase());
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().role === 'owner') {
          errorMsg?.classList.add("hidden");
          showDashboard();
        } else {
          await signOut(auth);
          if (errorMsg) {
            errorMsg.innerText = "غير مصرح لك بالوصول لغرفة المراقبة السحابية؛ هذه المساحة مخصصة للمالك فقط.";
            errorMsg.classList.remove("hidden");
          }
          hideDashboard();
        }
      } catch (error) {
        console.error("Auth check error:", error);
        await signOut(auth);
        hideDashboard();
      }
    } else {
      hideDashboard();
    }
  });

  authForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const emailVal = document.getElementById("monitor-email").value.trim();
    const passVal = document.getElementById("monitor-pass").value;

    if (errorMsg) errorMsg.classList.add("hidden");

    signInWithEmailAndPassword(auth, emailVal, passVal)
      .catch((error) => {
        if (errorMsg) {
          errorMsg.innerText = "بيانات الوصول غير صحيحة!";
          errorMsg.classList.remove("hidden");
        }
        document.getElementById("monitor-pass").value = "";
      });
  });

  logoutBtn?.addEventListener("click", () => {
    signOut(auth).then(() => {
      if (unsubscribeLogs) unsubscribeLogs();
      if (unsubscribeDevices) unsubscribeDevices();
      location.reload();
    });
  });
}

function hideDashboard() {
  document.getElementById("secret-login-gate")?.classList.remove("hidden");
  document.getElementById("monitor-dashboard")?.classList.add("hidden");
}

function showDashboard() {
  document.getElementById("secret-login-gate").classList.add("hidden");
  document.getElementById("monitor-dashboard").classList.remove("hidden");

  // بدء الاستماع اللحظي للسجلات وطلب الأجهزة
  initCloudLogsListener();
  initDeviceRequestsListener();

  document.getElementById("logs-search-input")?.addEventListener("input", (e) => {
    currentSearchQuery = e.target.value.trim().toLowerCase();
    renderLogsTable();
  });
  
  document.getElementById("clear-logs-btn")?.addEventListener("click", clearAllLogs);
}

// 💡 1. استماع وعرض طلبات اعتماد الأجهزة المعلقة (مع الخيارات الثلاثة)
function initDeviceRequestsListener() {
  const bannerContainer = document.getElementById("device-requests-banner");
  if (!bannerContainer) return;

  const rolesRef = collection(db, "admin_roles");
  unsubscribeDevices = onSnapshot(rolesRef, (snapshot) => {
    const pendingRequests = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.pendingDevice && data.pendingDevice.id) {
        pendingRequests.push({ email: docSnap.id, ...data.pendingDevice, currentAllowed: data.allowedDevices || [] });
      }
    });

    if (pendingRequests.length === 0) {
      bannerContainer.classList.add("hidden");
      bannerContainer.innerHTML = "";
      return;
    }

    bannerContainer.classList.remove("hidden");
    bannerContainer.innerHTML = pendingRequests.map(req => `
      <div class="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg animate-fade-in">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-xl">⚠️</span>
            <h4 class="text-sm font-bold text-amber-300">طلب اعتماد جهاز جديد للمشرف: <span class="text-white font-mono underline">${escapeHTML(req.email)}</span></h4>
          </div>
          <p class="text-xs text-muted font-mono">💻 مواصفات الجهاز: <span class="text-content font-bold">${escapeHTML(req.info)}</span></p>
          <p class="text-[11px] text-muted">الأجهزة المعتمدة له حالياً: <span class="font-bold font-mono text-teal-400">${req.currentAllowed.length} أجهزة</span></p>
        </div>

        <div class="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <!-- الخيار 1: اعتماد وإلغاء القديم -->
          <button type="button" onclick="handleDeviceDecision('${escapeHTML(req.email)}', '${escapeHTML(req.id)}', '${escapeHTML(req.info)}', 'replace')" 
            class="bg-red-600 hover:bg-red-700 text-white text-xs py-2 px-3 rounded-xl font-bold shadow transition-all">
            1️⃣ اعتماد وإلغاء القديم
          </button>

          <!-- الخيار 2: اعتماد كجهاز إضافي -->
          <button type="button" onclick="handleDeviceDecision('${escapeHTML(req.email)}', '${escapeHTML(req.id)}', '${escapeHTML(req.info)}', 'add')" 
            class="bg-teal-600 hover:bg-teal-700 text-white text-xs py-2 px-3 rounded-xl font-bold shadow transition-all">
            2️⃣ اعتماد كجهاز إضافي ➕
          </button>

          <!-- الخيار 3: عدم الاعتماد (رفض) -->
          <button type="button" onclick="handleDeviceDecision('${escapeHTML(req.email)}', '${escapeHTML(req.id)}', '${escapeHTML(req.info)}', 'reject')" 
            class="bg-surface-secondary hover:bg-theme text-muted hover:text-white text-xs py-2 px-3 rounded-xl font-bold border border-theme transition-all">
            3️⃣ عدم الاعتماد ❌
          </button>
        </div>
      </div>
    `).join("");
  });
}

// دالة تنفيذ قرار المالك (الخيارات الثلاثة)
window.handleDeviceDecision = async (email, newDeviceId, deviceInfo, decision) => {
  const docRef = doc(db, "admin_roles", email);
  try {
    if (decision === 'replace') {
      // استبدال كل الأجهزة بهذا الجهاز فقط
      await updateDoc(docRef, {
        allowedDevices: [newDeviceId],
        pendingDevice: deleteField()
      });
      await logAuditActivity(email, "✅ وافق المالك: اعتماد كجهاز وحيد وإلغاء كل الأجهزة السابقة", deviceInfo);
    } 
    else if (decision === 'add') {
      // إضافته بجانب الأجهزة المعتمدة السابقة
      const docSnap = await getDocs(query(collection(db, "admin_roles"))); // قراءة سريعة أو جلب الحالي
      // الأفضل جلب المصفوفة الحالية وإضافة الجديد لها:
      const currentDoc = await getDoc(docRef);
      const currentDevices = currentDoc.exists() ? (currentDoc.data().allowedDevices || []) : [];
      if (!currentDevices.includes(newDeviceId)) currentDevices.push(newDeviceId);

      await updateDoc(docRef, {
        allowedDevices: currentDevices,
        pendingDevice: deleteField()
      });
      await logAuditActivity(email, "➕ وافق المالك: اعتماد كجهاز إضافي مسموح به", deviceInfo);
    } 
    else if (decision === 'reject') {
      // حذف الطلب وإبقاؤه محظوراً
      await updateDoc(docRef, {
        pendingDevice: deleteField()
      });
      await logAuditActivity(email, "❌ رفض المالك طلب اعتماد الجهاز الجديد", deviceInfo);
    }
  } catch (err) {
    console.error("Device decision error:", err);
    alert("حدث خطأ أثناء معالجة القرار السحابي.");
  }
};

// دالة تسجيل النشاطات في Firestore
async function logAuditActivity(email, action, target) {
  try {
    await setDoc(doc(collection(db, "activity_logs")), {
      adminEmail: email,
      action: action,
      targetName: target,
      timestamp: serverTimestamp()
    });
  } catch (err) { console.error("Log error:", err); }
}

// 2. استماع السجلات + تنظيف 30 يوم
function initCloudLogsListener() {
  const tableBody = document.getElementById("activity-logs-table-body");
  if (!tableBody) return;

  const logsRef = collection(db, "activity_logs");
  const q = query(logsRef, orderBy("timestamp", "desc"));

  tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-muted">⏳ جاري الاتصال المشفر بـ Cloud Firestore...</td></tr>`;

  unsubscribeLogs = onSnapshot(q, (snapshot) => {
    allLogs = [];
    const logsToPurge = []; 
    const nowTimestamp = Date.now();
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000; 

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      let logTime = data.timestamp && data.timestamp.toMillis ? data.timestamp.toMillis() : Date.now();

      if (nowTimestamp - logTime >= thirtyDaysInMs) {
        logsToPurge.push(docSnap.id);
      } else {
        allLogs.push({ id: docSnap.id, ...data, logTime });
      }
    });

    if (logsToPurge.length > 0) executeAutoPurge(logsToPurge);
    renderLogsTable();
  }, (error) => {
    console.error("❌ خطأ في استماع سجلات النشاط:", error);
    tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-red-500 font-bold">❌ فشل الاتصال بقاعدة البيانات السحابية!</td></tr>`;
  });
}

async function executeAutoPurge(logIds) {
  try {
    for (const id of logIds) await deleteDoc(doc(db, "activity_logs", id));
  } catch (err) { console.error("Purge error:", err); }
}

function renderLogsTable() {
  const tableBody = document.getElementById("activity-logs-table-body");
  const countBadge = document.getElementById("logs-count-badge");
  if (!tableBody) return;

  const filteredLogs = allLogs.filter((log) => {
    if (!currentSearchQuery) return true;
    const email = (log.adminEmail || "").toLowerCase();
    const action = (log.action || "").toLowerCase();
    const target = (log.targetName || "").toLowerCase();
    return email.includes(currentSearchQuery) || action.includes(currentSearchQuery) || target.includes(currentSearchQuery);
  });

  if (countBadge) countBadge.innerText = `⏳ ${filteredLogs.length} عملية نشطة`;

  if (filteredLogs.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-12 text-muted font-medium">لا توجد سجلات نشاط مطابقة حالياً.</td></tr>`;
    return;
  }

  tableBody.innerHTML = filteredLogs.map((log) => {
    let formattedTime = "الآن...";
    if (log.timestamp && log.timestamp.toDate) {
      formattedTime = log.timestamp.toDate().toLocaleString("ar-EG", {
        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true
      });
    }

    let badgeStyle = "bg-slate-700 text-slate-300 border-slate-600";
    if (log.action?.includes("إضافة") || log.action?.includes("نشر")) badgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (log.action?.includes("تعديل") || log.action?.includes("تحديث") || log.action?.includes("وافق")) badgeStyle = "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (log.action?.includes("حذف") || log.action?.includes("محظورة") || log.action?.includes("رفض")) badgeStyle = "bg-rose-500/10 text-rose-400 border-rose-500/20";

    return `
      <tr class="border-b border-theme hover:bg-surface-secondary/60 transition-colors">
        <td class="px-5 py-4 font-mono text-content font-semibold">
          <div class="flex items-center gap-2">
            <span class="text-accent">👤</span>
            <span class="text-teal-300 font-mono">${escapeHTML(log.adminEmail || "مشرف غير معروف")}</span>
          </div>
        </td>
        <td class="px-5 py-4">
          <span class="px-3 py-1 rounded-lg text-[11px] font-bold border ${badgeStyle}">${escapeHTML(log.action || "عملية نظام")}</span>
        </td>
        <td class="px-5 py-4 font-medium text-content max-w-xs truncate" title="${escapeHTML(log.targetName || '')}">
          ${log.targetName ? `📁 ${escapeHTML(log.targetName)}` : '<span class="text-muted italic">--</span>'}
        </td>
        <td class="px-5 py-4 text-muted font-mono text-[11px] whitespace-nowrap">🕒 ${formattedTime}</td>
      </tr>
    `;
  }).join("");
}

async function clearAllLogs() {
  if (!confirm("⚠️ هل أنت متأكد تماماً من رغبتك في تفريغ غرفة المراقبة ومسح كل السجلات من السحابة نهائياً؟")) return;
  const clearBtn = document.getElementById("clear-logs-btn");
  if (clearBtn) { clearBtn.disabled = true; clearBtn.innerText = "⏳ جاري المسح السحابي..."; }
  try {
    const querySnapshot = await getDocs(collection(db, "activity_logs"));
    const deletePromises = [];
    querySnapshot.forEach((docSnap) => deletePromises.push(deleteDoc(doc(db, "activity_logs", docSnap.id))));
    await Promise.all(deletePromises);
    alert("🗑️ تم تفريغ كافة سجلات النشاط من السحابة بنجاح!");
  } catch (error) {
    console.error("❌ فشل مسح السجلات:", error);
    alert("❌ حدث خطأ أثناء محاولة مسح السجلات السحابية.");
  } finally {
    if (clearBtn) { clearBtn.disabled = false; clearBtn.innerText = "🗑️ مسح كل السجلات نهائياً"; }
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", initSecretGate);
} else {
  initSecretGate();
}