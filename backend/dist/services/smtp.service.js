"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.verifySmtpConnection = verifySmtpConnection;
const nodemailer_1 = __importDefault(require("nodemailer"));
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
async function sendEmail(input) {
    const info = await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: input.recipient,
        subject: input.subject,
        text: input.body,
    });
    return info;
}
async function verifySmtpConnection() {
    await transporter.verify();
    console.log("📧 SMTP connection verified");
}
