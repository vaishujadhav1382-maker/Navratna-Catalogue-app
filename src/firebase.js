// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCW86RlbmSTGL9MHZZ_myw7C3zClp69DDA",
  authDomain: "admin-panel-430b8.firebaseapp.com",
  projectId: "admin-panel-430b8",
  storageBucket: "admin-panel-430b8.firebasestorage.app",
  messagingSenderId: "233849790581",
  appId: "1:233849790581:web:5a002f3c59a6582944983c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

export default app;