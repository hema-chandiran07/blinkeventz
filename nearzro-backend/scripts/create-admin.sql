INSERT INTO "User" (name, email, "passwordHash", role, "isActive", "createdAt", "updatedAt") 
VALUES ('Admin User', 'admin@nearzro.com', '$2b$10$fJbOCERl0D28TpHJKxmDGOwJJHh/a9M0UACmhaupD2wN2xB2ZHzPG', 'ADMIN', true, NOW(), NOW()) 
ON CONFLICT (email) DO UPDATE SET 
  name='Admin User', 
  role='ADMIN', 
  "passwordHash"='$2b$10$fJbOCERl0D28TpHJKxmDGOwJJHh/a9M0UACmhaupD2wN2xB2ZHzPG', 
  "isActive"=true,
  "updatedAt"=NOW();
