/**
 * Gene_Z — Shared runtime
 * Loads reusable HTML components, translates UI, and highlights active navigation.
 * Integrated safely with Cloud-Native Analytics Engine using Dynamic Import.
 */

(function () {
  const COMPONENT_BASE = resolveBasePath();

  function resolveBasePath() {
    const path = window.location.pathname;
    if (path.includes("/pages/")) return "../";
    return "./";
  }

  async function loadComponent(targetId, file) {
    const container = document.getElementById(targetId);
    if (!container) return;

    try {
      const response = await fetch(`${COMPONENT_BASE}components/${file}`);
      if (!response.ok) throw new Error(`Failed to load ${file}`);
      container.innerHTML = await response.text();
      fixRelativeLinks(container);
      highlightActiveNav();
      bindMobileNav();
      bindThemeToggles();
      bindLanguageToggle();
    } catch (err) {
      console.warn("[Gene_Z] Component load error:", err.message);
    }
  }

  function fixRelativeLinks(container) {
    container.querySelectorAll("[data-href]").forEach((el) => {
      const href = el.getAttribute("data-href");
      el.setAttribute("href", `${COMPONENT_BASE}${href}`);
    });
    container.querySelectorAll("[data-src]").forEach((el) => {
      const src = el.getAttribute("data-src");
      el.setAttribute("src", `${COMPONENT_BASE}${src}`);
    });
  }

  function highlightActiveNav() {
    const current = window.location.pathname.split("/").pop() || "index.html";
    const currentBase = current.split("#")[0];
    const urlParams = new URLSearchParams(window.location.search);

    document.querySelectorAll(".nav-link").forEach((link) => {
      const href = link.getAttribute("href") || "";
      const page = href.split("/").pop();
      const pageBase = page.split("#")[0];

      let isActive = (pageBase === currentBase || (currentBase === "" && pageBase === "index.html"));
      
      // Handle sub-pages
      if (currentBase === "course-details.html") {
        const type = urlParams.get('type');
        if (type === 'extra' && pageBase === "courses-extra.html") isActive = true;
        else if (type !== 'extra' && pageBase === "courses.html") isActive = true;
      }
      if (currentBase === "life-details.html" && pageBase === "life-connection.html") isActive = true;
      if (currentBase === "news-details.html" && pageBase === "news.html") isActive = true;

      // Exclusion: Gene-Z section and Study Plan should never be active
      if (href.includes("#about-us") || href.includes("#study-plan")) {
        isActive = false;
      }

      link.classList.toggle("active", isActive);
    });
  }

  function bindMobileNav() {
    const toggle = document.querySelector("button[aria-label='Open menu']");
    const menu = document.getElementById("mobile-menu");
    if (!toggle || !menu) return;

    // ✅ إزالة أي مستمعات قديمة بنسخ الزر
    const newToggle = toggle.cloneNode(true);
    toggle.parentNode.replaceChild(newToggle, toggle);

    newToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("hidden");
    });

    // إغلاق القائمة عند النقر على روابط داخلها
    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        menu.classList.add("hidden");
      });
    });

    // إغلاق القائمة عند النقر خارجها
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && e.target !== newToggle && !newToggle.contains(e.target)) {
        menu.classList.add("hidden");
      }
    }, { capture: true });
  }

  function bindThemeToggles() {
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "true";
      btn.addEventListener("click", () => {
        if (window.GeneZTheme) window.GeneZTheme.toggleTheme();
      });
    });
  }

  function bindLanguageToggle() {
    const langBtn = document.getElementById("lang-toggle");
    if (langBtn && !langBtn.dataset.bound) {
      langBtn.dataset.bound = "true";
      langBtn.addEventListener("click", () => {
        const currentLang = document.documentElement.lang === "ar" ? "en" : "ar";
        localStorage.setItem("gene_z_lang", currentLang);
        applyLanguage(currentLang);
      });
    }
    const savedLang = localStorage.getItem("gene_z_lang") || "ar";
    applyLanguage(savedLang);
  }

  function applyLanguage(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    
    if (lang === "en") {
      document.body.style.setProperty("font-family", "'Inter', sans-serif", "important");
    } else {
      document.body.style.setProperty("font-family", "'Noto Kufi Arabic', sans-serif", "important");
    }

    document.querySelectorAll("[data-en]").forEach(el => {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        if (!el.hasAttribute("data-ar")) {
          el.setAttribute("data-ar", el.getAttribute("placeholder") || "");
        }
        el.setAttribute("placeholder", lang === "en" ? el.getAttribute("data-en") : el.getAttribute("data-ar"));
      } else {
        if (!el.hasAttribute("data-ar")) {
          el.setAttribute("data-ar", el.innerHTML);
        }
        el.innerHTML = lang === "en" ? el.getAttribute("data-en") : el.getAttribute("data-ar");
      }
    });

    const langLabel = document.getElementById("lang-label");
    if (langLabel) {
      langLabel.textContent = lang === "ar" ? "EN" : "عر";
    }

    window.dispatchEvent(new CustomEvent("genez:lang-changed", { detail: { lang } }));
  }

  async function checkNotifications() {
    try {
      // Dynamic import to avoid slowing down main page load
      const { db } = await import("./firebase-init.js");
      const { collection, query, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      
      const q = query(collection(db, "genez_updates"), orderBy("timestamp", "desc"), limit(1));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const latestDoc = snapshot.docs[0];
        const latestTime = latestDoc.data().timestamp?.toMillis() || 0;
        const lastSeen = parseInt(localStorage.getItem("genez_last_seen_update") || "0");
        
        if (latestTime > lastSeen) {
          // ✅ إظهار النقطة الحمراء على جميع روابط الإعلانات
          showNotificationDot();
        } else {
          hideNotificationDot();
        }
      }
    } catch (err) {
      console.warn("Error checking notifications:", err);
    }
  }

  function showNotificationDot() {
    document.querySelectorAll(".notification-dot").forEach(dot => dot.classList.remove("hidden"));
  }

  function hideNotificationDot() {
    document.querySelectorAll(".notification-dot").forEach(dot => dot.classList.add("hidden"));
  }

  function bindNotificationBell() {
    // ✅ لما يضغط على رابط الإعلانات يُسجِّل الوقت ويُخفي النقطة
    document.querySelectorAll("a[href*='updates.html'], a[data-href*='updates.html']").forEach(link => {
      link.addEventListener("click", () => {
        localStorage.setItem("genez_last_seen_update", Date.now().toString());
        hideNotificationDot();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    // ✅ تشغيل عدّاد الزيارات اللحظي عبر Dynamic Import (بدون أي تعارض مع المتصفح)
    if (!sessionStorage.getItem("genez_visit_tracked")) {
      import("./admin/admin-analytics.js")
        .then((mod) => {
          mod.trackEvent(null, null, "visits");
        })
        .catch((err) => console.warn("Analytics tracking error:", err));
      sessionStorage.setItem("genez_visit_tracked", "true");
    }

    const savedLang = localStorage.getItem("gene_z_lang") || "ar";
    applyLanguage(savedLang);

    await Promise.all([
      loadComponent("site-header", "header.html"),
      loadComponent("site-navbar", "navbar.html"),
      loadComponent("site-footer", "footer.html"),
    ]);

    checkNotifications();
    bindNotificationBell();
  });

  window.GeneZ = { loadComponent, resolveBasePath: () => COMPONENT_BASE };
})();