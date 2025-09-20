const appwrite = require('../config/appwrite');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token, authorization denied' });
    }

    // For Appwrite, we need to verify the session token
    // This is a simplified approach - in production you might want to cache user sessions
    try {
      // Create a temporary client with the user's session
      const userClient = new appwrite.client.constructor()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setJWT(token);

      const userAccount = new appwrite.account.constructor(userClient);
      const user = await userAccount.get();

      // Add user to request
      req.user = {
        id: user.$id,
        email: user.email,
        name: user.name,
        emailVerification: user.emailVerification
      };

      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ error: 'Token is not valid' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Server Error' });
  }
};

module.exports = authMiddleware;