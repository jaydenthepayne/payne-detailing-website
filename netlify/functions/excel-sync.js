// Netlify Function: Write form submissions to Excel using Firebase-stored refresh token
const axios = require('axios');
const admin = require('firebase-admin');

const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const TENANT_ID = process.env.AZURE_TENANT_ID;
const FIREBASE_CONFIG = JSON.parse(process.env.FIREBASE_CONFIG || '{}');
const ONEDRIVE_FILE_PATH = '/Payne Detailing Group - Operations/Payne_Detailing_Business_System_v4.xlsx';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(FIREBASE_CONFIG),
    projectId: FIREBASE_CONFIG.project_id,
  });
}

const db = admin.firestore();
let cachedAccessToken = null;
let cachedTokenExpiry = null;

// Get refresh token from Firebase
async function getRefreshToken() {
  try {
    const doc = await db.collection('admin').doc('tokens').get();
    if (!doc.exists) {
      throw new Error('No refresh token stored');
    }
    return doc.data().refreshToken;
  } catch (error) {
    console.error('Failed to get refresh token:', error.message);
    throw new Error('Admin authorization not configured. Visit /admin-authorize first.');
  }
}

// Refresh access token using refresh token
async function getAccessToken() {
  // Return cached token if still valid
  if (cachedAccessToken && cachedTokenExpiry && Date.now() < cachedTokenExpiry) {
    return cachedAccessToken;
  }

  try {
    const refreshToken = await getRefreshToken();

    const response = await axios.post(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'Files.ReadWrite offline_access',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    cachedAccessToken = response.data.access_token;
    cachedTokenExpiry = Date.now() + (response.data.expires_in * 1000);

    return cachedAccessToken;
  } catch (error) {
    console.error('Token refresh failed:', error.response?.data || error.message);
    throw new Error('Failed to get access token');
  }
}

// Add job to Excel
async function addJobToExcel(jobData, accessToken) {
  try {
    // Get the file ID
    const fileSearchResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/me/drive/root:${encodeURIComponent(ONEDRIVE_FILE_PATH)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const fileId = fileSearchResponse.data.id;

    // Create a workbook session
    const sessionResponse = await axios.post(
      `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/createSession`,
      { persistChanges: true },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const sessionId = sessionResponse.data.id;

    // Get the Jobs table
    const tableResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/worksheets('Jobs')/tables`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'workbook-session-id': sessionId,
        },
      }
    );

    const jobsTable = tableResponse.data.value.find(t => t.name === 'JobsTable');
    if (!jobsTable) {
      throw new Error('JobsTable not found');
    }

    // Add new row
    await axios.post(
      `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/tables('${jobsTable.id}')/rows/add`,
      {
        values: [
          [
            jobData.customerName,
            jobData.vehicleDescription,
            jobData.serviceType,
            jobData.condition,
            jobData.addOns || '',
            null,
            null,
            null,
            jobData.paymentMethod || '',
            jobData.employee || '',
            jobData.jobDate || new Date().toISOString().split('T')[0],
            'Live',
          ],
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'workbook-session-id': sessionId,
        },
      }
    );

    // Close session
    await axios.post(
      `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/closeSession`,
      { sessionId },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'workbook-session-id': sessionId,
        },
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Excel write failed:', error.response?.data || error.message);
    throw new Error('Failed to write to Excel');
  }
}

// Main handler
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const formData = JSON.parse(event.body);

    // Validate required fields
    const required = ['customerName', 'email', 'phone', 'vehicleDescription', 'serviceType', 'condition'];
    for (const field of required) {
      if (!formData[field]) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Missing required field: ${field}` }),
        };
      }
    }

    // Get access token
    const accessToken = await getAccessToken();

    // Add job to Excel
    await addJobToExcel(formData, accessToken);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Your booking has been submitted and logged in our system',
      }),
    };
  } catch (error) {
    console.error('Function error:', error.message);

    if (error.message.includes('not configured')) {
      return {
        statusCode: 503,
        body: JSON.stringify({
          error: 'Booking system not yet configured. Please contact the site administrator.',
        }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to process booking. Please try again.',
      }),
    };
  }
};
