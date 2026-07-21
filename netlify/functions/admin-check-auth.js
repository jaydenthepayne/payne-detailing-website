// Netlify Function: Check if admin refresh token is set
const ADMIN_REFRESH_TOKEN = process.env.ADMIN_REFRESH_TOKEN;

exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      authorized: !!ADMIN_REFRESH_TOKEN,
    }),
  };
};
