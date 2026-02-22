import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCGmTXp_osE2PF9M55iD7wiX31O9E557D0",
  authDomain: "arambh-a6da4.firebaseapp.com",
  projectId: "arambh-a6da4",
  storageBucket: "arambh-a6da4.firebasestorage.app",
  messagingSenderId: "197577203366",
  appId: "1:197577203366:web:cc275f68f1dcb7980d1e67",
  measurementId: "G-NXNDNFLFHJ",
  databaseURL: "https://arambh-a6da4-default-rtdb.firebaseio.com"
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
