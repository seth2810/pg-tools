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

  describe('helpers', () => {
    describe('raw', () => {
      test.each([
        ['boolean', true],
        ['string', 'username'],
        ['number', Number.MAX_SAFE_INTEGER],
      ])(
        'should convert primitive value into injectable query with single text node (%j)',
        (_, value) => {
          expect(sql.raw(value)).toHaveProperty('nodes', [
            new TextNode(String(value)),
          ]);
        },
      );
    });

    describe('join', () => {
      test('should join conditions with passed delimiter', () => {
        const ids = [1, 2, 3];
        const [nameLike, active] = ['user', true];
        const conditions = [
          sql.inject`active = ${active}`,
          sql.inject`id in (${ids})`,
          sql.inject`name like '%${nameLike}%'`,
        ];

        expect(sql.join(conditions, ' and ').freeze).toEqual({
          text: "active = $1 and id in ($2) and name like '%$3%'",
          values: [active, ids, nameLike],
        });
      });
    });

    describe('set', () => {
      test('should make insert expression using passed keys from records', () => {
        const users = [
          { id: 1, name: 'john', age: 14 },
          { id: 2, name: 'selena', age: 23 },
        ];

        expect(sql.insert(users, 'name', 'age').freeze).toEqual({
          text: '("name","age") values ($1, $2), ($3, $4)',
          values: ['john', 14, 'selena', 23],
        });
      });
    });

    describe('update', () => {
      test('should make set expression using passed keys from record', () => {
        const updatedUser = { id: 1, name: 'alan', age: 23 };

        expect(sql.set(updatedUser, 'name', 'age').freeze).toEqual({
          text: 'set ("name","age") = row($1, $2)',
          values: ['alan', 23],
        });
      });
    });
  });
});
