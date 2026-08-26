import "dotenv/config";
import { emailQueue } from "./src/queues/email.queue";

async function main() {
  const job = await emailQueue.add(
    "send-email",
    {
      emailId: "test-email-1",
      recipient: "test@example.com",
      subject: "BullMQ Test",
      body: "Hello from ReachInbox!",
    },
    {
      delay: 5000,
      jobId: "test-email-1",
    }
  );

  console.log("🚀 Job added:", job.id);

  await emailQueue.close();
}

main().catch((error) => {
  console.error("Failed to add job:", error);
  process.exit(1);
});