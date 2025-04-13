import type { MetaData } from './meta-data';

export type ErrorHandle<T> = [T] | [undefined, string];

interface MatchInfoExtraData {
  num?: string;
  year?: string;
}
export interface MatchMovieInfo {
  type: 'movie';
  title: string;
  localMetaDataFilePath: string;
  localPosterImagePath: string;
  extra?: MatchInfoExtraData;
}
export interface MatchEpisodeInfo {
  type: 'episode';
  title: string;
  season: string;
  episode: string;
  localMetaDataFilePath: string;
  localSeriesMetaDataFilePath: string;
  localPosterImagePath: string;
  localThumbImagePath: string;
  extra?: MatchInfoExtraData;
}

export type MatchInfo = MatchMovieInfo | MatchEpisodeInfo;

/**
 * 插件接口
 */
export interface ScrapePlugin {
  /**
   * 插件唯一标识
   */
  name: string;

  scrape: (info: MatchInfo) => Promise<ErrorHandle<MetaData>>;
}
