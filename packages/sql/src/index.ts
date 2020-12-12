import { CompositeQuery, InjectableQuery, QueryNodes } from './queries';
import { createQueryFactory } from './createQueryFactory';
import { BindingValue, Primitive, TextNode } from './nodes';
import { SqlInstance } from './types';

const sql = createQueryFactory(
  (nodes: QueryNodes) => new CompositeQuery(nodes),
);

const inject = createQueryFactory(
  (nodes: QueryNodes) => new InjectableQuery(nodes),
);

const raw = (value: Primitive) =>
  new InjectableQuery([new TextNode(String(value))]);

const join = (queries: ReadonlyArray<InjectableQuery>, delimiter: string) => {
  const { nodes: delimiterNodes } = raw(delimiter);
  const nodes = queries.map((query) => query.nodes);
  const unitedNodes = nodes.reduce((a, b) => [...a, ...delimiterNodes, ...b]);

  return new InjectableQuery(unitedNodes);
};

const insert = <Patch extends Record<string, BindingValue>>(
  records: ReadonlyArray<Patch>,
  ...keys: ReadonlyArray<keyof Patch>
): InjectableQuery => {
  const keysQuery = inject`${raw(keys.map((key) => `"${key}"`).join(','))}`;
  const bindingQueries = records.map((record) =>
    join(
      keys.map((key) => inject`${record[key]}`),
      ', ',
    ),
  );

  return inject`(${keysQuery}) values (${join(bindingQueries, '), (')})`;
};

const set = <Patch extends Record<string, BindingValue>>(
  patch: Patch,
  ...keys: ReadonlyArray<keyof Patch>
): InjectableQuery => {
  const keysQuery = inject`${raw(keys.map((key) => `"${key}"`).join(','))}`;
  const bindingQuery = join(
    keys.map((key) => inject`${patch[key]}`),
    ', ',
  );

  return inject`set (${keysQuery}) = row(${bindingQuery})`;
};

const instance: SqlInstance = Object.assign(sql, {
  raw,
  set,
  join,
  insert,
  inject,
});

export default instance;
