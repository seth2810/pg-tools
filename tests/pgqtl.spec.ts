import pgqtl from '../src';

describe('pgqtl', () => {
  test('should return same query for literals without placeholders', () => {
    expect(pgqtl`select * from table`).toEqual({
      text: 'select * from table',
      values: [],
    });
  });

  test.each([
    ['null', null],
    ['boolean', true],
    ['string', 'username'],
    ['undefined', undefined],
    ['number', Number.MAX_SAFE_INTEGER],
  ])('should bind primitive type placeholder as query parameter (%s)', (_, value) => {
    expect(pgqtl`select * from table where field = ${value}`).toEqual({
      text: 'select * from table where field = $1',
      values: [value],
    });
  });

  test('should bind array type placeholder without interpolation', () => {
    const ids = [1, 2, 3];

    expect(pgqtl`select * from table where active = ${true} and id in (${ids})`)
      .toEqual({
        text: 'select * from table where active = $1 and id in ($2)',
        values: [true, ids],
      });
  });

  test('should bind placeholders using their appearance order', () => {
    const ids = [1, 2, 3];
    const [nameLike, active] = ['user', true];

    expect(pgqtl`select * from table where id in (${ids}) and name like '%${nameLike}%' and active = ${active}`)
      .toEqual({
        text: "select * from table where id in ($1) and name like '%$2%' and active = $3",
        values: [ids, nameLike, active],
      });
  });

  test('should allow to inject subqueries in placeholders', () => {
    const ids = [1, 2, 3];
    const idsCondition = pgqtl.inject`id in (${ids})`;
    const activeCondition = pgqtl.inject`active = ${true}`;
    const activeRecords = pgqtl.inject`select * from table where ${activeCondition}`;

    expect(activeRecords).toMatchObject({
      text: 'select * from table where active = $1',
      values: [true],
    });

    expect(pgqtl`with (${activeRecords}) as a select name from a where ${idsCondition}`)
      .toEqual({
        text: 'with (select * from table where active = $1) as a select name from a where id in ($2)',
        values: [true, ids],
      });

    expect(pgqtl`select name from (${activeRecords}) as a where ${idsCondition}`).toEqual({
      text: 'select name from (select * from table where active = $1) as a where id in ($2)',
      values: [true, ids],
    });
  });
});

// Разобрать частые кейсы использования:
// выборка с условием where,
// like (с использованием %),
// in,
// подзапрос,
// with,
// join,
// композиция sql добавлением фильтров (на страничке есть фильтр по условию and по множеству полей),
// вставка объекта.
