# PostgreSQL transactions

This package helps to easily create `pg` [transactions](https://node-postgres.com/features/transactions) and execute a set of queries within a transaction.

## Install

```bash
npm install --save @pg-tools/trx
```

## Usage

### withTransaction

#### Signrature

```ts
withTransaction<Result, Client extends pg.ClientBase>(
  client: Client,
  queries: (Client) => PromiseLike<Result>,
  options?: TransactionOptions
): Promise<Result>
```

Execute a set of queries within a transaction.

Start a transaction and execute a set of queries within it.
If the function does not throw an error, the transaction is committed.

If the function throws a non-retryable error, the transaction is rolled back and the error is rethrown.

If the function throws a retryable error, the transaction is rolled back and retried up to 2 or `maxRetries` times.
By default, PostgreSQL errors codes `40001` (serialization failure) and `40P01` (deadlock detected) are considered to be retryable,
but you may customize the behavior by supplying a custom `shouldRetry` predicate.

You may also configure the [access mode](https://www.postgresql.org/docs/current/sql-set-transaction.html) and [isolation level](https://www.postgresql.org/docs/current/transaction-iso.html) of the transaction by supplying the `accessMode` and `isolationLevel` options respectively.

```typescript
import { Pool } from 'pg';
import sql from '@pg-tools/sql';
import { withTransaction } from '@pg-tools/trx';

const pool = new Pool();
const client = await pool.connect();

const insertedUsers = await withTransaction(client, async (tx) => {
  await tx.query(sql`insert into users (name) values ('john')`);
  await tx.query(sql`insert into users (name) values ('mary')`);
  await tx.query(sql`insert into users (name) values ('alice')`);

  return await tx.query(sql`select * from users`);
});
```

### withSavepoint

#### Signrature

```ts
withSavepoint<Result, Client extends pg.ClientBase>(
  client: Client,
  queries: (Client) => PromiseLike<Result>
): Promise<Result>
```

Execute a set of queries within a [savepoint](https://www.postgresql.org/docs/current/sql-savepoint.html).

Start a savepoint and execute a set of queries within it. If the function does not throw an error, the savepoint is released.

If the function throws any kind of error, the savepoint is rolled back and the error is rethrown.

May only be used within a transaction.

```ts
import { Pool } from 'pg';
import sql from '@pg-tools/sql';
import { withTransaction, withSavepoint } from '@pg-tools/trx';

const pool = new Pool();
const client = await pool.connect();

await withTransaction(client, async (tx) => {
  await tx.query(sql`insert into users (name) values ('john')`);

  try {
    await withSavepoint(tx, async (tx) => {
      await tx.query(sql`insert into users (name) values ('mary')`);
      await tx.query(sql`insert into users (name) values ('alice')`);
    });
  } catch (err) {
    // Let the first insert to through if the second or third one fails.
  }
});
```
