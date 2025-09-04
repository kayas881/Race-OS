#!/bin/bash

# Financial Hub Integration Setup Script
# This script helps you configure all the necessary API keys and settings

echo "🏦 Financial Hub - Integration Setup"
echo "===================================="
echo ""

# Check if .env file exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled. Edit .env manually if needed."
        exit 1
    fi
fi

# Copy template
cp .env.example .env
echo "✅ Created .env file from template"
echo ""

# Function to update env variable
update_env() {
    local key=$1
    local value=$2
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|${key}=.*|${key}=${value}|" .env
    else
        sed -i "s|${key}=.*|${key}=${value}|" .env
    fi
}

# Prompt for database configuration
echo "📊 Database Configuration"
echo "------------------------"
read -p "MongoDB URI (press Enter for default: mongodb://localhost:27017/financial-hub): " mongodb_uri
mongodb_uri=${mongodb_uri:-mongodb://localhost:27017/financial-hub}
update_env "MONGODB_URI" "$mongodb_uri"

# Generate JWT secret
echo ""
echo "🔐 Security Configuration"
echo "------------------------"
jwt_secret=$(openssl rand -base64 32 2>/dev/null || echo "please-change-this-jwt-secret-$(date +%s)")
update_env "JWT_SECRET" "$jwt_secret"
echo "✅ Generated JWT secret"

# Plaid configuration
echo ""
echo "🏦 Plaid Banking Integration"
echo "---------------------------"
echo "To connect bank accounts, you need Plaid API credentials."
echo "Get them from: https://dashboard.plaid.com/team/keys"
echo ""
read -p "Plaid Client ID (or press Enter to skip): " plaid_client_id
if [ ! -z "$plaid_client_id" ]; then
    update_env "PLAID_CLIENT_ID" "$plaid_client_id"
    read -p "Plaid Secret Key: " plaid_secret
    update_env "PLAID_SECRET" "$plaid_secret"
    
    echo "Choose Plaid environment:"
    echo "1) sandbox (for testing)"
    echo "2) development (for development)"
    echo "3) production (for live data)"
    read -p "Enter choice (1-3): " plaid_env_choice
    case $plaid_env_choice in
        1) update_env "PLAID_ENV" "sandbox" ;;
        2) update_env "PLAID_ENV" "development" ;;
        3) update_env "PLAID_ENV" "production" ;;
        *) update_env "PLAID_ENV" "sandbox" ;;
    esac
    echo "✅ Plaid configured"
else
    echo "⏭️  Skipping Plaid configuration"
fi

# YouTube configuration
echo ""
echo "📺 YouTube Integration"
echo "---------------------"
echo "To track YouTube revenue, you need Google API credentials."
echo "Get them from: https://console.developers.google.com/"
echo ""
read -p "Google Client ID (or press Enter to skip): " google_client_id
if [ ! -z "$google_client_id" ]; then
    update_env "GOOGLE_CLIENT_ID" "$google_client_id"
    read -p "Google Client Secret: " google_client_secret
    update_env "GOOGLE_CLIENT_SECRET" "$google_client_secret"
    echo "✅ YouTube configured"
else
    echo "⏭️  Skipping YouTube configuration"
fi

# Twitch configuration
echo ""
echo "📹 Twitch Integration"
echo "--------------------"
echo "To track Twitch revenue, you need Twitch API credentials."
echo "Get them from: https://dev.twitch.tv/console/apps"
echo ""
read -p "Twitch Client ID (or press Enter to skip): " twitch_client_id
if [ ! -z "$twitch_client_id" ]; then
    update_env "TWITCH_CLIENT_ID" "$twitch_client_id"
    read -p "Twitch Client Secret: " twitch_client_secret
    update_env "TWITCH_CLIENT_SECRET" "$twitch_client_secret"
    echo "✅ Twitch configured"
else
    echo "⏭️  Skipping Twitch configuration"
fi

# Patreon configuration
echo ""
echo "💰 Patreon Integration"
echo "---------------------"
echo "To track Patreon revenue, you need Patreon API credentials."
echo "Get them from: https://www.patreon.com/portal/registration/register-clients"
echo ""
read -p "Patreon Client ID (or press Enter to skip): " patreon_client_id
if [ ! -z "$patreon_client_id" ]; then
    update_env "PATREON_CLIENT_ID" "$patreon_client_id"
    read -p "Patreon Client Secret: " patreon_client_secret
    update_env "PATREON_CLIENT_SECRET" "$patreon_client_secret"
    echo "✅ Patreon configured"
else
    echo "⏭️  Skipping Patreon configuration"
fi

# Email configuration
echo ""
echo "📧 Email Notifications"
echo "---------------------"
echo "Configure SMTP for sending notifications and invoices."
echo ""
read -p "Enable email notifications? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "SMTP Host (default: smtp.gmail.com): " smtp_host
    smtp_host=${smtp_host:-smtp.gmail.com}
    update_env "SMTP_HOST" "$smtp_host"
    
    read -p "SMTP Port (default: 587): " smtp_port
    smtp_port=${smtp_port:-587}
    update_env "SMTP_PORT" "$smtp_port"
    
    read -p "Email address: " smtp_user
    update_env "SMTP_USER" "$smtp_user"
    
    read -s -p "Email app password: " smtp_pass
    echo
    update_env "SMTP_PASS" "$smtp_pass"
    echo "✅ Email configured"
else
    echo "⏭️  Skipping email configuration"
fi

# Frontend URL
echo ""
echo "🌐 Frontend Configuration"
echo "------------------------"
read -p "Frontend URL (default: http://localhost:3000): " frontend_url
frontend_url=${frontend_url:-http://localhost:3000}
update_env "FRONTEND_URL" "$frontend_url"
update_env "CORS_ORIGIN" "$frontend_url"

# Final steps
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Install dependencies: npm install"
echo "2. Start the application: npm run dev"
echo "3. Open your browser to: $frontend_url"
echo ""
echo "📝 Integration Setup Instructions:"
echo ""

if [ ! -z "$plaid_client_id" ]; then
    echo "🏦 Banking (Plaid):"
    echo "   - Go to Integrations > Banking"
    echo "   - Click 'Connect Bank Account'"
    echo "   - Follow the Plaid Link flow"
    echo ""
fi

if [ ! -z "$google_client_id" ]; then
    echo "📺 YouTube:"
    echo "   - Go to Integrations > Creator Platforms"
    echo "   - Click 'Connect YouTube'"
    echo "   - Authorize access to your channel"
    echo ""
fi

if [ ! -z "$twitch_client_id" ]; then
    echo "📹 Twitch:"
    echo "   - Go to Integrations > Creator Platforms"
    echo "   - Click 'Connect Twitch'"
    echo "   - Authorize access to your channel"
    echo ""
fi

if [ ! -z "$patreon_client_id" ]; then
    echo "💰 Patreon:"
    echo "   - Go to Integrations > Creator Platforms"
    echo "   - Click 'Connect Patreon'"
    echo "   - Authorize access to your campaigns"
    echo ""
fi

echo "📄 Substack:"
echo "   - Go to Integrations > Creator Platforms"
echo "   - Click 'Connect Substack'"
echo "   - Upload your subscriber CSV export"
echo ""

echo "💡 For detailed setup instructions, check:"
echo "   - README.md"
echo "   - FINANCIAL_HUB_DOCUMENTATION.md"
echo ""
echo "🚀 Happy tracking!"
