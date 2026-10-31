import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBoztfrpW7-6ZRxNviFhqogExj5SyILx1Y",
  authDomain: "ostaz-mohamed-ramadan-platform.firebaseapp.com",
  projectId: "ostaz-mohamed-ramadan-platform",
  storageBucket: "ostaz-mohamed-ramadan-platform.firebasestorage.app",
  messagingSenderId: "1045912223821",
  appId: "1:1045912223821:web:ec35af873e0d275c9f9c04"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
