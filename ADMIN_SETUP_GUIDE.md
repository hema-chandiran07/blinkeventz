# 🔐 Admin Authentication Guide

## Default Admin Credentials

**Email:** `admin@NearZro.com`  
**Password:** `admin123`

**Login URL:** http://localhost:3001/admin-login

---

## 🔒 Security Features Implemented

### 1. Role-Based Access Control (RBAC)
- Only users with `role: "ADMIN"` can access admin routes
- All admin pages check `user.role === "ADMIN"` before rendering
- Backend endpoints use `@Roles(Role.ADMIN)` decorator

### 2. Protected Admin Routes
```
/dashboard/admin          - Admin Dashboard
/dashboard/admin/users    - User Management
/dashboard/admin/create-admin - Create New Admin
/api/user/admin-only      - Admin-only API endpoint
```

### 3. Admin-Only API Endpoints
- `POST /api/auth/register-admin` - Create new admin (requires admin token)
- `GET /api/user/admin-only` - Admin-only route test
- `PATCH /api/venues/:id/approve` - Approve venues
- `PATCH /api/vendors/:id/approve` - Approve vendors
- `PATCH /api/vendors/:id/reject` - Reject vendors

---

## 📋 How to Create New Admin Accounts

### Method 1: Via Admin Panel (Recommended)
1. Login as admin at http://localhost:3001/admin-login
2. Navigate to **Dashboard → Admin → Create Admin**
3. Fill in the form:
   - Full Name
   - Email Address
   - Password (min 8 characters)
   - Confirm Password
4. Click "Create Admin Account"

### Method 2: Via API (For Developers)
```bash
# First, login as admin to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@NearZro.com","password":"admin123"}'

# Use the token to create new admin
curl -X POST http://localhost:3000/api/auth/register-admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"name":"New Admin","email":"newadmin@NearZro.com","password":"SecurePass123!"}'
```

### Method 3: Via Database Seed (Initial Setup)
```bash
# Run seed command
docker exec NearZro-api npx prisma db seed

# This creates: admin@NearZro.com / admin123
```

---

## 🛡️ Security Best Practices

### For Production:
1. **Change default password immediately**
   ```bash
   # Update password via API or database
   UPDATE "User" SET "passwordHash" = '<new_hash>' WHERE email = 'admin@NearZro.com';
   ```

2. **Use environment variables for sensitive data**
   ```env
   ADMIN_EMAIL=admin@yourdomain.com
   # Never commit passwords to .env files in production
   ```

3. **Enable 2FA for admin accounts** (Future enhancement)

4. **Audit admin actions** - All admin actions are logged in `AuditLog` table

5. **Limit admin access by IP** (Future enhancement)
   ```typescript
   // Add IP whitelist middleware
   const ADMIN_IPS = ['192.168.1.1', '10.0.0.1'];
   ```

---

## 🧪 Testing Admin Access

### Test 1: Admin Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@NearZro.com","password":"admin123"}'
```
**Expected:** Returns JWT token with `role: "ADMIN"`

### Test 2: Access Admin-Only Route
```bash
curl http://localhost:3000/api/user/admin-only \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```
**Expected:** `"ADMIN ACCESS GRANTED"`

### Test 3: Non-Admin Access (Should Fail)
```bash
# Login as regular user
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@gmail.com","password":"TestPass123!"}'

# Try to access admin route
curl http://localhost:3000/api/user/admin-only \
  -H "Authorization: Bearer USER_TOKEN"
```
**Expected:** `403 Forbidden`

---

## 📊 Admin Dashboard Features

### Accessible at: http://localhost:3001/dashboard/admin

- **User Management** - View all users, filter by role
- **Venue Approvals** - Approve/reject venue listings
- **Vendor Approvals** - Approve/reject vendor applications
- **System Statistics** - Total users, venues, vendors, revenue
- **Create Admin** - Add new administrators
- **Audit Logs** - View system activity logs

---

## ⚠️ Important Notes

1. **Admin accounts bypass OTP verification** - Admin accounts created via `/register-admin` are pre-verified
2. **Only existing admins can create new admins** - Requires valid admin JWT token
3. **Admin email must be unique** - Cannot duplicate existing user emails
4. **Password requirements** - Minimum 8 characters (enforced by validation)

---

## 🚨 Troubleshooting

### "Unauthorized" when accessing admin pages
- Ensure you're logged in with an admin account
- Check `user.role === "ADMIN"` in browser console
- Clear localStorage and re-login

### "403 Forbidden" on admin API calls
- Verify token has `role: "ADMIN"` claim
- Token might be expired (7-day expiry)
- Re-login to get fresh token

### Can't create admin account
- Ensure you're logged in as admin
- Check email isn't already registered
- Verify password meets requirements (8+ chars)

---

## 📞 Support

For admin access issues:
1. Check backend logs: `docker logs NearZro-api | grep -i admin`
2. Verify database: `SELECT * FROM "User" WHERE role = 'ADMIN';`
3. Re-seed admin: `docker exec NearZro-api npx prisma db seed`
