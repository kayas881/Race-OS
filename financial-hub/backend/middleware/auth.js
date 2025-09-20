const { Client, Account } = require('node-appwrite');

module.exports = async function(req, res, next) {
  try {
    let token = req.header('Authorization');

    if (!token) {
      return res.status(401).json({ error: 'No token, authorization denied' });
    }

    // Remove Bearer prefix if present
    if (token.startsWith('Bearer ')) {
      token = token.slice(7, token.length).trimLeft();
    }

    // Validate token format
    if (typeof token !== 'string' || token.length < 20) {
      console.log('❌ Invalid token format:', typeof token, token ? token.length : 'null');
      return res.status(401).json({ error: 'Invalid token format' });
    }

    console.log('🔍 Received token length:', token.length);
    console.log('🔍 Token preview:', token.substring(0, 50) + '...');

    // Create new client instance for this request
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setJWT(token);

    const account = new Account(client);

    // Verify the JWT token by getting user information
    const user = await account.get();

    if (!user) {
      console.log('❌ No user found for token');
      return res.status(401).json({ error: 'Token is not valid' });
    }

    // Attach user to request object
    req.user = {
      id: user.$id,
      email: user.email,
      name: user.name
    };
    
    console.log(`✅ Authenticated user: ${user.name} (${user.email})`);
    next();
  } catch (err) {
    console.log('❌ Auth middleware error:', err.message);
    if (err.message.includes('JWT')) {
      console.log('❌ JWT Error details:', err.message);
    }
    res.status(401).json({ error: 'Token validation failed', details: err.message });
  }
};
