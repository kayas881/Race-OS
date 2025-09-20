const appwriteService = require('../config/appwrite');
const sdk = require('node-appwrite');

module.exports = async function(req, res, next) {
  // Get session ID from header
  const sessionId = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

  // Check if no session ID
  if (!sessionId) {
    return res.status(401).json({ error: 'No session token, authorization denied' });
  }

  try {
    // Initialize appwrite service if not done already
    if (!appwriteService.initialized) {
      appwriteService.initializeClient(
        process.env.APPWRITE_ENDPOINT,
        process.env.APPWRITE_PROJECT_ID,
        process.env.APPWRITE_API_KEY
      );
    }

    // Create a new client and set the session to validate it
    const sessionClient = new sdk.Client();
    sessionClient
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID);

    // Use the Users service with server API key to get session info
    const users = new sdk.Users(sessionClient.setKey(process.env.APPWRITE_API_KEY));
    
    // Get the session by its ID
    const session = await users.getSession(sessionId);
    
    if (session && session.userId) {
      // Get user details
      const user = await users.get(session.userId);
      
      if (user) {
        req.user = { 
          id: user.$id,
          email: user.email,
          name: user.name,
          sessionId: sessionId
        };
        console.log(`✅ Authenticated user: ${user.name} (${user.email})`);
        next();
      } else {
        console.log('❌ User not found for session');
        res.status(401).json({ error: 'User not found' });
      }
    } else {
      console.log('❌ Invalid session');
      res.status(401).json({ error: 'Session is not valid' });
    }

  } catch (err) {
    console.log('❌ Auth middleware error:', err.message);
    // Log more details for debugging
    if (err.code) {
      console.log('❌ Error code:', err.code);
    }
    res.status(401).json({ error: 'Session validation failed', details: err.message });
  }
};
