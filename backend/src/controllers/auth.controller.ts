import { Request, Response } from "express";
import { loginUser } from "../services/auth.service";

export async function loginController(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: "Username and password are required",
      });
    }

    const user = await loginUser({ username, password });

    return res.status(200).json({
      message: "Login successful",
      user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to login";
    return res.status(401).json({
      error: message,
    });
  }
}
