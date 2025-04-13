import fs from 'fs';

import { mergeWith, omit, pick } from 'lodash-es';
import { Builder } from 'xml2js';

import { Tool, Match } from './core';
import { logger, sleep } from './utils';

import type { ScrapePlugin, MetaData, MatchInfo } from './types';

interface UsePlugin {
  use: ScrapePlugin;
  pick?: string[];
  omit?: string[];
}

interface ScraperConfig {
  /**
   * 运行的模式
   * cover：无论是否已有数据都直接覆盖
   * merge：合并已有数据，新数据优先级更高
   * complete：若数据存在，补全已有数据
   */
  mode: 'cover' | 'merge' | 'complete';
  /** 是否要下载刮削的图片 */
  downloadImage: boolean;
  /**
   * 使用的插件，优先级按照先后顺序决定
   */
  plugins: UsePlugin[];
}

const DEFAULT_CONFIG: Omit<ScraperConfig, 'plugins'> = {
  mode: 'complete',
  downloadImage: false,
};

const isEmpty = (v: any) => {
  if (v === undefined) {
    return true;
  }
  if (Array.isArray(v)) {
    return !!v.length;
  }
  return false;
};

const simgleMerge = <T>(a: T, b: T) => {
  return mergeWith({} as T, a, b, (objValue, srcValue) => {
    if (isEmpty(srcValue)) {
      return objValue;
    }
    // 数组无需 merge
    if (Array.isArray(objValue)) {
      return srcValue;
    }
  });
};

class Scraper {
  config: ScraperConfig;
  builder = new Builder();

  constructor(custom: Partial<Omit<ScraperConfig, 'plugins'>> & { plugins: UsePlugin[] }) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...custom,
    };
  }

  mergeMetaData<T extends MetaData>(local: T | undefined, remote: T) {
    let temp: T;
    if (!local || this.config.mode === 'cover') {
      temp = remote;
    } else {
      if (this.config.mode === 'merge') {
        temp = simgleMerge(local, remote);
      } else {
        temp = simgleMerge(remote, local);
      }
    }
    return temp;
  }

  async saveMetaData<T extends MetaData>(info: MatchInfo, metaData: T) {
    const tryWriteMetaDataFile = (path: string, data: any) => {
      const str = this.builder.buildObject(data);
      fs.writeFileSync(path, str);
    };
    if (info.type === 'movie' && Tool.isMovieMetaData(metaData)) {
      tryWriteMetaDataFile(info.localMetaDataFilePath, metaData);
      if (metaData.movie.thumb) {
        await this.savePostImage(info.localPosterImagePath, metaData.movie.thumb);
      }
      return;
    }
    if (info.type === 'episode' && Tool.isEpisodeMetaDataWithSeries(metaData)) {
      tryWriteMetaDataFile(info.localMetaDataFilePath, omit(metaData, 'tvshow'));
      tryWriteMetaDataFile(info.localSeriesMetaDataFilePath, omit(metaData, 'episodedetails'));
      if (metaData.tvshow.thumb) {
        await this.savePostImage(info.localPosterImagePath, metaData.tvshow.thumb);
        await sleep(2000);
      }
      if (metaData.episodedetails.thumb) {
        await this.savePostImage(info.localThumbImagePath, metaData.episodedetails.thumb);
      }
      return;
    }
    logger.error(`unkown type or metadata, info.type: ${info.type}`);
  }
  async savePostImage(localPostImagePath: string, url: string) {
    if (!this.config.downloadImage) {
      return;
    }
    const locaExist = fs.existsSync(localPostImagePath);
    if (locaExist && this.config.mode === 'complete') {
      logger.info(`image is existed and scrape mode is ${this.config.mode}, skip download`);
      return;
    }
    logger.info(`start download: ${url}`);
    const [, error] = await Tool.downloadImage(url, localPostImagePath);
    if (error) {
      logger.error('image download failed: ', error);
    } else {
      logger.info('image donwload finished!');
    }
  }

  async run(filePath: string) {
    const info = Match.getInfo(filePath);

    const localMetaData = await Tool.getLocalMetaData(info);

    const [metaData, error] = await this.scrape(info);
    console.log(error, metaData);
    if (error || !metaData) {
      return;
    }

    const nextMetaData = this.mergeMetaData(localMetaData, metaData);
    await this.saveMetaData(info, nextMetaData);
  }

  private async scrape(info: MatchInfo) {
    let temp: undefined | MetaData = undefined;
    for (const plugin of this.config.plugins) {
      const [metaData, error] = await plugin.use.scrape(info);
      if (error || !metaData) {
        continue;
      }
      Object.entries(metaData).forEach(([key, value]) => {
        if (temp === undefined) {
          temp = {} as any;
        }
        if (plugin.pick) {
          temp[key] = simgleMerge(temp[key], pick(value, plugin.pick));
        } else if (plugin.omit) {
          temp[key] = simgleMerge(temp[key], omit(value, plugin.omit));
        } else {
          temp[key] = simgleMerge(temp[key], value);
        }
      });
    }
    return [temp];
  }
}

export { Scraper };
