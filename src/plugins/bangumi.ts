import axios from 'axios';

import { errorHandle, Logger } from '../utils';

import type {
  EpisodeMetaDataWithSeries,
  ErrorHandle,
  MatchInfo,
  MetaData,
  MovieMetaData,
  ScrapePlugin,
} from '../types';
import type { AxiosInstance } from 'axios';

interface BangumiScrapePluginConfig {
  token: string;
}

export class BangumiScrapePlugin implements ScrapePlugin {
  name = 'bangumi';
  logger = new Logger(this.name);
  fetch: AxiosInstance;

  constructor(private config: BangumiScrapePluginConfig) {
    this.fetch = axios.create({
      baseURL: 'https://api.bgm.tv/',
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        ['User-Agent']: 'July/media-scraper (https://github.com/JxJuly/media-scraper)',
      },
    });
  }

  async scrape(info: MatchInfo): Promise<ErrorHandle<MetaData>> {
    const { data: subjects } = await this.fetch.post('/v0/search/subjects', {
      keyword: info.title.normalize('NFC'),
      sort: 'match',
      filter: {
        type: [2],
      },
    });
    if (!subjects.data?.length) {
      return errorHandle(`${info.title} not found`, this.logger);
    }
    const subjectData = subjects.data[0];
    const studio = (subjectData.infobox || []).find((i) => i.key === '动画制作');
    const tags = (subjectData.tags || []).map((i) => i.name);
    if (info.type === 'movie') {
      const movieMetaData: MovieMetaData = {
        movie: {
          title: subjectData.name,
          originaltitle: subjectData.name,
          premiered: subjectData.date,
          rating: subjectData.rating.score,
          plot: subjectData.summary,
          thumb: subjectData.image,
          studio: studio?.value,
          tag: tags,
          genre: tags,
          bgmid: subjectData.id,
        },
      };
      return [movieMetaData];
    }
    const { data: episodes } = await this.fetch.get('/v0/episodes', {
      params: {
        subject_id: subjectData.id,
      },
    });
    const episodeData = (episodes?.data || []).find((i) => i.ep === Number(info.episode));
    if (!episodeData) {
      return errorHandle(`${subjectData.name} ${info.episode} not found`);
    }
    const episdoeMetaData: EpisodeMetaDataWithSeries = {
      episodedetails: {
        showtitle: episodeData.name,
        plot: episodeData.desc || subjectData.summary,
        bgmid: episodeData.id,
        season: '1',
        episode: episodeData.ep,
        tag: tags,
        genre: tags,
        studio: studio?.value,
        premiered: episodeData.airdate,
      },
      tvshow: {
        title: subjectData.name,
        originaltitle: subjectData.name,
        rating: subjectData.rating.score,
        premiered: subjectData.date,
        thumb: subjectData.image,
        plot: subjectData.summary,
        tag: tags,
        genre: tags,
        studio: studio?.value,
        bgmid: subjectData.id,
      },
    };
    return [episdoeMetaData];
  }
}
