import { createLogger, format, transports } from 'winston';
import path from 'path';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_TO_FILE = process.env.LOG_TO_FILE === 'true';
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || '/var/log/antigravity/app.log';

const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.json()
);

const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'HH:mm:ss' }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

const loggerTransports: transports.StreamTransportInstance[] = [
  new transports.Console({ format: consoleFormat }),
];

if (LOG_TO_FILE) {
  loggerTransports.push(
    new transports.File({
      filename: LOG_FILE_PATH,
      format: logFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
    })
  );
  loggerTransports.push(
    new transports.File({
      filename: path.join(path.dirname(LOG_FILE_PATH), 'error.log'),
      level: 'error',
      format: logFormat,
    })
  );
}

export const logger = createLogger({
  level: LOG_LEVEL,
  transports: loggerTransports,
  exceptionHandlers: [new transports.Console()],
  rejectionHandlers: [new transports.Console()],
});

export default logger;
