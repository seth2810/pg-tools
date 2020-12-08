# PostgreSQL query template tagged literals

This helper generates a `pg` QueryConfig object for the given query.

[![Maintainability](https://api.codeclimate.com/v1/badges/e3372971ea4fa29dee04/maintainability)](https://codeclimate.com/github/seth2810/pgqtl/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/e3372971ea4fa29dee04/test_coverage)](https://codeclimate.com/github/seth2810/pgqtl/test_coverage)
[![Node CI](https://github.com/seth2810/pgqtl/workflows/pgqtl/badge.svg)](https://github.com/seth2810/pgqtl/workflows/pgqtl/badge.svg)

### Install

```bash
npm install --save pgqtl
```

### Usage

#### Basic

```js
import pgqtl from "pgqtl";
import { Client } from "pg";

const client = new Client();

await client.connect();

/**
 * pg client will receive { text: 'select now()' }
 */
const now = await client.query(pgqtl`select now()`);

await client.end();
```

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
