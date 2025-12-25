
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 사용자가 제공한 파이어베이스 설정값 적용
const firebaseConfig = {
  apiKey: "AIzaSyAN-J7mRfGmWwUa4NCZm02bQrviE2eEQ0Y",
  authDomain: "timer-89800.firebaseapp.com",
  projectId: "timer-89800",
  storageBucket: "timer-89800.firebasestorage.app",
  messagingSenderId: "102026508912",
  appId: "1:102026508912:web:a3e00f6c14fe214c1cd2b5",
  measurementId: "G-PGBYWHBT1W"
};

// 이미 선언되어 있으므로 중복 선언하지 않도록 주의하세요.
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
