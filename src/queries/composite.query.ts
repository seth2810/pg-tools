import { QueryResult, QueryResultRow } from 'pg';

import { TextNode, BindingNode, FunctionalNode } from '../nodes';

export type QueryNodes<P> = Array<TextNode | BindingNode | FunctionalNode<P>>;

type QueryParameter<P> = BindingNode | FunctionalNode<P>;

interface PgClient {
  query: <
    R extends QueryResultRow = any,
    I extends any[] = any[],
  >(sql: string, values?: I) => Promise<QueryResult<R>>
}

const getQueryParameters = (nodes: QueryNodes<any>): Array<QueryParameter<any>> => nodes
  .filter((node) => node instanceof TextNode === false);

const getQueryText = (nodes: QueryNodes<any>): string => {
  let bindIndex = 0;

  const parts: string[] = nodes.map((node) => {
    if (node instanceof TextNode) {
      return node.value;
    }

    bindIndex += 1;

    return `$${bindIndex}`;
  });

  return parts.join('');
};

export class CompositeQuery<Input extends any, Output extends any> {
  private readonly text: string;

  private readonly parameters: Array<QueryParameter<Input>>;

  constructor(nodes: QueryNodes<Input>) {
    this.text = getQueryText(nodes);
    this.parameters = getQueryParameters(nodes);
  }

  async execute(client: PgClient, data: Input): Promise<Output[]> {
    const values = this.parameters.map((parameter) => {
      if (parameter instanceof FunctionalNode) {
        return parameter.value(data);
      }

      return parameter.value;
    });

    const { rows } = await client.query(this.text, values);

    return rows;
  }
}
