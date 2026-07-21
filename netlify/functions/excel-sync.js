// Netlify Function: Write form submissions to Excel via OAuth
// Uses delegated auth flow so it can access your OneDrive

const axios = require('axios');

const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const TENANT_ID = process.env.AZURE_TENANT_ID;
const REDIRECT_URI = 'https://paynedetailinggroup.com/.netlify/functions/excel-sync-callback';
const ONEDRIVE_FILE_PATH = '/Payne Detailing Group - Operations/Payne_Detailing_Business_System_v4.xlsx';

// Store tokens in environment or use a simple file-based store
// For production, you'd use a database, but we'll use a simple approach
let storedTokens = {};

// Step 1: Get authorization code from user
async function getAuthorizationUrl() {
  const scope = 'Files.ReadWrite offline_access';
  const authUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?` +
    `client_id=${CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `response_mode=query`;
  
  return authUrl;
}

// Step 2: Exchange authorization code for tokens
async function getTokensFromCode(code) {
  try {
    const response = await axios.post(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
        scope: 'Files.ReadWrite offline_access',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    
    storedTokens.accessToken = response.data.access_token;
    storedTokens.refreshToken = response.data.refresh_token;
    storedTokens.expiresAt = Date.now() + (response.data.expires_in * 1000);
    
    return response.data.access_token;
  } catch (error) {
    console.error('Token exchange failed:', error.response?.data || error.message);
    throw new Error('Failed to get access token');
  }
}

// Step 3: Refresh token if expired
async function refreshAccessToken() {
  if (!storedTokens.refreshToken) {
    throw new Error('No refresh token available');
  }
  
  try {
    const response = await axios.post(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: storedTokens.refreshToken,
        grant_type: 'refresh_token',
        scope: 'Files.ReadWrite offline_access',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    
    storedTokens.accessToken = response.data.access_token;
    storedTokens.expiresAt = Date.now() + (response.data.expires_in * 1000);
    
    return response.data.access_token;
  } catch (error) {
    console.error('Token refresh failed:', error.response?.data || error.message);
    throw new Error('Failed to refresh access token');
  }
}

// Step 4: Get valid access token
async function getValidAccessToken() {
  if (storedTokens.accessToken && storedTokens.expiresAt && Date.now() < storedTokens.expiresAt) {
    return storedTokens.accessToken;
  }
  
  if (storedTokens.refreshToken) {
    return await refreshAccessToken();
  }
  
  throw new Error('No valid token available');
}

// Step 5: Add job to Excel
async function addJobToExcel(jobData, accessToken) {
  try {
    // Get the file ID for v4.xlsx
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
            null, // BasePrice (formula)
            null, // ConditionMultiplier (formula)
            null, // TotalPrice (formula)
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
  try {
    // Handle callback from Microsoft login
    if (event.path.includes('excel-sync-callback')) {
      const code = event.queryStringParameters?.code;
      const error = event.queryStringParameters?.error;
      
      if (error) {
        return {
          statusCode: 400,
          body: `Authorization error: ${error}`,
        };
      }
      
      if (code) {
        await getTokensFromCode(code);
        return {
          statusCode: 200,
          body: 'Authorization successful! You can close this window and submit the form again.',
        };
      }
      
      return {
        statusCode: 400,
        body: 'Missing authorization code',
      };
    }
    
    // Handle form submission
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }
    
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
    
    // Get valid access token
    let accessToken;
    try {
      accessToken = await getValidAccessToken();
    } catch (error) {
      // No token, need to authorize
      const authUrl = await getAuthorizationUrl();
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: 'Authorization required',
          authUrl: authUrl,
          message: 'Please authorize access to your OneDrive and try again',
        }),
      };
    }
    
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
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to process booking. Please try again.',
        details: error.message,
      }),
    };
  }
};
