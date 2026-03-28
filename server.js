const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const mysql = require("mysql2");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

/* ✅ ROOT ROUTE */
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

/* ✅ DATABASE CONNECTION (FIXED) */
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/* ------------------ SIGNUP ------------------ */
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  db.getConnection(async (err, connection) => {
    if (err) return res.status(500).json({ message: "DB connection error" });

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      const sql =
        "INSERT INTO eco_users (name, email, password) VALUES (?, ?, ?)";

      connection.query(sql, [name, email, hashedPassword], (err, result) => {
        connection.release();

        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ message: "Email already exists" });
          }
          return res.status(500).json({ message: err.message });
        }

        res.json({
          message: "Signup successful",
          user: { id: result.insertId, name, email }
        });
      });
    } catch (err) {
      connection.release();
      res.status(500).json({ message: "Server error" });
    }
  });
});

/* ------------------ LOGIN ------------------ */
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.getConnection((err, connection) => {
    if (err) return res.status(500).json({ message: "DB connection error" });

    const sql = "SELECT * FROM eco_users WHERE email = ?";

    connection.query(sql, [email], async (err, result) => {
      connection.release();

      if (err || result.length === 0)
        return res.status(400).json({ message: "User not found" });

      const validPassword = await bcrypt.compare(
        password,
        result[0].password
      );

      if (!validPassword)
        return res.status(400).json({ message: "Invalid password" });

      res.json({
        message: "Login successful",
        user: result[0]
      });
    });
  });
});

/* ------------------ USERS ------------------ */
app.get("/users", (req, res) => {
  db.query(
    "SELECT id, name, email FROM eco_users",
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(results);
    }
  );
});

/* ------------------ PRODUCTS ------------------ */
app.get("/products", (req, res) => {
  db.query("SELECT * FROM eco_products", (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(results);
  });
});

app.get("/products/:id", (req, res) => {
  db.query(
    "SELECT * FROM eco_products WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(result[0]);
    }
  );
});

/* CREATE PRODUCT */
app.post("/products", (req, res) => {
  const { name, price, size, colour, image } = req.body;

  const sql =
    "INSERT INTO eco_products (name, price, size, colour, image) VALUES (?, ?, ?, ?, ?)";

  db.query(
    sql,
    [name, price, size, colour, image],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });

      res.json({
        message: "Product created",
        id: result.insertId
      });
    }
  );
});

/* UPDATE PRODUCT */
app.put("/products/:id", (req, res) => {
  const { name, price, size, colour, image } = req.body;

  const sql = `
    UPDATE eco_products 
    SET name=?, price=?, size=?, colour=?, image=? 
    WHERE id=?
  `;

  db.query(
    sql,
    [name, price, size, colour, image, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: "Product updated" });
    }
  );
});

/* DELETE PRODUCT */
app.delete("/products/:id", (req, res) => {
  db.query(
    "DELETE FROM eco_products WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: "Product deleted" });
    }
  );
});

/* ------------------ ENQUIRY ------------------ */
app.post("/enquiry", (req, res) => {
  const { name, price } = req.body;

  const sql =
    "INSERT INTO eco_enquiries (product_name, price) VALUES (?, ?)";

  db.query(sql, [name, price], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: "Enquiry saved" });
  });
});

/* ------------------ PAYMENTS ------------------ */
app.post("/payments", (req, res) => {
  const { productName, price, status } = req.body;

  const sql =
    "INSERT INTO eco_payments (product_name, price, status) VALUES (?, ?, ?)";

  db.query(sql, [productName, price, status], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: "Payment saved" });
  });
});

/* ------------------ START SERVER ------------------ */
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});