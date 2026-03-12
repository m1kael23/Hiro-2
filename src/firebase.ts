import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST:   'list',
  GET:    'get',
  WRITE:  'write',
};

// Log the error but DO NOT throw — throwing crashes the entire component tree.
// Callers should handle null/empty responses gracefully instead.
export function handleFirestoreError(error: unknown, operationType: string, path: string) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    userId: auth.currentUser?.uid,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  // Return instead of throw — let components handle missing data gracefully
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch {
    // Silently ignore — this is just a connectivity probe
  }
}

testConnection();
