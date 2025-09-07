type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private logLevel: LogLevel = 'info';

  constructor() {
    // Set log level from environment
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    if (envLevel && ['debug', 'info', 'warn', 'error'].includes(envLevel)) {
      this.logLevel = envLevel;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    // Store log entry
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }

    // Console output
    const logMessage = `[${entry.timestamp}] ${level.toUpperCase()}: ${message}`;
    
    switch (level) {
      case 'debug':
        console.debug(logMessage, data ? JSON.stringify(data, null, 2) : '');
        break;
      case 'info':
        console.info(logMessage, data ? JSON.stringify(data, null, 2) : '');
        break;
      case 'warn':
        console.warn(logMessage, data ? JSON.stringify(data, null, 2) : '');
        break;
      case 'error':
        console.error(logMessage, data ? JSON.stringify(data, null, 2) : '');
        break;
    }
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (!level) return [...this.logs];
    return this.logs.filter(log => log.level === level);
  }

  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  clearLogs(): void {
    this.logs = [];
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info(`Log level set to: ${level}`);
  }

  getLogLevel(): LogLevel {
    return this.logLevel;
  }
}

export const logger = new Logger();