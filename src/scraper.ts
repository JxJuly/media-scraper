import fs from 'fs';
import path from 'path';

import axios from 'axios';
import { mergeWith, noop } from 'lodash-es';
import { parseStringPromise, Builder } from 'xml2js';

import { errorHandle, logger } from './utils';

import type { ErrorHandle, ScrapePlugin, MovieMetaData, SeriesMetaData, MetaData, MetaType } from './types';

interface ScraperConfig {
  /**
   * 运行的模式
   * cover：无论是否已有数据都直接覆盖
   * skip：若已有数据则直接跳过刮削
   * merge：合并已有数据，新数据优先级更高
   * complete：若数据存在，补全已有数据
   */
  mode: 'cover' | 'skip' | 'merge' | 'complete';
  /** 是否要下载刮削的图片 */
  downloadImage: boolean;
  /**
   * 使用的插件，优先级按照先后顺序决定
   */
  plugins: ScrapePlugin[];
}

const DEFAULT_CONFIG: Omit<ScraperConfig, 'plugins'> = {
  mode: 'complete',
  downloadImage: false,
};

const META_DATA_EXTENSION = '.nfo';
const POSTER_IMAGE_EXTENSION = '.jpg';
const MOVIE_POSTER_IMAGE = 'poster.jpg';

const simgleMerge = <T>(a: T, b: T) => {
  return mergeWith({} as T, a, b, (objValue, srcValue) => {
    // 数组无需 merge
    if (Array.isArray(objValue)) {
      return srcValue;
    }
  });
};

class Scraper {
  config: ScraperConfig;
  builder = new Builder();

  constructor(custom: Partial<Omit<ScraperConfig, 'plugins'>> & { plugins: ScrapePlugin[] }) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...custom,
    };
  }

  /**
   * 运行刮削
   * @param filePath 文件完整的路径
   */
  async run(filePath: string) {
    const plugin = this.config.plugins[0];
    if (!plugin) {
      return errorHandle(`请至少添加一个插件`);
    }
    const localMetaDataPath = this.getMetaDataPath(filePath);
    const [localMetaData] = await this.loadMetaData(localMetaDataPath);

    // 本地已经存在元数据，并且模式为 skip 则直接跳过
    if (this.config.mode === 'skip' && localMetaData) {
      return [localMetaData];
    }
    const [metaData, error] = await plugin.search(filePath);
    if (error || !metaData) {
      return;
    }

    const nextMetaData = this.mergeMetaData(localMetaData, metaData);
    this.saveMetaData(localMetaDataPath, nextMetaData);
    const thumb = this.getMetaDataThumb(nextMetaData);
    if (thumb) {
      const localPostImagePath = this.getPostImagePath(filePath, this.getMetaDataType(nextMetaData));
      await this.savePostImage(localPostImagePath, thumb);
    }
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

  async loadMetaData(metaDataPath: string): Promise<ErrorHandle<undefined | MetaData>> {
    if (!fs.existsSync(metaDataPath)) {
      return [undefined];
    }
    const metaData: MetaData = await parseStringPromise(fs.readFileSync(metaDataPath));
    return [metaData];
  }
  saveMetaData<T>(metaDataPath: string, metaData: T) {
    const str = this.builder.buildObject(metaData);
    fs.writeFileSync(metaDataPath, str);
  }
  async savePostImage(localPostImagePath: string, url: string) {
    const locaExist = fs.existsSync(localPostImagePath);
    if (locaExist && (this.config.mode === 'complete' || this.config.mode === 'skip')) {
      logger.info(`检测到封面图已经存在且刮削模式为 ${this.config.mode}，跳过图片下载`);
      return;
    }
    logger.info('开始下载封面图');
    const response = await axios.get(url, { responseType: 'stream' });
    const writer = fs.createWriteStream(localPostImagePath);
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        logger.info('封面图下载完成！');
        resolve(localPostImagePath);
      });
      writer.on('error', (err) => {
        logger.error('封面图下载失败！', err);
        fs.unlink(localPostImagePath, noop);
        reject(err);
      });
    });
  }

  getMetaDataPath(filePath: string) {
    const parsed = path.parse(filePath);
    parsed.base = parsed.name + META_DATA_EXTENSION;
    parsed.ext = META_DATA_EXTENSION;
    return path.format(parsed);
  }
  getPostImagePath(filePath: string, type: MetaType) {
    if (type === 'movie') {
      const parsed = path.parse(filePath);
      parsed.base = MOVIE_POSTER_IMAGE;
      parsed.ext = POSTER_IMAGE_EXTENSION;
      return path.format(parsed);
    }

    if (type === 'series') {
      return path.resolve(filePath, MOVIE_POSTER_IMAGE);
    }

    const parsed = path.parse(filePath);
    parsed.base = parsed.name + '-thumb' + POSTER_IMAGE_EXTENSION;
    parsed.ext = POSTER_IMAGE_EXTENSION;
    return path.format(parsed);
  }

  getMetaDataType(metaData: MetaData): MetaType {
    if (this.isMovieMetaData(metaData)) {
      return 'movie';
    }
    if (this.isSeriesMetaData(metaData)) {
      return 'series';
    }
    return 'episode';
  }
  isMovieMetaData(metaData: MetaData): metaData is MovieMetaData {
    return !!(metaData as MovieMetaData).movie;
  }
  isSeriesMetaData(metaData: MetaData): metaData is SeriesMetaData {
    return !!(metaData as SeriesMetaData).tvshow;
  }
  getMetaDataThumb(metaData: MetaData) {
    if (this.isMovieMetaData(metaData)) {
      return metaData.movie.thumb;
    }
    if (this.isSeriesMetaData(metaData)) {
      return metaData.tvshow.thumb;
    }
    return metaData.episodedetails.thumb;
  }
}

export { Scraper };
