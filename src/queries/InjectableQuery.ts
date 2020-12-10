import { CompositeQuery } from './CompositeQuery';
import { QueryNodes } from './types';

export class InjectableQuery<Input extends any, Output extends any = any> {
  constructor(readonly nodes: QueryNodes<Input>) {}

  get freeze(): CompositeQuery<Input, Output> {
    return new CompositeQuery(this.nodes);
  }
}
