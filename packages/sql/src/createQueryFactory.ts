import { TextNode, BindingNode, FunctionalNode } from './nodes';
import { QueryNodes, InjectableQuery } from './queries';
import { Placeholders, QueryFactory } from './types';

const collectQueryNodes = <Params>(
  strings: TemplateStringsArray,
  placeholders: Placeholders<Params>,
): QueryNodes<Params> =>
  strings.flatMap((string, index) => {
    const stringNode = new TextNode(string);

    if (index === strings.length - 1) {
      return stringNode;
    }

    const placeholder = placeholders[index];

    if (placeholder instanceof InjectableQuery) {
      return [stringNode, ...placeholder.nodes];
    }

    if (typeof placeholder === 'function') {
      return [stringNode, new FunctionalNode(placeholder)];
    }

    return [stringNode, new BindingNode(placeholder)];
  });

const removeEmptyTextNodes = <Params>(
  nodes: QueryNodes<Params>,
): QueryNodes<Params> =>
  nodes.filter(
    (node) => node instanceof TextNode === false || node.value !== '',
  );

export const createQueryFactory = <Input, Result>(
  factory: QueryFactory<Input, Result>,
) => (strings: TemplateStringsArray, ...placeholders: Placeholders<Input>) =>
  factory(removeEmptyTextNodes(collectQueryNodes(strings, placeholders)));
