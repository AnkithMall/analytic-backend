const express = require("express");
const bodyParser = require("body-parser");
const { getRedisClient } = require("./queue");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const QUEUE_KEY = "events_queue";

// Basic validation of incoming event JSON
function validateEvent(body) {
  const errors = [];
  if (!body.site_id) errors.push("site_id is required");
  if (!body.event_type) errors.push("event_type is required");
  if (!body.path) errors.push("path is required");

  // timestamp optional, but if present must be valid ISO
  if (body.timestamp) {
    const d = new Date(body.timestamp);
    if (isNaN(d.getTime())) {
      errors.push("timestamp must be a valid ISO date string");
    }
  }

  return errors;
}

app.post("/event", async (req, res) => {
  try {
    const errors = validateEvent(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const redis = await getRedisClient();

    // Normalize event payload
    const event = {
      site_id: req.body.site_id,
      event_type: req.body.event_type,
      path: req.body.path,
      user_id: req.body.user_id || null,
      timestamp: req.body.timestamp || new Date().toISOString(),
    };

    // Push to queue (as JSON string)
    await redis.rPush(QUEUE_KEY, JSON.stringify(event));

    // Respond immediately (no DB write here)
    return res.status(202).json({
      status: "queued",
      message: "Event received and queued for processing",
    });
  } catch (err) {
    console.error("Error in /event:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const port = process.env.INGESTION_PORT || 3000;
app.listen(port, () => {
  console.log(`Ingestion API listening on port ${port}`);
});
