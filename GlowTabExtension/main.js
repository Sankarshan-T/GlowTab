document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("searchForm");
  const input = document.getElementById("searchInput");
  const settingsBtn = document.getElementById("settingsBtn");
  const sidebar = document.getElementById("settingsSidebar");
  const overlay = document.getElementById("overlay");
  const toggleBtn = document.getElementById("themeToggle");
  const root = document.documentElement;
  
  const modal = document.getElementById("shortcutModal");
  const modalTitle = document.getElementById("modalTitle");
  const nameInput = document.getElementById("shortcutName");
  const urlInput = document.getElementById("shortcutUrl");
  const saveBtn = document.getElementById("saveShortcut");
  const cancelBtn = document.getElementById("cancelShortcut");
  const weatherCard = document.getElementById("weather");

  console.log("weatherCard:", weatherCard);
 
  const savedTheme = localStorage.getItem("theme");
  
  const defaultShortcuts = [
    { name: "Flavortown", url: "https://flavortown.hackclub.com/" },
    { name: "Mail", url: "https://mail.google.com/" },
    { name: "GitHub", url: "https://github.com/" },
    { name: "Docs", url: "https://docs.google.com/" }
  ];
  
  let selectedShortcutIndex = null;
  let editIndex = null;
  let dragStartIndex = null;
  
  function normalizeUrl(input) {
    try { return new URL(input).href; }
    catch {
      try { return new URL(`https://${input}`).href; }
      catch { return null; }
    }
  }
  
  function getShortcuts(cb) {
    if (!chrome?.storage?.sync) return cb([]);
    chrome.storage.sync.get(["shortcuts"], d => cb(d.shortcuts || []));
  }
  
  function setShortcuts(shortcuts, cb) {
    if (!chrome?.storage?.sync) {
      cb?.();
      return;
    }
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
  
  document.getElementById("addShortcut")?.addEventListener("click", () => {
    openModal();
  });
  
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
  
  saveBtn.addEventListener("click", () => {
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
  
  cancelBtn.addEventListener("click", closeModal);
  
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
  
  if (savedTheme) {
    root.dataset.theme = savedTheme;
    toggleBtn.textContent = savedTheme === "light" ? "Dark" : "Light";
  }
  
  settingsBtn?.addEventListener("click", () => {
    const o = sidebar.classList.contains("open");
    sidebar.classList.toggle("open", !o);
    overlay.classList.toggle("show", !o);
    settingsBtn.classList.toggle("shifted", !o);
  });
  
  overlay?.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
    settingsBtn.classList.remove("shifted");
  });
  
  toggleBtn?.addEventListener("click", () => {
    const l = root.dataset.theme === "light";
    root.dataset.theme = l ? "dark" : "light";
    localStorage.setItem("theme", root.dataset.theme);
    toggleBtn.textContent = l ? "Light" : "Dark";
  });
  
  window.onload = () => input?.focus();
  
  form?.addEventListener("submit", e => {
    e.preventDefault();
    const q = input.value.trim();
    if (q) window.location.href =
      `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  });

  function loadWeather() {
    if (!weatherCard) return;
  
    if (!navigator.geolocation) {
      weatherCard.textContent = "Location not supported";
      return;
    }
  
    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
          );
          const data = await res.json();
  
          if (!data.current_weather) throw new Error();
  
          weatherCard.textContent =
            `${Math.round(data.current_weather.temperature)}°C • ` +
            `Wind ${data.current_weather.windspeed} km/h`;
        } catch {
          weatherCard.textContent = "Weather unavailable";
        }
      },
      () => {
        weatherCard.textContent = "Location permission denied";
      }
    );
  }  
  
  function updateClock() {
    const n = new Date();
    const h24 = n.getHours();
    const g =
      h24 < 12 ? "Good Morning" :
      h24 < 17 ? "Good Afternoon" :
      h24 < 21 ? "Good Evening" : "Good Night";
  
    const h = (h24 % 12 || 12).toString().padStart(2, "0");
    const m = n.getMinutes().toString().padStart(2, "0");
    const s = n.getSeconds().toString().padStart(2, "0");
    const ap = h24 >= 12 ? "PM" : "AM";
  
    document.getElementById("time").textContent = `${h}:${m}:${s} ${ap}`;
    document.getElementById("date").textContent =
      `${n.toLocaleString("default",{month:"long"})} ${n.getDate()}, ${n.getFullYear()}`;
    document.getElementById("greeting").textContent = g;
  }
  
  loadWeather();
  loadShortcuts();
  updateClock();
  setInterval(updateClock, 1000);
  
});

