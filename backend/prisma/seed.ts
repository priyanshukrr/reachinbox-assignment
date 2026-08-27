import "dotenv/config";
import prisma from "../src/db/prisma";

async function main() {
  // Create or get test user
  const user = await prisma.user.upsert({
    where: {
      email: "test@reachinbox.local",
    },
    update: {},
    create: {
      googleId: "test-google-id-001",
      username: "testuser",
      password: "password123",
      name: "Test User",
      email: "test@reachinbox.local",
      avatar: null,
      role: "USER",
    },
  });

  console.log("✅ Test user ready:", {
    id: user.id,
    name: user.name,
    email: user.email,
  });

  // Create or get Admin user: priyanshu221 / priyanshu123
  const adminUser = await prisma.user.upsert({
    where: {
      username: "priyanshu221",
    },
    update: {
      password: "priyanshu123",
      role: "ADMIN",
    },
    create: {
      username: "priyanshu221",
      password: "priyanshu123",
      name: "Priyanshu (Admin)",
      email: "priyanshu221@reachinbox.local",
      role: "ADMIN",
    },
  });

  console.log("👑 Admin user ready:", {
    id: adminUser.id,
    username: adminUser.username,
    name: adminUser.name,
    role: adminUser.role,
  });

  // Check whether test campaign already exists for admin
  let campaign = await prisma.campaign.findFirst({
    where: {
      userId: adminUser.id,
    },
  });

  if (!campaign) {
    campaign = await prisma.campaign.findFirst({
      where: {
        userId: user.id,
      },
    });
  }

  // Create campaign if it doesn't exist
  if (!campaign) {
    const startTime = new Date(Date.now() + 60 * 60 * 1000);

    campaign = await prisma.campaign.create({
      data: {
        userId: adminUser.id,
        subject: "Test Campaign",
        body: "Hello! This is a test campaign from ReachInbox.",
        startTime,
        delayBetweenEmails: 2000,
        hourlyLimit: 200,
      },
    });
  }

  console.log("✅ Test campaign ready:", {
    id: campaign.id,
    subject: campaign.subject,
    startTime: campaign.startTime,
    delayBetweenEmails: campaign.delayBetweenEmails,
    hourlyLimit: campaign.hourlyLimit,
  });
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });