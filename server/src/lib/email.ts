import { Resend } from "resend";

const apiKey = process.env["RESEND_API_KEY"];
const resend = apiKey ? new Resend(apiKey) : null;

function getFromAddress(): string {
  return process.env["RESEND_FROM_EMAIL"] ?? "Rakhat <onboarding@resend.dev>";
}

export async function sendPasswordResetOtp(to: string, otp: string): Promise<void> {
  if (!resend) {
    console.log(`[DEV] Password reset OTP for ${to}: ${otp}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject: "Your Rakhat password reset code",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111; margin-bottom: 8px;">Password reset</h2>
        <p style="color: #444; line-height: 1.5;">
          Use this one-time code to reset your password. It expires in 10 minutes.
        </p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111; margin: 24px 0;">
          ${otp}
        </p>
        <p style="color: #888; font-size: 13px;">
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("[Resend] Failed to send OTP email:", error);
    throw Object.assign(new Error("Failed to send OTP email"), { status: 500 });
  }
}
