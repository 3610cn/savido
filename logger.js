import winston from 'winston';
import path from 'path';
import dayjs from 'dayjs';


const date = dayjs().format('YYYY-MM-DD')
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_INFO_FILE = path.join(LOG_DIR, `${date}.log`);
const LOG_INFO_ERROR = path.join(LOG_DIR, `${date}.error.log`);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  // defaultMeta: { service: 'user-service' },
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    new winston.transports.File({ filename: LOG_INFO_ERROR, level: 'error' }),
    new winston.transports.File({ filename: LOG_INFO_FILE })
  ]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
// 
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;