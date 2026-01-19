import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log("Prisma seed started")
  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.create({
  data: {
    name: 'Admin',
    email: 'admin@blinkeventz.com',
    passwordHash,
    role: Role.ADMIN,
  },
});

  console.log('✅ Admin user seeded');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
