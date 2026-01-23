import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { verifyTurnstileToken, getClientIP } from "@/lib/turnstile";
import { formatEmailTimestamp } from "@/lib/utils";

type ContactFormData = {
  name: string;
  surname: string;
  email: string;
  phone: string;
  message: string;
  gdprConsent: boolean;
  turnstileToken: string;
};

export async function POST(request: NextRequest) {
  try {
    const body: ContactFormData = await request.json();
    const { name, surname, email, phone, message, gdprConsent, turnstileToken } = body;

    if (!name || !surname || !email || !phone || !message || !gdprConsent || !turnstileToken) {
      return NextResponse.json(
        { error: "All fields are required and you must agree to the processing of personal data." },
        { status: 400 }
      );
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
      subject: `New contact form message from ${name} ${surname}`,
      html: `
        <h2>New contact form message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Surname:</strong> ${surname}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
        <p><em>Sent: ${formatEmailTimestamp()}</em></p>
      `,
      text: `
          New contact form message

          Name: ${name}
          Surname: ${surname}
          Email: ${email}
          Phone: ${phone}
          Message: ${message}

          Sent: ${formatEmailTimestamp()}
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: "Message sent successfully!" }, { status: 200 });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "An error occurred while sending the message. Please try again later." },
      { status: 500 }
    );
  }
}
