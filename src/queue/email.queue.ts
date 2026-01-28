import { Queue } from "bullmq";
import { connection } from "../helpers/radis";

export const emailQueue = new Queue("email", {
  connection: connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
});

// check vps updating
