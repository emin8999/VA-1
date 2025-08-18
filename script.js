// Contact form (demo)
const form = document.querySelector(".contact__form");
const msg = document.querySelector(".form-msg");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    msg.textContent = "Спасибо! Мы свяжемся с вами.";
    form.reset();
    setTimeout(() => (msg.textContent = ""), 4000);
    // TODO: send to backend
    console.log("Contact form data:", data);
  });
}

// Off-canvas drawer (opens from right to left)
const burger = document.querySelector(".burger");
const drawer = document.getElementById("drawer");
const overlay = document.getElementById("drawerOverlay");
const closeBtn = drawer?.querySelector(".drawer__close");

function openDrawer() {
  if (!drawer || !overlay) return;
  drawer.hidden = false;
  overlay.hidden = false;
  requestAnimationFrame(() => {
    drawer.classList.add("open");
    overlay.classList.add("show");
  });
  document.body.classList.add("body--no-scroll");
  burger?.setAttribute("aria-expanded", "true");
  drawer.focus();
}

function closeDrawer() {
  if (!drawer || !overlay) return;
  drawer.classList.remove("open");
  overlay.classList.remove("show");
  document.body.classList.remove("body--no-scroll");
  burger?.setAttribute("aria-expanded", "false");
  setTimeout(() => {
    drawer.hidden = true;
    overlay.hidden = true;
    burger?.focus();
  }, 300);
}

burger?.addEventListener("click", () => {
  const open = drawer && !drawer.hidden;
  open ? closeDrawer() : openDrawer();
});

overlay?.addEventListener("click", closeDrawer);
closeBtn?.addEventListener("click", closeDrawer);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && drawer && !drawer.hidden) {
    closeDrawer();
  }
});

drawer?.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const focusables = drawer.querySelectorAll(
    'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

//Gallery lightbox
document.addEventListener("DOMContentLoaded", () => {
  // Создаем элементы lightbox
  const overlay = document.createElement("div");
  overlay.id = "lightboxOverlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.85);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  `;

  const content = document.createElement("div");
  content.id = "lightboxContent";
  content.style.cssText = `
    max-width: 90%;
    max-height: 90%;
  `;

  overlay.appendChild(content);
  document.body.appendChild(overlay);

  // Закрытие по клику или ESC
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.style.display = "none";
      content.innerHTML = "";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.style.display === "flex") {
      overlay.style.display = "none";
      content.innerHTML = "";
    }
  });

  // Ищем все изображения и видео внутри галереи
  const galleryItems = document.querySelectorAll(
    ".gallery img, .gallery video"
  );

  galleryItems.forEach((item) => {
    item.style.cursor = "pointer";
    item.addEventListener("click", () => {
      content.innerHTML = "";

      if (item.tagName.toLowerCase() === "img") {
        const img = document.createElement("img");
        img.src = item.src;
        img.alt = item.alt || "";
        img.style.maxWidth = "100%";
        img.style.maxHeight = "100%";
        content.appendChild(img);
      } else if (item.tagName.toLowerCase() === "video") {
        const video = document.createElement("video");
        video.src = item.currentSrc || item.src;
        video.controls = true;
        video.autoplay = true;
        video.style.maxWidth = "100%";
        video.style.maxHeight = "100%";
        content.appendChild(video);
      }

      overlay.style.display = "flex";
    });
  });
});

