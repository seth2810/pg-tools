import { QueryConfig } from 'pg';

import { BindingValue, BindingNode, TextNode } from '../nodes';

import { QueryNodes } from './types';

const getQueryValues = (nodes: QueryNodes): Array<BindingValue> =>
  nodes.filter((node) => node instanceof BindingNode).map(({ value }) => value);

const getQueryText = (nodes: QueryNodes): string => {
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

export class CompositeQuery implements QueryConfig {
  readonly text: string;

  readonly values: any[];

  constructor(nodes: QueryNodes) {
    this.text = getQueryText(nodes);
    this.values = getQueryValues(nodes);
  }
}
