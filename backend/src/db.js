const mysql = require("mysql2/promise");

function requireEnv(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Missing required env var ${name}`);
  }
  return v;
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: process.env.MYSQL_CONNECTION_LIMIT,
  namedPlaceholders: true,
});

module.exports = { pool };