//classes
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("classesGrid");
  const cards = Array.from(grid.querySelectorAll(".card"));

  const search = document.getElementById("classSearch");
  const typeFilter = document.getElementById("typeFilter");
  const levelFilter = document.getElementById("levelFilter");

  function normalize(s) {
    return (s || "").toLowerCase().trim();
  }

  function applyFilters() {
    const q = normalize(search.value);
    const type = typeFilter.value; // all | dance | modeling | vocal | fitness
    const level = levelFilter.value; // all | beginner | intermediate | advanced

    cards.forEach((card) => {
      const tags = normalize(card.dataset.tags);
      const ctype = card.dataset.type || "dance";
      const clevel = card.dataset.level || "beginner";

      // match search
      const matchesSearch =
        !q ||
        tags.includes(q) ||
        card.querySelector("h3").textContent.toLowerCase().includes(q);
      const matchesType = type === "all" || ctype === type;
      const matchesLevel = level === "all" || clevel === level;

      const show = matchesSearch && matchesType && matchesLevel;
      card.classList.toggle("hidden", !show);
    });
  }

  search.addEventListener("input", applyFilters);
  typeFilter.addEventListener("change", applyFilters);
  levelFilter.addEventListener("change", applyFilters);

  // Инициализация
  applyFilters();
});

//add class
document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "academyClasses";
  const grid = document.getElementById("classesGrid");
  const empty = document.getElementById("emptyMsg");

  // Фильтры (у тебя уже есть такие id в разметке)
  const searchInput = document.getElementById("classSearch");
  const typeFilter = document.getElementById("typeFilter");
  const levelFilter = document.getElementById("levelFilter");

  // Для мгновенных обновлений между вкладками
  const bc =
    "BroadcastChannel" in window ? new BroadcastChannel("classes") : null;

  // Преобразование уровня в читаемый вид
  const LEVEL_MAP = {
    beginner: "Начинающий",
    intermediate: "Средний",
    advanced: "Продвинутый",
  };
  const TYPE_MAP = {
    dance: "Танцы",
    modeling: "Моделинг",
    vocal: "Вокал",
    fitness: "Фитнес/Гимнастика",
  };

  function loadClasses() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function escapeHtml(s = "") {
    return s.replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[m])
    );
  }

  function makeCard(cls) {
    const article = document.createElement("article");
    article.className = "card";
    article.dataset.tags = cls.tags || "";
    article.dataset.type = cls.type || "";
    article.dataset.level = cls.level || "";

    article.innerHTML = `
      <div class="card__media" style="--img:url('${escapeHtml(
        cls.image
      )}'); background-image:url('${escapeHtml(cls.image)}')"></div>
      <div class="card__body">
        <h3>${escapeHtml(cls.title || "")}</h3>
        <div class="badges">
          <span class="badge">${
            TYPE_MAP[cls.type] || escapeHtml(cls.type || "Тип")
          }</span>
          <span class="badge badge--lvl">${
            LEVEL_MAP[cls.level] || escapeHtml(cls.level || "Уровень")
          }</span>
        </div>
        <p>${escapeHtml(cls.description || "")}</p>
        <div class="meta">
          <span>${escapeHtml(cls.schedule || "")}</span>
          <span>Педагог: ${escapeHtml(cls.teacher || "")}</span>
        </div>
        <a href="#signup" class="btn btn-outline">Записаться</a>
      </div>
    `;
    return article;
  }

  function applyFilters() {
    const q = (searchInput?.value || "").toLowerCase().trim();
    const type = typeFilter?.value || "all";
    const level = levelFilter?.value || "all";

    // фильтрация уже отрисованных карточек
    const cards = grid.querySelectorAll(".card");
    cards.forEach((card) => {
      const tags = (card.dataset.tags || "").toLowerCase();
      const text = (card.querySelector("h3")?.textContent || "").toLowerCase();
      const ctype = card.dataset.type || "";
      const clevel = card.dataset.level || "";

      const matchesSearch = !q || tags.includes(q) || text.includes(q);
      const matchesType = type === "all" || ctype === type;
      const matchesLevel = level === "all" || clevel === level;

      card.style.display =
        matchesSearch && matchesType && matchesLevel ? "" : "none";
    });
  }

  function render() {
    const list = loadClasses();
    grid.innerHTML = "";

    if (!list.length) {
      if (empty) empty.style.display = "block";
      return;
    }
    if (empty) empty.style.display = "none";

    // Порядок сохраняем как в localStorage (push → в конец)
    list.forEach((cls) => grid.appendChild(makeCard(cls)));
    applyFilters(); // применить выбранные фильтры сразу после рендера
  }

  // Первичный рендер
  render();

  // Живые обновления: BroadcastChannel (если обе страницы открыты)
  if (bc) {
    bc.addEventListener("message", (ev) => {
      if (ev.data && ev.data.type === "updated") render();
    });
  }

  // Обновление при изменении localStorage (если добавление было из другой вкладки/окна)
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) render();
  });

  // Фильтры
  searchInput?.addEventListener("input", applyFilters);
  typeFilter?.addEventListener("change", applyFilters);
  levelFilter?.addEventListener("change", applyFilters);
});

