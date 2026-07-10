/**
 * Gene_Z — Shared runtime
 * Loads reusable HTML components, translates UI, and highlights active navigation.
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
      bindLanguageToggle(); // تفعيل زر اللغة بعد تحميل الهيدر
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
    document.querySelectorAll(".nav-link").forEach((link) => {
      const href = link.getAttribute("href") || "";
      const page = href.split("/").pop();
      link.classList.toggle("active", page === current || (current === "" && page === "index.html"));
    });
  }

  function bindMobileNav() {
    const toggle = document.getElementById("mobile-menu-toggle");
    const menu = document.getElementById("mobile-menu");
    if (!toggle || !menu) return;

    toggle.addEventListener("click", () => {
      menu.classList.toggle("hidden");
    });

    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => menu.classList.add("hidden"));
    });
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

  // ==========================================
  // نظام الترجمة وإدارة اللغة (Language Logic)
  // ==========================================
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
    // تطبيق اللغة فوراً على العناصر التي تم تحميلها
    const savedLang = localStorage.getItem("gene_z_lang") || "ar";
    applyLanguage(savedLang);
  }

  function applyLanguage(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    
    // تغيير الخطوط بناءً على اللغة ليكون الشكل أنظف
    if (lang === "en") {
      document.body.style.setProperty("font-family", "'Inter', sans-serif", "important");
    } else {
      document.body.style.setProperty("font-family", "'Noto Kufi Arabic', sans-serif", "important");
    }

    // تبديل النصوص للعناصر التي تحتوي على data-en
    document.querySelectorAll("[data-en]").forEach(el => {
      // التحقق إذا كان العنصر هو حقل إدخال (Input/Textarea) لتغيير الـ placeholder
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        if (!el.hasAttribute("data-ar")) {
          el.setAttribute("data-ar", el.getAttribute("placeholder") || "");
        }
        el.setAttribute("placeholder", lang === "en" ? el.getAttribute("data-en") : el.getAttribute("data-ar"));
      } else {
        // للعناصر العادية نغير الـ innerHTML
        if (!el.hasAttribute("data-ar")) {
          el.setAttribute("data-ar", el.innerHTML);
        }
        el.innerHTML = lang === "en" ? el.getAttribute("data-en") : el.getAttribute("data-ar");
      }
    });

    // تحديث نص زر اللغة
    const langLabel = document.getElementById("lang-label");
    if (langLabel) {
      langLabel.textContent = lang === "ar" ? "EN" : "عربي";
    }

    // إرسال إشارة لكل الموقع بتغير اللغة (لإعادة رسم البطاقات في الـ JS بدون Refresh)
    window.dispatchEvent(new CustomEvent("genez:lang-changed", { detail: { lang } }));
  }

  document.addEventListener("DOMContentLoaded", async () => {
    // تطبيق اللغة على محتوى الصفحة الأساسي قبل تحميل المكونات
    const savedLang = localStorage.getItem("gene_z_lang") || "ar";
    applyLanguage(savedLang);

    await Promise.all([
      loadComponent("site-header", "header.html"),
      loadComponent("site-navbar", "navbar.html"),
      loadComponent("site-footer", "footer.html"),
    ]);
  });

  window.GeneZ = { loadComponent, resolveBasePath: () => COMPONENT_BASE };
})();