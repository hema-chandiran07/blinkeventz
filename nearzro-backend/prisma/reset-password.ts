import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log("Resetting admin password...");
  
  const newPassword = 'admin123';
  const passwordHash = await bcrypt.hash(newPassword, 10);
  
  const result = await prisma.user.updateMany({
    where: { email: 'admin@NearZro.com' },
    data: { passwordHash },
  });
  
  console.log(`✅ Password reset for ${result.count} user(s)`);
  console.log(`New password: admin123`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
