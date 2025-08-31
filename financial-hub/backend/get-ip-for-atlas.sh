#!/bin/bash

echo "=== MongoDB Atlas IP Whitelist Helper ==="
echo "Current external IP address:"

# Try to get current IP
CURRENT_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipecho.net/plain 2>/dev/null || curl -s icanhazip.com 2>/dev/null)

if [ -n "$CURRENT_IP" ]; then
    echo "🌐 Your current IP: $CURRENT_IP"
    echo ""
    echo "📋 Steps to whitelist in Atlas:"
    echo "1. Go to: https://cloud.mongodb.com"
    echo "2. Select your project: Race-OS"
    echo "3. Go to Network Access (left sidebar)"
    echo "4. Click 'Add IP Address'"
    echo "5. Add this IP: $CURRENT_IP"
    echo "   OR add 0.0.0.0/0 for development"
    echo ""
    echo "⏱️  After whitelisting, restart the backend server"
else
    echo "❌ Could not determine IP address"
    echo "💡 Manually add 0.0.0.0/0 to Atlas Network Access for development"
fi

echo ""
echo "🔗 Direct Atlas link: https://cloud.mongodb.com/v2/66a5db4cf55b5066a5bbd5bb#/security/network/accessList"
