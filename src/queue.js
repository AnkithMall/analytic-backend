const { createClient } = require("redis");
require("dotenv").config();

let client;

async function getRedisClient() {
  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL,
    });

    client.on("error", (err) => {
      console.error("Redis Client Error", err);
    });

    await client.connect();
    console.log("Connected to Redis");
  }
  return client;
}

module.exports = {
  getRedisClient,
};
