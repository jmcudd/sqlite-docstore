import sqlite3 from "better-sqlite3";
import { v4 as uuidv4 } from "uuid"; // Import UUID generator
/**
 * A JSON-based database abstraction layer mimicking MongoDB's API, powered by SQLite.
 * This library provides a MongoDB-style API to interact with an SQLite database, allowing users
 * to store, query, update, and delete JSON documents inside a single SQLite file or in-memory database.
 *
 * Designed to leverage SQLite's JSON capabilities, this package provides a lightweight, modern solution
 * for applications that require document-based data storage and manipulation without the overhead of a dedicated document database like MongoDB.
 *
 * ## Features:
 * - **Document Storage:** Store and retrieve JSON documents in collections (which are represented as SQLite tables).
 * - **Full Querying Capabilities:** Query documents using equality conditions, `$in` operator, regular expressions, and logical operators.
 * - **Insert/Update/Delete:** Handle CRUD operations for single or multiple documents with structured queries.
 * - **Indexing:** Optimize performance by creating SQLite indexes on specific fields within documents.
 * - **Schema and Constraints:** Utilize SQLite's triggers and constraints to enforce lightweight schema validations.
 * - **Aggregation:** Perform aggregation operations like `$group` and `$match` for summarizing data.
 * - **In-Memory and Persistent Options:** Choose between an in-memory database (ephemeral) or a file-based SQLite database (persistent).
 *
 * ## Core Concepts:
 * - Each "collection" in this API corresponds to a table within the SQLite database, with two key columns:
 *   - `_id`: A unique identifier for the document (primary key).
 *   - `document`: A JSON column that stores the full document structure.
 * - SQLite's robust JSON functions (e.g., `json_extract`, `json_set`) are utilized for querying and updating.
 * - Document `_id`s are automatically generated using UUIDs if not provided.
 *
 * ## SQLiteDocstoreFunctions:
 * Describes the interface for interacting with the SQLite-backed document database.
 *
 * @typedef {Object} SqliteDocstoreFunctions
 * @property {sqlite3.Database} db - The SQLite raw database connection.
 * @property {(collectionName: string) => void} createCollection - Creates a new collection (table) for storing JSON documents.
 * @property {(collectionName: string, field: string, options?: object) => { acknowledged: boolean }} createIndex - Creates an index for efficient querying on a specific JSON field.
 * @property {(collectionName: string, document: object) => { acknowledged: boolean, insertedId: string }} insertOne - Inserts a single document into a collection.
 * @property {(collectionName: string, documents: object[]) => { acknowledged: boolean, insertedCount: number }} insertMany - Inserts multiple documents into a collection in a single transaction.
 * @property {(collectionName: string, query?: object) => object[]} find - Finds all documents matching a query. Returns all documents if no query is provided.
 * @property {(collectionName: string, query?: object) => object | null} findOne - Finds the first document matching a query or `null` if none is found.
 * @property {(collectionName: string, id: string) => object | null} findById - Finds a document based on its `_id` (primary key). Returns `null` if not found.
 * @property {(collectionName: string, query: object) => object[]} findWithIn - Finds documents that match the `$in` operator on the specified fields.
 * @property {(collectionName: string, query: object) => object[]} findWithRegex - Finds documents that match a regular expression condition.
 * @property {(collectionName: string, query: object, update: { $set: object }) => { acknowledged: boolean, modifiedCount: number }} updateOne - Updates the first document that matches a query using a `$set` update operator.
 * @property {(collectionName: string, query: object) => { acknowledged: boolean, deletedCount: number }} deleteOne - Deletes the first document that matches the query. Returns the number of documents deleted.
 * @property {(collectionName: string, query?: object) => number} countDocuments - Counts the number of documents that match the query. If no query is provided, counts all documents in the collection.
 * @property {(collectionName: string, field: string) => any[]} distinct - Returns an array of distinct values for a specific JSON field within a collection.
 * @property {(oldName: string, newName: string) => { acknowledged: boolean }} renameCollection - Renames a collection (table) from `oldName` to `newName`.
 * @property {(collectionName: string) => { acknowledged: boolean }} dropCollection - Drops (deletes) a collection (table) and all its documents.
 * @property {(collectionName: string, pipeline: object[]) => object[]} aggregate - Performs aggregation queries with support for `$match` (filter) and `$group` (grouping and aggregation) stages.
 */

