import { CompositeQueryBase } from './CompositeQueryBase';

import { QueryNodes, PgClient } from './types';

export class CompositeQueryWithClient<Input, Output> extends CompositeQueryBase<
  Input,
  Output
> {
  constructor(nodes: QueryNodes<Input>, private readonly client: PgClient) {
    super(nodes);
  }

  async execute(data: Input) {
    return this.sendQuery(this.client, data);
  }
}
