# sqlite-docstore

🚀 **sqlite-docstore** is a lightweight JSON document store built on top of SQLite, offering **MongoDB-like APIs** for interacting with document-style data, without the overhead of running a NoSQL database server.

Use it to store and query JSON documents in SQLite with rich MongoDB-like features: `$set`, `$in`, `$regex`, aggregation pipelines, indexed queries, and more.

---

## ✨ Features
- Store **JSON documents** using the power of SQLite.
- MongoDB-like API: `find`, `insert`, `update`, `delete`, all translated into fast SQL queries.
- Perform advanced JSON queries using SQLite's native JSON functions.
- Support for **schema validation**, **array fields**, and **Mongo-style indexes**.
- **Lightweight and embedded**: No need for new infrastructure, just SQLite.
- Great for **small-to-medium applications**, **serverless apps**, or **local-first tools**.

---

## 📦 Installation

Install `sqlite-docstore` via npm:

```bash
npm install sqlite-docstore
```

Ensure SQLite is installed on your system; this is required by `better-sqlite3`, a high-performance SQLite driver.

```bash
# macOS/Linux
brew install sqlite3

# Ubuntu/Debian
sudo apt install sqlite3
```

---

## 🚀 Getting Started

Here’s an example of how to get started with `sqlite-docstore`:

```javascript
import docstore from 'sqlite-docstore';

// Initialize SQLite as the backend (':memory:' or use a file for persistence)
const db = docstore.init(':memory:');

// Create a collection
db.createCollection('users');

// Insert documents
db.insertOne('users', { name: 'Alice', age: 25 });
db.insertOne('users', { name: 'Bob', age: 30, hobbies: ['coffee', 'golf'] });

// Query documents
const users = db.find('users', { age: 30 });
console.log(users); // [{ _id: '...', name: 'Bob', age: 30, hobbies: ['coffee', 'golf'] }]

// Update documents
db.updateOne('users', { name: 'Alice' }, { $set: { age: 26 } });

// Delete documents
db.deleteOne('users', { name: 'Bob' });

// Count documents
const total = db.countDocuments('users');
console.log(`Total docs: ${total}`);
```

---

## 🛠 API Overview

### Initialization
- `docstore.init(fileName: string|string|null): Database`
  - `fileName`: Path to the SQLite database file or `:memory:` for in-memory storage.
  
  Example:
  ```javascript
  const db = docstore.init('data.db'); 
  ```

### Collections
- `db.createCollection(name: string)`: Creates a collection (SQLite table) if it doesn’t exist.
- `db.dropCollection(name: string)`: Drops a collection.

### Document Operations
- `db.insertOne(collection, document)`: Inserts a single document.
- `db.insertMany(collection, documents)`: Inserts many documents.
- `db.find(collection, query)`: Queries for documents using a MongoDB-style `{ field: value }` syntax.
- `db.updateOne(collection, query, update)`: Updates a document using `$set`, `$inc`, etc.
- (Add full descriptions for all your methods... Maybe an expandable section or link to docs.)

---

## Why Choose `sqlite-docstore`?

`sqlite-docstore` provides the perfect mix of SQL and NoSQL:
- **Runs Anywhere**: SQLite works in server apps, CLI tools, or embedded systems.
- **No Daemon/Server**: No MongoDB, no Postgres; just a library.
- **Mongo-Like Power**: Familiar Mongo-like APIs make it easy to work with documents.
- Make JSON + SQL workflow a breeze.

If you're using SQLite already, or deploying resource-constrained systems (single-file databases, CLIs, lightweight Foxit-based APIs), `sqlite-docstore` is your best bet.

---

## 🧑‍💻 Contributing

We welcome contributions! Feel free to:
- Submit bug reports and feature requests on [GitHub Issues](https://github.com/jmcudd/sqlite-docstore/issues).
- Open pull requests to improve functionality or fix issues.
- Improve documentation or examples.

---

## ❤️ Community & Support

Need help or have feedback? Join our community:
- Issues Tracker: [GitHub Issues](https://github.com/jmcudd/sqlite-docstore/issues)
- Discussions: [Community Discussions](https://github.com/jmcudd/sqlite-docstore/discussions)

---

## 📄 License

This project is licensed under the MIT License. Pull requests welcome—enjoy it 🚀!
