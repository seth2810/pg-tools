import { CompositeQuery, InjectableQuery, QueryNodes } from './queries';
import { createQueryFactory } from './createQueryFactory';
import { Primitive, TextNode } from './nodes';
import { SqlInstance } from './types';

const sql = createQueryFactory(
  (nodes: QueryNodes) => new CompositeQuery(nodes),
);

const inject = createQueryFactory(
  (nodes: QueryNodes) => new InjectableQuery(nodes),
);

const raw = (value: Primitive) =>
  new InjectableQuery([new TextNode(String(value))]);

const join = (queries: ReadonlyArray<InjectableQuery>, separator: string) => {
  const separatorNode = new TextNode(` ${separator} `);
  const nodes = queries.map((query) => query.nodes);
  const unitedNodes = nodes.reduce((a, b) => [...a, separatorNode, ...b]);

  return new InjectableQuery(unitedNodes);
};

const instance: SqlInstance = Object.assign(sql, { inject, raw, join });

export default instance;
