import { Cashfree } from "@cashfreepayments/cashfree-js"; // or use script tag

export const cf = async (paymentSessionId) => {
  const cf = Cashfree({ mode: "sandbox" }); // or "production"
  cf.checkout({ paymentSessionId });
  return cf;
};
