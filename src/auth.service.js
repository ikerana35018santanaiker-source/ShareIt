// ═══════════════════════════════════════════════════════════════
// TASKFLOW — Auth Service
// Handles all authentication operations with Firebase Auth
// ═══════════════════════════════════════════════════════════════

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { auth } from "../firebase-config.js";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ─── Register with email/password ────────────────────────────
export async function registerWithEmail(name, email, password) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  return credential.user;
}

// ─── Login with email/password ───────────────────────────────
export async function loginWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

// ─── Login with Google ────────────────────────────────────────
export async function loginWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

// ─── Password reset ──────────────────────────────────────────
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ─── Logout ───────────────────────────────────────────────────
export async function logout() {
  await signOut(auth);
}

// ─── Auth state observer ─────────────────────────────────────
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ─── Get current user ────────────────────────────────────────
export function getCurrentUser() {
  return auth.currentUser;
}

// ─── Update display name ─────────────────────────────────────
export async function updateDisplayName(name) {
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: name });
  }
}

// ─── Error message mapper ────────────────────────────────────
export function getAuthErrorMessage(code) {
  const messages = {
    'auth/user-not-found': 'No existe cuenta con este email.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-credential': 'Email o contraseña incorrectos.',
    'auth/email-already-in-use': 'Este email ya está registrado.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-email': 'Email no válido.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
    'auth/network-request-failed': 'Error de conexión. Revisa tu internet.',
    'auth/popup-closed-by-user': 'Ventana de Google cerrada. Inténtalo de nuevo.',
    'auth/cancelled-popup-request': '',
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
  };
  return messages[code] || `Error: ${code}`;
}
