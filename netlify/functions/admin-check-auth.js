// Netlify Function: Check if admin authorization is set up
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load Firebase config from file in the same directory as this function
let FIREBASE_CONFIG = {};
try {
  const configPath = path.join(__dirname, 'firebase-config.json');
  const configFile = fs.readFileSync(configPath, 'utf8');
  FIREBASE_CONFIG = JSON.parse(configFile);
  console.log('✓ Loaded Firebase config from:', configPath);
} catch (error) {
  console.error('✗ Failed to load firebase-config.json:', error.message);
  throw new Error('Firebase configuration file not found. Ensure firebase-config.json exists in netlify/functions directory.');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(FIREBASE_CONFIG),
    projectId: FIREBASE_CONFIG.project_id,
  });
}

const db = admin.firestore();

exports.handler = async (event) => {
  try {
    const doc = await db.collection('admin').doc('tokens').get();

    return {
      statusCode: 200,
      body: JSON.stringify({
        authorized: doc.exists,
      }),
    };
  } catch (error) {
    console.error('Check failed:', error.message);
    return {
      statusCode: 200,
      body: JSON.stringify({ authorized: false }),
    };
  }
};
