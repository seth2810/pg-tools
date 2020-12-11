import { CompositeQuery } from './CompositeQuery';
import { QueryNodes } from './types';

export class InjectableQuery {
  constructor(readonly nodes: QueryNodes) {}

  get freeze(): CompositeQuery {
    return new CompositeQuery(this.nodes);
  }
}
