#!/bin/bash

echo "=== Testing Invoice Creation Fix ==="

# First, we need to create a user and get a token
echo "1. Creating test user..."
USER_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }')

echo "User creation response: $USER_RESPONSE"

# Extract token (this is a simple approach - in real testing you'd parse JSON properly)
TOKEN=$(echo $USER_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token. Trying login..."
  LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "password123"
    }')
  echo "Login response: $LOGIN_RESPONSE"
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
  echo "❌ Could not get authentication token"
  exit 1
fi

echo "✅ Got authentication token"

# Test invoice creation
echo -e "\n2. Testing invoice creation..."
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
        "description": "Web Development Services",
        "quantity": 10,
        "rate": 50
      }
    ],
    "dueDate": "2025-09-15",
    "taxRate": 8.5,
    "discountRate": 0,
    "notes": "Thank you for your business"
  }')

echo "Invoice creation response:"
echo $INVOICE_RESPONSE | jq '.' 2>/dev/null || echo $INVOICE_RESPONSE

# Check if invoice was created successfully
if echo $INVOICE_RESPONSE | grep -q '"invoiceNumber"'; then
  echo -e "\n✅ Invoice created successfully!"
  
  # Test invoice listing
  echo -e "\n3. Testing invoice listing..."
  LIST_RESPONSE=$(curl -s -X GET http://localhost:5000/api/invoices \
    -H "Authorization: Bearer $TOKEN")
  
  echo "Invoice list response:"
  echo $LIST_RESPONSE | jq '.' 2>/dev/null || echo $LIST_RESPONSE
  
  if echo $LIST_RESPONSE | grep -q '"invoices"'; then
    echo -e "\n✅ Invoice listing works!"
  else
    echo -e "\n❌ Invoice listing failed"
  fi
else
  echo -e "\n❌ Invoice creation failed"
fi

echo -e "\n=== Test Complete ==="
