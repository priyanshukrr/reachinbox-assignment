import { Router } from "express";
import {
  scheduleEmailController,
  getEmailsController,
} from "../controllers/email.controller";

const router = Router();

router.get("/", getEmailsController);
router.post("/schedule", scheduleEmailController);

export default router;