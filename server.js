// -------------------- IMPORTS --------------------
import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from 'bcryptjs';
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

// -------------------- CONFIGURACIÓN --------------------
const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");


app.use(
  session({
    secret: "clave-secreta",
    resave: false,
    saveUninitialized: false,
  })
);

// -------------------- RUTAS --------------------

// Crear usuario con clave automática
app.post("/crear-usuario", async (req, res) => {
  const { dni, nombre, apellido } = req.body;
  try {
    const password = dni.slice(-3);
    await pool.query(
      "INSERT INTO usuarios (dni, password, nombre, apellido) VALUES ($1, $2, $3, $4)",
      [dni, password, nombre, apellido]
    );
    res.json({ success: true, message: `Usuario creado. Clave por defecto: ${password}` });
  } catch (err) {
    console.error("Error al crear usuario:", err);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// Login por DNI (sin hash, usa clave simple)
app.post("/login", async (req, res) => {
  const { dni, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE dni = $1", [dni]);
    if (result.rows.length === 0)
      return res.status(401).json({ error: "DNI no encontrado" });

    const usuario = result.rows[0];
    if (usuario.password !== password)
      return res.status(401).json({ error: "Contraseña incorrecta" });

    req.session.usuario = {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
    };

    res.json({ success: true, message: "Login exitoso" });
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ error: "Error en login" });
  }
});

// Seleccionar escuela y mesa
app.post("/seleccionar", async (req, res) => {
  const { escuela, mesa } = req.body;
  const usuario = req.session.usuario;

  if (!usuario)
    return res.status(401).json({ error: "Sesión no iniciada" });

  try {
    let result = await pool.query(
      "SELECT * FROM registros WHERE usuario_id = $1 AND escuela = $2 AND mesa = $3",
      [usuario.id, escuela, mesa]
    );

    let registro;
    if (result.rows.length === 0) {
      const insert = await pool.query(
        "INSERT INTO registros (usuario_id, escuela, mesa) VALUES ($1, $2, $3) RETURNING *",
        [usuario.id, escuela, mesa]
      );
      registro = insert.rows[0];
    } else {
      registro = result.rows[0];
    }

    req.session.escuela = escuela;
    req.session.mesa = mesa;
    req.session.registro_id = registro.id;

    res.json({ success: true, message: "Registro activo", registro });
  } catch (err) {
    console.error("Error al seleccionar escuela/mesa:", err);
    res.status(500).json({ error: "Error al crear o recuperar registro" });
  }
});

// Carga de votos
app.post("/votos", async (req, res) => {
  const { nro_orden, votos_validos, votos_nulos, votos_blancos } = req.body;
  const registro_id = req.session.registro_id;

  if (!registro_id)
    return res.status(400).json({ error: "No hay registro activo" });

  try {
    await pool.query(
      "INSERT INTO votos (registro_id, nro_orden, votos_validos, votos_nulos, votos_blancos) VALUES ($1, $2, $3, $4, $5)",
      [registro_id, nro_orden, votos_validos, votos_nulos, votos_blancos]
    );
    res.json({ success: true, message: "Votos guardados correctamente" });
  } catch (err) {
    console.error("Error al guardar votos:", err);
    res.status(500).json({ error: "Error al guardar votos" });
  }
});

// Obtener votos de la sesión
app.get("/votos", async (req, res) => {
  const registro_id = req.session.registro_id;
  if (!registro_id)
    return res.status(400).json({ error: "No hay registro activo" });

  try {
    const result = await pool.query(
      "SELECT * FROM votos WHERE registro_id = $1 ORDER BY id ASC",
      [registro_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener votos:", err);
    res.status(500).json({ error: "Error al obtener votos" });
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Sesión cerrada" });
  });
});

// -------------------- INICIO --------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/views/login", (req, res) => {
  res.render("login");
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
