document.addEventListener("DOMContentLoaded", () => {
  // ЕДИНЫЙ КЛЮЧ ДЛЯ ВСЕГО ПРОЕКТА
  const STORAGE_KEY = "academyInstructors";
  const LEGACY_KEY = "instructors"; // то, что было у тебя сейчас

  const form = document.getElementById("instructorForm");
  const okMsg = document.getElementById("ok");

  // Вставляем секцию со списком ниже main (как у тебя было)
  const listWrap = document.createElement("section");
  listWrap.className = "instructor-list";
  listWrap.innerHTML = `
    <h2>Сохранённые педагоги</h2>
    <div id="instructorList"></div>
  `;
  document.querySelector("main").appendChild(listWrap);

  const instructorList = document.getElementById("instructorList");

  // Для живых обновлений другой страницы (необязательно)
  const bc =
    "BroadcastChannel" in window ? new BroadcastChannel("instructors") : null;

  // Отображаем человекочитаемые подписи
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

  // --- MIGRATION: перенесём старые записи из legacy-ключа, если они есть
  (function migrateIfNeeded() {
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (
        Array.isArray(legacy) &&
        (!Array.isArray(current) || current.length === 0)
      ) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
        // по желанию можно очистить старый ключ:
        // localStorage.removeItem(LEGACY_KEY);
      }
    } catch {}
  })();

  // --- Чтение/запись
  function getInstructors() {
    try {
      const arr = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  function saveInstructors(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    if (bc) bc.postMessage({ type: "updated" });
  }

  // Небольшая защита от XSS в тексте
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

  // --- Рендер списка
  function renderInstructors() {
    const instructors = getInstructors();
    instructorList.innerHTML = "";

    if (instructors.length === 0) {
      instructorList.innerHTML =
        "<p class='muted'>Пока нет сохранённых педагогов.</p>";
      return;
    }

    instructors.forEach((inst, index) => {
      const name = escapeHtml(inst.name || "");
      const disciplineCode = inst.discipline || "";
      const levelCode = inst.level || "";
      const discipline =
        DISC_MAP[disciplineCode] || escapeHtml(disciplineCode || "Направление");
      const level = LEVEL_MAP[levelCode] || escapeHtml(levelCode || "Уровень");
      const bio = escapeHtml(inst.bio || "");
      const schedule = escapeHtml(inst.schedule || "");
      const img = escapeHtml(inst.img || "");
      const cta = escapeHtml(inst.cta || "#");

      const card = document.createElement("article");
      card.className = "pr-card";
      card.innerHTML = `
        <div class="pr-media" style="background-image:url('${img}')"></div>
        <div class="pr-body">
          <h3>${name}</h3>
          <div class="badges">
            <span class="badge">${discipline}</span>
            <span class="badge badge--lvl">${level}</span>
          </div>
          <p class="muted">${bio}</p>
          <div class="meta">
            <span>${schedule}</span>
          </div>
          <a class="btn btn-outline" href="${cta}" target="_self">Записаться</a>
          <button class="btn btn-danger" data-index="${index}">Удалить</button>
        </div>
      `;
      instructorList.appendChild(card);
    });

    // Делегирование на удаление
    instructorList.querySelectorAll("[data-index]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.currentTarget.getAttribute("data-index"));
        const arr = getInstructors();
        if (Number.isInteger(idx) && idx >= 0 && idx < arr.length) {
          if (confirm("Удалить этого педагога?")) {
            arr.splice(idx, 1);
            saveInstructors(arr);
            renderInstructors();
          }
        }
      });
    });
  }

  // --- Сохранение нового педагога
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const newInstructor = {
      id: Date.now(),
      name: document.getElementById("name").value.trim(),
      discipline: document.getElementById("discipline").value,
      level: document.getElementById("level").value,
      schedule: document.getElementById("schedule").value.trim(),
      bio: document.getElementById("bio").value.trim(),
      img: document.getElementById("img").value.trim(),
      cta: (document.getElementById("cta").value || "#").trim(),
      tags: document.getElementById("tags").value.trim(),
    };

    // простая проверка обязательных полей
    if (
      !newInstructor.name ||
      !newInstructor.discipline ||
      !newInstructor.level ||
      !newInstructor.schedule ||
      !newInstructor.bio ||
      !newInstructor.img
    ) {
      alert("Пожалуйста, заполните все обязательные поля.");
      return;
    }

    const arr = getInstructors();
    arr.push(newInstructor); // добавляем в конец — будет «снизу»
    saveInstructors(arr);

    form.reset();
    okMsg.hidden = false;
    setTimeout(() => (okMsg.hidden = true), 1500);

    renderInstructors();
  });

  // --- Лайв-превью (как у тебя)
  form.addEventListener("input", () => {
    const name = document.getElementById("name").value || "Имя Фамилия";
    const disciplineCode = document.getElementById("discipline").value;
    const levelCode = document.getElementById("level").value;

    document.getElementById("prName").textContent = name;
    document.getElementById("prDiscipline").textContent =
      DISC_MAP[disciplineCode] || disciplineCode || "Направление";
    document.getElementById("prLevel").textContent =
      LEVEL_MAP[levelCode] || levelCode || "Уровень";
    document.getElementById("prBio").textContent =
      document.getElementById("bio").value || "Краткое био педагога…";
    document.getElementById("prSchedule").textContent =
      document.getElementById("schedule").value || "Расписание";

    const imgVal = document.getElementById("img").value;
    document.getElementById("prImg").style.backgroundImage = imgVal
      ? `url('${imgVal}')`
      : "none";
    document.getElementById("prCta").href =
      document.getElementById("cta").value || "#";
  });

  // Первичная отрисовка
  renderInstructors();

  // Если кто-то меняет хранилище из другой вкладки — обновимся
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) renderInstructors();
  });
  if (bc)
    bc.addEventListener("message", (ev) => {
      if (ev.data?.type === "updated") renderInstructors();
    });
});
