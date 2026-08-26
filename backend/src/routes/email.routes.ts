import { Router } from "express";
import { scheduleEmailController } from "../controllers/email.controller";

const router = Router();

router.post("/schedule", scheduleEmailController);

export default router;