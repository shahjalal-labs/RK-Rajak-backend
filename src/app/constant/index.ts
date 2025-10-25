
export const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  status: true,
  isEmailVerified: true,
  createdAt: true,
};

export const verifyEmailHTML = (link: string) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Verify Your Email</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #fff8e1;
        margin: 0;
        padding: 0;
      }
      .email-container {
        max-width: 600px;
        margin: 30px auto;
        background-color: #ffffff;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
        border: 2px solid #ffcc00;
      }
      .header {
        text-align: center;
        padding-bottom: 10px;
      }
      .header h1 {
        color: #f9a825;
        margin: 0;
      }
      .content {
        padding: 20px;
        text-align: center;
      }
      .content p {
        color: #444;
        line-height: 1.6;
        font-size: 16px;
      }
      .button {
        display: inline-block;
        padding: 12px 24px;
        margin: 25px 0;
        font-size: 16px;
        color: #ffffff;
        background-color: #fbc02d;
        text-decoration: none;
        border-radius: 8px;
        font-weight: bold;
        transition: background-color 0.3s ease;
      }
      .button:hover {
        background-color: #f9a825;
      }
      .footer {
        text-align: center;
        padding: 20px;
        font-size: 12px;
        color: #777;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <h1>Welcome to iSuckAtRocket 🚀</h1>
      </div>
      <div class="content">
        <p>Hey there! 👋</p>
        <p>You're just one click away from unlocking a powerful platform where contractors and subcontractors collaborate smoothly.</p>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${link}" class="button">Verify Email Address</a>
        <p>If this wasn’t you, just ignore this message — no worries!</p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} iSuckAtRocket. Built with ❤️ for builders.</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

export const successEmailVerificationHTML = () => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Email Verified</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #fffde7;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
      }
      .container {
        text-align: center;
        background: #ffffff;
        padding: 2rem;
        border-radius: 10px;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        border: 2px solid #fbc02d;
      }
      h1 {
        color: #43a047;
        font-size: 2.5rem;
        margin-bottom: 1rem;
      }
      p {
        color: #333;
        font-size: 1.1rem;
      }
      .icon {
        font-size: 4rem;
        color: #43a047;
        margin-bottom: 1rem;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="icon">✔</div>
      <h1>Email Verified</h1>
      <p>Awesome! Your email has been successfully verified. You're ready to dive into iSuckAtRocket and get connected.</p>
    </div>
  </body>
  </html>
  `;
};

export const failedEmailVerificationHTML = (client_server: string) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Email Verification Failed</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #fff8e1;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
      }
      .container {
        text-align: center;
        background: white;
        padding: 2rem;
        border-radius: 10px;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
        width: 90%;
        max-width: 500px;
        border: 2px solid #ffcc00;
      }
      h1 {
        color: #d32f2f;
        font-size: 2.2rem;
        margin-bottom: 1rem;
      }
      p {
        color: #444;
        font-size: 1rem;
      }
      .icon {
        font-size: 4rem;
        color: #d32f2f;
        margin-bottom: 1rem;
      }
      button {
        background-color: #fbc02d;
        color: #000;
        padding: 1rem 2rem;
        font-size: 1.1rem;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s ease;
        margin-top: 1.2rem;
        font-weight: bold;
      }
      button:hover {
        background-color: #f9a825;
      }
      a {
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="icon">✖</div>
      <h1>Verification Failed</h1>
      <p>Oops! This verification link is invalid or may have expired.<br/>Please request a new one to continue using iSuckAtRocket.</p>
      <a href="${client_server}">
        <button>Return to Homepage</button>
      </a>
    </div>
  </body>
  </html>
  `;
};

