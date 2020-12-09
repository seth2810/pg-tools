import { TextNode } from '../nodes/text.node';
import { BindingNode } from '../nodes/binding.node';

import type { QueryNodes } from './types';

export const getQueryText = (nodes: QueryNodes): string => {
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

export const getQueryValues = (nodes: QueryNodes) => nodes
  .filter((node) => node instanceof BindingNode)
  .map(({ value }) => value);
