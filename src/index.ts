import type { QueryConfig } from 'pg';

export default <V extends any[] = any[]>(strings: TemplateStringsArray): QueryConfig<V> => {
  const [text] = strings;

  return { text };
};
