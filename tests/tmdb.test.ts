import { expect, test, describe } from 'vitest';

import { TMDBScrapePlugin } from '../src/plugins/tmdb';

const tmdb = new TMDBScrapePlugin({
  token: '',
});

describe('TMDBScrapePlugin', () => {
  test('isTV: with seanson', () => {
    expect(tmdb.isTV('/root/资源库/亮剑/season01/episode02.mp4')).toBeTruthy();
  });
  test('isTV: without seanson', () => {
    expect(tmdb.isTV('/root/资源库/亮剑/episode02.mp4')).toBeTruthy();
  });
  test('isTV: is not', () => {
    expect(tmdb.isTV('/root/资源库/复仇者联盟3.mp4')).toBeFalsy();
  });
});
