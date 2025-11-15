const express = require("express");
const bodyParser = require("body-parser");
const { query } = require("./db");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

/**
 * GET /stats
 * Query parameters:
 *   site_id (required)
 *   date (optional, format: YYYY-MM-DD)
 *
 * Example:
 *   /stats?site_id=site-abc-123&date=2025-11-12
 */
app.get("/stats", async (req, res) => {
  const { site_id, date } = req.query;

  if (!site_id) {
    return res.status(400).json({ error: "site_id is required" });
  }

  let dateFilterClause = "";
  const params = [site_id];

  if (date) {
    // Filter by that day (00:00 to 23:59:59)
    dateFilterClause = "AND event_time::date = $2::date";
    params.push(date);
  }

  try {
    // Aggregate total views & unique users
    const statsSql = `
      SELECT
        $1::text AS site_id,
        ${date ? "$2::date AS date," : "NULL::date AS date,"}
        COUNT(*) FILTER (WHERE event_type = 'page_view') AS total_views,
        COUNT(DISTINCT user_id) AS unique_users
      FROM events
      WHERE site_id = $1
      ${dateFilterClause}
    `;

    const statsResult = await query(statsSql, params);
    const row = statsResult.rows[0];

    // Aggregate top paths
    const topPathsSql = `
      SELECT
        path,
        COUNT(*) AS views
      FROM events
      WHERE site_id = $1
      ${dateFilterClause}
        AND event_type = 'page_view'
      GROUP BY path
      ORDER BY views DESC
      LIMIT 10
    `;

    const topPathsResult = await query(topPathsSql, params);

    const response = {
      site_id: site_id,
      date: date || null,
      total_views: Number(row.total_views) || 0,
      unique_users: Number(row.unique_users) || 0,
      top_paths: topPathsResult.rows.map((r) => ({
        path: r.path,
        views: Number(r.views),
      })),
    };

    return res.json(response);
  } catch (err) {
    console.error("Error in /stats:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const port = process.env.REPORTING_PORT || 3001;
app.listen(port, () => {
  console.log(`Reporting API listening on port ${port}`);
});
