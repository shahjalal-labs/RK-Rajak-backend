import Redis from "ioredis";
import { createClient } from "redis";

export const connection = new Redis("redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
});

const redisClient = createClient({
  url: "redis://127.0.0.1:6379",
});

redisClient.on("connect", () => {
  console.log("✅ Redis connected successfully");
});

redisClient.on("error", (err) => {
  console.error("Redis connection error ❌", err);
});

export default redisClient;
