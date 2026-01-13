document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("searchForm");
  const input = document.getElementById("searchInput");
  const settingsBtn = document.getElementById("settingsBtn");
  const sidebar = document.getElementById("settingsSidebar");
  const overlay = document.getElementById("overlay");
  const notesInput = document.getElementById("notesInput");
  const notesPreview = document.getElementById("notesPreview");
  const notesToggle = document.getElementById("notesToggle");
  const searchBtn = document.getElementById("searchBtn");
  const themeSelect = document.getElementById("themeSelect");
  const historyBtn = document.getElementById("historyBtn");
  const historySidebar = document.getElementById("historySidebar");
  const historyList = document.getElementById("historyList");
  const root = document.documentElement;
  const modal = document.getElementById("shortcutModal");
  const modalTitle = document.getElementById("modalTitle");
  const nameInput = document.getElementById("shortcutName");
  const urlInput = document.getElementById("shortcutUrl");
  const saveBtn = document.getElementById("saveShortcut");
  const cancelBtn = document.getElementById("cancelShortcut");
  const weatherCard = document.getElementById("weather");
  const goal = document.getElementById("goalInput");

  let previewMode = false;
  let selectedShortcutIndex = null;
  let editIndex = null;
  let dragStartIndex = null;

  const defaultShortcuts = [
    { name: "Google", url: "https://google.com/" },
    { name: "Mail", url: "https://mail.google.com/" },
    { name: "Amazon", url: "https://amazon.com/" },
    { name: "Microsoft", url: "https://microsoft.com/" }
  ];

  function loadHistory() {
    if (!chrome?.history || !historyList) return;
    chrome.history.search(
      { text: "", maxResults: 50 },
      results => {
        historyList.innerHTML = "";
        results.forEach(item => {
          const li = document.createElement("li");
          li.textContent = item.title || item.url;
          li.onclick = () => chrome.tabs.create({ url: item.url });
          historyList.appendChild(li);
        });
      }
    );
  }

  function showGoal() {
    goal.value = localStorage.getItem("goal") || "";
  }

  goal?.addEventListener("input", () => {
    localStorage.setItem("goal", goal.value);
  });

  if (notesInput && notesPreview && notesToggle) {
    const saved = localStorage.getItem("notes-md") || "";
    notesInput.value = saved;

    function renderPreview() {
      notesPreview.innerHTML = marked.parse(notesInput.value);
    }

    renderPreview();

    notesInput.addEventListener("input", () => {
      localStorage.setItem("notes-md", notesInput.value);
      if (previewMode) renderPreview();
    });

    notesToggle.addEventListener("click", () => {
      previewMode = !previewMode;
      notesInput.classList.toggle("hidden", previewMode);
      notesPreview.classList.toggle("hidden", !previewMode);
      notesToggle.textContent = previewMode ? "✏️" : "👁️";
      if (previewMode) renderPreview();
      else notesInput.focus();
    });
  }

  function normalizeUrl(input) {
    try { return new URL(input).href; }
    catch {
      try { return new URL(`https://${input}`).href; }
      catch { return null; }
    }
  }

  function getShortcuts(cb) {
    chrome.storage.sync.get(["shortcuts"], d => cb(d.shortcuts || []));
  }

  function setShortcuts(shortcuts, cb) {
    chrome.storage.sync.set({ shortcuts }, cb);
  }

  function loadShortcuts() {
    getShortcuts(s => {
      if (!s.length) {
        setShortcuts(defaultShortcuts, () => renderShortcuts(defaultShortcuts));
      } else {
        renderShortcuts(s);
      }
    });
  }

  function renderShortcuts(shortcuts) {
    const container = document.getElementById("shortcuts");
    if (!container) return;
    container.innerHTML = "";
    shortcuts.forEach((sc, i) => {
      const a = document.createElement("a");
      a.className = "shortcut";
      a.href = sc.url;
      a.draggable = true;
      a.addEventListener("contextmenu", e => {
        e.preventDefault();
        showShortcutMenu(e.pageX, e.pageY, i);
      });
      const icon = document.createElement("span");
      icon.className = "icon";
      const img = document.createElement("img");
      img.src = `https://icons.duckduckgo.com/ip3/${new URL(sc.url).hostname}.ico`;
      icon.appendChild(img);
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = sc.name;
      a.append(icon, label);
      container.appendChild(a);
    });
    container.addEventListener("wheel", e => {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }, { passive: false });
  }

  function showShortcutMenu(x, y, index) {
    const menu = document.getElementById("shortcutMenu");
    if (!menu) return;
    selectedShortcutIndex = index;
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.display = "block";
  }

  document.addEventListener("click", () => {
    const menu = document.getElementById("shortcutMenu");
    if (menu) menu.style.display = "none";
  });

  function openModal(edit = false, sc = null, index = null) {
    modal.classList.remove("hidden");
    modalTitle.textContent = edit ? "Edit Shortcut" : "Add Shortcut";
    nameInput.value = sc?.name || "";
    urlInput.value = sc?.url || "";
    editIndex = index;
    nameInput.focus();
  }

  function closeModal() {
    modal.classList.add("hidden");
    nameInput.value = "";
    urlInput.value = "";
    editIndex = null;
  }

  document.getElementById("addShortcut")?.addEventListener("click", () => openModal());

  document.getElementById("editShortcut")?.addEventListener("click", () => {
    getShortcuts(s => {
      const sc = s[selectedShortcutIndex];
      if (sc) openModal(true, sc, selectedShortcutIndex);
    });
  });

  document.getElementById("deleteShortcut")?.addEventListener("click", () => {
    getShortcuts(s => {
      if (selectedShortcutIndex == null) return;
      s.splice(selectedShortcutIndex, 1);
      setShortcuts(s, () => renderShortcuts(s));
    });
  });

  saveBtn?.addEventListener("click", () => {
    const name = nameInput.value.trim();
    const url = normalizeUrl(urlInput.value.trim());
    if (!name || !url) return;
    getShortcuts(s => {
      if (editIndex !== null) s[editIndex] = { name, url };
      else s.push({ name, url });
      setShortcuts(s, () => {
        renderShortcuts(s);
        closeModal();
      });
    });
  });

  cancelBtn?.addEventListener("click", closeModal);

  document.addEventListener("dragstart", e => {
    const sc = e.target.closest(".shortcut");
    if (!sc) return;
    dragStartIndex = [...sc.parentNode.children].indexOf(sc);
  });

  document.addEventListener("dragover", e => e.preventDefault());

  document.addEventListener("drop", e => {
    const sc = e.target.closest(".shortcut");
    if (!sc || dragStartIndex === null) return;
    const dropIndex = [...sc.parentNode.children].indexOf(sc);
    getShortcuts(s => {
      const [m] = s.splice(dragStartIndex, 1);
      s.splice(dropIndex, 0, m);
      setShortcuts(s, () => renderShortcuts(s));
    });
  });

  const savedTheme = localStorage.getItem("theme") || "dark";
  root.dataset.theme = savedTheme;
  if (themeSelect) themeSelect.value = savedTheme;

  themeSelect?.addEventListener("change", () => {
    root.dataset.theme = themeSelect.value;
    localStorage.setItem("theme", themeSelect.value);
  });

  historyBtn?.addEventListener("click", () => {
    const open = historySidebar.classList.toggle("open");
    overlay.classList.toggle("show", open);
    historyBtn.classList.toggle("shifted", open);
    if (open) loadHistory();
  });

  settingsBtn?.addEventListener("click", () => {
    const open = sidebar.classList.toggle("open");
    overlay.classList.toggle("show", open);
    settingsBtn.classList.toggle("shifted", open);
  });

  overlay?.addEventListener("click", () => {
    sidebar?.classList.remove("open");
    historySidebar?.classList.remove("open");
    overlay.classList.remove("show");
    settingsBtn?.classList.remove("shifted");
    historyBtn?.classList.remove("shifted");
  });

  function submitSearch() {
    const q = input?.value.trim();
    if (q) window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  }

  form?.addEventListener("submit", e => {
    e.preventDefault();
    submitSearch();
  });

  searchBtn?.addEventListener("click", submitSearch);

  async function loadWeather() {
    if (!weatherCard) return;
    try {
      const loc = await (await fetch("https://ipwho.is/")).json();
      if (!loc.success) throw 0;
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true`);
      const data = await res.json();
      const w = data.current_weather;
      weatherCard.innerHTML = `${Math.round(w.temperature)}°C • Wind ${w.windspeed} km/h<br>${loc.city || "Your area"}`;
    } catch {
      weatherCard.textContent = "Weather unavailable";
    }
  }

  function updateClock() {
    const n = new Date();
    const h24 = n.getHours();
    const g = h24 < 12 ? "Good Morning" : h24 < 17 ? "Good Afternoon" : h24 < 21 ? "Good Evening" : "Good Night";
    const h = (h24 % 12 || 12).toString().padStart(2, "0");
    const m = n.getMinutes().toString().padStart(2, "0");
    const s = n.getSeconds().toString().padStart(2, "0");
    const ap = h24 >= 12 ? "PM" : "AM";
    document.getElementById("time").textContent = `${h}:${m}:${s} ${ap}`;
    document.getElementById("date").textContent = `${n.toLocaleString("default",{month:"long"})} ${n.getDate()}, ${n.getFullYear()}`;
    document.getElementById("greeting").textContent = g;
  }

  showGoal();
  loadWeather();
  loadShortcuts();
  updateClock();
  setInterval(updateClock, 1000);
  input?.focus();
});
