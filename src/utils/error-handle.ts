import { logger, Logger } from './logger';

export const errorHandle = (errorMsg: string, log?: boolean | Logger): [undefined, string] => {
  if (log) {
    const reporter = log instanceof Logger ? log : logger;
    reporter.error(errorMsg);
  }
  return [undefined, errorMsg];
};