//instructors
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("grid");
  const cards = Array.from(grid.querySelectorAll(".card"));

  const q = document.getElementById("q");
  const discipline = document.getElementById("discipline");
  const level = document.getElementById("level");

  const overlay = document.getElementById("modalOverlay");
  const modal = document.getElementById("modal");
  const closeBtn = modal.querySelector(".modal__close");

  const mTitle = document.getElementById("modalTitle");
  const mImg = document.getElementById("modalImg");
  const mBio = document.getElementById("modalBio");
  const mDiscipline = document.getElementById("modalDiscipline");
  const mLevel = document.getElementById("modalLevel");
  const mSchedule = document.getElementById("modalSchedule");
  const mCta = document.getElementById("modalCta");

  function norm(s) {
    return (s || "").toLowerCase().trim();
  }

  function applyFilters() {
    const query = norm(q.value);
    const d = discipline.value; // all | ballet | folk | rnb | modeling | ...
    const lv = level.value; // all | beginner | intermediate | advanced

    cards.forEach((card) => {
      const name = norm(card.dataset.name);
      const tags = norm(card.dataset.tags);
      const cd = card.dataset.discipline || "ballet";
      const clv = card.dataset.level || "beginner";

      const matchQ = !query || name.includes(query) || tags.includes(query);
      const matchD = d === "all" || cd === d;
      const matchL = lv === "all" || clv === lv;

      card.style.display = matchQ && matchD && matchL ? "" : "none";
    });
  }

  q.addEventListener("input", applyFilters);
  discipline.addEventListener("change", applyFilters);
  level.addEventListener("change", applyFilters);
  applyFilters();

  function openModal(card) {
    const name = card.dataset.name || "";
    const img = card.dataset.img || "";
    const bio = card.dataset.bio || "";
    const cd = card.dataset.discipline || "";
    const lv = card.dataset.level || "";
    const sch = card.dataset.schedule || "";
    const cta = card.dataset.cta || "#";

    mTitle.textContent = name;
    mImg.src = img;
    mImg.alt = name;
    mBio.textContent = bio;
    mDiscipline.textContent = labelByDiscipline(cd);
    mLevel.textContent = levelLabel(lv);
    mSchedule.textContent = sch || "Расписание уточняется";
    mCta.href = cta;

    overlay.hidden = false;
    modal.hidden = false;
    requestAnimationFrame(() => {
      overlay.classList.add("show");
      modal.classList.add("show");
    });
    modal.focus();
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    overlay.classList.remove("show");
    modal.classList.remove("show");
    document.body.style.overflow = "";
    setTimeout(() => {
      overlay.hidden = true;
      modal.hidden = true;
    }, 220);
  }

  function labelByDiscipline(d) {
    const map = {
      ballet: "Балет",
      folk: "Народные",
      rnb: "R&B / Хип-хоп",
      modeling: "Моделинг",
      vocal: "Вокал",
      gym: "Гимнастика",
      contemporary: "Contemporary",
      jazzfunk: "Jazz Funk",
      latin: "Latino",
      tap: "Tap / Степ",
    };
    return map[d] || "Направление";
  }

  function levelLabel(l) {
    const map = {
      beginner: "Начинающий",
      intermediate: "Средний",
      advanced: "Продвинутый",
    };
    return map[l] || "Уровень";
  }

  // кнопки "Подробнее"
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open]");
    if (!btn) return;
    const card = e.target.closest(".card");
    if (card) openModal(card);
  });

  // закрытие модалки
  overlay.addEventListener("click", closeModal);
  closeBtn.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });
});

