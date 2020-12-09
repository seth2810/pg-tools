import { PgQuery, QueryNodes } from './types';
import { getQueryText, getQueryValues } from './utils';

export class AggregateQuery implements PgQuery {
  readonly text: string;

  readonly values: any[];

  constructor(nodes: QueryNodes) {
    this.text = getQueryText(nodes);
    this.values = getQueryValues(nodes);
  }
}
