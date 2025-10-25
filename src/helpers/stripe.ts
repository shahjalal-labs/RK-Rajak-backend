import Stripe from "stripe";
import config from "../config";

const stripe = new Stripe(config.stripe.stripe_secret!, {
  apiVersion: "2025-08-27.basil",
});

export const createConnectedAccount = async (hosterEmail: string) => {
  const account = await stripe.accounts.create({
    type: "express",
    country: "US",
    email: hosterEmail,
    capabilities: {
      transfers: { requested: true },
    },
  });

  return account.id; // save this Stripe Account ID in your DB for the worker
};

export default stripe;
