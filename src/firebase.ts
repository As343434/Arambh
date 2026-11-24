import { initializeApp, getApp } from 'firebase/app';
import { getAuth, initializeAuth, inMemoryPersistence } from 'firebase/auth';
import {
  initializeFirestore,
  memoryLocalCache
} from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

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
export const analytics = typeof window !== 'undefined' && firebaseConfig.measurementId ? getAnalytics(app) : null;

export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalAutoDetectLongPolling: true
});

export function getSecondaryAuth() {
  const secondaryAppName = 'secondary-auth-app';
  let secondaryApp;
  try {
    secondaryApp = getApp(secondaryAppName);
  } catch {
    const mainApp = getApp();
    secondaryApp = initializeApp(mainApp.options, secondaryAppName);
  }

  try {
    return initializeAuth(secondaryApp, { persistence: inMemoryPersistence });
  } catch {
    return getAuth(secondaryApp);
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
