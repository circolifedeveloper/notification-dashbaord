import nodemailer from "nodemailer";
import env from "../config/env.js";

let transporter;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: env.mailer.host,
            port: env.mailer.port,
            secure: true,
            auth: { user: env.mailer.user, pass: env.mailer.pass },
        });
    }
    return transporter;
}

function otpEmailHtml(name, otp) {
    return `
    <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 480px; margin: auto; background: #f8fafc; border-radius: 12px;">
      <h2 style="color: #0f172a; margin: 0 0 8px;">Circolife Notification Dashboard</h2>
      <p style="color: #475569; font-size: 15px;">Hi ${name}, use this one-time password to sign in:</p>
      <p style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #0f172a; background: #e0f2fe; padding: 12px 20px; border-radius: 8px; text-align: center;">${otp}</p>
      <p style="color: #64748b; font-size: 13px;">This code expires in 5 minutes. If you did not request it, you can ignore this email.</p>
    </div>`;
}

export async function sendOtpEmail({ to, name, otp }) {
    if (!env.mailer.user || !env.mailer.pass) {
        if (env.isProduction) throw new Error("Mailer is not configured");
        console.warn(`[Mail] MAILER_USER/MAILER_PASS not set. Development OTP for ${to}: ${otp}`);
        return;
    }

    await getTransporter().sendMail({
        from: `"Circolife" <${env.mailer.from}>`,
        to,
        subject: "Your Circolife dashboard login code",
        text: `Your Circolife dashboard login code is ${otp}. It expires in 5 minutes.`,
        html: otpEmailHtml(name, otp),
    });
}
