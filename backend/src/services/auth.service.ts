import prisma from "../db/prisma";

export interface LoginInput {
  username: string;
  password: string;
}

export async function loginUser(input: LoginInput) {
  const { username, password } = input;

  if (!username || !password) {
    throw new Error("Username and password are required");
  }

  // Find user by username or email
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: username },
        { email: username },
      ],
    },
  });

  if (!user) {
    throw new Error("Invalid username or password");
  }

  // Validate password
  if (user.password !== password) {
    throw new Error("Invalid username or password");
  }

  // Find or create default campaign for logged-in user
  let campaign = await prisma.campaign.findFirst({
    where: {
      userId: user.id,
    },
  });

  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: {
        userId: user.id,
        subject: "Default Campaign",
        body: "Hello from ReachInbox!",
        startTime: new Date(),
        delayBetweenEmails: 2000,
        hourlyLimit: 200,
      },
    });
  }

  return {
    id: user.id,
    username: user.username || user.email,
    name: user.name,
    email: user.email,
    role: user.role,
    campaignId: campaign.id,
  };
}
