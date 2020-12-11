import { TextNode, BindingNode } from './nodes';
import { QueryNodes, InjectableQuery } from './queries';
import { Placeholders, QueryFactory } from './types';

const collectQueryNodes = (
  strings: TemplateStringsArray,
  placeholders: Placeholders,
): QueryNodes =>
  strings.flatMap((string, index) => {
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

const removeEmptyTextNodes = (nodes: QueryNodes): QueryNodes =>
  nodes.filter((node) => node instanceof BindingNode || node.value !== '');

export const createQueryFactory = <Result>(factory: QueryFactory<Result>) => (
  strings: TemplateStringsArray,
  ...placeholders: Placeholders
) => factory(removeEmptyTextNodes(collectQueryNodes(strings, placeholders)));
