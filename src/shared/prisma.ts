import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "error",
    },
  ],
  transactionOptions: {
    maxWait: 10000,
    timeout: 20000,
  },
});

prisma.$on("error", (e) => {
  console.log(e);
});

export default prisma;
