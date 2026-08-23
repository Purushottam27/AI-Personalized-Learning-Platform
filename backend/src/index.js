import 'dotenv/config';
import app from './app.js';
import pino from 'pino';
import { connectDB, disconnectDB } from './config/database.js';

const logger = pino();
const port = process.env.PORT || 3000;
let server = null;
let isShuttingDown = false;

connectDB()
  .then(() => {

    server = app.listen(port, () => {
      logger.info(`Backend listening on port ${port}`);
      console.log(`Server is running at port: http://localhost:${port}`)
    })

    server.on('error', (error) => {
      logger.error('Server error: ', error)
      console.error('Server error: ', error)
    })

  })
  .catch((error) => {
    logger.error("Application error : ", error)
    console.error("MongoDB error : ", error)
    process.exit(1);
  })


async function gracefulShutdown(signal) {

  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(`Received ${signal}. Starting graceful shutdown...`);

  try {

    if (server) {
      await new Promise((resolve, reject) => {

        server.close((error) => {

          if (error) {
            reject(error);
            return;
          }

          console.log('HTTP server closed. Cleaning up resources...');
          resolve();
        });

      });
    }
    console.log("Before disconnectDB");

    await disconnectDB();

    console.log("MongoDB disconnected");
    logger.info("Database disconnected");

    process.exit(0);

  } catch (error) {

    logger.error("Error during graceful shutdown", error);
    console.error("Error during cleanup:", error);

    process.exit(1);
  }
}

process.on("SIGTERM", () => {
  gracefulShutdown("SIGTERM")
})

process.on("SIGINT", () => {
  gracefulShutdown("SIGINT")
})

