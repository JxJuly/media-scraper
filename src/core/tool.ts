import fs from 'fs';
import { posix as path } from 'path';

import glob from 'fast-glob';
import { toString, uniq } from 'lodash-es';
import { parseStringPromise } from 'xml2js';

import type {
  EpisodeMetaData,
  EpisodeMetaDataWithSeries,
  ErrorHandle,
  MatchInfo,
  MetaData,
  MovieMetaData,
  SeriesMetaData,
} from '../types';

const META_DATA_EXTENSION = '.nfo';
const POSTER_IMAGE_EXTENSION = '.jpg';
const MOVIE_POSTER_IMAGE = 'poster.jpg';
const SERIES_META_DATA_FILE_NAME = 'tvshow.nfo';
const SUPPORT_MEDIA_FILE_EXTENSIONS = ['.mp4', '.mkv'];
/**
 * 是否是 movie 类型的元数据
 */
const isMovieMetaData = (metaData: MetaData): metaData is MovieMetaData => {
  return !!(metaData as MovieMetaData).movie;
};
/**
 * 是否是 episode 类型的元数据
 */
const isEpisodeMetaData = (metaData: MetaData): metaData is EpisodeMetaData => {
  return !!(metaData as EpisodeMetaData).episodedetails;
};
/**
 * 是否是 series 类型的元数据
 */
const isSeriesMetaData = (metaData: MetaData): metaData is SeriesMetaData => {
  return !!(metaData as SeriesMetaData).tvshow;
};
/**
 * 是否包含 series 数据的 episode 数据
 */
const isEpisodeMetaDataWithSeries = (metaData: MetaData): metaData is EpisodeMetaDataWithSeries => {
  return (
    !!(metaData as EpisodeMetaDataWithSeries).tvshow &&
    !!(metaData as EpisodeMetaDataWithSeries).episodedetails
  );
};

/**
 * 读取 nfo 文件
 * @param filePath nfo 文件路径
 */
const parseMetaDataFile = async (filePath: string): Promise<ErrorHandle<MetaData>> => {
  if (!fs.existsSync(filePath)) {
    return [undefined, 'file is not exists'];
  }
  try {
    const data = await parseStringPromise(fs.readFileSync(filePath));
    return [data];
  } catch (err) {
    return [undefined, toString(err)];
  }
};

/**
 * 获取元数据文件路径
 * @param filePath 媒体文件路径
 * @returns
 */
const getMetaDataFilePath = (filePath: string) => {
  const parsed = path.parse(filePath);
  parsed.base = parsed.name + META_DATA_EXTENSION;
  parsed.ext = META_DATA_EXTENSION;
  return path.format(parsed);
};
const getLocalMetaData = async (info: MatchInfo) => {
  if (info.type === 'movie') {
    return await tryReadMetaDataFile(info.localMetaDataFilePath);
  } else {
    const [metaData, seriesMetaData] = await Promise.all([
      tryReadMetaDataFile(info.localMetaDataFilePath),
      tryReadMetaDataFile(info.localSeriesMetaDataFilePath),
    ]);
    return {
      ...metaData,
      ...seriesMetaData,
    };
  }

  async function tryReadMetaDataFile(path: string) {
    return !fs.existsSync(path) ? undefined : await parseStringPromise(fs.readFileSync(path));
  }
};

/**
 * 通过 episode 文件路径计算 series nfo 文件路径
 * @param filePath episode 文件路径
 * @returns
 */
const getSeriesMetaDataPathByEpisodePath = (filePath: string) => {
  const parsed = path.parse(filePath);
  return path.join(parsed.dir, SERIES_META_DATA_FILE_NAME);
};

/**
 * 通过媒体文件路径获取封面图片路径
 * 1. movie   => movie poster
 * 2. episode => series poster
 * @param filePath 媒体文件路径
 * @returns
 */
const getPosterImagePathByMediaPath = (filePath: string) => {
  const parsed = path.parse(filePath);
  return path.join(parsed.dir, MOVIE_POSTER_IMAGE);
};

/**
 * 通过 episode 文件路径获得其缩略图路径
 * @param filePath
 * @returns
 */
const getThumbImagePathByEpisodePath = (filePath: string) => {
  const parsed = path.parse(filePath);
  parsed.base = parsed.name + '-thumb' + POSTER_IMAGE_EXTENSION;
  parsed.ext = POSTER_IMAGE_EXTENSION;
  return path.format(parsed);
};

const findMedia = async (libarayPaths: string[]) => {
  const patterns = libarayPaths.map((libarayPath) => {
    // 需要转义 "("、")"、"["、"]"
    const escapedPath = libarayPath.replace(/[()[\]]/g, (match) => `\\${match}`);
    return `${escapedPath}/**/*{${SUPPORT_MEDIA_FILE_EXTENSIONS.join(',')}}`;
  });
  const files = await glob(patterns, { dot: true, deep: Infinity });

  const uniqMediaPaths = uniq(files);
  return [uniqMediaPaths];
};

const Tool = {
  // stage
  findMedia,
  getLocalMetaData,
  isMovieMetaData,
  isEpisodeMetaData,
  isSeriesMetaData,
  isEpisodeMetaDataWithSeries,
  parseMetaDataFile,
  getSeriesMetaDataPathByEpisodePath,
  getPosterImagePathByMediaPath,
  getThumbImagePathByEpisodePath,
  // temp
  getMetaDataFilePath,
};

export { Tool };
