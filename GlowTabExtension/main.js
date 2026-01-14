document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("searchForm");
  const input = document.getElementById("searchInput");
  const overlay = document.getElementById("overlay");

  const notesInput = document.getElementById("notesInput");
  const notesPreview = document.getElementById("notesPreview");
  const notesToggle = document.getElementById("notesToggle");

  const searchBtn = document.getElementById("searchBtn");
  const themeSelect = document.getElementById("themeSelect");

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

  const iconGroup = document.querySelector(".sidebar-icons");
  const buttons = iconGroup?.querySelectorAll("button") || [];
  const sidebars = document.querySelectorAll("aside");

  const display = document.getElementById('display');
  const startStopBtn = document.getElementById('startStopBtn');
  const resetBtn = document.getElementById('resetBtn');

  let previewMode = false;
  let selectedShortcutIndex = null;
  let editIndex = null;
  let dragStartIndex = null;
  let startTime;
  let elapsedTime = 0;
  let timerInterval;
  let isRunning = false;

  const defaultShortcuts = [
    { name: "Google", url: "https://google.com/" },
    { name: "Mail", url: "https://mail.google.com/" },
    { name: "Amazon", url: "https://amazon.com/" },
    { name: "Microsoft", url: "https://microsoft.com/" }
  ];

  const shiftButtons = amount => {
    buttons.forEach(b => {
      b.style.transform = amount ? `translateX(${amount}px)` : "";
    });
  };

  function timeToString(time) {
    let diffInHrs = time / 3600000;
    let hh = Math.floor(diffInHrs);

    let diffInMin = (diffInHrs - hh) * 60;
    let mm = Math.floor(diffInMin);

    let diffInSec = (diffInMin - mm) * 60;
    let ss = Math.floor(diffInSec);

    let diffInMs = (diffInSec - ss) * 100;
    let ms = Math.floor(diffInMs);

    let formattedHH = hh.toString().padStart(2, "0");
    let formattedMM = mm.toString().padStart(2, "0");
    let formattedSS = ss.toString().padStart(2, "0");
    let formattedMS = ms.toString().padStart(2, "0");

    return `${formattedHH}:${formattedMM}:${formattedSS}:${formattedMS}`;
  }

  function start() {
    startTime = Date.now() - elapsedTime;
    timerInterval = setInterval(function printTime() {
      elapsedTime = Date.now() - startTime;
      display.innerHTML = timeToString(elapsedTime);
    }, 10);
    startStopBtn.textContent = 'Stop';
    startStopBtn.classList.add('stop');
    isRunning = true;
  }

  function stop() {
    clearInterval(timerInterval);
    startStopBtn.textContent = 'Start';
    startStopBtn.classList.remove('stop');
    isRunning = false;
  }

  startStopBtn.addEventListener('click', () => {
    if (isRunning) {
        stop();
    } else {
        start();
    }
  });

  resetBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    display.innerHTML = "00:00:00";
    elapsedTime = 0;
    isRunning = false;
    startStopBtn.textContent = 'Start';
    startStopBtn.classList.remove('stop');  
  });

  function loadHistory() {
    if (!chrome?.history || !historyList) return;
    chrome.history.search({ text: "", maxResults: 50 }, results => {
      historyList.innerHTML = "";
      results.forEach(i => {
        const li = document.createElement("li");
        li.textContent = i.title || i.url;
        li.onclick = () => chrome.tabs.create({ url: i.url });
        historyList.appendChild(li);
      });
    });
  }

  function showGoal() {
    goal.value = localStorage.getItem("goal") || "";
  }

  goal?.addEventListener("input", () =>
    localStorage.setItem("goal", goal.value)
  );

  if (notesInput && notesPreview && notesToggle) {
    notesInput.value = localStorage.getItem("notes-md") || "";

    const renderPreview = () =>
      (notesPreview.innerHTML = marked.parse(notesInput.value));

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
      previewMode ? renderPreview() : notesInput.focus();
    });
  }

  const normalizeUrl = v => {
    try { return new URL(v).href; }
    catch {
      try { return new URL(`https://${v}`).href; }
      catch { return null; }
    }
  };

  const getShortcuts = cb =>
    chrome.storage.sync.get(["shortcuts"], d => cb(d.shortcuts || []));

  const setShortcuts = (s, cb) =>
    chrome.storage.sync.set({ shortcuts: s }, cb);

  function loadShortcuts() {
    getShortcuts(s =>
      s.length
        ? renderShortcuts(s)
        : setShortcuts(defaultShortcuts, () =>
            renderShortcuts(defaultShortcuts)
          )
    );
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

      const img = document.createElement("img");
      img.src = `https://icons.duckduckgo.com/ip3/${new URL(sc.url).hostname}.ico`;

      a.append(
        Object.assign(document.createElement("span"), { className: "icon" }).appendChild(img).parentNode,
        Object.assign(document.createElement("span"), { className: "label", textContent: sc.name })
      );

      container.appendChild(a);
    });

    container.addEventListener(
      "wheel",
      e => {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      },
      { passive: false }
    );
  }

  function showShortcutMenu(x, y, index) {
    const menu = document.getElementById("shortcutMenu");
    if (!menu) return;
    selectedShortcutIndex = index;
    Object.assign(menu.style, {
      left: `${x}px`,
      top: `${y}px`,
      display: "block"
    });
  }

  document.addEventListener("click", () => {
    const m = document.getElementById("shortcutMenu");
    if (m) m.style.display = "none";
  });

  function openModal(edit = false, sc = null, index = null) {
    modal.classList.remove("hidden");
    modalTitle.textContent = edit ? "Edit Shortcut" : "Add Shortcut";
    nameInput.value = sc?.name || "";
    urlInput.value = sc?.url || "";
    editIndex = index;
    nameInput.focus();
  }

  const closeModal = () => {
    modal.classList.add("hidden");
    nameInput.value = "";
    urlInput.value = "";
    editIndex = null;
  };

  document.getElementById("addShortcut")?.addEventListener("click", () =>
    openModal()
  );

  document.getElementById("editShortcut")?.addEventListener("click", () =>
    getShortcuts(s => {
      const sc = s[selectedShortcutIndex];
      if (sc) openModal(true, sc, selectedShortcutIndex);
    })
  );

  document.getElementById("deleteShortcut")?.addEventListener("click", () =>
    getShortcuts(s => {
      if (selectedShortcutIndex == null) return;
      s.splice(selectedShortcutIndex, 1);
      setShortcuts(s, () => renderShortcuts(s));
    })
  );

  saveBtn?.addEventListener("click", () => {
    const name = nameInput.value.trim();
    const url = normalizeUrl(urlInput.value.trim());
    if (!name || !url) return;

    getShortcuts(s => {
      editIndex !== null ? (s[editIndex] = { name, url }) : s.push({ name, url });
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
    if (!sc || dragStartIndex == null) return;

    const dropIndex = [...sc.parentNode.children].indexOf(sc);

    getShortcuts(s => {
      const [moved] = s.splice(dragStartIndex, 1);
      s.splice(dropIndex, 0, moved);
      setShortcuts(s, () => renderShortcuts(s));
      dragStartIndex = null;
    });
  });

  const savedTheme = localStorage.getItem("theme") || "dark";
  root.dataset.theme = savedTheme;
  if (themeSelect) themeSelect.value = savedTheme;

  themeSelect?.addEventListener("change", () => {
    root.dataset.theme = themeSelect.value;
    localStorage.setItem("theme", themeSelect.value);
  });

  iconGroup?.addEventListener("click", e => {
    const btn = e.target.closest("button[data-sidebar]");
    if (!btn) return;

    const sidebar = document.getElementById(btn.dataset.sidebar);
    if (!sidebar) return;

    const width = sidebar.getBoundingClientRect().width;
    const isOpen = sidebar.classList.contains("open");

    sidebars.forEach(s => s.classList.remove("open"));
    buttons.forEach(b => b.classList.remove("active", "shifted"));
    shiftButtons(0);

    if (!isOpen) {
      sidebar.classList.add("open");
      btn.classList.add("active", "shifted");
      overlay?.classList.add("show");
      shiftButtons(width);

      if (sidebar === historySidebar) loadHistory();
      
    } else {
      overlay?.classList.remove("show");
    }
  });

  overlay?.addEventListener("click", () => {
    sidebars.forEach(s => s.classList.remove("open"));
    buttons.forEach(b => b.classList.remove("active", "shifted"));
    shiftButtons(0);
    overlay.classList.remove("show");
  });

  function submitSearch() {
    const q = input?.value.trim();
    if (q)
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
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
      const w = (
        await (
          await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true`
          )
        ).json()
      ).current_weather;

      weatherCard.innerHTML = `${Math.round(w.temperature)}°C • Wind ${w.windspeed} km/h<br>${loc.city || "Your area"}`;
    } catch {
      weatherCard.textContent = "Weather unavailable";
    }
  }

  function updateClock() {
    const n = new Date();
    const h24 = n.getHours();
    const g =
      h24 < 12
        ? "Good Morning"
        : h24 < 17
        ? "Good Afternoon"
        : h24 < 21
        ? "Good Evening"
        : "Good Night";

    document.getElementById("time").textContent =
      `${(h24 % 12 || 12).toString().padStart(2, "0")}:` +
      `${n.getMinutes().toString().padStart(2, "0")}:` +
      `${n.getSeconds().toString().padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`;

    document.getElementById("date").textContent =
      `${n.toLocaleString("default", { month: "long" })} ${n.getDate()}, ${n.getFullYear()}`;

    document.getElementById("greeting").textContent = g;
  }

  showGoal();
  loadWeather();
  loadShortcuts();
  updateClock();
  setInterval(updateClock, 1000);
  input?.focus();
});
