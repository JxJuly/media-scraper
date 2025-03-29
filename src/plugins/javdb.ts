import axios from 'axios';
import { load } from 'cheerio';
import { glob } from 'fast-glob';
import { uniq } from 'lodash-es';

import { errorHandle, logger } from 'utils';

import type { AxiosInstance } from 'axios';
import type { ErrorHandle, MetaData, MovieMetaData, ScrapePlugin } from 'types';

const SUPPORT_MEDIA_FILE_EXTENSIONS = ['.mp4', '.mkv'];

class JAVDBScrapePlugin implements ScrapePlugin {
  name = 'javdb';
  fetch: AxiosInstance;

  constructor() {
    this.fetch = axios.create({
      baseURL: 'https://javdb.com',
      headers: {
        Cookies: 'over18=1',
      },
    });
  }

  async search(filePath: string): Promise<ErrorHandle<MetaData>> {
    const num = this.getNumber(filePath);
    if (!num) {
      return errorHandle(`[JAVDB]没有从文件名中解析到番号 ${filePath}`);
    }
    const { data: listData } = await this.fetch('/search', {
      params: {
        q: num,
        f: 'all',
      },
    });
    const listPageEl = load(listData);
    const itemsEl = listPageEl('.movie-list').children('.item');
    if (itemsEl.length === 0) {
      return errorHandle(`[JAVDB]搜索不到资源 ${num}`);
    }
    const itemEl = itemsEl.first();
    const anchor = itemEl.children('a').first();
    const title = anchor.attr('title');
    const url = anchor.attr('href');
    const thumb = itemEl.find('img').first().attr('src');
    const date = itemEl.find('.meta').first().text().trim();

    logger.info(`[JAVDB]刮削成功 ${title}`);

    const metaData: MovieMetaData = {
      movie: {
        title,
        premiered: date,
        thumb,
        javdbid: url,
      },
    };

    return [metaData];
  }

  async match(libarayPaths: string[]): Promise<ErrorHandle<string[]>> {
    const patterns = libarayPaths.map(
      (libarayPath) => `${libarayPath}/**/*{${SUPPORT_MEDIA_FILE_EXTENSIONS.join(',')}}`
    );
    const files = await glob(patterns, { dot: true, deep: Infinity });
    const mediaPaths: string[] = files.filter((file) => this.getNumber(file));

    const uniqMediaPaths = uniq(mediaPaths);
    logger.info(`[JAVDB]检索到的电影：\n`, uniqMediaPaths.join('\n'));
    return [uniqMediaPaths];
  }

  getNumber(filename: string) {
    const reg = /(A-Za-z){3,4}-\d{3,4}/;
    const match = filename.match(reg);
    return match ? match[0].toLocaleLowerCase() : null;
  }
}

export { JAVDBScrapePlugin };
