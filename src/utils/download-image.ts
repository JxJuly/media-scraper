import fs from 'fs';
import { pipeline } from 'stream/promises';

import { got } from 'got';
import { noop } from 'lodash-es';

import { errorHandle } from './error-handle';
import { logger } from './logger';

export const downloadImage = async (url: string, localPath: string) => {
  try {
    const response = got.stream.get(url, {
      timeout: {
        request: 10000,
      },
      headers: {
        ['User-Agent']:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0',
      },
      retry: {
        limit: 3,
        methods: ['GET'],
        statusCodes: [408, 429, 500, 502, 503, 504],
        errorCodes: ['ETIMEDOUT', 'ECONNRESET'],
        calculateDelay: () => 5000,
      },
      hooks: {
        beforeRetry: [
          (error, count) => {
            logger.info(`retry ${count} to download image: ${url}`);
            error.options.searchParams['t'] = new Date();
          },
        ],
      },
    });
    const writer = fs.createWriteStream(localPath);
    await pipeline(response, writer);
    return [url];
  } catch (error) {
    fs.unlink(localPath, noop);
    return errorHandle(error?.code || error);
  }
};
