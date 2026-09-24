import { parsePageRequest } from '../src/pagination';

describe('parsePageRequest', () => {
  it('defaults to the first page of 25', () => {
    expect(parsePageRequest({})).toEqual({ page: 1, pageSize: 25 });
  });

  it('parses numeric strings from the query string', () => {
    expect(parsePageRequest({ page: '3', pageSize: '50' })).toEqual({ page: 3, pageSize: 50 });
  });

  it.each([['0'], ['-1'], ['abc'], ['1.5']])('rejects page=%s', (page) => {
    expect(() => parsePageRequest({ page })).toThrow('Validation failed');
  });

  it('caps page size so a client cannot request all 10k rows at once', () => {
    expect(() => parsePageRequest({ pageSize: '101' })).toThrow('Validation failed');
  });
});
