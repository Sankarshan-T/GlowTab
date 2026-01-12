/* =======================
   DOM REFERENCES
======================= */
const form = document.getElementById("searchForm");
const input = document.getElementById("searchInput");
const settingsBtn = document.getElementById("settingsBtn");
const sidebar = document.getElementById("settingsSidebar");
const overlay = document.getElementById("overlay");
const toggleBtn = document.getElementById("themeToggle");
const root = document.documentElement;

const savedTheme = localStorage.getItem("theme");

/* =======================
   DEFAULT SHORTCUTS
======================= */
const defaultShortcuts = [
  { name: "Flavortown", url: "https://flavortown.hackclub.com/" },
  { name: "Mail",       url: "https://mail.google.com/" },
  { name: "GitHub",     url: "https://github.com/" },
  { name: "Docs",       url: "https://docs.google.com/" }
];

/* =======================
   UTILITIES
======================= */
function normalizeUrl(input) {
  try {
    return new URL(input).href;
  } catch {
    try {
      return new URL(`https://${input}`).href;
    } catch {
      return null;
    }
  }
}

function getShortcuts(cb) {
  if (!chrome?.storage?.sync) return cb([]);
  chrome.storage.sync.get(["shortcuts"], data => cb(data.shortcuts || []));
}

function setShortcuts(shortcuts, cb) {
  chrome.storage.sync.set({ shortcuts }, cb);
}

/* =======================
   SHORTCUTS
======================= */
function loadShortcuts() {
  getShortcuts(shortcuts => {
    if (!shortcuts.length) {
      setShortcuts(defaultShortcuts, () => renderShortcuts(defaultShortcuts));
    } else {
      renderShortcuts(shortcuts);
    }
  });
}

function renderShortcuts(shortcuts) {
  const container = document.getElementById("shortcuts");
  if (!container) return;

  container.innerHTML = "";

  shortcuts.forEach((shortcut, index) => {
    const link = document.createElement("a");
    link.className = "shortcut";
    link.href = shortcut.url;
    link.draggable = true;

    link.addEventListener("contextmenu", e => {
      e.preventDefault();
      showShortcutMenu(e.pageX, e.pageY, index);
    });

    const icon = document.createElement("span");
    icon.className = "icon";

    const img = document.createElement("img");
    img.src = `https://www.google.com/s2/favicons?domain=${new URL(shortcut.url).hostname}`;
    icon.appendChild(img);

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = shortcut.name;

    link.append(icon, label);
    container.appendChild(link);
  });
}

/* =======================
   CONTEXT MENU
======================= */
let selectedShortcutIndex = null;

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

/* =======================
   ADD / EDIT / DELETE
======================= */
document.getElementById("addShortcut")?.addEventListener("click", () => {
  const name = prompt("Shortcut name:");
  const urlInput = prompt("Shortcut URL:");

  if (!name || !urlInput) return;

  const url = normalizeUrl(urlInput);
  if (!url) return alert("Invalid URL.");

  getShortcuts(shortcuts => {
    shortcuts.push({ name, url });
    setShortcuts(shortcuts, () => renderShortcuts(shortcuts));
  });
});

document.getElementById("editShortcut")?.addEventListener("click", () => {
  getShortcuts(shortcuts => {
    const shortcut = shortcuts[selectedShortcutIndex];
    if (!shortcut) return;

    const name = prompt("Name:", shortcut.name);
    const urlInput = prompt("URL:", shortcut.url);
    if (!name || !urlInput) return;

    const url = normalizeUrl(urlInput);
    if (!url) return alert("Invalid URL.");

    shortcuts[selectedShortcutIndex] = { name, url };
    setShortcuts(shortcuts, () => renderShortcuts(shortcuts));
  });
});

document.getElementById("deleteShortcut")?.addEventListener("click", () => {
  getShortcuts(shortcuts => {
    if (selectedShortcutIndex == null) return;
    shortcuts.splice(selectedShortcutIndex, 1);
    setShortcuts(shortcuts, () => renderShortcuts(shortcuts));
  });
});

/* =======================
   DRAG & DROP
======================= */
let dragStartIndex = null;

document.addEventListener("dragstart", e => {
  const shortcut = e.target.closest(".shortcut");
  if (!shortcut) return;

  dragStartIndex = [...shortcut.parentNode.children].indexOf(shortcut);
});

document.addEventListener("dragover", e => e.preventDefault());

document.addEventListener("drop", e => {
  const shortcut = e.target.closest(".shortcut");
  if (!shortcut || dragStartIndex === null) return;

  const dropIndex = [...shortcut.parentNode.children].indexOf(shortcut);

  getShortcuts(shortcuts => {
    const [moved] = shortcuts.splice(dragStartIndex, 1);
    shortcuts.splice(dropIndex, 0, moved);
    setShortcuts(shortcuts, () => renderShortcuts(shortcuts));
  });
});

/* =======================
   SETTINGS / THEME
======================= */
if (savedTheme) {
  root.dataset.theme = savedTheme;
  toggleBtn.textContent = savedTheme === "light" ? "Dark" : "Light";
}

function toggleSettings() {
  const isOpen = sidebar.classList.contains("open");
  sidebar.classList.toggle("open", !isOpen);
  overlay.classList.toggle("show", !isOpen);
  settingsBtn.classList.toggle("shifted", !isOpen);
}

settingsBtn?.addEventListener("click", toggleSettings);

overlay?.addEventListener("click", () => {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
  settingsBtn.classList.remove("shifted");
});

toggleBtn?.addEventListener("click", () => {
  const isLight = root.dataset.theme === "light";
  root.dataset.theme = isLight ? "dark" : "light";
  localStorage.setItem("theme", root.dataset.theme);
  toggleBtn.textContent = isLight ? "Light" : "Dark";
});

/* =======================
   SEARCH
======================= */
window.onload = () => input?.focus();

form?.addEventListener("submit", e => {
  e.preventDefault();
  const query = input.value.trim();
  if (!query) return;

  window.location.href =
    `https://www.google.com/search?q=${encodeURIComponent(query)}`;
});

/* =======================
   CLOCK
======================= */
function updateClock() {
  const now = new Date();
  const hours24 = now.getHours();

  const greeting =
    hours24 < 12 ? "Good Morning" :
    hours24 < 17 ? "Good Afternoon" :
    hours24 < 21 ? "Good Evening" :
                   "Good Night";

  const hours = (hours24 % 12 || 12).toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  const ampm = hours24 >= 12 ? "PM" : "AM";

  document.getElementById("time").textContent =
    `${hours}:${minutes}:${seconds} ${ampm}`;

  document.getElementById("date").textContent =
    `${now.toLocaleString("default", { month: "long" })} ${now.getDate()}, ${now.getFullYear()}`;

  document.getElementById("greeting").textContent = greeting;
}

loadShortcuts();
updateClock();
setInterval(updateClock, 1000);
