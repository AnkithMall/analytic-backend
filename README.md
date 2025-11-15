# TJRA Retail Analytics Backend

[![Run on Repl.it](https://repl.it/badge/github/owner/repo)](https://repl.it/github/owner/repo)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://travis-ci.org/owner/repo.svg?branch=main)](https://travis-ci.org/owner/repo)
[![Code Coverage](https://codecov.io/gh/owner/repo/branch/main/graph/badge.svg)](https://codecov.io/gh/owner/repo)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/owner/repo/releases/tag/v1.0.0)

This project is a simple analytics backend with two main components:
1.  **Ingestion API**: A high-throughput API to receive analytics events.
2.  **Reporting API**: An API to query aggregated analytics data.

## Table of Contents
- [Architecture Decision](#architecture-decision)
- [Database Schema](#database-schema)
- [Setup Instructions](#setup-instructions)
- [API Usage](#api-usage)
- [License](#license)

## Architecture Decision

### Asynchronous Processing with a Queue

For the ingestion of analytics events, we have chosen an asynchronous architecture using a message queue. This decision was driven by the need to handle high-throughput event ingestion without sacrificing the responsiveness of the API.

Here's how it works:

1.  **Event Reception**: The Ingestion API (`ingestionServer.js`) receives an event via a `POST` request to the `/event` endpoint.
2.  **Validation & Queuing**: The API performs basic validation on the event payload and then pushes it into a Redis list, which acts as a queue. This is a very fast operation.
3.  **Immediate Response**: The API immediately responds to the client with a `202 Accepted` status, indicating that the event has been queued for processing.
4.  **Asynchronous Processing**: A separate worker process (`worker.js`) continuously monitors the Redis queue. When a new event is available, the worker pulls it from the queue.
5.  **Database Insertion**: The worker then inserts the event data into the PostgreSQL database.

This approach decouples the event reception from the database write operation, providing several advantages:

*   **High Throughput**: The Ingestion API can handle a large number of requests quickly because it doesn't have to wait for the database.
*   **Resilience**: If the database is temporarily unavailable, the events will accumulate in the queue and can be processed once the database is back online.
*   **Scalability**: We can scale the number of worker processes independently of the API servers to match the event processing load.

## Database Schema

The database schema is straightforward, consisting of a single table named `events`.

### `events` table

| Column      | Type         | Description                                                  |
|-------------|--------------|--------------------------------------------------------------|
| `id`        | `SERIAL`     | Primary key for the event record.                            |
| `site_id`   | `VARCHAR(255)`| The ID of the site where the event occurred.                 |
| `event_type`| `VARCHAR(100)`| The type of event (e.g., `page_view`, `click`).              |
| `path`      | `TEXT`       | The path on the site where the event occurred (e.g., `/products/123`). |
| `user_id`   | `VARCHAR(255)`| The ID of the user who triggered the event.                  |
| `event_time`| `TIMESTAMPTZ`| The timestamp of when the event occurred.                    |
| `received_at`| `TIMESTAMPTZ`| The timestamp of when the event was received by the system.  |

### Indexes

The following indexes are created to optimize query performance for the Reporting API:

*   `idx_events_site_time`: On `(site_id, event_time)`
*   `idx_events_site_path`: On `(site_id, path)`
*   `idx_events_site_user`: On `(site_id, user_id)`

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Before you begin, ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (v14 or later)
- [Docker](https://www.docker.com/)
- [npm](https://www.npmjs.com/)

### Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd analytic-backend
    ```

2.  **Set up environment variables**
    Copy the example environment file:
    ```bash
    cp env.example .env
    ```
    Then, edit the `.env` file with your configuration. You have two options for the database: a local PostgreSQL instance using Docker or a cloud-hosted Neon DB.

    **Option A: Local Docker Setup**

    For a local setup, your `.env` file should look like this:

    ```
    # PostgreSQL settings
    POSTGRES_USER=user
    POSTGRES_PASSWORD=password
    POSTGRES_DB=analytics
    DB_HOST=localhost
    DB_PORT=5432
    PG_SSL=false

    # Redis settings
    REDIS_HOST=localhost
    REDIS_PORT=6379

    # API ports
    INGESTION_PORT=3000
    REPORTING_PORT=3001
    ```

    **Option B: Neon DB (Cloud)**

    If you are using a Neon DB instance, your `.env` file should look like this:

    ```
    # PostgreSQL settings (Neon DB)
    PG_HOST=<your-neon-db-host>
    PG_PORT=5432
    PG_USER=<your-neon-db-user>
    PG_PASSWORD=<your-neon-db-password>
    PG_DATABASE=analytics
    PG_SSL=true

    # Redis settings
    REDIS_HOST=localhost
    REDIS_PORT=6379

    # API ports
    INGESTION_PORT=3000
    REPORTING_PORT=3001
    ```

3.  **Start the Database and Redis**

    **Local Docker Setup**

    If you are using the local Docker setup, you can run PostgreSQL and Redis in containers.

    ```bash
    docker run --name analytics-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_USER=user -e POSTGRES_DB=analytics -p 5432:5432 -d postgres
    
    docker run --name analytics-redis -p 6379:6379 -d redis:7
    ```

    **Neon DB Setup**

    If you are using Neon DB, you don't need to run PostgreSQL locally. You only need to run Redis.

    ```bash
    docker run --name analytics-redis -p 6379:6379 -d redis:7
    ```

4.  **Install dependencies**
    ```bash
    npm install
    ```

5.  **Set up the database schema**
    Run the `schema.sql` script to create the `events` table and indexes.

    The following command uses the environment variables you set in the `.env` file.

    ```bash
    psql -h $DB_HOST -p $DB_PORT -U $POSTGRES_USER -d $POSTGRES_DB -f sql/schema.sql
    ```

    You will be prompted for the password.

6.  **Run the System**
    The system consists of three processes that should be run in separate terminals.

    **Terminal 1: Ingestion API**
    ```bash
    npm run ingestion
    ```

    **Terminal 2: Reporting API**
    ```bash
    npm run reporting
    ```

    **Terminal 3: Worker**
    ```bash
    npm run worker
    ```

    The system is now up and running.

## Project Structure

```
.
├── sql
│   └── schema.sql
├── src
│   ├── db.js
│   ├── ingestionServer.js
│   ├── queue.js
│   ├── reportingServer.js
│   └── worker.js
├── .env
├── .env.example
├── .gitignore
├── package-lock.json
├── package.json
└── README.md
