import fs from 'fs';
import { pipeline } from 'stream/promises';

import { got } from 'got';
import { noop, mergeWith } from 'lodash-es';

import type { LoadPlugin, UsePlugin } from '../types';
/**
 * 睡眠
 * @param ms
 */
export const sleep = (ms?: number) => new Promise<void>((reolsve) => setTimeout(reolsve, ms));

/**
 * 格式化错误信息
 */
export const errorHandle = (errorMsg: string): [undefined, string] => {
  return [undefined, errorMsg];
};

interface DownloadOptions {
  onRetry: (error: any, count: number) => void;
}
/**
 * 下载
 */
export const download = async (httpUrl: string, localPath: string, options?: DownloadOptions) => {
  if (!httpUrl) {
    return errorHandle('下载链接为空！');
  }
  try {
    const response = got.stream.get(httpUrl, {
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
            options?.onRetry?.(error, count);
            error.options.searchParams['t'] = new Date();
          },
        ],
      },
    });
    const writer = fs.createWriteStream(localPath);
    await pipeline(response, writer);
    return [httpUrl];
  } catch (error) {
    fs.unlink(localPath, noop);
    return errorHandle(error?.code || error);
  }
};

/**
 * 是否是 UsePlugin
 */
export const isUsePlugin = (v: LoadPlugin): v is UsePlugin => !!(v as UsePlugin).use;

/**
 * 元数据合并
 */
export const meregMetaData = <T>(a: unknown, b: unknown) => {
  return mergeWith({} as T, a, b, (objValue, srcValue) => {
    /**
     * 若是数组且后者不为空则直接覆盖
     */
    if (Array.isArray(srcValue)) {
      return srcValue.length ? srcValue : objValue;
    }
  }) as T;
};
