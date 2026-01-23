import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { verifyTurnstileToken, getClientIP } from "@/lib/turnstile";
import { formatEmailTimestamp } from "@/lib/utils";

type NewsletterFormData = {
  email: string;
  turnstileToken: string;
};

export async function POST(request: NextRequest) {
  try {
    const body: NewsletterFormData = await request.json();
    const { email, turnstileToken } = body;

    if (!email || !turnstileToken) {
      return NextResponse.json({ error: "Email and verification are required." }, { status: 400 });
    }

    // Verify Turnstile token
    const clientIP = getClientIP(request);
    const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIP);

    if (!turnstileResult.success) {
      return NextResponse.json(
        { error: turnstileResult.error || "Verification failed. Please try again." },
        { status: 400 }
      );
    }

    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT || "587"),
      secure: process.env.MAIL_PORT === "465",
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM_ADDRESS}>`,
      to: process.env.FORM_RECIPIENT_EMAIL,
      subject: `New newsletter subscription - ${email}`,
      html: `
        <h2>New newsletter subscription</h2>
        <p><strong>Email:</strong> ${email}</p>
        <p><em>Subscribed: ${formatEmailTimestamp()}</em></p>
      `,
      text: `
          New newsletter subscription

          Email: ${email}

          Subscribed: ${formatEmailTimestamp()}
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { message: "Successfully subscribed to newsletter!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing newsletter subscription:", error);
    return NextResponse.json(
      { error: "An error occurred during subscription. Please try again later." },
      { status: 500 }
    );
  }
}
