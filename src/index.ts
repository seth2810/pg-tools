import type { QueryConfig } from 'pg';

import type { Placeholder } from './types';

export default <V extends any[] = any[]>(
  strings: TemplateStringsArray,
  ...placeholders: Array<Placeholder>
): QueryConfig<V> => {
  const nodes: string[] = [];
  const values: any[] = [...placeholders];

  strings.forEach((string, index) => {
    const nodeIndex = index * 2;
    nodes[nodeIndex] = string;
  });

  placeholders.forEach((_, index) => {
    const bindIndex = index + 1;
    const nodeIndex = index * 2 + 1;
    nodes[nodeIndex] = `$${bindIndex}`;
  });

  const text = nodes.join('');

  if (values.length === 0) {
    return { text };
  }

  return { text, values: values as V };
};
