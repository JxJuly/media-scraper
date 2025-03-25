import { logger } from './logger';

export const errorHandle = (errorMsg: string): [undefined, string] => {
  logger.error(errorMsg);
  return [undefined, errorMsg];
};
