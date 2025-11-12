import twilio from "twilio";
import config from "../config";

// Validate Twilio credentials
const validateTwilioConfig = () => {
  const { twilio_account_sid, twilio_auth_token, twilio_phone_number } = config.twilio;
    console.log({twilio_account_sid , twilio_auth_token , twilio_phone_number})
  if (!twilio_account_sid || !twilio_auth_token || !twilio_phone_number) {
    console.error("❌ Twilio configuration missing!");
    console.error("Please check your .env file for:");
    console.error("- TWILIO_ACCOUNT_SID");
    console.error("- TWILIO_AUTH_TOKEN");
    console.error("- TWILIO_PHONE_NUMBER");
    return false;
  }
  
  // Check if credentials have spaces or newlines
  if (twilio_account_sid.includes(" ") || twilio_auth_token.includes(" ")) {
    console.error("❌ Twilio credentials contain spaces - please check .env file");
    return false;
  }
  
  console.log("✅ Twilio configuration loaded");
  console.log(`Account SID: ${twilio_account_sid.substring(0, 10)}...`);
  console.log(`Auth Token Length: ${twilio_auth_token.length} chars`);
  console.log(`Phone Number: ${twilio_phone_number}`);
  
  // Debug: Check for special characters
  const hasSpecialChars = /[^a-zA-Z0-9]/.test(twilio_auth_token);
  if (hasSpecialChars && twilio_auth_token.length !== 32) {
    console.warn("⚠️ Auth Token has unusual format - verify it's correct");
  }
  
  return true;
};

// Validate before initializing
if (!validateTwilioConfig()) {
  console.warn("⚠️ Twilio will not work without proper credentials");
}

// Initialize Twilio client with trimmed credentials
const twilioClient = twilio(
  config.twilio.twilio_account_sid?.trim(),
  config.twilio.twilio_auth_token?.trim()
);

/**
 * Send OTP via Twilio SMS
 * @param phone - Phone number with country code (e.g., +919876543210)
 * @param otp - OTP code to send
 * @returns Promise with Twilio response
 */
export const sendOTPViaTwilio = async (phone: string, otp: string) => {
  try {
    // Check if Twilio is configured
    if (!config.twilio.twilio_account_sid || !config.twilio.twilio_auth_token) {
      throw new Error("Twilio credentials not configured");
    }

    // Format phone number - ensure it has + prefix
    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

    const message = await twilioClient.messages.create({
      body: `Your OTP for RK-Rajak is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`,
      from: config.twilio.twilio_phone_number?.trim(),
      to: formattedPhone,
    });

    console.log(`✅ Twilio OTP sent successfully to ${formattedPhone}`);
    console.log(`Message SID: ${message.sid}`);

    return {
      success: true,
      messageSid: message.sid,
      status: message.status,
    };
  } catch (error: any) {
    console.error("❌ Twilio SMS Error:", error);
    
    // Log specific Twilio errors
    if (error.code) {
      console.error(`Twilio Error Code: ${error.code}`);
      console.error(`Twilio Error Message: ${error.message}`);
      
      // Provide helpful hints for common errors
      if (error.code === 20003) {
        console.error("💡 Error 20003 = Authentication failed");
        console.error("   Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env");
        console.error("   Make sure there are no extra spaces or quotes");
      } else if (error.code === 21211) {
        console.error("💡 Error 21211 = Invalid phone number");
      } else if (error.code === 21608) {
        console.error("💡 Error 21608 = Phone number not verified (trial account)");
        console.error("   Verify the phone number in Twilio Console first");
      }
    }

    throw new Error(`Failed to send OTP via Twilio: ${error.message}`);
  }
};

/**
 * Send custom SMS via Twilio
 * @param phone - Phone number with country code
 * @param message - Message to send
 * @returns Promise with Twilio response
 */
export const sendSMSViaTwilio = async (phone: string, message: string) => {
  try {
    // Format phone number - ensure it has + prefix
    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

    const smsResponse = await twilioClient.messages.create({
      body: message,
      from: config.twilio.twilio_phone_number,
      to: formattedPhone,
    });

    console.log(`✅ Twilio SMS sent successfully to ${formattedPhone}`);
    console.log(`Message SID: ${smsResponse.sid}`);

    return {
      success: true,
      messageSid: smsResponse.sid,
      status: smsResponse.status,
    };
  } catch (error: any) {
    console.error("❌ Twilio SMS Error:", error);
    throw new Error(`Failed to send SMS via Twilio: ${error.message}`);
  }
};

/**
 * Verify phone number format for Twilio
 * @param phone - Phone number to verify
 * @returns boolean indicating if phone is valid
 */
export const verifyPhoneNumber = (phone: string): boolean => {
  // Check if phone has country code
  if (phone.startsWith("+")) {
    // Valid international format
    return /^\+[1-9]\d{10,14}$/.test(phone);
  }
  
  // For Indian numbers without +91
  if (/^[6-9]\d{9}$/.test(phone)) {
    return true;
  }
  
  return false;
};

export default {
  sendOTPViaTwilio,
  sendSMSViaTwilio,
  verifyPhoneNumber,
};
