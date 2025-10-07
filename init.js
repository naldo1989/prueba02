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
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      escuela VARCHAR(100) NOT NULL,
      mesa VARCHAR(50) NOT NULL,
      fecha TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(escuela, mesa)
    );
  `);
     await pool.query(`
 CREATE TABLE IF NOT EXISTS votos (
    id SERIAL PRIMARY KEY,
    registro_id INTEGER REFERENCES registros(id) ON DELETE CASCADE,
    nro_orden VARCHAR(20) NOT NULL,
    votos_validos INTEGER DEFAULT 0,
    votos_nulos INTEGER DEFAULT 0,
    votos_blancos INTEGER DEFAULT 0,
    total_votos INTEGER GENERATED ALWAYS AS (total_votos + votos_validos) STORED,
    fecha_carga TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
  `);


  console.log("✅ Tablas creadas");
  process.exit(0);
}

init().catch(err => console.error(err));
