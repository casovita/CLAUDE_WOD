import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Human-readable format for console
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, context, stack, ...meta }) => {
    const ctx = context ? `[${context}] ` : '';
    const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${timestamp} ${level} ${ctx}${message}${extra}${stack ? '\n' + stack : ''}`;
  }),
);

// JSON format for log files
const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
);

const dailyRotateOptions = {
  datePattern: 'YYYY-MM-DD',
  maxSize: '10m',
  maxFiles: '14d', // keep 14 days
};

export const loggerConfig: WinstonModuleOptions = {
  transports: [
    // Console — pretty
    new winston.transports.Console({ format: consoleFormat }),

    // All logs → combined.log (rotated daily)
    new (winston.transports as any).DailyRotateFile({
      ...dailyRotateOptions,
      dirname: 'logs',
      filename: 'combined-%DATE%.log',
      level: 'info',
      format: fileFormat,
    }),

    // Errors only → error.log (rotated daily)
    new (winston.transports as any).DailyRotateFile({
      ...dailyRotateOptions,
      dirname: 'logs',
      filename: 'error-%DATE%.log',
      level: 'error',
      format: fileFormat,
    }),
  ],
};
