import { Server } from "http";
import app from "./app";
import config from "./config";
import seedSuperAdmin from "./app/DB";
import { scheduleDailyOrderMerge } from "./app/modules/order/order.cron";

async function main() {
  const server: Server = app.listen(config.port, () => {
    console.log(" Server is running on port ", config.port);
    seedSuperAdmin();
    
    // Schedule daily order merge cron job
    scheduleDailyOrderMerge();
  });

  const exitHandler = () => {
    if (server) {
      server.close(() => {
        console.info("💥 Server closed!");
      });
    }
    process.exit(1);
  };
  process.on("uncaughtException", (error) => {
    console.log(error);
    exitHandler();
  });

  process.on("unhandledRejection", (error) => {
    console.log(error);
    exitHandler();
  });
}

main();
