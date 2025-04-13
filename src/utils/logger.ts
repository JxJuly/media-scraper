class Logger {
  scrope: undefined | string;
  constructor(_scrope?: string) {
    this.scrope = _scrope;
  }
  getPrefix(type: string) {
    return (this.scrope ? `[${this.scrope}]` : '') + type;
  }
  info(...args: any[]) {
    console.log(this.getPrefix('INFO:'), ...args);
  }
  error(...args: any[]) {
    console.log(this.getPrefix('ERROR:'), ...args);
  }
}

const logger = new Logger();

export { logger, Logger };
