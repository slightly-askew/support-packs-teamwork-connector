import { getDayFormat } from './util';
jest.unmock('./util');

describe('util', () => {
  describe('getDayFormat()', () => {
    it('with date parameter', () => {
      const date = new Date('Sat Sep 01 00:00:00 GMT+10:00 2018');
      expect(getDayFormat(date)).toBe('20180831140000');
    });
  });
});
