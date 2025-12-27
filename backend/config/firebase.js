const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      console.log('Firebase already initialized');
      return admin.firestore();
    }

    // Initialize with environment variables
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });

    console.log('✅ Firebase initialized successfully');
    return admin.firestore();
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    throw error;
  }
};

const db = initializeFirebase();

module.exports = { admin, db };
