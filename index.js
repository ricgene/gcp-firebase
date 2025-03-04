import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import express from 'express';
import * as functions from 'firebase-functions';

// Import Firebase Admin SDK
const admin = require('firebase-admin');
// Import regular Firebase SDK if needed for client-side features
const { initializeApp, getFirestore } = require('firebase/app');
require('firebase/firestore');


// -----------------------------------------------
// For server-side operations (Admin SDK)
// This uses service account credentials for privileged access
const serviceAccount = require('./firebase-admin-creds.json');
const adminApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
}, 'admin-app');

// For client-side operations (if needed)
// This uses your public Firebase config
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "prizmpoc.firebaseapp.com",
  projectId: "prizmpoc",
  storageBucket: "prizmpoc.appspot.com",
  messagingSenderId: "324482404818",
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Initialize regular Firebase (if needed for client operations)
const clientApp = initializeApp(firebaseConfig, 'client-app');

// Choose the appropriate Firestore instance based on your needs
// For admin operations (server-side with full privileges):
const adminDb = admin.firestore();

// For client operations (if needed):
const clientDb = getFirestore(clientApp);

// Use adminDb for your agent's server-side operations
// Use clientDb only if you need client-side operations with limited privileges

// -------------------------------
const db = adminDb;

// Store data function
async function storeDataInFirebase(data) {
  console.log("Attempting to store data:", JSON.stringify(data));
  
  try {
    const dataWithTimestamp = {
      ...data,
      timestamp: data.timestamp || serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, "conversations"), dataWithTimestamp);
    console.log("Document written with ID:", docRef.id);
    return docRef;
  } catch (error) {
    console.error("Error storing data in Firebase:", error);
    throw error;
  }
}

// Create Express app
const expressApp = express();
expressApp.use(express.json());

// Webhook handler
expressApp.post('/', async (req, res) => {
  try {
    const sessionInfo = req.body.sessionInfo || {};
    const parameters = sessionInfo.parameters || {};
    
    const dataToStore = {
      userId: parameters.userId || 'anonymous',
      query: req.body.text,
      intent: sessionInfo.matchedIntent || '',
      pageInfo: sessionInfo.currentPage || {},
      timestamp: new Date().toISOString(),
      parameters: parameters
    };
    
    await storeDataInFirebase(dataToStore);
    
    res.status(200).send({
      fulfillmentResponse: {
        messages: [{
          text: {
            text: ["Your information has been processed successfully."]
          }
        }]
      }
    });
  } catch (error) {
    console.error("Error in webhook:", error);
    
    res.status(500).send({
      fulfillmentResponse: {
        messages: [{
          text: {
            text: ["I'm sorry, there was an issue processing your request."]
          }
        }]
      }
    });
  }
});

// Start the server
const port = process.env.PORT || 8080;
expressApp.listen(port, () => {
  console.log(`dialogflowWebhook listening on port ${port}`);
});

// For local testing
async function testFirestore() {
  try {
    const docRef = await addDoc(collection(db, "test"), {
      message: "Hello from Node.js",
      timestamp: new Date()
    });
    console.log("Document written with ID:", docRef.id);
    return docRef;
  } catch (e) {
    console.error("Error adding document:", e);
    throw e;
  }
}

// Export for Cloud Functions (not used in Gen2 but good for compatibility)
export const dialogflowWebhook = functions.https.onRequest(expressApp);

// Only call when running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testFirestore();
}