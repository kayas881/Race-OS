const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

class DatabaseConnection {
  constructor() {
    this.mongoServer = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      let mongoUri;
      let useAtlas = false;

      // Check if MongoDB URI is provided (for Atlas or other hosted MongoDB)
      if (process.env.MONGODB_URI && process.env.MONGODB_URI !== 'mongodb://localhost:27017/financial-hub') {
        mongoUri = process.env.MONGODB_URI;
        useAtlas = true;
        console.log('🌐 Attempting to connect to MongoDB Atlas...');
        
        try {
          // Try to connect to Atlas with a short timeout
          await mongoose.connect(mongoUri, { 
            serverSelectionTimeoutMS: 5000, // 5 second timeout
            socketTimeoutMS: 45000,
          });
          
          this.isConnected = true;
          console.log('✅ MongoDB Atlas connected successfully');
          
          // Set up connection event handlers
          this.setupConnectionHandlers();
          return;
          
        } catch (atlasError) {
          console.log('⚠️  MongoDB Atlas connection failed:', atlasError.message);
          console.log('💡 To use Atlas, make sure to:');
          console.log('   1. Whitelist your IP address in Atlas Security');
          console.log('   2. Check your cluster is running');
          console.log('   3. Verify your connection string');
          console.log('🔄 Falling back to MongoDB Memory Server for development...');
          
          // Disconnect any partial Atlas connection
          if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
          }
        }
      }

      // Fallback to MongoDB Memory Server
      console.log('💻 Starting MongoDB Memory Server for development...');
      this.mongoServer = await MongoMemoryServer.create({
        instance: {
          port: 27018,
          dbName: 'financial-hub-dev'
        }
      });
      mongoUri = this.mongoServer.getUri();
      console.log('📍 MongoDB Memory Server started at:', mongoUri);

      // Connect to Memory Server
      await mongoose.connect(mongoUri);
      
      this.isConnected = true;
      console.log('✅ MongoDB Memory Server connected successfully');
      
      this.setupConnectionHandlers();

    } catch (error) {
      console.error('❌ Failed to connect to any database:', error);
      throw error;
    }
  }

  setupConnectionHandlers() {
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      this.isConnected = false;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  async disconnect() {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      
      if (this.mongoServer) {
        await this.mongoServer.stop();
        console.log('MongoDB Memory Server stopped');
      }
      
      this.isConnected = false;
      console.log('Database disconnected');
    } catch (error) {
      console.error('Error disconnecting from database:', error);
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
      usingAtlas: this.mongoServer === null && this.isConnected,
      usingMemoryServer: this.mongoServer !== null
    };
  }
}

module.exports = new DatabaseConnection();
