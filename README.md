# SQLite Docstore

A lightweight, MongoDB-like JSON document storage system powered by SQLite, designed for developers who need efficient document-based storage without the overhead of a dedicated NoSQL database like MongoDB. This library combines the simplicity of SQLite with robust JSON querying capabilities to provide a modern, performant, and flexible document store solution.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/node/v/sqlite-docstore.svg)](https://nodejs.org)
[![GitHub Issues](https://img.shields.io/github/issues/jmcudd/sqlite-docstore)](https://github.com/jmcudd/sqlite-docstore/issues)
[![NPM Version](https://img.shields.io/npm/v/sqlite-docstore.svg)](https://www.npmjs.com/package/sqlite-docstore)

## Features

- **Document Storage**: Store and retrieve JSON documents in collections (SQLite tables).  
- **Rich Query Capabilities**: Support for equality checks, `$in`, `$regex`, and logical operators.  
- **MongoDB-Like API**: Familiar CRUD functions – `insertOne`, `find`, `updateOne`, and more!  
- **Advanced Queries**: Count, distinct values, and `$match/$group` aggregations for advanced use cases.  
- **In-Memory and File-Based DBs**: Choice between ephemeral or persistent SQLite databases.  
- **Lightweight**: Leverages the SQLite engine; no separate server or complex setup needed.  
- **Extensible**: Access raw SQLite functions for full flexibility.  

---

## Why Choose SQLite Docstore?

Sometimes, running a full-fledged MongoDB server is unnecessary, especially for smaller projects, edge deployments, or environments constrained by resources. SQLite Docstore gives you the simplicity of SQLite while letting you work with JSON documents in a MongoDB-like way.

With SQLite Docstore, you:
- Can get started right away without provisioning any external services.
- Have access to persistent, robust, and performant data storage through SQLite.
- Can take advantage of SQLite's native JSON functions to query and manipulate records.

---

## Installation

To install via **npm**:

```bash
npm install sqlite-docstore
```

To install via **yarn**:

```bash
yarn add sqlite-docstore
```

The library requires **Node.js v22 or higher**.

---

## Getting Started

Here's a quick example to help you get started:

```javascript
import { sqliteDocstore } from "sqlite-docstore";

const db = sqliteDocstore.init(); // In-memory DB
const collectionName = "users";

// Create a collection
db.createCollection(collectionName);

// Insert a document
const result = db.insertOne(collectionName, { name: "Alice", age: 30 });
console.log("Inserted Document ID:", result.insertedId);

// Query documents
const users = db.find(collectionName, { name: "Alice" });
console.log("Found Users:", users);

// Count documents in a collection
const count = db.countDocuments(collectionName);
console.log("Total Users:", count);

// Drop the collection
db.dropCollection(collectionName);
```

---

## Core API

### Initialization

```javascript
sqliteDocstore.init(fileName?: string | null): SqliteDocstoreFunctions
```

- **`fileName`**: Path to the SQLite file for persistent data. When `null`, creates an in-memory database (all data is lost when the process exits).

Returns: An object containing MongoDB-like methods to interact with your database.

---

### CRUD Operations

#### `createCollection(collectionName: string)`

Creates a new collection. Each collection corresponds to an SQLite table.

#### `insertOne(collectionName: string, document: object)`

Inserts a single document into a specified collection.

**Returns**:
```javascript
{ acknowledged: boolean, insertedId: string }
```

---

#### `insertMany(collectionName: string, documents: object[])`

Inserts multiple documents in a single transaction.

**Returns**:
```javascript
{ acknowledged: boolean, insertedCount: number }
```

---

#### `find(collectionName: string, query?: object)`

Finds all documents matching a query. If no query is provided, all documents are returned.

**Example**:

```javascript
db.find("users", { name: "Alice" });
```

---

#### `findOne(collectionName: string, query?: object)`

Finds the first document matching a query.

---

#### `findById(collectionName: string, id: string)`

Finds a document by its unique `_id`.

---

#### `updateOne(collectionName: string, query: object, update: {$set: object})`

Updates a single document that matches the query using the `$set` operator.

**Returns**:
```javascript
{ acknowledged: boolean, modifiedCount: number }
```

---

#### `deleteOne(collectionName: string, query: object)`

Deletes the first document that matches the query.

**Returns**:
```javascript
{ acknowledged: boolean, deletedCount: number }
```

---

#### `countDocuments(collectionName: string, query?: object)`

Counts the number of documents matching a query. Counts all documents if no query is provided.

---

### Advanced Operations

#### `findWithIn(collectionName: string, query: object)`

Finds documents that match an `$in` condition.

**Example**:

```javascript
db.findWithIn("users", { name: { $in: ["Alice", "Bob"] } });
```

---

#### `findWithRegex(collectionName: string, query: object)`

Finds documents that match a `$regex` condition.

**Example**:

```javascript
db.findWithRegex("users", { name: { $regex: "^A" } });
```

---

#### `aggregate(collectionName: string, pipeline: object[])`

Performs advanced queries using a combination of `$match` (filtering) and `$group` (aggregation).

**Example**:
```javascript
const pipeline = [
  { $match: { age: { $gt: 25 } } },
  {
    $group: {
      _id: "country",
      totalAge: { $sum: "age" },
      count: { $count: 1 },
    },
  },
];

const results = db.aggregate("users", pipeline);
```

---

#### `distinct(collectionName: string, field: string)`

Returns all distinct values for a specific field.

**Example**:
```javascript
db.distinct("users", "age");
```

---

#### `renameCollection(oldName: string, newName: string)`

Renames an existing collection.

---

#### `dropCollection(collectionName: string)`

Drops (deletes) a collection and all associated documents.

---

## Running Tests

The library uses [Mocha](https://mochajs.org/) for testing. To run the tests:

```bash
npm test
```

To run tests in watch mode as you edit the code:

```bash
npm run test-watch
```

---

## Contributing

Contributions, issues, and feature requests are welcome! Please check the [issues page](https://github.com/jmcudd/sqlite-docstore/issues) before opening new requests.

If you'd like to contribute:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature-name`).
3. Commit your changes (`git commit -m 'Add feature'`).
4. Push to your fork (`git push origin feature-name`).
5. Open a Pull Request.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Author

Developed and maintained by jmcudd. Feel free to reach out for support or collaboration!

GitHub: [@jmcudd](https://github.com/jmcudd)  
X: [@jmcudd](https://x.com/jmcudd)

---

## Links

- **NPM**: [sqlite-docstore](https://www.npmjs.com/package/sqlite-docstore)
- **Repository**: [GitHub Repo](https://github.com/jmcudd/sqlite-docstore)
- **Issues**: [Report Issues](https://github.com/jmcudd/sqlite-docstore/issues)
