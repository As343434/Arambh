import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBKhquJnNGiGKWXrIwgDjlbmHLVekOOhHk",
  authDomain: "arambh-c1654.firebaseapp.com",
  projectId: "arambh-c1654",
  storageBucket: "arambh-c1654.firebasestorage.app",
  messagingSenderId: "1089324429935",
  appId: "1:1089324429935:web:27fec6c1c2af676ae9939a",
  measurementId: "G-ELM77B48MQ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Helper for Realtime Database paths
export const getRtdbPath = (path: string) => `arambh/${path}`;

// Initialize Firestore with persistent local cache (modern v9+ way)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
