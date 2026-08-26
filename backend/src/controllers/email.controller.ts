import { Request, Response } from "express";
import { scheduleEmail } from "../services/email.service";

export async function scheduleEmailController(
  req: Request,
  res: Response
) {
  try {
    const {
      userId,
      campaignId,
      recipient,
      subject,
      body,
      scheduledAt,
    } = req.body;

    if (
      !userId ||
      !campaignId ||
      !recipient ||
      !subject ||
      !body ||
      !scheduledAt
    ) {
      return res.status(400).json({
        error: "All email scheduling fields are required",
      });
    }

    const scheduledDate = new Date(scheduledAt);

    if (Number.isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        error: "Invalid scheduledAt",
      });
    }

    if (scheduledDate.getTime() <= Date.now()) {
      return res.status(400).json({
        error: "scheduledAt must be in the future",
      });
    }

    const email = await scheduleEmail({
      userId,
      campaignId,
      recipient,
      subject,
      body,
      scheduledAt: scheduledDate,
    });

    return res.status(201).json({
      message: "Email scheduled successfully",
      email,
    });
  } catch (error) {
    console.error("Schedule email error:", error);

    return res.status(500).json({
      error: "Failed to schedule email",
    });
  }
}