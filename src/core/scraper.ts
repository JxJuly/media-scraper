import fs from 'fs';

import { omit, pick, noop } from 'lodash-es';
import { Builder } from 'xml2js';

import { meregMetaData, isUsePlugin, download, errorHandle, sleep } from './utils';

import type { ScraperConfig, ScrapePlugin, MetaData, MatchInfo, ErrorHandle, UsePlugin } from '../types';

import { Tool, Match } from '.';

class Scraper {
  config: Required<ScraperConfig>;
  builder = new Builder();

  constructor(custom: ScraperConfig) {
    this.config = {
      mode: 'complete',
      downloadImage: false,
      reporter: noop,
      ...custom,
    };
  }

  get reporter() {
    return this.config.reporter;
  }

  async saveMetaData<T extends MetaData>(info: MatchInfo, metaData: T) {
    const tryWriteMetaDataFile = (path: string, data: any) => {
      const str = this.builder.buildObject(data);
      fs.writeFileSync(path, str);
    };
    if (info.type === 'movie' && Tool.isMovieMetaData(metaData)) {
      tryWriteMetaDataFile(info.localMetaDataFilePath, metaData);
      if (metaData.movie.thumb) {
        await this.saveImage(info.localPosterImagePath, metaData.movie.thumb);
      }
      return;
    }
    if (info.type === 'episode' && Tool.isEpisodeMetaDataWithSeries(metaData)) {
      tryWriteMetaDataFile(info.localMetaDataFilePath, omit(metaData, 'tvshow'));
      tryWriteMetaDataFile(info.localSeriesMetaDataFilePath, omit(metaData, 'episodedetails'));
      if (metaData.tvshow.thumb) {
        await this.saveImage(info.localPosterImagePath, metaData.tvshow.thumb);
        await sleep(2000);
      }
      if (metaData.episodedetails.thumb) {
        await this.saveImage(info.localThumbImagePath, metaData.episodedetails.thumb);
      }
      return;
    }
    this.reporter({ msg: `未知的元数据类型：${info.type}`, level: 'error' });
  }
  async saveImage(localPostImagePath: string, url: string) {
    if (!this.config.downloadImage) {
      return;
    }

    if (fs.existsSync(localPostImagePath) && this.config.mode === 'complete') {
      this.reporter({ msg: `文件已存在，跳过下载`, level: 'info' });
      return;
    }
    this.reporter({ msg: `开始下载：${url}`, level: 'info' });
    const [, error] = await download(url, localPostImagePath, {
      onRetry(error, count) {
        this.reporter({ msg: `正在第 ${count} 次下载重试`, level: 'error' });
      },
    });
    if (error) {
      this.reporter({ msg: `下载失败: ${error}`, level: 'error' });
    } else {
      this.reporter({ msg: `下载成功`, level: 'success' });
    }
  }

  async run(filePath: string) {
    const info = Match.getInfo(filePath);

    const localMetaData = await Tool.getLocalMetaData(info);

    const [metaData, error] = await this.scrape(info);
    if (error || !metaData) {
      this.reporter({ msg: error || '元数据为空！', level: 'error' });
      return;
    }

    /** 不同的模式决定不同的合并优先级 */
    const nextMetaData =
      this.config.mode === 'merge'
        ? meregMetaData<MetaData>(localMetaData, metaData)
        : meregMetaData<MetaData>(metaData, localMetaData);

    await this.saveMetaData(info, nextMetaData);
    this.reporter({ msg: 'done.', level: 'info' });
  }

  private async scrape(info: MatchInfo): Promise<ErrorHandle<MetaData>> {
    let temp: undefined | MetaData = undefined;
    for (const plugin of this.config.plugins) {
      const [metaData, error] = isUsePlugin(plugin)
        ? await this.runUsePlugin(plugin, info)
        : await this.runPlugin(plugin, info);

      if (error || !metaData) {
        this.reporter({ msg: error, level: 'error' });
        continue;
      }
      temp = meregMetaData(temp, metaData);
    }
    return [temp];
  }

  private async runPlugin(plugin: ScrapePlugin, info: MatchInfo) {
    try {
      return await plugin.scrape(info);
    } catch (e) {
      return errorHandle(e);
    }
  }
  private async runUsePlugin(plugin: UsePlugin, info: MatchInfo): Promise<ErrorHandle<MetaData>> {
    const result = await this.runPlugin(plugin.use, info);
    /** 异常情况 */
    if (result[1] || !result[0]) {
      return result;
    }
    /** 没有特殊配置 */
    if (!plugin.omit && !plugin.omit) {
      return result;
    }
    /** 基于配置做筛检 */
    const temp = Object.entries(result[0]).reduce((prev, cur) => {
      const [key, value] = cur;
      let next = value;
      if (plugin.pick) {
        next = pick(value, plugin.pick);
      }
      if (plugin.omit) {
        next = omit(value, plugin.omit);
      }
      prev[key] = next;
      return prev;
    }, {} as MetaData);
    return [temp];
  }
}

export { Scraper };
