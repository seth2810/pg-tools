import pgqtl from '../src';
import { TextNode, BindingNode, FunctionalNode } from '../src/nodes';

describe('pgqtl', () => {
  const query = jest.fn().mockReturnValue({});

  beforeEach(() => {
    query.mockClear();
  });

  describe('inject', () => {
    test('should contain empty list of nodes for empty template', () => {
      expect(pgqtl.inject``).toHaveProperty('nodes', []);
    });

    test.each([
      ['null', null],
      ['boolean', true],
      ['string', 'username'],
      ['undefined', undefined],
      ['number', Number.MAX_SAFE_INTEGER],
    ])('should convert placeholder with primitive value into binding node (%s)', (_, value) => {
      expect(pgqtl.inject`${value}`).toHaveProperty('nodes', [
        new BindingNode(value),
      ]);
    });

    test('should convert empty string placehodler into binding node', () => {
      expect(pgqtl.inject`${''}`).toHaveProperty('nodes', [
        new BindingNode(''),
      ]);
    });

    test.each([
      [[1, 2, 3]],
      [['a', 'b', 'c']],
    ])('should convert array type placeholder into binding node (%j)', (values) => {
      expect(pgqtl.inject`${values}`).toHaveProperty('nodes', [
        new BindingNode(values),
      ]);
    });

    test('should convert template strings into text nodes', () => {
      const ids = [1, 2, 3];

      expect(pgqtl.inject`id in (${ids}) and active = ${true}`).toHaveProperty('nodes', [
        new TextNode('id in ('),
        new BindingNode(ids),
        new TextNode(') and active = '),
        new BindingNode(true),
      ]);
    });

    test('should convert function placeholder into functional node', () => {
      const namePlaceholder = ({ name }: { name: string }) => name;

      expect(pgqtl.inject`name = ${namePlaceholder}`).toHaveProperty('nodes', [
        new TextNode('name = '),
        new FunctionalNode(namePlaceholder),
      ]);
    });

    test('should interpolate nested injectable templates nodes', () => {
      const ids = [1, 2, 3];
      const idsCondition = pgqtl.inject`id in (${ids})`;
      const activeCondition = pgqtl.inject`active = ${true}`;

      expect(pgqtl.inject`${idsCondition} and ${activeCondition}`).toHaveProperty('nodes', [
        new TextNode('id in ('),
        new BindingNode(ids),
        new TextNode(')'),
        new TextNode(' and '),
        new TextNode('active = '),
        new BindingNode(true),
      ]);
    });

    test('should allow to freeze injectable template into composite', async () => {
      const activeRecords = pgqtl.inject`select * from table where active = ${true}`;

      await activeRecords.freeze.execute({ query });

      expect(query).toBeCalledWith(
        'select * from table where active = $1',
        [true],
      );
    });
  });

  describe('composite', () => {
    test('should return same query for literals without placeholders', async () => {
      await pgqtl`select * from table`.execute({ query });

      expect(query).toBeCalledWith('select * from table', []);
    });

    test.each([
      ['null', null],
      ['boolean', true],
      ['string', 'username'],
      ['undefined', undefined],
      ['number', Number.MAX_SAFE_INTEGER],
    ])('should bind primitive type placeholder as query parameter (%s)', async (_, value) => {
      await pgqtl`select * from table where field = ${value}`.execute({ query });

      expect(query).toBeCalledWith('select * from table where field = $1', [value]);
    });

    test('should bind empty string placehodler as query parameter', async () => {
      await pgqtl`select * from table where field = ${''}`.execute({ query });

      expect(query).toBeCalledWith('select * from table where field = $1', ['']);
    });

    test.each([
      [[1, 2, 3]],
      [['a', 'b', 'c']],
    ])('should bind array type placeholder without interpolation (%j)', async (values) => {
      await pgqtl`select * from table where field in (${values})`.execute({ query });

      expect(query).toBeCalledWith('select * from table where field in ($1)', [values]);
    });

    test('should bind placeholders using their appearance order', async () => {
      const ids = [1, 2, 3];
      const [nameLike, active] = ['user', true];

      await pgqtl`select * from table where id in (${ids}) and name like '%${nameLike}%' and active = ${active}`.execute({ query });

      expect(query).toBeCalledWith(
        "select * from table where id in ($1) and name like '%$2%' and active = $3",
        [ids, nameLike, active],
      );
    });

    test('should allow to inject subqueries in placeholders', async () => {
      const ids = [1, 2, 3];
      const idsCondition = pgqtl.inject`id in (${ids})`;
      const activeCondition = pgqtl.inject`active = ${true}`;
      const activeRecords = pgqtl.inject`select * from table where ${activeCondition}`;

      await pgqtl`with (${activeRecords}) as t select name from t where ${idsCondition}`
        .execute({ query });

      expect(query).toBeCalledWith(
        'with (select * from table where active = $1) as t select name from t where id in ($2)',
        [true, ids],
      );

      await pgqtl`select name from (${activeRecords}) as t where ${idsCondition}`
        .execute({ query });

      expect(query).toBeCalledWith(
        'select name from (select * from table where active = $1) as t where id in ($2)',
        [true, ids],
      );
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