//add-instructors.js
document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "academyInstructors"; // ключ в localStorage
  const grid = document.getElementById("grid");
  const empty = document.getElementById("emptyMsg");

  // фильтры
  const qInput = document.getElementById("q");
  const dSelect = document.getElementById("discipline");
  const lSelect = document.getElementById("level");

  // модалка
  const overlay = document.getElementById("modalOverlay");
  const modal = document.getElementById("modal");
  const closeBtn = modal.querySelector(".modal__close");
  const mTitle = document.getElementById("modalTitle");
  const mImg = document.getElementById("modalImg");
  const mBio = document.getElementById("modalBio");
  const mDiscipline = document.getElementById("modalDiscipline");
  const mLevel = document.getElementById("modalLevel");
  const mSchedule = document.getElementById("modalSchedule");
  const mCta = document.getElementById("modalCta");

  // живые обновления между вкладками
  const bc =
    "BroadcastChannel" in window ? new BroadcastChannel("instructors") : null;

  const LEVEL_MAP = {
    beginner: "Начинающий",
    intermediate: "Средний",
    advanced: "Продвинутый",
  };
  const DISC_MAP = {
    ballet: "Балет",
    folk: "Народные",
    rnb: "R&B / Хип-хоп",
    modeling: "Моделинг",
    vocal: "Вокал",
    gym: "Гимнастика",
    contemporary: "Contemporary",
    jazzfunk: "Jazz Funk",
    latin: "Latino",
    tap: "Tap / Степ",
  };

  function loadList() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }
  function escapeHtml(s = "") {
    return s.replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[m])
    );
  }

  function makeCard(ins) {
    const el = document.createElement("article");
    el.className = "card";
    el.dataset.name = ins.name || "";
    el.dataset.tags = ins.tags || "";
    el.dataset.discipline = ins.discipline || "";
    el.dataset.level = ins.level || "";
    el.dataset.img = ins.img || "";
    el.dataset.bio = ins.bio || "";
    el.dataset.schedule = ins.schedule || "";
    el.dataset.cta = ins.cta || "#";

    el.innerHTML = `
      <div class="card__media" style="--img:url('${escapeHtml(
        ins.img || ""
      )}'); background-image:url('${escapeHtml(ins.img || "")}')"></div>
      <div class="card__body">
        <h3>${escapeHtml(ins.name || "")}</h3>
        <div class="badges">
          <span class="badge">${
            DISC_MAP[ins.discipline] ||
            escapeHtml(ins.discipline || "Направление")
          }</span>
          <span class="badge badge--lvl">${
            LEVEL_MAP[ins.level] || escapeHtml(ins.level || "Уровень")
          }</span>
        </div>
        <p>${escapeHtml((ins.bio || "").slice(0, 140))}${
      ins.bio && ins.bio.length > 140 ? "…" : ""
    }</p>
        <button class="btn btn-outline" data-open>Подробнее</button>
      </div>
    `;
    return el;
  }

  function render() {
    const list = loadList();
    grid.innerHTML = "";
    if (!list.length) {
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";
    list.forEach((ins) => grid.appendChild(makeCard(ins)));
    applyFilters();
  }

  function norm(s) {
    return (s || "").toLowerCase().trim();
  }
  function applyFilters() {
    const q = norm(qInput?.value);
    const d = dSelect?.value || "all";
    const l = lSelect?.value || "all";

    grid.querySelectorAll(".card").forEach((card) => {
      const name = norm(card.dataset.name);
      const tags = norm(card.dataset.tags);
      const cd = card.dataset.discipline || "";
      const lv = card.dataset.level || "";

      const matchQ = !q || name.includes(q) || tags.includes(q);
      const matchD = d === "all" || cd === d;
      const matchL = l === "all" || lv === l;

      card.style.display = matchQ && matchD && matchL ? "" : "none";
    });
  }

  function openModalFromCard(card) {
    const name = card.dataset.name || "";
    const img = card.dataset.img || "";
    const bio = card.dataset.bio || "";
    const cd = card.dataset.discipline || "";
    const lv = card.dataset.level || "";
    const sch = card.dataset.schedule || "";
    const cta = card.dataset.cta || "#";

    mTitle.textContent = name;
    mImg.src = img;
    mImg.alt = name;
    mBio.textContent = bio;
    mDiscipline.textContent = DISC_MAP[cd] || "Направление";
    mLevel.textContent = LEVEL_MAP[lv] || "Уровень";
    mSchedule.textContent = sch || "Расписание уточняется";
    mCta.href = cta;

    overlay.hidden = false;
    modal.hidden = false;
    requestAnimationFrame(() => {
      overlay.classList.add("show");
      modal.classList.add("show");
    });
    modal.focus();
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    overlay.classList.remove("show");
    modal.classList.remove("show");
    document.body.style.overflow = "";
    setTimeout(() => {
      overlay.hidden = true;
      modal.hidden = true;
    }, 220);
  }

  // делегирование
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open]");
    if (!btn) return;
    const card = e.target.closest(".card");
    if (card) openModalFromCard(card);
  });
  overlay.addEventListener("click", closeModal);
  closeBtn.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  // фильтры
  qInput?.addEventListener("input", applyFilters);
  dSelect?.addEventListener("change", applyFilters);
  lSelect?.addEventListener("change", applyFilters);

  // первичный рендер
  render();

  // живые обновления
  if (bc)
    bc.addEventListener("message", (ev) => {
      if (ev.data?.type === "updated") render();
    });
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) render();
  });
});

