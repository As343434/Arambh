import { updateProfile, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, getSecondaryAuth } from '../firebase';
import { syncPublicProfile } from './erpService';
import { generateCompliantTempPassword, sanitizeText } from '../utils/validation';

export const FirebaseBatchService = {
  async createUser(userData: any) {
    const { email, password, name, role, ...metadata } = userData;

    try {
      const secondaryAuth = getSecondaryAuth();
      const effectivePassword = password && String(password).length >= 8
        ? String(password)
        : generateCompliantTempPassword();

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), effectivePassword);
      const user = userCredential.user;
      const cleanName = sanitizeText(name || 'University User');

      await updateProfile(user, { displayName: cleanName });

      const userRef = doc(db, 'users', user.uid);
      const cleanMetadata = Object.fromEntries(
        Object.entries(metadata).filter(([_, v]) => v !== undefined)
      );

      const userDoc = {
        uid: user.uid,
        email: email.trim(),
        name: cleanName,
        role,
        status: 'active' as const,
        ...cleanMetadata,
        isFirstLogin: true,
        createdAt: serverTimestamp()
      };

      await setDoc(userRef, userDoc);
      await syncPublicProfile(user.uid, userDoc);

      await secondaryAuth.signOut();

      return { success: true, uid: user.uid };
    } catch (error: any) {
      console.error('Error creating batch user:', error?.code || 'batch_error');
      return { success: false, error: 'Unable to provision account.' };
    }
  }
};
