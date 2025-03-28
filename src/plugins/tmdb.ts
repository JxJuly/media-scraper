import path from 'path';

import axios from 'axios';
import glob from 'fast-glob';

import { logger, errorHandle } from '../utils';

import type {
  ScrapePlugin,
  ErrorHandle,
  MetaData,
  MovieMetaData,
  EpisodeMetaData,
  SeriesMetaData,
} from '../types';
import type { AxiosInstance } from 'axios';

interface TMDBScrapePluginConfig {
  /** 刮削的凭证 */
  token: string;
  /** 刮削语言 */
  language?: string;
  /** r18 */
  isAdult?: boolean;
}

interface MatchComputeResult {
  /** 剧集标题 */
  title: string;
  /** 季号 */
  season: string;
  /** 集号 */
  episode: string;
  /** 剧集目录 */
  seriesPath: string;
  /** 季目录 */
  seasonPath?: string;
}
interface Matcher {
  reg: RegExp;
  compute: (match: RegExpMatchArray, filePath: string) => MatchComputeResult;
}

const SUPPORT_MEDIA_FILE_EXTENSIONS = ['.mp4', '.mkv'];
/**
 * 枚举匹配器
 */
export const matchers: Matcher[] = [
  {
    reg: /.+\/([^/]+)\/season(\d+)\/.*episode(\d+)/,
    compute: (match: RegExpMatchArray, filePath: string) => {
      const seasonPath = path.dirname(filePath);
      return {
        title: match[1],
        season: match[2] || '01',
        episode: match[3],
        seriesPath: path.dirname(seasonPath),
        seasonPath,
      };
    },
  },
  {
    reg: /.+\/([^/]*)\/.*episode(\d+)/,
    compute: (match: RegExpMatchArray, filePath: string) => {
      return {
        title: match[1],
        season: '01',
        episode: match[2],
        seriesPath: path.dirname(filePath),
      };
    },
  },
];

class TMDBScrapePlugin implements ScrapePlugin {
  name = 'tmdb';
  fetch: AxiosInstance;

  constructor(private config: TMDBScrapePluginConfig) {
    this.fetch = axios.create({
      baseURL: 'https://api.themoviedb.org/3/',
      params: {
        language: this.config.language,
      },
      headers: {
        Authorization: `Bearer ${this.config.token}`,
      },
    });
  }

  public search(filePath: string): Promise<ErrorHandle<MetaData>> {
    if (this.isSeries(filePath)) {
      return this.searchSeries(filePath);
    }
    return this.isTV(filePath) ? this.searchEpisode(filePath) : this.searchMovie(filePath);
  }

  public async match(libarayPaths: string[]): ReturnType<ScrapePlugin['match']> {
    const mediaPaths: string[] = [];
    const patterns = libarayPaths.map(
      (libarayPath) => `${libarayPath}/**/*{${SUPPORT_MEDIA_FILE_EXTENSIONS.join(',')}}`
    );
    const files = await glob(patterns, { dot: true, deep: Infinity });
    mediaPaths.push(...files);
    files.forEach((file) => {
      const info = this.matchAndComputeAll(file);
      if (!info) {
        return;
      }
      mediaPaths.push(info.seriesPath);
    });
    logger.info(`检索到的电影、剧集：\n`, mediaPaths.join('\n'));
    return [mediaPaths];
  }

  /**
   * 是否是剧集
   * @param filePath 文件路径
   */
  isTV(filePath: string): boolean {
    return !!matchers.find((match) => filePath.match(match.reg));
  }

  /**
   * 是否是剧集文件夹
   * 姑且通过是否有后缀来判断，也可以实际去判断是否是文件夹，但不想太多入侵
   * @param filePath
   */
  isSeries(filePath: string) {
    return !path.parse(filePath).ext;
  }

