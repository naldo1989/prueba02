const pool = require("./db");

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      dni VARCHAR(10) NOT NULL,
      password VARCHAR(10) NOT NULL,
      nombre VARCHAR(50) NOT NULL,
      apellido VARCHAR(50) NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS registros (
      id SERIAL PRIMARY KEY,
      escuela VARCHAR(100) NOT NULL,
      mesa VARCHAR(20) NOT NULL,
      votos INT DEFAULT 0,
      ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(escuela, mesa)
    );
  `);

  console.log("✅ Tablas creadas");
  process.exit(0);
}

init().catch(err => console.error(err));
