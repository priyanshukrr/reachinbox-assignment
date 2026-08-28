import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./db/prisma";
import emailRoutes from "./routes/email.routes";
import authRoutes from "./routes/auth.routes";
import cronRoutes from "./routes/cron.routes";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);
app.use(express.json());

// Auth & Email routes
app.use("/api/auth", authRoutes);
app.use("/api/emails", emailRoutes);

// Cron route — called by Vercel Cron Jobs every minute to process scheduled emails
app.use("/api/cron", cronRoutes);

// Root
app.get("/", (req, res) => {
  res.json({ message: "ReachInbox API" });
});

// Database health
app.get("/health/db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Database health check failed:", error);
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Export app for Vercel serverless
export default app;

// Start local dev server only when not running on Vercel
if (process.env.VERCEL !== "1") {
  const PORT = Number(process.env.PORT) || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}