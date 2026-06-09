/**
 * Run this once to get a fresh Google OAuth refresh token.
 * Usage: node get-token.js
 */
require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PORT          = 3001;
const REDIRECT_URI  = `http://localhost:${PORT}/callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌  GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/drive.file'],
});

console.log('\n1. Open this URL in your browser:\n');
console.log('   ' + authUrl);
console.log('\n2. Sign in with the Google account that owns your Drive folder.');
console.log('3. After you approve, this script will print your new refresh token.\n');

const server = http.createServer(async (req, res) => {
  const { pathname, query } = url.parse(req.url, true);
  if (pathname !== '/callback') { res.end(); return; }

  const code = query.code;
  if (!code) {
    res.end('No code found in callback.');
    server.close();
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.end('<h2>Success! Check your terminal for the refresh token.</h2>');
    server.close();

    console.log('\n✅  New refresh token:\n');
    console.log('   ' + tokens.refresh_token);
    console.log('\nUpdate GOOGLE_REFRESH_TOKEN in your .env and in Vercel environment variables.\n');
  } catch (err) {
    res.end('Error: ' + err.message);
    server.close();
    console.error('❌  Token exchange failed:', err.message);
  }
});

server.listen(PORT);
