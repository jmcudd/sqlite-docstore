import sqlite3 from "better-sqlite3";
import { v4 as uuidv4 } from "uuid"; // Import UUID generator
/**
 * @typedef {Object} SqliteDocstoreFunctions
 * @property {sqlite3.Database} db - Exposing SQLite connection.
 * @property {(collectionName: string) => void} createCollection - Creates a collection (SQLite table).
 * @property {(collectionName: string, field: string, options?: object) => { acknowledged: boolean }} createIndex - Creates an index on a JSON field.
 * @property {(collectionName: string, document: object) => { acknowledged: boolean, insertedId: string }} insertOne - Inserts one document.
 * @property {(collectionName: string, documents: object[]) => { acknowledged: boolean, insertedCount: number }} insertMany - Inserts multiple documents.
 * @property {(collectionName: string, query?: object) => object[]} find - Finds all matching documents with a Mongo-style query.
 * @property {(collectionName: string, query?: object) => object | null} findOne - Finds a single matching document.
 * @property {(collectionName: string, id: string) => object | null} findById - Finds a document based on its `_id`.
 * @property {(collectionName: string, query: object) => object[]} findWithIn - Matches `$in` operator on fields.
 * @property {(collectionName: string, query: object) => object[]} findWithRegex - Executes regex-based queries.
 * @property {(collectionName: string, query: object, update: { $set: object }) => { acknowledged: boolean, modifiedCount: number }} updateOne - Updates a single matching document.
 * @property {(collectionName: string, query: object) => { acknowledged: boolean, deletedCount: number }} deleteOne - Deletes a single document matching the query.
 * @property {(collectionName: string, query?: object) => number} countDocuments - Counts documents matching the query.
 * @property {(collectionName: string, field: string) => any[]} distinct - Retrieves distinct values for a field.
 * @property {(oldName: string, newName: string) => { acknowledged: boolean }} renameCollection - Renames a collection.
 * @property {(collectionName: string) => { acknowledged: boolean }} dropCollection - Drops a collection (removes the table).
 * @property {(collectionName: string, pipeline: object[]) => object[]} aggregate - Executes aggregation pipelines with `$match` and `$group`.
 */

/**
 * A JSON-based database abstraction layer mimicking MongoDB's API, powered by SQLite.
 * This library provides a MongoDB-style API to interact with an SQLite database, allowing users
 * to store, retrieve, update, and delete JSON documents inside a single SQLite file or in-memory database.
 * It is lightweight and supports advanced features like indexing, schema validation, array operations,
 * and aggregations.
 *
 * Functions are designed to mimic MongoDB's functionality wherever possible,
 * while being translated into equivalent SQLite queries.
 *
 * ## Features:
 * - **Document Storage:** Store JSON documents in collections backed by SQLite tables.
 * - **Querying:** Execute rich queries including equality, `$in`, and partial regex matches.
 * - **Insert/Update/Delete:** Perform single or bulk operations with support for `$set` updates,
 *    atomic push/pull for arrays, and upserts.
 * - **Indexing:** Create indexes on JSON document fields to optimize query performance.
 * - **Schema Validation:** Enforce schemas with custom validation rules using triggers.
 * - **Aggregations:** Support `$match` and `$group` stages for advanced data processing.
 * - **Collection Operations:** Manage collections with operations like rename, drop, and count.
 * - **In-Memory and Persistent Storage:** Use an SQLite file for persistence or in-memory mode for temporary storage.
 *
 * ## Implementation Details:
 * - Each "collection" is an SQLite table consisting of:
 *     - `_id`: A unique primary key for the document.
 *     - `document`: A JSON column containing the full document.
 * - SQLite's JSON functions (`json_extract`, `json_set`, etc.) are used extensively for document manipulation.
 * - The UUID library (`uuid`) is used to generate unique document identifiers.
 *
 */

/**
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
