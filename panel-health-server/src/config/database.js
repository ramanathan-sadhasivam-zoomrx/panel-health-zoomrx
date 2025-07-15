const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
  constructor() {
    this.pool = null;
  }

  async connect() {
    try {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'zoomrx_nps',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true
      });

      // Test the connection
      const connection = await this.pool.getConnection();
      connection.release();
      
      return this.pool;
    } catch (error) {
      console.error('Database connection failed:', error);
      
      // Create a fallback pool with default values
      this.pool = mysql.createPool({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'zoomrx_nps',
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        acquireTimeout: 30000,
        timeout: 30000,
        reconnect: true
      });
      
      return this.pool;
    }
  }

  async query(sql, params = []) {
    try {
      if (!this.pool) {
        await this.connect();
      }
      
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('Query error:', error);
      return [];
    }
  }

  async getConnection() {
    return await this.pool.getConnection();
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

// Singleton instance
const database = new Database();

module.exports = database; 