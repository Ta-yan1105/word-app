import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// 👇 ここに、先ほど「コピーボタン」を押して取得したコードをそのまま貼り付けてください！
// （以下の const firebaseConfig = { ... }; の部分をまるごと上書きします）
const firebaseConfig = {
  apiKey: "AIzaSyBmcXqTlsLUd-yoz-thuZymltFyUiROYUE",
  authDomain: "my-word-app-5b588.firebaseapp.com",
  projectId: "my-word-app-5b588",
  storageBucket: "my-word-app-5b588.firebasestorage.app",
  messagingSenderId: "275462943198",
  appId: "1:275462943198:web:53d33f176699400e36ad4f",
  measurementId: "G-YQM20K7JQ4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();