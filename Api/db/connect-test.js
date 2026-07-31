/* eslint-disable no-console */
const path = require('path');
const mongoose = require('mongoose');

process.env.MONGOMS_DOWNLOAD_DIR = process.env.MONGOMS_DOWNLOAD_DIR || path.resolve(__dirname, '../.mongodb-binaries');

const { MongoMemoryServer } = require('mongodb-memory-server');
const config = require('./config');

const connect = async () => {
  // Prevent MongooseError: Can't call `openUri()` on
  // an active connection with different connection strings
  await mongoose.disconnect();

  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  global.__MONGOINSTANCE = mongoServer;
  return mongoose
    .set('strictQuery', false)
    .connect(mongoUri, config)
    .catch(err => {
      console.error(`[MongoDB-TEST] ${err} -- Retrying in 5s`);
    });
};

const close = async () => {
  try {
    await mongoose.disconnect();
    if (global.__MONGOINSTANCE) await global.__MONGOINSTANCE.stop();
  } catch (err) {
    console.error(err);
  }
};

const clear = async () => {
  const { collections } = mongoose.connection;

  return Promise.all(Object.keys(collections).map(key => collections[key].deleteMany())).catch(console.error);
};

module.exports = {
  connect,
  close,
  clear
};
