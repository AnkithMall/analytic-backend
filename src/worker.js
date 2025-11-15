const { getRedisClient } = require("./queue");
const { query } = require("./db");
require("dotenv").config();

const QUEUE_KEY = "events_queue";

async function processEvent(event) {
  // event is already validated at ingestion, but we can be defensive
  const { site_id, event_type, path, user_id, timestamp } = event;

  const eventTime = new Date(timestamp);
  if (isNaN(eventTime.getTime())) {
    console.warn("Skipping event with invalid timestamp:", event);
    return;
  }

  const sql = `
    INSERT INTO events (site_id, event_type, path, user_id, event_time)
    VALUES ($1, $2, $3, $4, $5)
  `;

  const params = [site_id, event_type, path, user_id, eventTime.toISOString()];
  await query(sql, params);
}

async function startWorker() {
  const redis = await getRedisClient();
  console.log("Worker started, waiting for events...");

  while (true) {
    try {
      // BLPOP blocks until an item is available
      const result = await redis.blPop(QUEUE_KEY, 0); // 0 = block indefinitely

      if (!result || !result.element) {
        continue;
      }

      const raw = result.element;
      let event;
      try {
        event = JSON.parse(raw);
      } catch (e) {
        console.error("Failed to parse event JSON:", raw);
        continue;
      }

      await processEvent(event);
    } catch (err) {
      console.error("Error in worker loop:", err);
      // Sleep briefly to avoid tight error loop
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

startWorker().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});
