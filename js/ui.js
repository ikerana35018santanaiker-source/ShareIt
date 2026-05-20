// js/ui.js — UI utility functions

// ===== SCREEN TRANSITIONS =====
export function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

// ===== TOAST =====
let toastTimer = null;
export function showToast(msg, duration = 3000) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), duration);
}

// ===== MODALS =====
export function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
}
export function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

window.closeModal = closeModal;

// ===== FORMAT BYTES =====
export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// ===== FORMAT DATE =====
export function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

// ===== FILE ICON =====
export function getFileIcon(name, type) {
  if (!name) return "📄";
  const ext = name.split(".").pop().toLowerCase();
  const icons = {
    // Images
    jpg: "🖼️", jpeg: "🖼️", png: "🖼️", gif: "🖼️", webp: "🖼️", svg: "🖼️", bmp: "🖼️", ico: "🖼️",
    // Video
    mp4: "🎬", mov: "🎬", avi: "🎬", mkv: "🎬", webm: "🎬",
    // Audio
    mp3: "🎵", wav: "🎵", ogg: "🎵", flac: "🎵", m4a: "🎵", aac: "🎵",
    // Documents
    pdf: "📕", doc: "📝", docx: "📝", xls: "📊", xlsx: "📊", ppt: "📊", pptx: "📊",
    txt: "📄", md: "📄", csv: "📊",
    // Code
    js: "💻", ts: "💻", html: "💻", css: "💻", py: "💻", java: "💻", c: "💻", cpp: "💻",
    json: "💻", xml: "💻", sh: "💻", php: "💻",
    // Archives
    zip: "📦", rar: "📦", "7z": "📦", tar: "📦", gz: "📦",
    // Folder
    folder: "📁",
  };
  return icons[ext] || (type?.startsWith("image/") ? "🖼️" : type?.startsWith("video/") ? "🎬" : type?.startsWith("audio/") ? "🎵" : "📄");
}

// ===== IS IMAGE/VIDEO (for thumbnail) =====
export function isImage(name, type) {
  if (type?.startsWith("image/")) return true;
  const ext = name?.split(".").pop().toLowerCase();
  return ["jpg","jpeg","png","gif","webp","svg","bmp"].includes(ext);
}
export function isVideo(name, type) {
  if (type?.startsWith("video/")) return true;
  const ext = name?.split(".").pop().toLowerCase();
  return ["mp4","webm","mov","ogg"].includes(ext);
}
export function isAudio(name, type) {
  if (type?.startsWith("audio/")) return true;
  const ext = name?.split(".").pop().toLowerCase();
  return ["mp3","wav","ogg","flac","m4a","aac"].includes(ext);
}
export function isText(name) {
  const ext = name?.split(".").pop().toLowerCase();
  return ["txt","md","json","xml","csv","js","ts","html","css","py","java","c","cpp","sh","php","sql"].includes(ext);
}
export function isPdf(name) {
  return name?.split(".").pop().toLowerCase() === "pdf";
}

// ===== GENERATE SHARE TOKEN =====
export function generateToken(length = 16) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ===== MAKE GLOBAL =====
window.showToast = showToast;
window.openModal = openModal;
