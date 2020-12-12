# PostgreSQL query tagged templates

This package helps to easily create `pg` compatible [query configuration objects](https://node-postgres.com/features/queries#query-config-object) using a syntax similar to regular `SQL`.

## Install

```bash
npm install --save @pg-tools/sql
```

## Usage

```ts
import { Pool } from 'pg';
import sql from '@pg-tools/sql';

const pool = new Pool();

/**
 * equals to { text: 'select * from users where active = $1', values: [true] }
 */
const users = await pool.query(sql`select * from users where active = ${true}`);
```

## Concept

To achieve composition, optimal performance and memory consumption, library author decided to divide all tagged templates into two types: `Injectable` and `Composite`.

### Injectable

They are best suited for query components (conditions, filters) or general queries (subqueries, with queries).
To allow injection they considered as containers and track all nodes that make up template.
In this regard, due to performance considerations they do not support execution otherwise they would have to build text and query parameters at runtime.
But you can always freeze or create a `Composite` based on such a template, which is essentially the equivalent operations.

### Composite

They represents queries that, in addition to parameters, can also contain injections of other parts or queries of course, only using `Injectable`'s.
They do not track nodes, but use them to immediately build query text and parameters, and therefore do not support injection.
If they encounter `Injectable` as a parameter, they immediately inject it by copying its nodes.
They are returned by the exported library function by default.

## Examples

### Bindings

```ts
import sql from '@pg-tools/sql';

const ids = [1, 2, 3];
const nameLike = 'John';
const activeUsersQuery = sql`select name from users where active = ${true} and id in (${ids}) and name like '%${nameLike}%'`;

// same as

const conditions = [
  sql.inject`active = ${true}`,
  sql.inject`id in (${ids})`,
  sql.inject`name like '%${nameLike}%'`,
];

const activeUsersQuery = sql`select name from users where ${sql.join(
  conditions,
  ' or ',
)}`;
```

### Subquery

```ts
const activeUsersQuery = sql.inject`select * from users where active = ${true}`;
const activeTeenagersQuery = sql`
  select * from (${activeUsersQuery}) as u
  where age <= ${18}
`;

// same as

const teenagersIdsQuery = sql.inject`select id from users where age <= ${18}`;
const activeTeenagersQuery = sql`
  select * from users
  where id in (${teenagersIdsQuery}) and active = ${true}
`;

// same as

const activeTeenagersQuery = sql`
  with (${activeUsersQuery}) as a
  select * from a where age <= ${18}
`;
```

### Joins

```ts
const usersQuery = sql.inject`select * from users`;

const activeParentsChildren = sql.inject`
select children.*
from (${usersQuery}) as parents
left join (${usersQuery}) as children on parents.id = children.parent_id
where parents.active = ${true}
`;
```

#### Insertions

```ts
const users = [
  { id: 1, name: 'john', age: 14 },
  { id: 2, name: 'selena', age: 23 },
];

const insertUsersQuery = sql`
  insert into users
  ${sql.insert(users, 'name', 'age')}
  returning *
`;
```

#### Updates

```ts
const updatedUser = { id: 1, name: 'alan', age: 23 };

const updateUserQuery = sql`
  update users
  ${sql.set(updatedUser, 'name', 'age')}
  where id = ${updatedUser.id}
`;
```

### High order functions

```ts
import { nanoid } from 'nanoid';
import sql from '@pg-tools/sql';
import { QueryResult } from 'pg';

const makeLimitedQuery = (
  query: InjectableQuery,
  limit: number,
  offset: number,
): InjectableQuery => {
  return sql.inject`
    select *
    from (${query}) limitedQuery${nanoid()}
    limit ${limit}
    offset ${offset}
  `;
};

const usersQuery = sql.inject`select * from users order by id desc`;
const limitedUsersQuery = makeLimitedQuery(usersQuery, 10, 10);

const users = pg.query<QueryResult<Users>>(limitedUsersQuery.freeze);
```

#### Filters

```ts
import sql from '@pg-tools/sql';
import { QueryResult } from 'pg';

type UsersFilter = {
  email?: string;
  minAge?: number;
  maxAge?: number;
};

const filterUsers = (filter: UsersFilter): InjectableQuery => {
  const conditions: InjectableQuery[] = [];

  if (filter.email) {
    conditions.push(sql.inject`email like ${filter.email}`);
  }

  if (filter.minAge) {
    conditions.push(sql.inject`age > ${filter.minAge}`);
  }

  if (filter.maxAge) {
    conditions.push(sql.inject`age < ${filter.maxAge}`);
  }

  return sql.inject`select * from users where ${sql.join(conditions, ' and ')}`;
};
```
