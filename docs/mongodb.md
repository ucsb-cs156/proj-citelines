# Configuring for MongoDB

Citelines uses MongoDB in addition to PostgreSQL: PostgreSQL holds relational
data (users, projects, etc.), while MongoDB holds BibTeX bibliography entries
(the `bibtex_entries` collection, backed by the `BibTexEntry` document type,
indexed by `projectId`).

On localhost, and for unit/integration/end-to-end tests, you do not need to do
any special configuration for MongoDB; the app uses an embedded, in-memory
instance of MongoDB, similar to how H2 is used as an in-memory instance of a
SQL database.

## Configuring MongoDB on Dokku

On dokku, you set up the MongoDB database in a similar way to how the Postgres
database is set up, with these commands.

Note that `appname` should be replaced with the name of your app, e.g.
`citelines`, `citelines-qa`, `citelines-dev-cgaucho`, etc.

Append `-m-db` to distinguish this from the app itself.

```
dokku mongo:create appname-m-db
dokku mongo:link appname-m-db appname --no-restart
```

For example, for a `citelines-dev-cgaucho` app, you'd use:

```
dokku mongo:create citelines-dev-cgaucho-m-db
dokku mongo:link citelines-dev-cgaucho-m-db citelines-dev-cgaucho --no-restart
```

The `dokku mongo:link` command sets the `MONGO_URL` config var on the app,
which is read by `spring.data.mongodb.uri` in
`application-production.properties`.

## Accessing the Mongo Command on Dokku

If you want to list records in the mongo collections, you can access a mongo
command line on dokku with the following command (substitute the name of your
mongo db database in place of `citelines-m-db`):

```
dokku mongo:connect citelines-m-db
```

That gives you something like the following:

```
pconrad@dokku-00:~$ dokku mongo:connect citelines-m-db
Current Mongosh Log ID:	69768804b279b310cf0bbacc
Connecting to:		mongodb://<credentials>@127.0.0.1:27017/citelines_m_db?directConnection=true&serverSelectionTimeoutMS=2000&authSource=citelines_m_db&appName=mongosh+1.10.1
Using MongoDB:		6.0.7
Using Mongosh:		1.10.1

For mongosh info see: https://docs.mongodb.com/mongodb-shell/

citelines_m>
```

Some useful commands:

| Command                                     | Explanation                                            |
| -------------------------------------------- | ------------------------------------------------------ |
| `show collections`                          | Show the names of all of the collections in the database |
| `db.bibtex_entries.find().limit(5)`         | Show the first 5 documents in the `bibtex_entries` collection |
| `db.bibtex_entries.find({projectId: 1})`    | Show all BibTeX entries for project id `1`             |
