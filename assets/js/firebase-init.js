// assets/js/firebase-init.js
// تم توحيد الإصدار إلى 10.12.0 لمنع أي تضارب بين الأقسام السحابية

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCp3GeVnokoipTIkw5Ri4JQRg4NbpVH77M",
  authDomain: "gene-z-portal.firebaseapp.com",
  projectId: "gene-z-portal",
  storageBucket: "gene-z-portal.firebasestorage.app",
  messagingSenderId: "201853068393",
  appId: "1:201853068393:web:9db4cc186ea3b0d2256ef8",
  measurementId: "G-SWHKS3SN2F"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };