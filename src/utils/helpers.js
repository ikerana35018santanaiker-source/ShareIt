// ═══════════════════════════════════════════════════════════════
// TASKFLOW — Utility Helpers
// ═══════════════════════════════════════════════════════════════

// ─── DOM helpers ─────────────────────────────────────────────
export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

export function show(el) { el?.classList.remove('hidden'); }
export function hide(el) { el?.classList.add('hidden'); }
export function toggle(el, condition) {
  if (condition === undefined) {
    el?.classList.toggle('hidden');
  } else {
    condition ? show(el) : hide(el);
  }
}

// ─── String helpers ───────────────────────────────────────────
export function getInitials(name = '') {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export function truncate(str, len = 60) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── Date helpers ─────────────────────────────────────────────
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function isOverdue(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T23:59:59');
  return d < new Date();
}

export function isDueSoon(dateStr, days = 2) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T23:59:59');
  const now = new Date();
  const diff = (d - now) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// ─── ID helpers ───────────────────────────────────────────────
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── Priority helpers ─────────────────────────────────────────
export const PRIORITY_META = {
  critical: { label: 'Crítica', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', emoji: '🔴' },
  high:     { label: 'Alta',    color: '#f97316', bg: 'rgba(249,115,22,0.12)', emoji: '🟠' },
  medium:   { label: 'Media',   color: '#eab308', bg: 'rgba(234,179,8,0.12)',  emoji: '🟡' },
  low:      { label: 'Baja',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  emoji: '🟢' },
};

export function getPriorityMeta(p) {
  return PRIORITY_META[p] || PRIORITY_META.medium;
}

// ─── Confirm dialog (native-free) ────────────────────────────
export function showConfirm(title, message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('confirm-modal-overlay');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');

    titleEl.textContent = title;
    msgEl.textContent = message;
    show(overlay);

    const cleanup = () => hide(overlay);

    const onOk = () => { cleanup(); resolve(true); okBtn.removeEventListener('click', onOk); cancelBtn.removeEventListener('click', onCancel); };
    const onCancel = () => { cleanup(); resolve(false); okBtn.removeEventListener('click', onOk); cancelBtn.removeEventListener('click', onCancel); };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  });
}

// ─── Form validation ─────────────────────────────────────────
export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password) {
  return password && password.length >= 8;
}

export function passwordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score; // 0-5
}

export function strengthColor(score) {
  if (score <= 1) return '#ef4444';
  if (score <= 2) return '#f97316';
  if (score <= 3) return '#eab308';
  return '#22c55e';
}

// ─── Loader button helpers ────────────────────────────────────
export function setLoading(btn, loading) {
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  btn.disabled = loading;
  if (text) toggle(text, !loading);
  if (loader) toggle(loader, loading);
}

// ─── Search highlight ─────────────────────────────────────────
export function highlightText(text, query) {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const escapedQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(escapedQ, 'gi'), (m) => `<mark class="search-highlight">${m}</mark>`);
}
