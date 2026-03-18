const admin = require('firebase-admin');
require('dotenv').config();

// Ensure all required environment variables are present
const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.warn('Firebase Admin credentials missing in .env. Google Login will not work.');
} else {
    try {
        // Handle potential escaped newlines in the private key from .env string
        const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: FIREBASE_PROJECT_ID,
                clientEmail: FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            })
        });
        console.log('Firebase Admin initialized successfully from .env');
    } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
    }
}

module.exports = admin;
