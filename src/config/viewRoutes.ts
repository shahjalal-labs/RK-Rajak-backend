import { Router } from "express";

const privacyPolicy = () => {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>ABS Fresh — Privacy Policy</title>
  <meta name="description" content="Privacy Policy for ABS Fresh mobile application" />
  <style>
    :root {
      --bg:#f7f8fb;
      --card:#ffffff;
      --text:#0f172a;
      --muted:#6b7280;
      --accent:#0f766e;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      margin:0;
      background:var(--bg);
      padding:32px;
      color:var(--text);
    }
    .wrap { max-width:900px; margin:0 auto; }
    .card {
      background:var(--card);
      border-radius:12px;
      padding:24px;
      box-shadow:0 6px 18px rgba(0,0,0,0.05);
      margin-bottom:18px;
    }
    h1 { font-size:22px; margin:0 0 8px 0; color:var(--accent); }
    h2 { font-size:18px; margin-top:20px; }
    p, li { font-size:15px; line-height:1.6; }
    .muted { color:var(--muted); }
    footer { text-align:center; margin-top:20px; font-size:13px; color:var(--muted); }
    ul { margin-left:20px; }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="card">
      <h1>Privacy Policy</h1>
      <p class="muted">ABS Fresh Private Limited</p>
      <p class="muted"><strong>Effective Date:</strong> 27-01-2026</p>
    </header>

    <section class="card">
      <h2>1. Introduction</h2>
      <p>ABS Fresh Private Limited (“ABS Fresh”, “we”, “our”, “us”) respects your privacy. This Privacy Policy explains how we collect, use, store, share, and protect personal information when you use the ABS Fresh mobile application and related services (“Services”).</p>
      <p>This policy is framed in accordance with the Information Technology Act, 2000, applicable Indian data protection rules, and the privacy requirements of Google Play Store and Apple App Store.</p>

      <h2>2. Company Information</h2>
      <ul>
        <li>Legal Entity: ABS Fresh Private Limited</li>
        <li>Registered Location: Bengaluru, Karnataka, India</li>
        <li>Contact Email: info@absfresh.co.in</li>
      </ul>

      <h2>3. Information We Collect</h2>
      <h3>3.1 Personal Information</h3>
      <ul>
        <li>Mobile number (for OTP-based login)</li>
        <li>Name (if provided)</li>
        <li>Delivery address</li>
        <li>Email address (only if voluntarily shared with us)</li>
      </ul>

      <h3>3.2 Location Information</h3>
      <ul>
        <li>Precise location only while the app is in use</li>
        <li>Approximate location such as area or pincode</li>
      </ul>
      <p>We do not collect or track background location data.</p>

      <h3>3.3 Payment Information</h3>
      <ul>
        <li>Payments are processed through third-party gateways and UPI platforms (Cashfree, PhonePe, Google Pay, Paytm, card networks)</li>
        <li>ABS Fresh does not store credit/debit card numbers, UPI credentials, PINs, or bank account details</li>
        <li>We only receive transaction status and reference identifiers</li>
      </ul>

      <h3>3.4 Device & Technical Information</h3>
      <ul>
        <li>Device type, operating system, and app version</li>
        <li>IP address</li>
        <li>Crash logs and diagnostic data</li>
      </ul>

      <h3>3.5 Communication Data</h3>
      <ul>
        <li>OTP and transactional SMS messages</li>
        <li>WhatsApp updates related to orders and deliveries</li>
        <li>Push notifications for order updates, availability, and service communication</li>
      </ul>
      <p>We do not send promotional emails.</p>

      <h2>4. How We Use Information</h2>
      <ul>
        <li>Create and manage user accounts</li>
        <li>Process orders and deliver products</li>
        <li>Communicate service and order updates</li>
        <li>Prevent fraud and misuse</li>
        <li>Improve app performance and user experience</li>
        <li>Comply with legal and regulatory requirements</li>
      </ul>

      <h2>5. Analytics and Marketing</h2>
      <p>We use third-party tools such as Google Analytics / Firebase, Meta (Facebook) SDK, Appsflyer or similar attribution platforms for analytics, performance measurement, and marketing attribution only.</p>
      <p>ABS Fresh does not sell or rent personal data.</p>

      <h2>6. Data Sharing</h2>
      <ul>
        <li>Delivery partners (to complete deliveries)</li>
        <li>Payment gateways (to process payments and refunds)</li>
        <li>Analytics and technology service providers</li>
        <li>Government or legal authorities when required by law</li>
      </ul>
      <p>Data is shared strictly on a need-to-know basis.</p>

      <h2>7. Data Retention</h2>
      <p>We retain personal data only as long as required to provide services, meet legal/tax/audit obligations, and resolve disputes. After account deletion, certain records may be retained as required by law.</p>

      <h2>8. User Rights</h2>
      <p>Users may request access to personal data, correction of inaccurate data, and account deletion. Requests can be sent to <strong>info@absfresh.co.in</strong>. Identity verification may be required.</p>

      <h2>9. Data Security</h2>
      <p>ABS Fresh uses reasonable technical and organizational safeguards to protect personal data. However, no system is completely secure.</p>

      <h2>10. Children’s Privacy</h2>
      <p>ABS Fresh services are intended for users 18 years and above. We do not knowingly collect data from children.</p>

      <h2>11. Policy Updates</h2>
      <p>This Privacy Policy may be updated periodically. Continued use of the Services indicates acceptance of the updated policy.</p>

      <h2>12. Contact</h2>
      <p>ABS Fresh Private Limited<br>Email: info@absfresh.co.in</p>
    </section>

    <footer>
      © ABS Fresh Private Limited — Privacy Policy
    </footer>
  </div>
</body>
</html>`;
};

const dataDelete = () => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Delete Data</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
    * {
      box-sizing: border-box;
    }
 
    body {
      font-family: Arial, sans-serif;
      background-color: #f6f6f6;
      padding: 0;
      margin: 0;
    }
 
    .container {
      max-width: 400px;
      margin: 80px auto;
      background-color: #ffffff;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
 
    h2 {
      color: #d32f2f;
      text-align: center;
      margin-bottom: 20px;
    }
 
    label {
      display: block;
      margin-bottom: 6px;
      font-weight: 600;
    }
 
    input[type="email"],
    input[type="password"] {
      width: 100%;
      padding: 10px;
      margin-bottom: 20px;
      border: 1px solid #ccc;
      border-radius: 6px;
      font-size: 14px;
    }
 
    button {
      width: 100%;
      padding: 12px;
      background-color: #d32f2f;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      transition: background-color 0.3s ease;
 
    }
 
    button:hover {
      background-color: #b71c1c;
    }
 
    .note {
      font-size: 13px;
      color: #555;
      text-align: center;
      margin-top: 15px;
    }
</style>
</head>
<body>
 
<div class="container">
<h2>Delete Your Data</h2>
  <form onsubmit="handleDelete(event)">
<label for="email">Email</label>
<input type="email" id="email" name="email" required>
    <label for="password">Password</label>
<input type="password" id="password" name="password" required>
    <button type="submit">Confirm</button>
</form>
 
  <div class="note">
    This action is irreversible. Please confirm carefully.
</div>
</div>
 
<script>
 
  function handleDelete(e) {
 
    e.preventDefault();
 
    const email = document.getElementById("email").value.trim();
 
    const password = document.getElementById("password").value.trim();
 
    if (!email || !password) {
 
      alert("Please fill in both fields.");
 
      return;
 
    }
 
    const confirmed = confirm(Are you sure you want to delete the account?);
 
    if (confirmed) {
 
      // TODO: Send deletion request to server here
 
      alert("Your account has been marked for deletion.");
 
    }
 
  }
</script>
 
</body>
</html>
 
 `;
};

