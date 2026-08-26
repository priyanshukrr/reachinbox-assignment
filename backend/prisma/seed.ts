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
      name: "Test User",
      email: "test@reachinbox.local",
      avatar: null,
    },
  });

  console.log("✅ Test user ready:");
  console.log({
    id: user.id,
    name: user.name,
    email: user.email,
  });

  // Check whether test campaign already exists
  let campaign = await prisma.campaign.findFirst({
    where: {
      userId: user.id,
      subject: "Test Campaign",
    },
  });

  // Create campaign if it doesn't exist
  if (!campaign) {
    const startTime = new Date(Date.now() + 60 * 60 * 1000);

    campaign = await prisma.campaign.create({
      data: {
        userId: user.id,
        subject: "Test Campaign",
        body: "Hello! This is a test campaign from ReachInbox.",
        startTime,
        delayBetweenEmails: 2000,
        hourlyLimit: 200,
      },
    });
  }

  console.log("✅ Test campaign ready:");
  console.log({
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