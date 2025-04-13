import axios from 'axios';
import { load } from 'cheerio';

import { errorHandle, Logger } from '../utils';

import type { AxiosInstance } from 'axios';
import type { ErrorHandle, MatchInfo, MetaData, MovieMetaData, ScrapePlugin } from 'types';

class JAVDBScrapePlugin implements ScrapePlugin {
  name = 'javdb';
  logger = new Logger(this.name);
  fetch: AxiosInstance;

  constructor() {
    this.fetch = axios.create({
      baseURL: 'https://javdb.com',
      headers: {
        Cookies: 'over18=1',
      },
    });
  }

  async scrape(info: MatchInfo): Promise<ErrorHandle<MetaData>> {
    const num = info.extra.num;
    if (!num) {
      return errorHandle(`can not find number from ${info.title}`, this.logger);
    }
    const { data: listData } = await this.fetch('/search', {
      params: {
        q: num,
        f: 'all',
      },
    });
    const listPageEl = load(listData);
    const itemsEl = listPageEl('.movie-list').children('.item');
    if (itemsEl.length === 0) {
      return errorHandle(`${num} not found`, this.logger);
    }
    const itemEl = itemsEl.first();
    const anchor = itemEl.children('a').first();
    const title = anchor.attr('title');
    const url = anchor.attr('href');
    const thumb = itemEl.find('img').first().attr('src');
    const date = itemEl.find('.meta').first().text().trim();

    const { data: detialData } = await this.fetch(url);
    const $ = load(detialData);
    const $panels = $('.panel.movie-panel-info').children();
    const studio = $panels
      .filter(function () {
        return $(this).find('strong').text().trim() === '片商:';
      })
      .find('a')
      .text();
    const ratingStr = $panels
      .filter(function () {
        return $(this).find('strong').text().trim() === '評分:';
      })
      .find('.value')
      .html();
    const reg = /([\d.]+)分/;
    const rating = ratingStr?.match(reg)?.[1];
    const tag = $panels
      .filter(function () {
        return $(this).find('strong').text().trim() === '類別:';
      })
      .find('.value a')
      .map(function () {
        return $(this).text();
      })
      .get();
    const actor = $panels
      .filter(function () {
        return $(this).find('strong').first().text().trim() === '演員:';
      })
      .find('.female')
      .map(function () {
        return $(this).prev().text();
      })
      .get()
      .map((i) => ({
        name: i,
        role: 'AV 女优',
        type: 'Actor',
      }));
    this.logger.info(`success: ${title}`);

    const metaData: MovieMetaData = {
      movie: {
        title,
        premiered: date,
        thumb,
        javdbid: url,
        rating,
        tag,
        genre: tag,
        actor,
        studio: [studio],
      },
    };

    return [metaData];
  }
}

export { JAVDBScrapePlugin };
