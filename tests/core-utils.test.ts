import { expect, test, describe } from 'vitest';

import { meregMetaData } from '../src/core/utils';

describe('test meregMetaData', () => {
  test('empty a and object b', () => {
    const b = { str: 'string' };
    expect(meregMetaData(undefined, b)).toEqual(b);
  });
  test('a and b has same key', () => {
    const a = { str: 'stringa' };
    const b = { str: 'stringb' };
    expect(meregMetaData(a, b)).toEqual(b);
  });
  test('normal merge', () => {
    const a = {
      episodedetails: {
        showtitle: 'showtitle',
        season: '01',
        episode: '01',
      },
    };
    const b = {
      tvshow: {
        title: 'title',
      },
    };
    expect(meregMetaData(a, b)).toEqual({
      ...a,
      ...b,
    });
  });
  test('has array', () => {
    const a = {
      movie: {
        tags: ['tagA1', 'tagA2'],
      },
    };
    const b = {
      movie: {
        tags: ['tagB1', 'tagB2'],
      },
    };
    expect(meregMetaData(a, b)).toEqual(b);
  });
});
