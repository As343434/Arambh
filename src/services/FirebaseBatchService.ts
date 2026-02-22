import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

// Secondary app instance to create users without signing out the admin
const secondaryApp = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}, 'SecondaryApp');

const secondaryAuth = getAuth(secondaryApp);

export const FirebaseBatchService = {
  async createUser(userData: any) {
    const { email, password, name, role, ...metadata } = userData;
    
    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const user = userCredential.user;
      
      // Update profile name
      await updateProfile(user, { displayName: name });
      
      // 2. Create Firestore Document
      const userRef = doc(db, 'users', user.uid);
      
      // Clean up metadata to remove undefined values which Firestore doesn't support
      const cleanMetadata = Object.fromEntries(
        Object.entries(metadata).filter(([_, v]) => v !== undefined)
      );

      await setDoc(userRef, {
        uid: user.uid,
        email,
        name,
        role,
        ...cleanMetadata,
        isFirstLogin: true,
        createdAt: serverTimestamp()
      });

      // Sign out from secondary auth immediately so it doesn't persist
      await secondaryAuth.signOut();
      
      return { success: true, uid: user.uid };
    } catch (error: any) {
      console.error(`Error creating user ${email}:`, error);
      return { success: false, error: error.message };
    }
  }
};
