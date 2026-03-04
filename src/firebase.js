import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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