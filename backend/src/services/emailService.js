const { getMailer } = require('../config/mailer');
const config = require('../config/env');

async function sendPasswordResetEmail(toEmail, resetToken, fullName = 'User') {
  const mailer = await getMailer();
  const resetLink = `${config.clientUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  const mailOptions = {
    from: config.email.from,
    to: toEmail,
    subject: 'SUBNEX - Password Reset Request',
    text: `Hello ${fullName},\n\nYou requested a password reset for your SUBNEX account.\nYour password reset token is:\n\n${resetToken}\n\nOr click the link below to reset your password:\n${resetLink}\n\nThis token will expire in 1 hour. If you did not request this, please disregard this email.\n\nBest regards,\nThe SUBNEX Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-bottom: 16px;">SUBNEX</h2>
        <p>Hello <strong>${fullName}</strong>,</p>
        <p>You requested a password reset for your SUBNEX account.</p>
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px dashed #cbd5e1;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Your Reset Token:</p>
          <code style="display: block; margin-top: 8px; font-size: 16px; font-weight: bold; color: #1e293b; word-break: break-all;">${resetToken}</code>
        </div>
        <p>Or click the button below to reset your password:</p>
        <p style="margin: 24px 0;">
          <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
        </p>
        <p style="font-size: 13px; color: #94a3b8;">This token will expire in 1 hour. If you did not request this, no further action is required.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">SUBNEX – One Platform. Every Subscription. Complete Control.</p>
      </div>
    `,
  };

  const info = await mailer.sendMail(mailOptions);
  console.log(`[Email] Password reset sent to ${toEmail}. MessageId: ${info.messageId}`);
  return { info, resetToken };
}

async function sendWelcomeEmail(toEmail, fullName = 'User') {
  const mailer = await getMailer();
  const mailOptions = {
    from: config.email.from,
    to: toEmail,
    subject: 'Welcome to SUBNEX',
    text: `Hello ${fullName},\n\nWelcome to SUBNEX! Your account has been successfully created.\n\nOne Platform. Every Subscription. Complete Control.\n\nBest regards,\nThe SUBNEX Team`,
  };

  try {
    const info = await mailer.sendMail(mailOptions);
    console.log(`[Email] Welcome email sent to ${toEmail}. MessageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.warn(`[Email] Failed to send welcome email: ${err.message}`);
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail,
};

