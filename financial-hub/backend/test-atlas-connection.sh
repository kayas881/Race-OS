#!/bin/bash

echo "=== Testing MongoDB Atlas Connection ==="

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "Environment: $NODE_ENV"
echo "MongoDB URI: ${MONGODB_URI:0:20}..." # Show only first 20 chars for security

# Test connection with node
node << 'EOF'
const mongoose = require('mongoose');

async function testConnection() {
    try {
        console.log('🌐 Testing Atlas connection...');
        
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 75000,
            family: 4,
            maxPoolSize: 10,
            retryWrites: true,
            w: 'majority'
        });
        
        console.log('✅ Atlas connection successful!');
        console.log('📍 Database:', mongoose.connection.name);
        console.log('📍 Host:', mongoose.connection.host);
        
        // Test a simple operation
        const admin = mongoose.connection.db.admin();
        const status = await admin.ping();
        console.log('✅ Database ping successful:', status);
        
        await mongoose.disconnect();
        console.log('✅ Disconnected cleanly');
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        
        if (error.message.includes('IP')) {
            console.log('\n💡 IP Whitelist Issue:');
            console.log('   1. Go to MongoDB Atlas Dashboard');
            console.log('   2. Navigate to Network Access');
            console.log('   3. Add your current IP address');
            console.log('   4. Or add 0.0.0.0/0 for development (less secure)');
        }
        
        if (error.message.includes('authentication')) {
            console.log('\n💡 Authentication Issue:');
            console.log('   1. Check username/password in connection string');
            console.log('   2. Verify database user permissions');
        }
        
        process.exit(1);
    }
}

testConnection();
EOF

echo -e "\n=== Connection Test Complete ==="
