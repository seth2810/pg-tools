import sql from '../src';
import { TextNode, BindingNode } from '../src/nodes';

describe('sql', () => {
  describe('inject', () => {
    test('should contain empty list of nodes for empty template', () => {
      expect(sql.inject``).toHaveProperty('nodes', []);
    });

    test.each([
      ['null', null],
      ['boolean', true],
      ['string', 'username'],
      ['undefined', undefined],
      ['number', Number.MAX_SAFE_INTEGER],
    ])(
      'should convert placeholder with primitive value into binding node (%s)',
      (_, value) => {
        expect(sql.inject`${value}`).toHaveProperty('nodes', [
          new BindingNode(value),
        ]);
      },
    );

    test('should convert empty string placehodler into binding node', () => {
      expect(sql.inject`${''}`).toHaveProperty('nodes', [new BindingNode('')]);
    });

    test.each([[[1, 2, 3]], [['a', 'b', 'c']]])(
      'should convert array type placeholder into binding node (%j)',
      (values) => {
        expect(sql.inject`${values}`).toHaveProperty('nodes', [
          new BindingNode(values),
        ]);
      },
    );

    test('should convert template strings into text nodes', () => {
      const ids = [1, 2, 3];

      expect(
        sql.inject`id in (${ids}) and active = ${true}`,
      ).toHaveProperty('nodes', [
        new TextNode('id in ('),
        new BindingNode(ids),
        new TextNode(') and active = '),
        new BindingNode(true),
      ]);
    });

    test('should interpolate nested injectable templates nodes', () => {
      const ids = [1, 2, 3];
      const idsCondition = sql.inject`id in (${ids})`;
      const activeCondition = sql.inject`active = ${true}`;

      expect(
        sql.inject`${idsCondition} and ${activeCondition}`,
      ).toHaveProperty('nodes', [
        new TextNode('id in ('),
        new BindingNode(ids),
        new TextNode(')'),
        new TextNode(' and '),
        new TextNode('active = '),
        new BindingNode(true),
      ]);
    });

    test('should allow to freeze injectable template into composite', async () => {
      const activeRecords = sql.inject`select * from table where active = ${true}`;

      expect(activeRecords.freeze).toEqual({
        text: 'select * from table where active = $1',
        values: [true],
      });
    });
  });

  describe('composite', () => {
    test('should return same query for literals without placeholders', () => {
      expect(sql`select * from table`).toEqual({
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
    ])(
      'should bind primitive type placeholder as query parameter (%s)',
      (_, value) => {
        expect(sql`select * from table where field = ${value}`).toEqual({
          text: 'select * from table where field = $1',
          values: [value],
        });
      },
    );

    test('should bind empty string placehodler as query parameter', () => {
      expect(sql`select * from table where field = ${''}`).toEqual({
        text: 'select * from table where field = $1',
        values: [''],
      });
    });

    test.each([[[1, 2, 3]], [['a', 'b', 'c']]])(
      'should bind array type placeholder without interpolation (%j)',
      (items) => {
        expect(sql`select * from table where field in (${items})`).toEqual({
          text: 'select * from table where field in ($1)',
          values: [items],
        });
      },
    );

    test('should bind placeholders using their appearance order', () => {
      const ids = [1, 2, 3];
      const [nameLike, active] = ['user', true];

      expect(
        sql`select * from table where id in (${ids}) and name like '%${nameLike}%' and active = ${active}`,
      ).toEqual({
        text:
          "select * from table where id in ($1) and name like '%$2%' and active = $3",
        values: [ids, nameLike, active],
      });
    });

    test('should allow to inject subqueries in placeholders', async () => {
      const ids = [1, 2, 3];
      const idsCondition = sql.inject`id in (${ids})`;
      const activeCondition = sql.inject`active = ${true}`;
      const activeRecords = sql.inject`select * from table where ${activeCondition}`;

      expect(
        sql`with (${activeRecords}) as t select name from t where ${idsCondition}`,
      ).toEqual({
        text:
          'with (select * from table where active = $1) as t select name from t where id in ($2)',
        values: [true, ids],
      });

      expect(
        sql`select name from (${activeRecords}) as t where ${idsCondition}`,
      ).toEqual({
        text:
          'select name from (select * from table where active = $1) as t where id in ($2)',
        values: [true, ids],
      });
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
