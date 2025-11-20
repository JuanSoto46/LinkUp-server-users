/**
 * Firebase Admin SDK configuration and initialization
 * @module FirebaseConfig
 */
import admin from 'firebase-admin';

/**
 * Firebase Admin App instance
 */
let firebaseApp: admin.app.App;

if (!admin.apps.length) {
  /**
   * Initialize Firebase Admin with service account credentials
   */
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    } as admin.ServiceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
} else {
  firebaseApp = admin.app();
}

/**
 * Firebase Auth instance
 */
export const auth = firebaseApp.auth();

/**
 * Firestore Database instance
 */
export const db = firebaseApp.firestore();

// Configure Firestore settings
db.settings({
  ignoreUndefinedProperties: true
});

export default firebaseApp;