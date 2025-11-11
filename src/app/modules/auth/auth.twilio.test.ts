import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { sendOTPViaTwilio, verifyPhoneNumber } from "../../../helpers/twilioHelper";

/**
 * Test Twilio SMS sending
 */
const testTwilioSMS = catchAsync(async (req: Request, res: Response) => {
  const { phone, message } = req.body;

  if (!phone) {
    return sendResponse(res, {
      success: false,
      statusCode: 400,
      message: "Phone number is required",
    });
  }

  // Verify phone number format
  if (!verifyPhoneNumber(phone)) {
    return sendResponse(res, {
      success: false,
      statusCode: 400,
      message: "Invalid phone number format. Use +919876543210 or 9876543210",
    });
  }

  try {
    const testOTP = "123456";
    const result = await sendOTPViaTwilio(phone, testOTP);

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Test SMS sent successfully via Twilio",
      data: result,
    });
  } catch (error: any) {
    sendResponse(res, {
      success: false,
      statusCode: 500,
      message: error.message || "Failed to send SMS via Twilio",
    });
  }
});

export const twilioTestController = {
  testTwilioSMS,
};
