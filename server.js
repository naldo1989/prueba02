const express = require("express");
const session = require("express-session");
const pool = require("./db");
require("dotenv").config();

const app = express();
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
  secret: "clave-secreta",
  resave: false,
  saveUninitialized: true
}));

// 🔹 Login
app.get("/", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", async (req, res) => {
  const { dni, password } = req.body;
  const user = await pool.query("SELECT * FROM usuarios WHERE dni=$1 AND password=$2", [dni, password]);

  if (user.rows.length === 0) {
    return res.render("login", { error: "Credenciales inválidas" });
  }

  req.session.user = user.rows[0];
  res.redirect("/mesa");
});

// 🔹 Selección de mesa
app.get("/mesa", (req, res) => {
  if (!req.session.user) return res.redirect("/");
  res.render("mesa", { user: req.session.user });
});

app.post("/mesa", (req, res) => {
  const { escuela, mesa } = req.body;
  req.session.escuela = escuela;
  req.session.mesa = mesa;
  res.redirect("/votos");
});

// 🔹 Registro de votos
app.get("/votos", (req, res) => {
  if (!req.session.escuela) return res.redirect("/mesa");
  res.render("votos", { escuela: req.session.escuela, mesa: req.session.mesa });
});

app.post("/votos", async (req, res) => {
  const { cantidad } = req.body;
  const { escuela, mesa } = req.session;

  await pool.query(`
    INSERT INTO registros (escuela, mesa, votos)
    VALUES ($1, $2, $3)
    ON CONFLICT (escuela, mesa) DO UPDATE
    SET votos = registros.votos + $3,
        ultima_actualizacion = CURRENT_TIMESTAMP
  `, [escuela, mesa, cantidad]);

  res.redirect("/votos");
});

// 🔹 Resultados
app.get("/resultados", async (req, res) => {
  const resultados = await pool.query("SELECT * FROM registros ORDER BY escuela, mesa");
  res.render("resultados", { resultados: resultados.rows });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
