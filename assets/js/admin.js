/**
 * Gene_Z Admin Dashboard
 * -----------------------------------------------
 * Client-side gatekeeper (ready for Firebase/backend auth).
 * Manages CRUD for courses + resource attachments via localStorage.
 *
 * Default credentials (CHANGE BEFORE PRODUCTION):
 *   Username: genez_admin
 *   Password: GeneZ@2026
 *
 * Session stored in sessionStorage as "gene_z_admin_session".
 */
(function () {
  const AUTH = {
    username: "genez_admin",
    password: "GeneZ@2026",
  };
  const SESSION_KEY = "gene_z_admin_session";

  let editingCourseId = null;

  /* ── Auth ── */
  function isAuthenticated() {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  }

  function login(username, password) {
    if (username === AUTH.username && password === AUTH.password) {
      sessionStorage.setItem(SESSION_KEY, "true");
      return true;
    }
    return false;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    showGate();
  }

  function showGate() {
    document.getElementById("admin-gate")?.classList.remove("hidden");
    document.getElementById("admin-panel")?.classList.add("hidden");
  }

  function showPanel() {
    document.getElementById("admin-gate")?.classList.add("hidden");
    document.getElementById("admin-panel")?.classList.remove("hidden");
    renderAdminCourseList();
    populateCategorySelect();
  }

  /* ── Course CRUD ── */
  function populateCategorySelect() {
    const select = document.getElementById("course-category");
    if (!select || !window.GeneZCourses) return;
    select.innerHTML = Object.values(GeneZCourses.CATEGORIES)
      .map(
        (c) =>
          `<option value="${c.id}">${c.labelEn} — ${c.labelAr}</option>`
      )
      .join("");
  }

  function renderAdminCourseList() {
    const list = document.getElementById("admin-course-list");
    if (!list || !window.GeneZCourses) return;

    const courses = GeneZCourses.getCourses();
    if (!courses.length) {
      list.innerHTML = `<p class="text-sm text-muted p-4">No courses yet. Add one below.</p>`;
      return;
    }

    list.innerHTML = courses
      .map((c) => {
        const cat = GeneZCourses.CATEGORIES[c.category];
        return `
        <div class="flex items-center justify-between gap-4 p-4 border-b border-theme last:border-0">
          <div class="min-w-0 flex-1">
            <p class="font-medium truncate">${c.title}</p>
            <p class="ar-text text-xs text-muted">${c.titleAr || ""}</p>
            <p class="text-xs text-accent mt-1">${cat ? cat.labelEn : c.category}</p>
          </div>
          <div class="flex gap-2 shrink-0">
            <button type="button" class="btn-outline text-xs py-1 px-3" data-edit="${c.id}">Edit</button>
            <button type="button" class="btn-danger" data-delete="${c.id}">Delete</button>
          </div>
        </div>`;
      })
      .join("");

    list.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => loadCourseForEdit(btn.dataset.edit));
    });
    list.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => deleteCourse(btn.dataset.delete));
    });
  }

  function loadCourseForEdit(id) {
    const course = GeneZCourses.getCourses().find((c) => c.id === id);
    if (!course) return;

    editingCourseId = id;
    document.getElementById("course-title").value = course.title;
    document.getElementById("course-title-ar").value = course.titleAr || "";
    document.getElementById("course-category").value = course.category;
    document.getElementById("course-description").value = course.description;
    document.getElementById("course-description-ar").value = course.descriptionAr || "";
    document.getElementById("form-mode-label").textContent = "Edit Course";
    document.getElementById("cancel-edit-btn").classList.remove("hidden");
    renderResourceManager(course);
    document.getElementById("course-form").scrollIntoView({ behavior: "smooth" });
  }

  function resetForm() {
    editingCourseId = null;
    document.getElementById("course-form")?.reset();
    document.getElementById("form-mode-label").textContent = "Add New Course";
    document.getElementById("cancel-edit-btn")?.classList.add("hidden");
    document.getElementById("resource-manager").innerHTML =
      '<p class="text-xs text-muted">Save the course first, then attach resources.</p>';
  }

  function saveCourse(e) {
    e.preventDefault();
    const courses = GeneZCourses.getCourses();

    const payload = {
      title: document.getElementById("course-title").value.trim(),
      titleAr: document.getElementById("course-title-ar").value.trim(),
      category: document.getElementById("course-category").value,
      description: document.getElementById("course-description").value.trim(),
      descriptionAr: document.getElementById("course-description-ar").value.trim(),
    };

    if (!payload.title || !payload.category) {
      alert("Title and category are required.");
      return;
    }

    if (editingCourseId) {
      const idx = courses.findIndex((c) => c.id === editingCourseId);
      if (idx !== -1) {
        courses[idx] = { ...courses[idx], ...payload };
      }
    } else {
      courses.push({
        id: GeneZCourses.generateId("course"),
        ...payload,
        resources: [],
      });
    }

    GeneZCourses.saveCourses(courses);
    resetForm();
    renderAdminCourseList();
    showToast("Course saved successfully.");
  }

  function deleteCourse(id) {
    if (!confirm("Delete this course and all attached resources?")) return;
    const filtered = GeneZCourses.getCourses().filter((c) => c.id !== id);
    GeneZCourses.saveCourses(filtered);
    if (editingCourseId === id) resetForm();
    renderAdminCourseList();
    showToast("Course deleted.");
  }

  /* ── Resource attachments ── */
  function renderResourceManager(course) {
    const container = document.getElementById("resource-manager");
    if (!container) return;

    const resources = course.resources || [];
    container.innerHTML = `
      <div class="space-y-3">
        <p class="text-sm font-medium">Resources for: ${course.title}</p>
        ${
          resources.length
            ? `<ul class="space-y-2">${resources
                .map(
                  (r) => `
              <li class="flex items-center justify-between gap-2 text-sm p-2 bg-surface-secondary rounded-lg">
                <span class="truncate">${r.name} <span class="text-xs text-muted">(${r.type})</span></span>
                <button type="button" class="btn-danger" data-remove-resource="${r.id}">Remove</button>
              </li>`
                )
                .join("")}</ul>`
            : `<p class="text-xs text-muted">No resources yet.</p>`
        }
        <div class="grid sm:grid-cols-2 gap-3 pt-2 border-t border-theme">
          <div>
            <label class="form-label" for="resource-name">Resource Name</label>
            <input type="text" id="resource-name" class="form-input" placeholder="Lecture Slides Week 1" />
          </div>
          <div>
            <label class="form-label" for="resource-type">Type</label>
            <select id="resource-type" class="form-select">
              <option value="file">File (static link)</option>
              <option value="link">External Link</option>
              <option value="video">Video URL</option>
            </select>
          </div>
          <div class="sm:col-span-2">
            <label class="form-label" for="resource-url">URL / File Path</label>
            <input type="url" id="resource-url" class="form-input" placeholder="https://..." />
          </div>
          <div class="sm:col-span-2">
            <button type="button" id="add-resource-btn" class="btn-primary">Attach Resource</button>
          </div>
        </div>
      </div>`;

    container.querySelector("#add-resource-btn")?.addEventListener("click", () => {
      addResource(course.id);
    });
    container.querySelectorAll("[data-remove-resource]").forEach((btn) => {
      btn.addEventListener("click", () => removeResource(course.id, btn.dataset.removeResource));
    });
  }

  function addResource(courseId) {
    const name = document.getElementById("resource-name")?.value.trim();
    const type = document.getElementById("resource-type")?.value;
    const url = document.getElementById("resource-url")?.value.trim();

    if (!name || !url) {
      alert("Resource name and URL are required.");
      return;
    }

    const courses = GeneZCourses.getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    course.resources = course.resources || [];
    course.resources.push({
      id: GeneZCourses.generateId("res"),
      type,
      name,
      url,
    });

    GeneZCourses.saveCourses(courses);
    renderResourceManager(course);
    showToast("Resource attached.");
  }

  function removeResource(courseId, resourceId) {
    const courses = GeneZCourses.getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    course.resources = (course.resources || []).filter((r) => r.id !== resourceId);
    GeneZCourses.saveCourses(courses);
    renderResourceManager(course);
    showToast("Resource removed.");
  }

  function showToast(msg) {
    const toast = document.getElementById("admin-toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove("hidden", "opacity-0");
    setTimeout(() => toast.classList.add("opacity-0"), 2500);
    setTimeout(() => toast.classList.add("hidden"), 3000);
  }

  /* ── Init ── */
  function init() {
    GeneZCourses.seedIfEmpty();

    if (isAuthenticated()) {
      showPanel();
    } else {
      showGate();
    }

    document.getElementById("login-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const user = document.getElementById("login-username").value.trim();
      const pass = document.getElementById("login-password").value;
      const err = document.getElementById("login-error");

      if (login(user, pass)) {
        err?.classList.add("hidden");
        showPanel();
      } else {
        err?.classList.remove("hidden");
      }
    });

    document.getElementById("logout-btn")?.addEventListener("click", logout);
    document.getElementById("course-form")?.addEventListener("submit", saveCourse);
    document.getElementById("cancel-edit-btn")?.addEventListener("click", resetForm);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
