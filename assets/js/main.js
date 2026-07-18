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
      langLabel.textContent = lang === "ar" ? "EN" : "عربي";
    }

    window.dispatchEvent(new CustomEvent("genez:lang-changed", { detail: { lang } }));
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
  });

  window.GeneZ = { loadComponent, resolveBasePath: () => COMPONENT_BASE };
})();