//add-gallery.js
document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "academyGallery";
  const bc =
    "BroadcastChannel" in window ? new BroadcastChannel("gallery") : null;

  const grid = document.getElementById("galleryGrid");
  const empty = document.getElementById("galleryEmpty");

  function loadList() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function render() {
    const list = loadList();
    grid.innerHTML = "";

    if (!list.length) {
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    list.forEach((item) => {
      const wrap = document.createElement("div");
      wrap.className = "masonry-item";

      const fig = document.createElement("figure");

      // Контент
      if (item.kind === "video") {
        const isEmbed =
          (item.src || "").includes("youtube.com/embed") ||
          (item.src || "").includes("player.vimeo.com");
        if (isEmbed) {
          const ifr = document.createElement("iframe");
          ifr.src = item.src;
          ifr.allowFullscreen = true;
          ifr.loading = "lazy";
          fig.appendChild(ifr);
        } else {
          const vid = document.createElement("video");
          if (item.poster) vid.poster = item.poster;
          vid.src = item.src;
          vid.controls = true;
          fig.appendChild(vid);
        }
      } else {
        const img = document.createElement("img");
        img.src = item.src;
        img.alt = item.title || "Фото";
        fig.appendChild(img);
      }

      // Подпись (если есть)
      if (item.title || item.caption) {
        const cap = document.createElement("figcaption");
        cap.innerHTML = `<strong>${escapeHtml(item.title || "")}</strong>${
          item.title && item.caption ? " — " : ""
        }${escapeHtml(item.caption || "")}`;
        fig.appendChild(cap);
      }

      wrap.appendChild(fig);
      grid.appendChild(wrap);
    });
  }

  function escapeHtml(s = "") {
    return s.replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[m])
    );
  }

  // Первичный рендер
  render();

  // Обновление, если другая вкладка изменила галерею
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) render();
  });
  if (bc)
    bc.addEventListener("message", (ev) => {
      if (ev.data?.type === "updated") render();
    });
});
