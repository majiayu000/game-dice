type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LogLevelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LogColors: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
};

const RESET = '\x1b[0m';

class Logger {
  private minLevel: LogLevel;

  constructor() {
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    return LogLevelPriority[level] >= LogLevelPriority[this.minLevel];
  }

  private format(level: LogLevel, category: string, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const color = LogColors[level];
    const levelStr = level.toUpperCase().padEnd(5);
    const base = `${color}[${timestamp}] ${levelStr}${RESET} [${category}] ${message}`;
    return data ? `${base} ${JSON.stringify(data)}` : base;
  }

  private log(level: LogLevel, category: string, message: string, data?: unknown) {
    if (!this.shouldLog(level)) return;
    const formatted = this.format(level, category, message, data);
    if (level === 'error') {
      console.error(formatted);
    } else if (level === 'warn') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  debug(category: string, message: string, data?: unknown) {
    this.log('debug', category, message, data);
  }

  info(category: string, message: string, data?: unknown) {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: unknown) {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, data?: unknown) {
    this.log('error', category, message, data);
  }
}

export const logger = new Logger();
