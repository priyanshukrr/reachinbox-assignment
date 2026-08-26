import nodemailer from "nodemailer";

const smtpPort = Number(process.env.SMTP_PORT) || 587;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface SendEmailInput {
  recipient: string;
  subject: string;
  body: string;
}

export async function sendEmail(input: SendEmailInput) {
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: input.recipient,
    subject: input.subject,
    text: input.body,
  });

  return info;
}

export async function verifySmtpConnection() {
  await transporter.verify();

  console.log("📧 SMTP connection verified");
}