const { MongoClient, ObjectId } = require("mongodb");

const { getInventoryForProduct } = require("./InventoryService");
const { uploadFile, getFile } = require("./StorageService");
const { publishEvent } = require("./PublisherService");

let client;
let db;

async function getClient() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db();
  }
  return { client, db };
}

async function teardown() {
  if (client) {
    await client.close();
  }
}

async function getProducts() {
  const { db } = await getClient();
  return await db.collection("products").find().toArray();
}

async function createProduct(product) {
  const { db } = await getClient();

  const existingProduct = await db
    .collection("products")
    .findOne({ upc: product.upc });

  if (existingProduct) {
    throw new Error("Product with this UPC already exists");
  }

  const newProduct = {
    ...product,
    has_image: false,
    _id: new ObjectId(),
  };

  await db.collection("products").insertOne(newProduct);

  publishEvent("products", {
    action: "product_created",
    id: newProduct._id.toString(),
    name: product.name,
    upc: product.upc,
    price: product.price,
    description: product.description,
  });

  return {
    ...newProduct,
    id: newProduct._id.toString(),
  };
}

async function getProductById(id) {
  const { db } = await getClient();

  const product = await db
    .collection("products")
    .findOne({ _id: new ObjectId(id) });

  if (!product) {
    return null;
  }

  const inventory = await getInventoryForProduct(product.upc);

  return {
    inventory,
    ...product,
    id: product._id.toString(),
  };
}

async function getProductImage(id) {
  return getFile(id);
}

async function uploadProductImage(id, buffer) {
  const { db } = await getClient();

  await uploadFile(id, buffer);
  await db
    .collection("products")
    .updateOne({ _id: new ObjectId(id) }, { $set: { has_image: true } });
}

module.exports = {
  getProducts,
  createProduct,
  getProductById,
  getProductImage,
  uploadProductImage,
  teardown,
};
