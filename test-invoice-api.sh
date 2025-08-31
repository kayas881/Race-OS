#!/bin/bash

echo "=== Testing Invoice System API ==="

# First, we need to register/login to get a token
echo "1. Testing user registration (if needed)..."

# Try to register a test user
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "firstName": "Test",
    "lastName": "User"
  }')

echo "Register response: $REGISTER_RESPONSE"

# Login to get token
echo -e "\n2. Logging in to get authentication token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }')

echo "Login response: $LOGIN_RESPONSE"

# Extract token (simple grep - in production you'd use jq)
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get authentication token"
  exit 1
fi

echo "✅ Got token: ${TOKEN:0:20}..."

# Test invoice creation
echo -e "\n3. Testing invoice creation..."
INVOICE_RESPONSE=$(curl -s -X POST http://localhost:5000/api/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client": {
      "name": "Test Client",
      "email": "client@example.com",
      "company": "Test Company"
    },
    "items": [
      {
        "description": "Web Development",
        "quantity": 10,
        "rate": 100
      }
    ],
    "dueDate": "2025-09-23",
    "taxRate": 0.08,
    "notes": "Test invoice"
  }')

echo "Invoice creation response: $INVOICE_RESPONSE"

# Test invoice listing
echo -e "\n4. Testing invoice listing..."
LIST_RESPONSE=$(curl -s -X GET http://localhost:5000/api/invoices \
  -H "Authorization: Bearer $TOKEN")

echo "Invoice list response: $LIST_RESPONSE"

echo -e "\n✅ Invoice API tests completed!"
echo "You can now use the frontend at http://localhost:3001"
echo "Login with: test@example.com / testpassword123"
