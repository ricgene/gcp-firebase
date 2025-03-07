// index.js - Updated to ES modules format

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import express from 'express';
import { https } from 'firebase-functions';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import admin from 'firebase-admin';

// For ES modules, get the current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure credentials
// When deployed to Cloud Functions/Cloud Run in the same project,
// we can use application default credentials
let serviceAccount;
try {
  // Only try to load from file in development environment
  if (process.env.NODE_ENV === 'development') {
    serviceAccount = JSON.parse(
      readFileSync(join(__dirname, './firebase-admin-creds.json'), 'utf8')
    );
    console.log('Loaded credentials from local file (development mode)');
  } else {
    // In production, we'll use application default credentials
    console.log('Using application default credentials (production mode)');
    serviceAccount = undefined;
  }
} catch (error) {
  console.log('Note: No local credentials file found, using default credentials');
  serviceAccount = undefined;
}

// Initialize Firebase Admin SDK
let adminApp;
try {
  // Use cert if we have explicit credentials, otherwise use applicationDefault
  if (serviceAccount) {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    }, 'admin-app');
    console.log('Initialized Firebase Admin with explicit credentials');
  } else {
    // When deployed to Cloud Functions, use application default credentials
    adminApp = admin.initializeApp();
    console.log('Initialized Firebase Admin with application default credentials');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  throw error;
}

// Firebase client config from environment variables
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

// Get Firestore instances
const adminDb = admin.firestore();
const clientDb = getFirestore(clientApp);

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
export const dialogflowWebhook = https.onRequest(dialogflowExpressApp);

// Special firebase storage webhook function
export const FirebaseStorageWebhook = https.onRequest(async (req, res) => {
  try {
    console.log("Firebase Storage webhook received:", req.body);

    // Store the request in Firestore
    const dataToStore = {
      type: 'STORAGE_WEBHOOK',
      payload: req.body,
      timestamp: new Date().toISOString()
    };

    const docRef = await storeDataInFirebase(dataToStore);

    // Send a success response
    res.status(200).json({
      success: true,
      message: "Storage webhook processed successfully",
      requestId: docRef.id
    });

  } catch (error) {
    console.error("Error processing storage webhook:", error);
    res.status(500).json({
      success: false,
      message: "Error processing storage webhook",
      error: error.message
    });
  }
});

// ========== Updated System Initiated Request Function ==========

// Create an Express app for the system-initiated requests
const systemInitiatedExpressApp = express();
systemInitiatedExpressApp.use(express.json());

// Updated function for system-initiated requests to handle both query parameters and JSON body
systemInitiatedExpressApp.post('/', async (req, res) => {
  try {
    console.log("System initiated request received:", req.body);

    // Determine if the request is from the processInputAndInitiateSession webhook
    // by checking for the expected structure
    const isFromDialogflowCx = req.body && req.body.sessionId && req.body.agentResponse;

    let dataToStore;

    if (isFromDialogflowCx) {
      // Handle the structured output from processInputAndInitiateSession
      const { sessionId, agentResponse } = req.body;
      
      dataToStore = {
        userId: sessionId,
        type: 'SYSTEM_INITIATED_REQUEST',
        timestamp: new Date().toISOString(),
        dialogflowResponse: {
          messages: agentResponse.messages || [],
          parameters: agentResponse.parameters || {},
          currentPage: agentResponse.currentPage || ''
        }
      };
    } else {
      // Handle direct API calls with JSON body
      const userId = req.body.userId || 'system';
      const context = req.body.context || 'default';
      
      dataToStore = {
        userId: userId,
        context: context,
        timestamp: new Date().toISOString(),
        parameters: req.body,
        type: 'SYSTEM_INITIATED_REQUEST'
      };
    }

    const docRef = await storeDataInFirebase(dataToStore);

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

// For backward compatibility, also handle GET requests with query parameters
systemInitiatedExpressApp.get('/', async (req, res) => {
  try {
    console.log("System initiated GET request received:", req.query);

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

// Export the system-initiated request handler for Cloud Functions
export const systemInitiatedRequest = https.onRequest(systemInitiatedExpressApp);

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

// Only call when running locally
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  testFirestore();
}