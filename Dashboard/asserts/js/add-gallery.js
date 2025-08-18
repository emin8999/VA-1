document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "academyGallery";
  const bc =
    "BroadcastChannel" in window ? new BroadcastChannel("gallery") : null;

  // form inputs
  const form = document.getElementById("galleryForm");
  const f = {
    kind: document.getElementById("kind"),
    title: document.getElementById("title"),
    caption: document.getElementById("caption"),
    url: document.getElementById("url"),
    file: document.getElementById("file"),
    tags: document.getElementById("tags"),
    poster: document.getElementById("poster"),
  };
  const posterWrap = document.getElementById("posterWrap");
  const ok = document.getElementById("ok");

  // preview
  const previewBox = document.getElementById("previewBox");

  // list
  const grid = document.getElementById("galGrid");
  const empty = document.getElementById("emptyList");
  const fltQ = document.getElementById("q");
  const fltKind = document.getElementById("fltKind");
  const clearAllBtn = document.getElementById("clearAll");

  // helpers
  function loadList() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }
  function saveList(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    if (bc) bc.postMessage({ type: "updated" });
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

  // detect YouTube/Vimeo and build embeddable URL
  function toEmbeddable(url) {
    if (!url) return null;
    try {
      const u = new URL(url);
      // YouTube
      if (u.hostname.includes("youtube.com")) {
        const id = u.searchParams.get("v");
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (u.hostname === "youtu.be") {
        const id = u.pathname.slice(1);
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      // Vimeo
      if (u.hostname.includes("vimeo.com")) {
        const id = u.pathname.split("/").filter(Boolean)[0];
        if (id) return `https://player.vimeo.com/video/${id}`;
      }
      return url; // обычный mp4/изображение или другой хост
    } catch {
      return url;
    }
  }

  // File -> DataURL
  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  // UI: toggle poster input for video
  function updatePosterVisibility() {
    posterWrap.style.display = f.kind.value === "video" ? "" : "none";
  }
  updatePosterVisibility();
  f.kind.addEventListener("change", () => {
    updatePosterVisibility();
    renderPreview();
  });

  // Preview builder
  async function renderPreview() {
    previewBox.innerHTML = "";
    const kind = f.kind.value;
    const urlVal = f.url.value.trim();
    const fileObj = f.file.files?.[0];
    const caption = escapeHtml(f.caption.value || "");
    const title = escapeHtml(f.title.value || "");

    let src = "";
    let isEmbed = false;
    let poster = f.poster.value.trim();

    if (fileObj) {
      try {
        src = await fileToDataURL(fileObj);
      } catch {
        previewBox.textContent = "Ошибка чтения файла";
        return;
      }
    } else if (urlVal) {
      src = toEmbeddable(urlVal);
      isEmbed =
        typeof src === "string" &&
        (src.includes("youtube.com/embed") || src.includes("player.vimeo.com"));
    } else {
      previewBox.classList.add("muted");
      previewBox.textContent = "Пока пусто";
      return;
    }

    if (kind === "image") {
      const img = document.createElement("img");
      img.src = src;
      img.alt = title || "Изображение";
      previewBox.appendChild(img);
    } else {
      if (isEmbed) {
        const iframe = document.createElement("iframe");
        iframe.src = src;
        iframe.allowFullscreen = true;
        iframe.loading = "lazy";
        previewBox.appendChild(iframe);
      } else {
        const video = document.createElement("video");
        if (poster) video.poster = poster;
        video.src = src;
        video.controls = true;
        previewBox.appendChild(video);
      }
    }

    if (title || caption) {
      const cap = document.createElement("div");
      cap.style.padding = ".6rem .8rem";
      cap.style.width = "100%";
      cap.innerHTML = `<strong>${title}</strong>${
        title && caption ? " — " : ""
      }${caption}`;
      previewBox.appendChild(cap);
    }
  }

  // bind preview updates
  ["input", "change"].forEach((evt) => {
    [f.kind, f.title, f.caption, f.url, f.file, f.poster].forEach((el) =>
      el.addEventListener(evt, renderPreview)
    );
  });

  // Make item card for list
  function makeItemCard(item, index) {
    const el = document.createElement("article");
    el.className = "card-item";
    const t = escapeHtml(item.title || "");
    const c = escapeHtml(item.caption || "");
    const tags = escapeHtml(item.tags || "");
    const kindLabel = item.kind === "video" ? "Видео" : "Фото";

    const thumb = document.createElement("div");
    thumb.className = "thumb";

    if (item.kind === "image") {
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = t || "Фото";
      thumb.appendChild(img);
    } else {
      const isEmbed =
        item.src.includes("youtube.com/embed") ||
        item.src.includes("player.vimeo.com");
      if (isEmbed) {
        const ifr = document.createElement("iframe");
        ifr.src = item.src;
        ifr.allowFullscreen = true;
        ifr.loading = "lazy";
        thumb.appendChild(ifr);
      } else {
        const vid = document.createElement("video");
        if (item.poster) vid.poster = item.poster;
        vid.src = item.src;
        vid.controls = true;
        thumb.appendChild(vid);
      }
    }

    const body = document.createElement("div");
    body.className = "item-body";
    body.innerHTML = `
      <div class="item-title">${t || "(без названия)"}</div>
      <div class="item-meta"><span>${kindLabel}</span>${
      tags ? `<span>• теги: ${tags}</span>` : ""
    }</div>
      ${c ? `<div class="muted">${c}</div>` : ""}
      <div class="item-actions">
        <button class="btn btn--danger" data-del="${index}">Удалить</button>
      </div>
    `;

    el.appendChild(thumb);
    el.appendChild(body);
    return el;
  }

  // Render list with filters (показываем ВСЕ — и старые, и новые)
  function renderList() {
    const list = loadList(); // весь список
    const q = (fltQ.value || "").toLowerCase().trim();
    const k = fltKind.value;

    grid.innerHTML = "";
    const filtered = list.filter((it) => {
      const byKind = k === "all" || it.kind === k;
      const hay = `${it.title || ""} ${it.caption || ""} ${
        it.tags || ""
      }`.toLowerCase();
      const byQ = !q || hay.includes(q);
      return byKind && byQ;
    });

    if (!filtered.length) {
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    filtered.forEach((item, idx) => {
      const realIndex = list.indexOf(item);
      grid.appendChild(makeItemCard(item, realIndex));
    });
  }

  // Delete one
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-del]");
    if (!btn) return;
    const index = Number(btn.getAttribute("data-del"));
    const list = loadList();
    if (!Number.isInteger(index) || index < 0 || index >= list.length) return;
    if (!confirm("Удалить элемент из галереи?")) return;
    list.splice(index, 1);
    saveList(list);
    renderList();
  });

  // Clear all
  clearAllBtn.addEventListener("click", () => {
    const list = loadList();
    if (!list.length) return;
    if (!confirm("Удалить все элементы галереи?")) return;
    saveList([]);
    renderList();
  });

  // Submit form (save item)
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const kind = f.kind.value;
    const title = f.title.value.trim();
    const caption = f.caption.value.trim();
    const tags = (f.tags.value || "").trim();

    let src = "";
    let poster = (f.poster.value || "").trim();

    if (f.file.files?.[0]) {
      try {
        src = await fileToDataURL(f.file.files[0]);
      } catch {
        alert("Не удалось прочитать файл");
        return;
      }
    } else if (f.url.value.trim()) {
      src = toEmbeddable(f.url.value.trim());
    } else {
      alert("Укажите URL или выберите файл");
      return;
    }

    if (!src) {
      alert("Источник пустой или некорректный.");
      return;
    }

    const item = {
      id: Date.now(),
      kind,
      title,
      caption,
      tags,
      src,
      poster: kind === "video" ? poster : undefined,
    };

    const list = loadList();
    list.push(item); // добавляем в конец → появляется снизу
    saveList(list);

    ok.hidden = false;
    setTimeout(() => (ok.hidden = true), 1600);

    form.reset();
    updatePosterVisibility();
    previewBox.innerHTML =
      '<div class="muted" style="padding:.6rem .8rem;">Пока пусто</div>';
    renderList();
  });

  // filters
  fltQ.addEventListener("input", renderList);
  fltKind.addEventListener("change", renderList);

  // initial
  renderPreview();
  renderList();

  // live updates if another tab changes gallery
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) renderList();
  });
  if (bc)
    bc.addEventListener("message", (ev) => {
      if (ev.data?.type === "updated") renderList();
    });
});