export const subscribeNewsletterHTML = (email: string) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Newsletter Subscription</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #fff8e1;
        margin: 0;
        padding: 0;
      }
      .email-container {
        max-width: 600px;
        margin: 30px auto;
        background-color: #ffffff;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
        border: 2px solid #ffcc00;
      }
      .header {
        text-align: center;
        padding-bottom: 10px;
      }
      .header h1 {
        color: #fb8c00;
        margin: 0;
      }
      .content {
        padding: 20px;
        text-align: center;
      }
      .content p {
        color: #444;
        line-height: 1.6;
        font-size: 16px;
      }
      .footer {
        text-align: center;
        padding: 20px;
        font-size: 12px;
        color: #777;
      }
      .highlight {
        color: #fb8c00;
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <h1>You're Subscribed! 🧡</h1>
      </div>
      <div class="content">
        <p>Hey there 👋</p>
        <p>Thanks for subscribing to the <span class="highlight">iSuckAtRocket</span> newsletter!</p>
        <p>You’ll now receive the latest updates, contractor tools, and construction industry insights straight to your inbox at:</p>
        <p class="highlight">${email}</p>
        <p>have a good day .</p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} iSuckAtRocket. Built with ❤️ for builders.</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

export const contactFormEmailHTML = ({
  userName,
  userEmail,
  userMessage,
  platformName = "iSuckAtRocket",
}: {
  userName: string;
  userEmail: string;
  userMessage: string;
  platformName?: string;
}) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Contact Form Message</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #f9f9f9;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #333;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background: #ffffff;
        padding: 2rem;
        border-radius: 10px;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
        border-left: 5px solid #3f51b5;
      }
      .header {
        text-align: center;
        margin-bottom: 1.5rem;
      }
      .header h2 {
        margin: 0;
        font-size: 1.6rem;
        color: #3f51b5;
      }
      .info {
        margin-top: 1rem;
      }
      .info p {
        margin: 0.5rem 0;
      }
      .message-box {
        margin-top: 1.5rem;
        padding: 1rem;
        background-color: #f1f1f1;
        border-left: 4px solid #3f51b5;
        border-radius: 6px;
        white-space: pre-wrap;
      }
      .footer {
        margin-top: 2rem;
        font-size: 0.9rem;
        color: #777;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>New Contact Message from ${platformName}</h2>
      </div>
      <div class="info">
        <p><strong>Name:</strong> ${userName}</p>
        <p><strong>Email:</strong> <a href="mailto:${userEmail}">${userEmail}</a></p>
      </div>
      <div class="message-box">
        <p><strong>Message:</strong></p>
        <p>${userMessage}</p>
      </div>
      <div class="footer">
        <p>This message was sent from the contact section of ${platformName}.</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

// emailTemplates.ts
export const otpHtml = (fullName: string, otp: string) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width"/>
  </head>
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:30px 16px;">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(2,6,23,0.08);">
            <tr>
              <td style="background:linear-gradient(90deg,#7b61ff,#00d4ff);padding:28px 30px;color:#fff;text-align:left;">
                <h1 style="margin:0;font-size:22px;letter-spacing:0.2px;">Account verification</h1>
                <p style="margin:6px 0 0;font-size:14px;opacity:0.95;">Hi <strong>${fullName}</strong>,</p>
              </td>
            </tr>

            <tr>
              <td style="background:#ffffff;padding:30px 30px 20px;color:#0f172a;">
                <p style="margin:0 0 14px;font-size:15px;">Use the one-time password (OTP) below to complete your action. This code is valid for <strong>5 minutes</strong>.</p>

                <div style="display:flex;align-items:center;justify-content:center;margin:18px 0;">
                  <div style="font-size:34px;font-weight:700;padding:18px 28px;border-radius:10px;background:linear-gradient(180deg,#fff,#f8fbff);box-shadow:0 6px 18px rgba(11,22,80,0.06);border:1px dashed rgba(0,0,0,0.05);">
                    <span style="letter-spacing:3px;color:#12263f;">${otp}</span>
                  </div>
                </div>

                <p style="margin:0 0 20px;font-size:13px;color:#475569;">If you didn't request this, you can safely ignore this email. For help, reply to this message or contact support.</p>

                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:8px;">
                  <tr>
                    <td align="center">
                      <a href="#" style="display:inline-block;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600;background:linear-gradient(90deg,#7b61ff,#00d4ff);color:#fff;">Verify Now</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:#0f172a;padding:18px 30px;color:#cbd5e1;font-size:13px;text-align:center;">
                <div>Thanks — The Support Team</div>
                <div style="opacity:0.7;margin-top:6px;font-size:12px;">If this wasn't you, secure your account immediately.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

export const forgotPasswordHtml = (fullName: string, otp: string) => `
<!doctype html>
<html>
  <head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
  <body style="margin:0;padding:0;background:#f1f6ff;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(90deg,#ff8a65,#ffb86b);padding:24px 28px;color:#fff;">
                <h2 style="margin:0;font-size:20px;">Password Reset Request</h2>
                <p style="margin:6px 0 0;font-size:13px;opacity:0.95;">Hello <strong>${fullName}</strong>,</p>
              </td>
            </tr>

            <tr>
              <td style="background:#ffffff;padding:24px 28px;color:#0b1220;">
                <p style="font-size:14px;margin:0 0 12px;">We received a request to reset your password. Enter the OTP below to continue. It will expire in <strong>5 minutes</strong>.</p>

                <div style="text-align:center;margin:18px 0;">
                  <div style="display:inline-block;padding:16px 26px;border-radius:12px;border:1px solid #eef2ff;font-size:32px;font-weight:700;">
                    ${otp}
                  </div>
                </div>

                <p style="font-size:13px;color:#55607a;margin-bottom:18px;">If you didn't request a password reset, ignore this email or secure your account.</p>

                <div style="text-align:center;">
                  <a href="#" style="padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;background:linear-gradient(90deg,#7c3aed,#06b6d4);color:#fff;">Reset Password</a>
                </div>
              </td>
            </tr>

            <tr>
              <td style="background:#f8fafc;padding:14px 18px;text-align:center;color:#9aa4b2;font-size:12px;">
                © ${new Date().getFullYear()} Your Company — Need help? Reply this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

export const couponHtml = (
  fullName: string,
  couponCode: string,
  discountValue: string,
  discountType : string,
  expiryDate: string,
  message = "",
  ctaUrl = "#"
) => `
<!doctype html>
<html>
  <head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
  <body style="margin:0;padding:0;background:#fff8f1;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:30px 16px;">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="border-radius:14px;overflow:hidden;box-shadow:0 12px 40px rgba(11,22,80,0.06);">
            <tr>
              <td style="background:linear-gradient(90deg,#ff6b6b,#ffb86b);padding:28px 30px;color:#fff;">
                <h1 style="margin:0;font-size:22px;">A special gift for you</h1>
                <p style="margin:6px 0 0;">Hey <strong>${fullName}</strong> — enjoy this exclusive coupon!</p>
              </td>
            </tr>

            <tr>
              <td style="background:#ffffff;padding:26px 30px;color:#0b1220;">
                <p style="margin:0 0 12px;font-size:15px;">${
                  message ||
                  "Use the coupon below at checkout to get your discount."
                }</p>

                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:14px 0;">
                  <tr>
                    <td style="padding:18px;border-radius:10px;background:linear-gradient(180deg,#fff,#fff9f0);text-align:center;border:1px solid rgba(0,0,0,0.03);">
                      <div style="font-size:20px;font-weight:800;color:#2b2b2b;margin-bottom:8px;">for one order</div>
                      <div style="font-size:20px;letter-spacing:3px;font-weight:700;background:#fff;padding:8px 14px;border-radius:6px;display:inline-block;border:1px dashed rgba(0,0,0,0.06);">
                        ${couponCode}
                      </div>
                      <div style="margin-top:10px;font-size:13px;color:#667085;">Expires on ${expiryDate}</div>
                    </td>
                  </tr>
                </table>

                <div style="text-align:center;margin-top:16px;">
                  <a href="${ctaUrl}" style="display:inline-block;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700;background:linear-gradient(90deg,#7b61ff,#00d4ff);color:#fff;">Shop Now</a>
                </div>
              </td>
            </tr>

            <tr>
              <td style="background:#fff4e6;padding:16px 20px;text-align:center;color:#8a6b45;font-size:13px;">
                Need help? Reply to this email — we're happy to assist.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
