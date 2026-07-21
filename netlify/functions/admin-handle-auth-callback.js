// Netlify Function: Handle OAuth callback and store refresh token in Firebase
const axios = require('axios');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const TENANT_ID = process.env.AZURE_TENANT_ID;
const ADMIN_REDIRECT_URI = 'https://paynedetailinggroup.com/admin-authorize';

// Load Firebase config from file
// In Netlify, __dirname = /var/task/netlify/functions/admin-handle-auth-callback
// Project root is /var/task/
// So we go up 3 levels: /var/task/netlify/functions/admin-handle-auth-callback -> /var/task/
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

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(FIREBASE_CONFIG),
    projectId: FIREBASE_CONFIG.project_id,
  });
}

const db = admin.firestore();

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { code } = JSON.parse(event.body);

    if (!code) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing authorization code' }) };
    }

    // Exchange code for tokens
    const response = await axios.post(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        redirect_uri: ADMIN_REDIRECT_URI,
        grant_type: 'authorization_code',
        scope: 'Files.ReadWrite offline_access',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const refreshToken = response.data.refresh_token;
    const accessToken = response.data.access_token;
    const expiresIn = response.data.expires_in;

    // Store tokens in Firestore
    await db.collection('admin').doc('tokens').set({
      refreshToken: refreshToken,
      accessToken: accessToken,
      expiresAt: Date.now() + (expiresIn * 1000),
      updatedAt: new Date(),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Authorization successful! Your refresh token has been securely stored.',
      }),
    };
  } catch (error) {
    console.error('Token exchange failed:', error.response?.data?.error || error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to complete authorization' }),
    };
  }
};
