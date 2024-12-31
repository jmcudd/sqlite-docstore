import { strictEqual, deepStrictEqual, throws } from "assert";
import { describe, it } from "mocha";
import { sqliteDocstore } from "./index.js";

// Initialize the database
const db = sqliteDocstore.init();
const collectionName = "testCollection";
console.log("db", db);

describe("SQLite Docstore Tests", () => {
  // Runs before the test suite
  before(async () => {
    // Create the collection before running any tests
    db.createCollection(collectionName);
  });

  // Runs after the entire test suite
  after(async () => {
    db.dropCollection(collectionName); // Cleanly close the database connection
  });

  describe("Document Insertion and Retrieval", () => {
    it("should insert one document and find it", () => {
      const document = { name: "Alice", age: 30 };
      const result = db.insertOne(collectionName, document);

      strictEqual(result.acknowledged, true);
      strictEqual(typeof result.insertedId, "string");

      const foundDocs = db.find(collectionName, { name: "Alice" });
      deepStrictEqual(foundDocs[0], {
        _id: result.insertedId,
        name: "Alice",
        age: 30,
      });
    });

    it("should insert multiple documents and count them", () => {
      const documents = [
        { name: "Bob", age: 35 },
        { name: "Charlie", age: 42 },
      ];
      const result = db.insertMany(collectionName, documents);

      strictEqual(result.acknowledged, true);
      strictEqual(result.insertedCount, 2);

      const count = db.countDocuments(collectionName);
      strictEqual(count, 3); // Count should include Alice, Bob, and Charlie
    });
  });

  describe("Document Deletion", () => {
    it("should delete one document", () => {
      const result = db.deleteOne(collectionName, { name: "Charlie" });

      strictEqual(result.acknowledged, true);
      strictEqual(result.deletedCount, 1);

      const foundDoc = db.findOne(collectionName, { name: "Charlie" });
      strictEqual(foundDoc, null);
    });
  });

  describe("Aggregate and Advanced Queries", () => {
    it("should find documents with $in operator", () => {
      const results = db.findWithIn(collectionName, {
        name: { $in: ["Alice", "Bob"] },
      });

      strictEqual(results.length, 2);
      deepStrictEqual(results.map((doc) => doc.name).sort(), ["Alice", "Bob"]);
    });

    it("should find documents using $regex operator", () => {
      const results = db.findWithRegex(collectionName, {
        name: { $regex: "^B" },
      });

      strictEqual(results.length, 1);
      strictEqual(results[0].name, "Bob");
    });

    it("should retrieve distinct field values", () => {
      const distinctAges = db.distinct(collectionName, "age");

      deepStrictEqual(distinctAges.sort(), [30, 35]);
    });

    it("should aggregate documents with $match and $group", () => {
      db.insertMany(collectionName, [
        { age: 45, country: "USA" },
        { age: 55, country: "USA" },
        { age: 15, country: "USA" },
        { age: 56, country: "USA" },
        { age: 25, country: "MEX" },
        { age: 25, country: "MEX" },
        { age: 15, country: "MEX" },
        { age: 56, country: "MEX" },
      ]);

      const pipeline = [
        { $match: { age: { $gt: 15 } } },
        {
          $group: {
            _id: "country",
            totalAge: { $sum: "age" },
            count: { $count: 1 },
          },
        },
      ];

      const result = db.aggregate(collectionName, pipeline);

      strictEqual(result.length, 3);
      deepStrictEqual(result[1], { groupKey: "MEX", totalAge: 106, count: 3 });
    });
  });

  describe("Count Queries", () => {
    it("should handle counting with a nonexistent query field", () => {
      const count = db.countDocuments(collectionName, {
        nonexistentField: "whatever",
      });

      strictEqual(count, 0);
    });
  });

  describe("Collection Operations", () => {
    it("should rename a collection and verify changes", () => {
      db.createCollection("old");
      db.insertOne("old", { _id: "test" });
      const result = db.renameCollection("old", "new");
      strictEqual(result.acknowledged, true);
      const oldFindResult = db.findOne("old", {});
      const newFindResult = db.findOne("new", {});
      strictEqual(oldFindResult, null);
      deepStrictEqual(newFindResult, { _id: "test" });
    });

    it("should drop collection and fail subsequent commands", () => {
      const result = db.dropCollection(collectionName);

      strictEqual(result.acknowledged, true);
      const findResult = db.findOne(collectionName, {});
      strictEqual(findResult, null);

      throws(() => {
        db.insertOne(collectionName, { name: "Test" });
      });
    });
  });
});