const accountDelete = () => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Account Delete</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
    * {
      box-sizing: border-box;
    }
 
    body {
      font-family: Arial, sans-serif;
      background-color: #f6f6f6;
      padding: 0;
      margin: 0;
    }
 
    .container {
      max-width: 400px;
      margin: 80px auto;
      background-color: #ffffff;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
 
    h2 {
      color: #d32f2f;
      text-align: center;
      margin-bottom: 20px;
    }
 
    label {
      display: block;
      margin-bottom: 6px;
      font-weight: 600;
    }
 
    input[type="email"],
    input[type="password"] {
      width: 100%;
      padding: 10px;
      margin-bottom: 20px;
      border: 1px solid #ccc;
      border-radius: 6px;
      font-size: 14px;
    }
 
    button {
      width: 100%;
      padding: 12px;
      background-color: #d32f2f;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      transition: background-color 0.3s ease;
 
    }
 
    button:hover {
      background-color: #b71c1c;
    }
 
    .note {
      font-size: 13px;
      color: #555;
      text-align: center;
      margin-top: 15px;
    }
</style>
</head>
<body>
 
<div class="container">
<h2>Delete Your Account</h2>
  <form onsubmit="handleDelete(event)">
<label for="email">Email</label>
<input type="email" id="email" name="email" required>
    <label for="password">Password</label>
<input type="password" id="password" name="password" required>
    <button type="submit">Confirm</button>
</form>
 
  <div class="note">
    This action is irreversible. Please confirm carefully.
</div>
</div>
 
<script>
 
  function handleDelete(e) {
 
    e.preventDefault();
 
    const email = document.getElementById("email").value.trim();
 
    const password = document.getElementById("password").value.trim();
 
    if (!email || !password) {
 
      alert("Please fill in both fields.");
 
      return;
 
    }
 
    const confirmed = confirm(Are you sure you want to delete the account?);
 
    if (confirmed) {
 
      // TODO: Send deletion request to server here
 
      alert("Your account has been marked for deletion.");
 
    }
 
  }
</script>
 
</body>
</html>
 
 `;
};

export const configRoutes = Router();

configRoutes.get("/privacy-policy", (req, res) => {
  res.type("html").send(privacyPolicy());
});

configRoutes.get("/data-delete", (req, res) => {
  res.type("html").send(dataDelete());
});

configRoutes.get("/account-delete", (req, res) => {
  res.type("html").send(accountDelete());
});
