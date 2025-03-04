//~/gitl/gcp-firebase/index.js
// has FirebaseStorageWebhook https://us-central1-prizmpoc.cloudfunctions.net/dialogflowWebhook

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import express from 'express';
import * as functions from 'firebase-functions';

// Import Firebase Admin SDK
const admin = require('firebase-admin');

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
// Use adminDb for the dialogflow webhook
const db = adminDb;

// Store data function
async function storeDataInFirebase(data) {
  console.log("Attempting to store data:", JSON.stringify(data));
  
  try {
    const dataWithTimestamp = {
      ...data,
      timestamp: data.timestamp || admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection("conversations").add(dataWithTimestamp);
    console.log("Document written with ID:", docRef.id);
    return docRef;
  } catch (error) {
    console.error("Error storing data in Firebase:", error);
    throw error;
  }
}

// Create Express app for dialogflowWebhook
const dialogflowExpressApp = express();
dialogflowExpressApp.use(express.json());

// Webhook handler
dialogflowExpressApp.post('/', async (req, res) => {
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

// Export the dialogflow webhook for Cloud Functions
export const dialogflowWebhook = functions.https.onRequest(dialogflowExpressApp);

// ========== New System Initiated Request Function ==========

// Create a new function for system-initiated requests
export const systemInitiatedRequest = functions.https.onRequest(async (req, res) => {
  try {
    console.log("System initiated request received:", req.query);
    
    // Extract parameters from the request query
    const userId = req.query.userId || 'system';
    const context = req.query.context || 'default';
    
    // Store the request in Firestore
    const dataToStore = {
      userId: userId,
      context: context,
      timestamp: new Date().toISOString(),
      parameters: req.query,
      type: 'SYSTEM_INITIATED_REQUEST'
    };
    
    const docRef = await storeDataInFirebase(dataToStore);
    
    // Process the system-initiated request here
    // Add your business logic based on the context and parameters
    
    // Send a response
    res.status(200).json({
      success: true,
      message: "System-initiated request processed successfully",
      requestId: docRef.id
    });
    
  } catch (error) {
    console.error("Error processing system-initiated request:", error);
    res.status(500).json({
      success: false,
      message: "Error processing system-initiated request",
      error: error.message
    });
  }
});

// For local testing
async function testFirestore() {
  try {
    const docRef = await db.collection("test").add({
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

// Only call when running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testFirestore();
}