// Firebase／Firestore 初期化（ロングポーリング強制：会社回線対策）
import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBXVipey4pv6oiHGQ2YHhrA0nCmBaXiUM0",
  authDomain: "music-app-51d25.firebaseapp.com",
  projectId: "music-app-51d25",
  storageBucket: "music-app-51d25.firebasestorage.app",
  messagingSenderId: "581526671664",
  appId: "1:581526671664:web:1af05faad122a3f87fb8f5",
  measurementId: "G-K652D9HF6W"
};

// Firebase アプリを初期化
const app = initializeApp(firebaseConfig);

// Firestore（ロングポーリング強制）
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});