  async searchMovie(filePath: string): Promise<ErrorHandle<MovieMetaData>> {
    const name = path.parse(filePath).name.normalize('NFC');
    logger.info(`开始刮削电影`, `name: ${name}`, `filePath: ${filePath}`);
    const { data: searchList } = await this.fetch.get('search/movie', {
      params: {
        query: name,
        include_adult: this.config.isAdult,
        page: 1,
      },
    });
    if (!searchList.results.length) {
      return errorHandle(`搜索不到资源 ${name}`);
    }
    const source = searchList.results[0];
    const movieId = source.id;
    const { data } = await this.fetch.get(`movie/${movieId}`);

    const metaData: MovieMetaData = {
      movie: {
        title: data.title,
        originaltitle: data.original_title,
        runtime: data.runtime,
        premiered: data.release_date,
        rating: data.vote_average,
        plot: data.overview,
        thumb: this.getTMDBImageUrl(data.poster_path),
        studio: data.production_companies?.[0]?.name,
        tmdbid: data.id,
      },
    };
    logger.info(`刮削成功 ${name} => ${data.title}`);
    return [metaData];
  }
  async searchEpisode(filePath: string): Promise<ErrorHandle<EpisodeMetaData>> {
    logger.info(`开始解析 episode: ${filePath}`);
    const info = this.matchAndComputeAll(filePath);
    if (!info) {
      return errorHandle(`解析 episode 的名称、季号或集数失败 ${filePath}`);
    }
    logger.info(`开始刮削 episode: ${info.title}-${info.season}-${info.episode}`);
    const { data: searchList } = await this.fetch.get('search/tv', {
      params: {
        query: info.title.normalize('NFC'),
        include_adult: this.config.isAdult,
        page: 1,
      },
    });
    if (!searchList.results.length) {
      return errorHandle(`搜索不到 TV 资源 ${info.title}`);
    }
    const series = searchList.results[0];
    const season = Number(info.season);
    const episode = Number(info.episode);
    const { data } = await this.fetch.get(`tv/${series.id}/season/${season}/episode/${episode}`);
    const metaData: EpisodeMetaData = {
      episodedetails: {
        showtitle: data.name,
        runtime: data.runtime,
        rating: data.vote_average,
        thumb: this.getTMDBImageUrl(data.still_path),
        plot: data.overview,
        tmdbid: data.id,
        season: data.season_number,
        episode: data.episode_number,
      },
    };
    return [metaData];
  }
  async searchSeries(filePath: string): Promise<ErrorHandle<SeriesMetaData>> {
    const name = path.parse(filePath).name.normalize('NFC');
    logger.info(`开始刮削 Series`, `name: ${name}`, `filePath: ${filePath}`);
    const { data: searchList } = await this.fetch.get('search/tv', {
      params: {
        query: name,
        include_adult: this.config.isAdult,
        page: 1,
      },
    });
    if (!searchList.results.length) {
      return errorHandle(`搜索不到 Series 资源：${name}`);
    }
    const series = searchList.results[0];
    const { data } = await this.fetch.get(`tv/${series.id}`);
    const metaData: SeriesMetaData = {
      tvshow: {
        title: data.name,
        originaltitle: data.original_name,
        runtime: data.runtime,
        rating: data.vote_average,
        premiered: data.first_air_date,
        thumb: this.getTMDBImageUrl(data.poster_path),
        studio: data?.production_companies.map((i) => i.name),
        plot: data.overview,
        tmdbid: data.id,
      },
    };
    return [metaData];
  }

  private matchAndComputeAll(filePath: string): null | MatchComputeResult {
    return matchers.reduce<null | MatchComputeResult>((value, matcher) => {
      if (!value) {
        const match = filePath.match(matcher.reg);
        return match ? matcher.compute(match, filePath) : null;
      }
      return value;
    }, null);
  }

  getTMDBImageUrl(path: string) {
    return `https://image.tmdb.org/t/p/w500${path}`;
  }
}

export { TMDBScrapePlugin };
