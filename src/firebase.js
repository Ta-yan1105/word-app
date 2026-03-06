import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Reflection（マスターデータベース）の鍵
const firebaseConfig = {
  apiKey: "AIzaSyAMvD6g3pTmneNad4-h8ZT_rzfZfn3T2YM",
  authDomain: "my-english-log-app.firebaseapp.com",
  projectId: "my-english-log-app",
  storageBucket: "my-english-log-app.firebasestorage.app",
  messagingSenderId: "693893816448",
  appId: "1:693893816448:web:3c6bfac6dc4dffaa8a0665"
};

// アプリの初期化
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);