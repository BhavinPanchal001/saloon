const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendOTPEmail = async (toEmail, adminName, otpCode) => {
  // Mock email sending if credentials are not provided (useful for local development)
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('\n========================================================');
    console.log(`[MOCK EMAIL] To: ${toEmail}`);
    console.log(`[MOCK EMAIL] Subject: Your Glowy Login Verification Code`);
    console.log(`[MOCK EMAIL] OTP Code: ${otpCode}`);
    console.log('========================================================\n');
    
    if (process.env.NODE_ENV === 'production') {
      console.warn("WARNING: Email credentials are not configured in production!");
    }
    return;
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: `"Glowy Saloon" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Glowy Login Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: #0f172a; padding: 32px 40px;">
          <p style="margin: 0; color: #dd6f35; font-size: 11px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase;">GLOWY</p>
          <h1 style="margin: 12px 0 0; color: #ffffff; font-size: 28px; font-weight: 400;">Verify your identity</h1>
        </div>
        <div style="padding: 32px 40px;">
          <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
            Hi <strong style="color: #0f172a;">${adminName}</strong>,<br>
            Use the code below to complete your sign-in. This code expires in <strong>10 minutes</strong>.
          </p>
          <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px;">Verification Code</p>
            <p style="margin: 0; font-size: 40px; font-weight: 700; color: #0f172a; letter-spacing: 12px; font-family: monospace;">${otpCode}</p>
          </div>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0;">
            If you did not attempt to sign in, please ignore this email. Your account remains secure.
          </p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail };
