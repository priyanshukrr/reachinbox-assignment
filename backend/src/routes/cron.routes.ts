import { Router } from "express";
import { processScheduledEmails } from "../controllers/cron.controller";

const router = Router();

// Called every minute by Vercel Cron Jobs
router.post("/process-emails", processScheduledEmails);

export default router;
