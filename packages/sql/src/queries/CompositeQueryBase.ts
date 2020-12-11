import { TextNode, FunctionalNode } from '../nodes';

import { QueryNodes, QueryParameter, PgClient } from './types';

const getQueryParameters = (
  nodes: QueryNodes<any>,
): Array<QueryParameter<any>> =>
  nodes.filter((node) => node instanceof TextNode === false);

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

export class CompositeQueryBase<Input, Output> {
  protected readonly text: string;

  protected parameters: ReadonlyArray<QueryParameter<Input>>;

  constructor(nodes: QueryNodes<Input>) {
    this.text = getQueryText(nodes);
    this.parameters = getQueryParameters(nodes);
  }

  protected async sendQuery(client: PgClient, data: Input): Promise<Output[]> {
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
