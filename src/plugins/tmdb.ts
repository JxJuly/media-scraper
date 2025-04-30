import axios from 'axios';

import { errorHandle } from '../core/utils';

import type {
  ScrapePlugin,
  ErrorHandle,
  MetaData,
  MatchEpisodeInfo,
  MatchMovieInfo,
  MovieMetaData,
  EpisodeMetaData,
  SeriesMetaData,
  MatchInfo,
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

  public async scrape(info: MatchInfo): Promise<ErrorHandle<MetaData>> {
    return info.type === 'movie' ? this.scrapeMovie(info) : this.scrapeEpisode(info);
  }

  async scrapeMovie(info: MatchMovieInfo): Promise<ErrorHandle<MovieMetaData>> {
    const name = info.title.normalize('NFC');
    const { data: searchList } = await this.fetch.get('search/movie', {
      params: {
        query: name,
        include_adult: this.config.isAdult,
        page: 1,
      },
    });
    if (!searchList.results.length) {
      return errorHandle(`${name} not found`);
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
        thumb: TMDBScrapePlugin.getTMDBImageUrl(data.poster_path),
        studio: data?.production_companies.map((i) => i.name),
        tmdbid: data.id,
      },
    };
    return [metaData];
  }

  async scrapeEpisode(info: MatchEpisodeInfo): Promise<ErrorHandle<EpisodeMetaData>> {
    const { data: searchList } = await this.fetch.get('search/tv', {
      params: {
        query: info.title.normalize('NFC'),
        include_adult: this.config.isAdult,
        page: 1,
        first_air_date_year: info.extra?.year,
        year: info.extra?.year,
      },
    });
    if (!searchList.results.length) {
      return errorHandle(`${info.title} not found`);
    }
    const series = searchList.results[0];
    const season = Number(info.season);
    const episode = Number(info.episode);
    const [{ data: seriesData }, { data: episodeData }] = await Promise.all([
      this.fetch.get(`tv/${series.id}`),
      this.fetch.get(`tv/${series.id}/season/${season}/episode/${episode}`),
    ]);
    const studio = seriesData?.production_companies.map((i) => i.name);
    const metaData: EpisodeMetaData & SeriesMetaData = {
      episodedetails: {
        showtitle: episodeData.name,
        runtime: episodeData.runtime,
        rating: episodeData.vote_average,
        thumb: TMDBScrapePlugin.getTMDBImageUrl(episodeData.still_path),
        plot: episodeData.overview || seriesData.overview,
        tmdbid: episodeData.id,
        season: episodeData.season_number,
        episode: episodeData.episode_number,
        // 继承自 series
        premiered: seriesData.air_date,
        studio,
      },
      tvshow: {
        title: seriesData.name,
        originaltitle: seriesData.original_name,
        runtime: seriesData.runtime,
        rating: seriesData.vote_average,
        premiered: seriesData.first_air_date,
        thumb: TMDBScrapePlugin.getTMDBImageUrl(seriesData.poster_path),
        studio,
        plot: seriesData.overview,
        tmdbid: seriesData.id,
      },
    };
    return [metaData];
  }

  static getTMDBImageUrl(path: string) {
    if (!path) return undefined;
    return `https://image.tmdb.org/t/p/w500${path}`;
  }
}

export { TMDBScrapePlugin };
