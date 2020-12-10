import { Primitive, TextNode } from './nodes';
import { InjectableQuery, QueryNodes } from './queries';
import { createQueryFactory } from './createQueryFactory';

export const inject = createQueryFactory(
  <Input extends any, Output extends any>(
    nodes: QueryNodes<Input>,
  ) => new InjectableQuery<Input, Output>(nodes),
);

export const raw = (value: Primitive) => new InjectableQuery([
  new TextNode(String(value)),
]);

export const join = (queries: ReadonlyArray<InjectableQuery<any, any>>, separator: string) => {
  const separatorNode = new TextNode(` ${separator} `);
  const nodes = queries.map((query) => query.nodes);
  const unitedNodes = nodes.reduce(
    (a, b) => [...a, separatorNode, ...b],
  );

  return new InjectableQuery(unitedNodes);
};
