import pgqtl from '../src';

describe('pgqtl', () => {
  test('should return an equivalent query for literals without placeholders', () => {
    expect(pgqtl`select * from table`).toEqual({
      text: 'select * from table',
    });
  });
});
