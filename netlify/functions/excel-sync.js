// Netlify Function: Write form submissions to Excel via Microsoft Graph API
// This runs serverless when your contact form is submitted

const axios = require('axios');

// Your Azure credentials (these come from environment variables in Netlify)
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const TENANT_ID = process.env.AZURE_TENANT_ID;
const ONEDRIVE_FILE_PATH = '/Payne Detailing Group - Operations/Payne_Detailing_Business_System_v4.xlsx';

// Step 1: Get an access token from Azure
async function getAccessToken() {
  try {
    const response = await axios.post(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Token fetch failed:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Microsoft Graph');
  }
}

// Step 2: Add a new row to the Jobs sheet in Excel
async function addJobToExcel(jobData, accessToken) {
  try {
    // First, get the file ID for v4.xlsx
    const fileSearchResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/me/drive/root:${ONEDRIVE_FILE_PATH}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    const fileId = fileSearchResponse.data.id;
    
    // Now get the workbook session and add data to the Jobs sheet
    const sessionResponse = await axios.post(
      `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/createSession`,
      {
        persistChanges: true,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    const sessionId = sessionResponse.data.id;
    
    // Find the next empty row in the Jobs sheet
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
      throw new Error('JobsTable not found in Jobs sheet');
    }
    
    // Add a new row to the table with the form data
    const newRow = await axios.post(
      `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/tables('${jobsTable.id}')/rows/add`,
      {
        values: [
          [
            jobData.customerName,
            jobData.vehicleId,
            jobData.serviceType,
            jobData.condition,
            jobData.addOns,
            null, // BasePrice (formula)
            null, // ConditionMultiplier (formula)
            null, // TotalPrice (formula)
            jobData.paymentMethod || '',
            jobData.employee || '',
            jobData.jobDate || new Date().toISOString().split('T')[0],
            'Live', // EntryType
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
    
    // Close the session
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
    
    return { success: true, message: 'Job added to Excel successfully' };
  } catch (error) {
    console.error('Excel write failed:', error.response?.data || error.message);
    throw new Error('Failed to write to Excel file');
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
    const required = ['customerName', 'email', 'phone', 'vehicleId', 'serviceType', 'condition'];
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
        message: 'Your booking has been submitted and logged in our system' 
      }),
    };
  } catch (error) {
    console.error('Function error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to process booking. Please try again or contact us.' 
      }),
    };
  }
};
