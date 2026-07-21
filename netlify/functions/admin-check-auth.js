// Netlify Function: Check if admin authorization is set up
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load Firebase config from file
// In Netlify, __dirname = /var/task/netlify/functions/admin-check-auth
// Project root is /var/task/
let FIREBASE_CONFIG = {};
try {
  // Try multiple possible paths
  const possiblePaths = [
    path.join(__dirname, '../../../firebase-config.json'),  // From netlify/functions/
    path.join(__dirname, '../../firebase-config.json'),      // Fallback
    '/var/task/firebase-config.json',                        // Absolute path for Netlify
  ];

  let configFile = null;
  for (const configPath of possiblePaths) {
    try {
      configFile = fs.readFileSync(configPath, 'utf8');
      console.log('Loaded Firebase config from:', configPath);
      break;
    } catch (e) {
      console.log('Tried path, not found:', configPath);
    }
  }

  if (!configFile) {
    throw new Error('Firebase config not found in any expected location');
  }

  FIREBASE_CONFIG = JSON.parse(configFile);
} catch (error) {
  console.error('Failed to load firebase-config.json:', error.message);
  throw new Error('Firebase configuration file not found. Ensure firebase-config.json exists in project root.');
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
