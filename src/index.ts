import { BindingValue } from './nodes/binding.node';
import { FunctionalValue } from './nodes/functional.node';
import { TextNode, BindingNode, FunctionalNode } from './nodes';

import { InjectableQuery } from './queries/injectable.query';
import { CompositeQuery, QueryNodes } from './queries/composite.query';

type Placeholders<P> = Array<BindingValue | FunctionalValue<P> | InjectableQuery<P>>;

const collectQueryNodes = <P>(
  strings: TemplateStringsArray,
  placeholders: Placeholders<P>,
): QueryNodes<P> => strings.flatMap((string, index) => {
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

const removeEmptyTextNodes = (nodes: QueryNodes<any>): QueryNodes<any> => nodes
  .filter((node) => node instanceof TextNode === false || node.value !== '');

const pgqtl = <Output extends any = void, Input extends any = void>(
  strings: TemplateStringsArray,
  ...placeholders: Placeholders<Input>
): CompositeQuery<Input, Output> => new CompositeQuery(
    removeEmptyTextNodes(collectQueryNodes(strings, placeholders)),
  );

const inject = <Input extends any = void>(
  strings: TemplateStringsArray,
  ...placeholders: Placeholders<Input>
): InjectableQuery<Input> => new InjectableQuery(
    removeEmptyTextNodes(collectQueryNodes(strings, placeholders)),
  );

export default Object.assign(pgqtl, { inject });
