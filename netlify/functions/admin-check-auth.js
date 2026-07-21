// Netlify Function: Check if admin authorization is set up
const admin = require('firebase-admin');
const FIREBASE_CONFIG = JSON.parse(process.env.FIREBASE_CONFIG || '{}');

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
