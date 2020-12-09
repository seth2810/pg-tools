# PostgreSQL query tagged templates

This library helps to easily create `pg` compatible [query configuration objects](https://node-postgres.com/features/queries#query-config-object) using a syntax similar to regular `SQL`.

[![Maintainability](https://api.codeclimate.com/v1/badges/e3372971ea4fa29dee04/maintainability)](https://codeclimate.com/github/seth2810/pgqtl/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/e3372971ea4fa29dee04/test_coverage)](https://codeclimate.com/github/seth2810/pgqtl/test_coverage)
[![Node CI](https://github.com/seth2810/pgqtl/workflows/pgqtl/badge.svg)](https://github.com/seth2810/pgqtl/workflows/pgqtl/badge.svg)

## Install

```bash
npm install --save pgqtl
```

## Usage

```js
import pgqtl from "pgqtl";

const condition = pgqtl.inject`active = ${true}`;

const query = pgqtl < Array < User >> `select * from users where ${condition}`;

const { now } = await query.execute(pg);
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

#### Bindings

```js
/**
 * pg client will receive {
 *  text: 'select name from users where active = $1 and id in ($2)',
 *  values: [true, [1,2,3]]
 * }
 */
const activeUsers = await client.query(
  pgqtl`select name from users where active = ${true} and id in (${[1, 2, 3]})`
);
```
