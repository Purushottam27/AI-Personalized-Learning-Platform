import 'dotenv/config';
import app from './app.js';
import pino from 'pino';

const logger = pino();
const port = process.env.PORT || 3000;

app.listen(port, () => {
  logger.info(`Backend listening on port ${port}`);
});
