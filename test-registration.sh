#!/bin/bash
# Test registration endpoint
echo "Testing registration endpoint..."
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@gmail.com","password":"TestPass123!"}' \
  -v 2>&1 | tee /tmp/test_result.txt

echo ""
echo "Checking API logs..."
docker logs NearZro-api --tail 50
