/**
 * 媒体类型
 */
export type MetaType = 'movie' | 'series' | 'episode';

/***********************************************************************
 * 👇👇👇 元数据类型
 */
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
  /** 标签 */
  tag?: string[];
  /** 分类 */
  genre?: string[];
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

/**
 * series 本身不是一种媒体实体，所以真正在刮削过程中 series 会和 episode 混合存在
 */
export type EpisodeMetaDataWithSeries = EpisodeMetaData & SeriesMetaData;

export type MetaData = MovieMetaData | EpisodeMetaData | SeriesMetaData | EpisodeMetaDataWithSeries;

/*************************************************************
 * 👇👇👇 通过路径解析得到的数据类型
 */
/** 文件路径中携带的可选信息 */
interface MatchInfoExtraData {
  /** 番号 */
  num?: string;
  /** 年份 */
  year?: string;
}
interface MatchCommonInfo {
  /** 标题 */
  title: string;
  /** 元数据文件的路径 */
  localMetaDataFilePath: string;
  /** 封面图片的路径 */
  localPosterImagePath: string;
  /** 额外的数据 */
  extra?: MatchInfoExtraData;
}
export type MatchMovieInfo = MatchCommonInfo & {
  type: 'movie';
};
export type MatchEpisodeInfo = MatchCommonInfo & {
  type: 'episode';
  season: string;
  episode: string;
  localSeriesMetaDataFilePath: string;
  localThumbImagePath: string;
};

export type MatchInfo = MatchMovieInfo | MatchEpisodeInfo;

/*************************************************************
 * 👇👇👇 工具类型
 */
export type ErrorHandle<T> = [T] | [undefined, string];

export type Reporter = (params: { msg: string; level: 'info' | 'success' | 'error' }) => void;

/*************************************************************
 * 👇👇👇 插件接口
 */
export interface ScrapePlugin {
  /**
   * 插件唯一标识
   */
  name: string;
  /**
   * 刮削方法
   */
  scrape: (info: MatchInfo) => Promise<ErrorHandle<MetaData>>;
}

/**
 * 附带参数的插件加载
 */
export interface UsePlugin {
  use: ScrapePlugin;
  pick?: string[];
  omit?: string[];
}

/**
 * 加载插件的类型
 */
export type LoadPlugin = ScrapePlugin | UsePlugin;

/*************************************************************
 * 👇👇👇 使用配置
 */
export interface ScraperConfig {
  /**
   * 使用的插件，优先级按照先后顺序决定
   */
  plugins: LoadPlugin[];
  /**
   * 运行的模式
   * merge：合并已有数据，新数据优先级更高
   * complete：补全已有数据
   */
  mode?: 'merge' | 'complete';
  /** 是否要下载刮削的图片 */
  downloadImage?: boolean;
  /** 日志输出 */
  reporter?: Reporter;
}
