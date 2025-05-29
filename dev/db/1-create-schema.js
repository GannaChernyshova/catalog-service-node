const { MongoClient } = require("mongodb");

async function initSchema() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();

    // Create products collection with schema validation
    await db.createCollection("products", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["name", "upc", "price"],
          properties: {
            name: {
              bsonType: "string",
              description: "must be a string and is required",
            },
            description: {
              bsonType: "string",
              description: "must be a string",
            },
            upc: {
              bsonType: "string",
              description: "must be a string and is required",
            },
            price: {
              bsonType: "double",
              description: "must be a number and is required",
            },
            has_image: {
              bsonType: "bool",
              description: "must be a boolean",
            },
          },
        },
      },
    });

    // Create unique index on UPC
    await db.collection("products").createIndex({ upc: 1 }, { unique: true });

    console.log("MongoDB schema initialized successfully");
  } catch (error) {
    console.error("Error initializing MongoDB schema:", error);
    throw error;
  } finally {
    await client.close();
  }
}

initSchema().catch(console.error);
