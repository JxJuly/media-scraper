/**
 * 媒体类型
 */
export type MetaType = 'movie' | 'series' | 'episode';

/**
 * 通用的元数据
 */
interface CommonMetaData {
  /** 媒体标题 */
  title?: string;
  /** 原始标题(用于外语电影) */
  originaltitle?: string;
  /** 发布年份 */
  year?: string;
  /** 首映日期 */
  premiered?: string;
  /** 剧情简介 */
  plot?: string;
  /** 评分(0-10) */
  rating?: string;
  runtime?: string;
  /** 缩略图URL或路径 */
  thumb?: string;
  /** 演员信息 */
  actor?: {
    name: string;
    role?: string;
    [key: string]: any;
  }[];
  /** 导演 */
  director?: string;
  /** 编剧 */
  credits?: string;
  /** 制作公司 */
  studio?: string[];
  tag?: string;
  [key: string]: any;
}

/**
 * 电影的元数据
 */
export interface MovieMetaData {
  movie: CommonMetaData;
}
/**
 * 剧集的元数据
 */
export interface EpisodeMetaData {
  episodedetails: CommonMetaData & {
    /** 剧集名称 */
    showtitle?: string;
    /** 季号 */
    season?: string;
    /** 集号 */
    episode: string;
  };
}

/**
 * Series 元数据
 */
export interface SeriesMetaData {
  tvshow: CommonMetaData & {
    season?: number;
    episode?: number;
  };
}

export type MetaData = MovieMetaData | EpisodeMetaData | SeriesMetaData;

export type ErrorHandle<T> = [T] | [undefined, string];

/**
 * 插件接口
 */
export interface ScrapePlugin {
  /**
   * 插件唯一标识
   */
  name: string;
  /**
   * 刮削函数
   */
  search(filePath: string): Promise<ErrorHandle<MetaData>>;
}
