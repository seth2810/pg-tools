import type { QueryConfig } from 'pg';

import { TextNode } from '../nodes/text.node';
import { BindingNode } from '../nodes/binding.node';

export interface PgQuery extends QueryConfig {
  readonly text: string;
  readonly values: any[];
}

export type QueryNodes = Array<TextNode | BindingNode>;
