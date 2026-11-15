import nodemailer from 'nodemailer';

export async function sendContactNotification(payload: {
  fullName: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const to = process.env.ADMIN_NOTIFY_EMAIL?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true';

  if (!host || !user || !pass || !to) {
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"Portfolio Contact" <${user}>`,
    to,
    replyTo: payload.email,
    subject: `[Portfolio] ${payload.subject}`,
    text: [
      `New contact submission from ${payload.fullName} (${payload.email})`,
      '',
      `Subject: ${payload.subject}`,
      '',
      payload.message,
    ].join('\n'),
  });
}
