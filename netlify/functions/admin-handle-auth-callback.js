// Netlify Function: Handle OAuth callback and return refresh token for manual storage
const axios = require('axios');

const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const TENANT_ID = process.env.AZURE_TENANT_ID;
const ADMIN_REDIRECT_URI = 'https://paynedetailinggroup.com/admin-authorize';

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

    // Return refresh token to be stored by user in Netlify environment variables
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        refreshToken: refreshToken,
        message: 'Copy the refreshToken value and add it to Netlify environment variables as ADMIN_REFRESH_TOKEN',
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
