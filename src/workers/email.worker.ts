import { Worker } from "bullmq";
import sendEmail from "../helpers/sendEmail";
import { connection } from "../helpers/radis";
import {  couponHtml, forgotPasswordHtml, otpHtml } from "../app/constant";

new Worker(
  "email",
  async (job) => {
    const { email, fullName, otp } = job.data;
    let subject = "";
    let html = "";

    if (job.name === "sendOtp") {
      subject = "Account verification";
      html = otpHtml(fullName, otp);
    } else if (job.name === "forgotPasswordOtp") {
      subject = "Your Password Reset OTP";
      html = forgotPasswordHtml(fullName, otp);
    } else if (job.name === "sendCoupon") {
      const {
        couponCode,
        discountValue,
        discountType,
        expiryDate,
        message,
        ctaUrl = "https://sana-ullah-roton.web.app/",
      } = job.data;
      console.log(job.data)
      subject = `You've received a coupon: ${couponCode}`;
      html = couponHtml(
        fullName,
        couponCode,
        discountValue,
        discountType,
        expiryDate,
        message,
        ctaUrl
      );
    } else {
      console.warn(`Unknown job name: ${job.name}`);
      return;
    }

    try {
      await sendEmail(email, subject, html);
      console.log(`✅ Email sent to ${email} for job: ${job.name}`);
    } catch (err) {
      console.error("Failed to send email:", err);
    }
  },
  { connection: connection }
);