import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Password@123", 10);

  const users = [
    { name: "Admin User", email: "admin@fundsweb.test", role: "ADMIN" as const },
    { name: "Sales User", email: "sales@fundsweb.test", role: "SALES" as const },
    { name: "Warehouse User", email: "warehouse@fundsweb.test", role: "WAREHOUSE" as const },
    { name: "Accounts User", email: "accounts@fundsweb.test", role: "ACCOUNTS" as const },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: password },
    });
  }

  console.log("Seeded 4 test users (password for all: Password@123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });