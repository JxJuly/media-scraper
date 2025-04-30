import { posix as path } from 'path';

import type { MatchInfo } from '../types';
const META_DATA_EXTENSION = '.nfo';
const POSTER_IMAGE_EXTENSION = '.jpg';
const MOVIE_POSTER_IMAGE = 'poster.jpg';
const SERIES_META_DATA_FILE_NAME = 'tvshow.nfo';

/**
 * 获取标题
 */
const getTitle = (filename: string) => {
  const useless = [
    /** 名称中从第一个 “.” 开始往后全部舍弃 */
    /\..*/,
    /** 名称中 “[abc]” 舍弃  */
    /(\[.*\])/,
    /** 名称中 “(abc)” 舍弃 */
    /(\(.*\))/,
    /** 名称为 “标题 - 01” 此类标题后续全部舍弃 */
    /- ?\d{1,3}/,
  ];
  let temp = filename;
  useless.forEach((reg) => {
    temp = temp.replace(reg, '');
  });
  /**
   * 1. 多个空格合并成一个空格
   * 2. 首尾去空格
   */
  return temp.replace(/\s{2,}/g, ' ').trim();
};
const getTVInfo = (filename: string) => {
  let match = null;
  /** S001E001 */
  match = filename.match(/[sS](\d{1,3})[eE](\d{1,3})/);
  if (match) {
    return { season: match[1], episode: match[2] };
  }
  /** E001 */
  match = filename.match(/[eE](\d{1,3})/);
  if (match) {
    return { season: '01', episode: match[1] };
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
/**
 * 通过 episode 文件路径计算 series nfo 文件路径
 * @param filePath episode 文件路径
 * @returns
 */
const getSeriesMetaDataPath = (filePath: string) => {
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
const getPosterImagePath = (filePath: string) => {
  const parsed = path.parse(filePath);
  return path.join(parsed.dir, MOVIE_POSTER_IMAGE);
};
/**
 * 通过 episode 文件路径获得其缩略图路径
 * @param filePath
 * @returns
 */
const getThumbImagePath = (filePath: string) => {
  const parsed = path.parse(filePath);
  parsed.base = parsed.name + '-thumb' + POSTER_IMAGE_EXTENSION;
  parsed.ext = POSTER_IMAGE_EXTENSION;
  return path.format(parsed);
};

/**
 * 获取年份
 */
const getYear = (filename: string) => {
  /**
   * (1990) 或者 [2001]
   */
  const match = filename.match(/[([]((19|20)\d{2})[\])]/);
  return match?.[1];
};
/**
 * 获取番号
 */
const getNumber = (filename: string) => {
  const reg = /[A-Za-z]{3,4}-\d{3,4}/;
  const match = filename.match(reg);
  return match ? match[0].toLocaleLowerCase() : undefined;
};

/**
 * 解析文件信息
 * @param filePath
 */
const getInfo = (filePath: string): MatchInfo => {
  const parsed = path.parse(filePath);
  const filename = parsed.name;
  const commonInfo = {
    title: getTitle(filename),
    localMetaDataFilePath: getMetaDataFilePath(filePath),
    localPosterImagePath: getPosterImagePath(filePath),
    extra: {
      year: getYear(filename),
      num: getNumber(filename),
    },
  };
  const tvInfo = getTVInfo(filename);
  if (tvInfo) {
    return {
      ...commonInfo,
      ...tvInfo,
      type: 'episode',
      localSeriesMetaDataFilePath: getSeriesMetaDataPath(filePath),
      localThumbImagePath: getThumbImagePath(filePath),
    };
  }
  return {
    ...commonInfo,
    type: 'movie',
  };
};

const Match = {
  getInfo,
};

export { Match };
