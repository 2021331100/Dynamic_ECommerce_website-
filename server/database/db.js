import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL && !process.env.DB_PASSWORD) {
  throw new Error("Database configuration is missing. Set DATABASE_URL or DB_PASSWORD.");
}

const database = new Pool({
  ...(process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST || "127.0.0.1",
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT || 5432),
      }),
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ...(process.env.DB_SSL === "true"
    ? { ssl: { rejectUnauthorized: true } }
    : {}),
});

database.on("error", (error) => {
  // Do not log connection strings or credentials.
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

export default database;
