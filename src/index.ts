import { TextNode } from './nodes/text.node';
import { BindingNode } from './nodes/binding.node';

import type { QueryNodes } from './queries/types';
import { AggregateQuery } from './queries/aggregate.query';
import { InjectableQuery } from './queries/injectable.query';

import type { Placeholders } from './types';

const collectQueryNodes = (
  strings: TemplateStringsArray,
  placeholders: Placeholders,
): QueryNodes => strings.flatMap((string, index) => {
  const stringNode = new TextNode(string);

  if (index === strings.length - 1) {
    return stringNode;
  }

  const placeholder = placeholders[index];

  if (placeholder instanceof InjectableQuery) {
    return [stringNode, ...placeholder.nodes];
  }

  return [stringNode, new BindingNode(placeholder)];
});

const pgqtl = (
  strings: TemplateStringsArray,
  ...placeholders: Placeholders
): AggregateQuery => new AggregateQuery(collectQueryNodes(strings, placeholders));

const inject = (
  strings: TemplateStringsArray,
  ...placeholders: Placeholders
): InjectableQuery => new InjectableQuery(collectQueryNodes(strings, placeholders));

// eslint-disable-next-line
export default Object.assign(pgqtl, { inject });
