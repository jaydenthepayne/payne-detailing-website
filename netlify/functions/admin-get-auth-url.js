// Netlify Function: Generate authorization URL for admin (Firebase version)
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const TENANT_ID = process.env.AZURE_TENANT_ID;
const ADMIN_REDIRECT_URI = 'https://paynedetailinggroup.com/admin-authorize';

exports.handler = async (event) => {
  try {
    const scope = 'Files.ReadWrite offline_access';
    const authUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?` +
      `client_id=${CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(ADMIN_REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_mode=query`;

    return {
      statusCode: 200,
      body: JSON.stringify({ authUrl }),
    };
  } catch (error) {
    console.error('Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate authorization URL' }),
    };
  }
};
