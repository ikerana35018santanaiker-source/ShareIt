// js/firebase.js — Firebase initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDKurDI4iIcV_6LnzLkML0E3hM9hqWaMZg",
  authDomain: "shareit-c1222.firebaseapp.com",
  databaseURL: "https://shareit-c1222-default-rtdb.firebaseio.com",
  projectId: "shareit-c1222",
  storageBucket: "shareit-c1222.firebasestorage.app",
  messagingSenderId: "466346058481",
  appId: "1:466346058481:web:733bcea3730cac9d9a3f50"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;