/**
 * Provides a lightweight, MongoDB-like JSON document storage system
 * backed by an SQLite database. All functions mimic MongoDB-style
 * commands, enabling compatibility with existing MongoDB-based code
 * with minimal changes.
 *
 * Additional Notes:
 * - Initialization requires setting up a file-based or in-memory SQLite instance.
 * - The library assumes SQLite 3.9+ for JSON support.
 *
 * @type {{
 *   init: (fileName?: string | null) => SqliteDocstoreFunctions
 * }}
 */
export const sqliteDocstore = {
  /**
   * Initialize the database connection and return an interface similar to MongoDB.
   * If a fileName is provided, it uses a file-based database. Otherwise, it creates an in-memory database.
   *
   * @param {string|null} fileName - SQLite file name. Defaults to an in-memory database when null.
   * @returns {object} - Mongo-style database functions.
   */
  init: (fileName = null) => {
    // Create a new SQLite connection: persistent (file) or in-memory
    const db = sqlite3(fileName || ":memory:");

    // defines REGEXP behavior for SQLite
    db.function("REGEXP", (pattern, value) => {
      try {
        return new RegExp(pattern).test(value) ? 1 : 0;
      } catch (e) {
        return 0; // If invalid regex, always return false
      }
    });

    // Return the Mongo-like interface for database operations
    return {
      db, // Expose the raw SQLite connection for advanced operations if needed

      createCollection: (collectionName) => {
        db.exec(
          `CREATE TABLE IF NOT EXISTS ${collectionName} (
             _id TEXT PRIMARY KEY,
             document JSON
          )`
        );
      },

      createIndex: (collectionName, field, options = {}) => {
        const jsonField = `json_extract(document, '$.${field}')`; // Extract field for indexing
        const unique = options.unique ? "UNIQUE" : ""; // Support unique indexes
        const indexName = `idx_${collectionName}_${field}`;
        db.exec(
          `CREATE ${unique} INDEX IF NOT EXISTS ${indexName} ON ${collectionName} (${jsonField})`
        );
        return { acknowledged: true };
      },

      insertOne: (collectionName, document) => {
        const id = document._id || uuidv4();
        const stmt = db.prepare(
          `INSERT INTO ${collectionName} (_id, document) VALUES (?, ?)`
        );
        stmt.run(id, JSON.stringify({ ...document, _id: id }));
        return { acknowledged: true, insertedId: id };
      },

      insertMany: (collectionName, documents) => {
        const stmt = db.prepare(
          `INSERT INTO ${collectionName} (_id, document) VALUES (?, ?)`
        );
        db.transaction(() => {
          for (const doc of documents) {
            const id = doc._id || uuidv4();
            stmt.run(id, JSON.stringify({ ...doc, _id: id }));
          }
        })();
        return { acknowledged: true, insertedCount: documents.length };
      },

      find: (collectionName, query = {}) => {
        try {
          // Build SQL query conditions for the WHERE clause
          const conditions = Object.entries(query)
            .map(([key]) => `json_extract(document, '$.${key}') = ?`)
            .join(" AND ");

          const params = Object.values(query); // Bind only values, keys are encoded in SQL

          const stmt = db.prepare(`
      SELECT _id, document FROM ${collectionName} 
      ${conditions ? `WHERE ${conditions}` : ""}
    `);

          // Execute the statement and parse results
          const rows = stmt.all(...params);
          return rows.map((row) => ({
            _id: row._id,
            ...JSON.parse(row.document), // Merge JSON document fields and _id
          }));
        } catch (err) {
          // Check for a "no such table" error (SQLite error code for it is usually `SQLITE_ERROR`)
          if (err.message.includes("no such table")) {
            console.error(
              `Collection (table) "${collectionName}" does not exist.`
            );
            return []; // Return an empty array as a fallback, or handle this case differently if needed
          }

          // Re-throw other errors, as they might indicate legitimate issues
          throw err;
        }
      },

      findOne: function (collectionName, query = {}) {
        try {
          const results = this.find(collectionName, query);
          return results.length > 0 ? results[0] : null;
        } catch (err) {
          console.log("error", err);
        }
      },

      findById: (collectionName, id) => {
        const stmt = db.prepare(
          `SELECT _id, document FROM ${collectionName} WHERE _id = ?`
        );
        const row = stmt.get(id);
        return row ? { _id: row._id, ...JSON.parse(row.document) } : null;
      },
      findWithIn: (collectionName, query) => {
        const params = [];
        const conditions = Object.entries(query)
          .map(([key, value]) => {
            if (Array.isArray(value.$in)) {
              const placeholders = value.$in.map(() => "?").join(", ");
              params.push(...value.$in);
              return `json_extract(document, '$.${key}') IN (${placeholders})`;
            }
            throw new Error("Unsupported operator");
          })
          .join(" AND ");

        const stmt = db.prepare(
          `SELECT _id, document FROM ${collectionName} WHERE ${conditions}`
        );

        return stmt.all(...params).map((row) => JSON.parse(row.document));
      },
      findWithRegex: (collectionName, query) => {
        const params = [];
        const conditions = Object.entries(query)
          .map(([key, value]) => {
            if (value.$regex) {
              params.push(value.$regex);
              return `json_extract(document, '$.${key}') REGEXP ?`;
            }
            throw new Error(`Unsupported operator for key "${key}"`);
          })
          .join(" AND ");

        const stmt = db.prepare(
          `SELECT _id, document FROM ${collectionName} WHERE ${conditions}`
        );
        return stmt.all(...params).map((row) => JSON.parse(row.document));
      },

      updateOne: (collectionName, query, update) => {
        if (!update.$set) {
          throw new Error("Only `$set` updates are supported");
        }

        const conditions = Object.entries(query)
          .map(([_]) => `json_extract(document, ?) = ?`)
          .join(" AND ");

        const queryParams = Object.entries(query).flatMap(([field, value]) => [
          `$.${field}`,
          value,
        ]);

        const updateFields = Object.entries(update.$set);
        const setStatements = updateFields
          .map(([field]) => `document = json_set(document, '$.${field}', ?)`)
          .join(", ");

        const updateValues = updateFields.map(([_, value]) => value);

        const stmt = db.prepare(
          `UPDATE ${collectionName} SET ${setStatements} WHERE ${conditions} LIMIT 1`
        );

        const result = stmt.run(...updateValues, ...queryParams);
        return { acknowledged: true, modifiedCount: result.changes };
      },

      deleteOne: (collectionName, query) => {
        const conditions = Object.entries(query)
          .map(([_]) => `json_extract(document, ?) = ?`)
          .join(" AND ");

        const queryParams = Object.entries(query).flatMap(([field, value]) => [
          `$.${field}`,
          value,
        ]);

        const stmt = db.prepare(
          `DELETE FROM ${collectionName} WHERE ${conditions} LIMIT 1`
        );

        const result = stmt.run(...queryParams);
        return { acknowledged: true, deletedCount: result.changes };
      },

      countDocuments: (collectionName, query = {}) => {
        const conditions = Object.entries(query)
          .map(([_]) => `json_extract(document, ?) = ?`)
          .join(" AND ");

        const params = Object.entries(query).flatMap(([field, value]) => [
          `$.${field}`,
          value,
        ]);

        const stmt = db.prepare(
          `SELECT COUNT(*) as count FROM ${collectionName} ${
            conditions ? `WHERE ${conditions}` : ""
          }`
        );

        const row = stmt.get(...params);
        return row.count;
      },

      distinct: (collectionName, field) => {
        const stmt = db.prepare(`
          SELECT DISTINCT json_extract(document, '$.${field}') as value 
          FROM ${collectionName}
        `);
        const rows = stmt.all();
        return rows.map((row) => row.value);
      },

      renameCollection: (oldName, newName) => {
        const stmt = db.prepare(`ALTER TABLE ${oldName} RENAME TO ${newName}`);
        stmt.run();
        return { acknowledged: true };
      },

      dropCollection: (collectionName) => {
        const stmt = db.prepare(`DROP TABLE IF EXISTS ${collectionName}`);
        stmt.run();
        return { acknowledged: true };
      },
      aggregate: (collectionName, pipeline) => {
        let baseQuery = `SELECT document FROM ${collectionName}`;
        let groupClause = ""; // For GROUP BY
        const params = [];
        const outputFields = []; // For fields in the SELECT clause

        pipeline.forEach((stage) => {
          if (stage.$match) {
            // Handle $match logic (already implemented in your original code)
            const comparisonOperators = {
              $eq: "=",
              $gt: ">",
              $gte: ">=",
              $lt: "<",
              $lte: "<=",
              $ne: "!=",
            };

            const conditions = Object.entries(stage.$match)
              .map(([key, value]) => {
                if (typeof value === "object" && value !== null) {
                  // Handle comparison operators: { key: { $gte: value } }
                  const [operator, operand] = Object.entries(value)[0];
                  if (!comparisonOperators[operator]) {
                    throw new Error(
                      `Unsupported comparison operator: ${operator}`
                    );
                  }
                  params.push(operand);
                  return `json_extract(document, '$.${key}') ${comparisonOperators[operator]} ?`;
                } else {
                  // Handle simple equality: { key: value }
                  params.push(value);
                  return `json_extract(document, '$.${key}') = ?`;
                }
              })
              .join(" AND ");

            baseQuery += ` WHERE ${conditions}`;
          }

          if (stage.$group) {
            // Parse the $group stage
            const { _id, ...aggregations } = stage.$group;
            if (!_id) {
              throw new Error(
                "$group stage must include an _id field for grouping."
              );
            }

            // Handle the grouping key (_id)
            const groupKey = `json_extract(document, '$.${_id}') AS groupKey`;
            groupClause = `GROUP BY json_extract(document, '$.${_id}')`;
            outputFields.push(groupKey);

            // Handle aggregations
            Object.entries(aggregations).forEach(([field, operation]) => {
              if (typeof operation === "object" && operation !== null) {
                const [op, jsonField] = Object.entries(operation)[0];
                const validAggregates = {
                  $sum: "SUM",
                  $avg: "AVG",
                  $count: "COUNT",
                  $max: "MAX",
                  $min: "MIN",
                };

                if (!validAggregates[op]) {
                  throw new Error(`Unsupported aggregation operator: ${op}`);
                }

                const sqlOp = validAggregates[op];

                const sqlField =
                  op === "$count"
                    ? "*" // COUNT doesn't need a specific field
                    : `COALESCE(json_extract(document, '$.${jsonField}'), 0)`;

                outputFields.push(`${sqlOp}(${sqlField}) AS ${field}`);
              } else {
                throw new Error(`Invalid aggregation for field ${field}.`);
              }
            });
          }
        });

        // Final SQL query assembly
        const selectClause =
          outputFields.length > 0 ? outputFields.join(", ") : "document";
        const finalQuery = `SELECT ${selectClause} FROM (${baseQuery}) ${groupClause}`;

        // Debugging helpers
        //console.log("Generated Query:", finalQuery);
        //console.log("Query Parameters:", params);

        const stmt = db.prepare(finalQuery);
        return stmt.all(...params);
      },
    };
  },
};
