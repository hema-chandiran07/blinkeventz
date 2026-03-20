const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Hash password
    const passwordHash = await bcrypt.hash('Admin@123456', 10);
    
    // Check if admin exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@nearzro.com' }
    });
    
    if (existingAdmin) {
      // Update existing admin
      await prisma.user.update({
        where: { email: 'admin@nearzro.com' },
        data: { 
          name: 'Admin User',
          role: 'ADMIN',
          passwordHash,
          isActive: true
        }
      });
      console.log('✅ Admin user updated successfully!');
    } else {
      // Create new admin
      await prisma.user.create({
        data: {
          name: 'Admin User',
          email: 'admin@nearzro.com',
          passwordHash,
          role: 'ADMIN',
          isActive: true
        }
      });
      console.log('✅ Admin user created successfully!');
    }
    
    console.log('\n📋 Login Credentials:');
    console.log('📧 Email: admin@nearzro.com');
    console.log('🔑 Password: Admin@123456');
    console.log('🔐 Role: ADMIN\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
