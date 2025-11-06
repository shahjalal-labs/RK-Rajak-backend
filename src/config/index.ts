import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  backend_base_url: process.env.BACKEND_BASE_URL,
  frontend_base_url: process.env.FRONTEND_BASE_URL || "http://localhost:3000", // Frontend URL
  super_admin_password: process.env.SUPER_ADMIN_PASSWORD,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  jwt: {
    jwt_secret: process.env.JWT_SECRET,
    gen_salt: process.env.GEN_SALT,
    expires_in: process.env.EXPIRES_IN,
    refresh_token_secret: process.env.REFRESH_TOKEN_SECRET,
    refresh_token_expires_in: process.env.REFRESH_TOKEN_EXPIRES_IN,
    reset_pass_secret: process.env.RESET_PASS_TOKEN,
    reset_pass_token_expires_in: process.env.RESET_PASS_TOKEN_EXPIRES_IN,
  },
  reset_pass_link: process.env.RESET_PASS_LINK,
  emailSender: {
    email: process.env.EMAIL,
    app_pass: process.env.APP_PASS,
  },
  stripe: {
    stripe_secret: process.env.STRIPE_SK,
    webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  cashfree: {
    app_id: process.env.CASHFREE_APP_ID,
    secret_key: process.env.CASHFREE_SECRET_KEY,
    api_version: process.env.CASHFREE_API_VERSION || "2023-08-01",
    environment: process.env.CASHFREE_ENV || "sandbox", // "sandbox" or "production"
    webhook_secret: process.env.CASHFREE_WEBHOOK_SECRET,
  },
  do_space: {
    endpoints: process.env.DO_SPACE_ENDPOINT,
    access_key: process.env.DO_SPACE_ACCESS_KEY,
    secret_key: process.env.DO_SPACE_SECRET_KEY,
    bucket: process.env.DO_SPACE_BUCKET,
  },
};
