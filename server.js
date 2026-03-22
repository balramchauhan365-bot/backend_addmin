const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');          
const mysql = require('mysql2');
require('dotenv').config(); // ye hamesha top pe rakho



const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

connection.connect((err) => {
  if(err) throw err;
  console.log("Connected to MySQL!");
});

const app = express();
app.use(cors());
app.use(express.json());

/* DATABASE CONNECTION */
const db = mysql.createConnection({
    host: process.env.DB_HOST,       // from .env
  user: process.env.DB_USER,       // from .env
  password: process.env.DB_PASSWORD, // from .env
  database: process.env.DB_NAME   
});

db.connect((err) => {
  if (err) console.log("Database connection failed:", err);
  else console.log("Database connected");
});

/* ------------------ SIGNUP ------------------ */
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields required" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
    db.query(sql, [name, email, hashedPassword], (err, result) => {
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
    res.status(500).json({ message: "Server error" });
  }
});

/* ------------------ LOGIN ------------------ */
app.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: "Email & password required" });

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], async (err, result) => {
    if (err || result.length === 0) return res.status(400).json({ message: "User not found" });

    const validPassword = await bcrypt.compare(password, result[0].password);
    if (!validPassword) return res.status(400).json({ message: "Invalid password" });

    res.json({ message: "Login successful", user: { id: result[0].id, name: result[0].name, email: result[0].email } });
  });
});

/* ------------------ USERS CRUD ------------------ */
// Read all users
app.get('/users', (req, res) => {
  const sql = "SELECT id, name, email FROM users";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ success: true, data: results });
  });
});

// Read single user by ID
app.get('/users/:id', (req, res) => {
  const sql = "SELECT id, name, email FROM users WHERE id = ?";
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ success: true, data: result[0] || null });
  });
});

// Update user
app.put('/users/:id', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name && !email && !password)
    return res.status(400).json({ message: "At least one field required" });

  let fields = [], values = [];
  if (name) { fields.push("name = ?"); values.push(name); }
  if (email) { fields.push("email = ?"); values.push(email); }
  if (password) {
    const hashed = await bcrypt.hash(password, 10);
    fields.push("password = ?"); values.push(hashed);
  }

  values.push(req.params.id);
  const sql = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ success: true, message: "User updated successfully" });
  });
});

// Delete user
app.delete('/users/:id', (req, res) => {
  const sql = "DELETE FROM users WHERE id = ?";
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ success: true, message: "User deleted successfully" });
  });
});

/* ------------------ PRODUCTS CRUD ------------------ */
app.get('/products', (req, res) => {
  const sql = "SELECT * FROM products";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: err.message });

    res.json(results);   // 🔥 change only this
  });
});


app.get('/products/:id', (req, res) => {
  const sql = "SELECT * FROM products WHERE id = ?";
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ success: true, data: result[0] || null });
  });
});

app.post('/products', (req, res) => {
  const { name, price, description } = req.body || {};
  if (!name || !price)
    return res.status(400).json({ message: "Name & price required" });

  const sql = "INSERT INTO products (name, price, description) VALUES (?, ?, ?)";
  db.query(sql, [name, price, description], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ success: true, message: 'Product created', product: { id: result.insertId, name, price, description } });
  });
});
// POST
app.post('/products', (req, res) => {
  const { name, price, size, colour, image } = req.body || {};
  if (!name || !price) return res.status(400).json({ message: "Name & price required" });

  const sql = "INSERT INTO products (name, price, size, colour, image) VALUES (?, ?, ?, ?, ?)";
  db.query(sql, [name, price, size, colour, image], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });

    res.json({
      success: true,
      message: 'Product created',
      product: { id: result.insertId, name, price, size, colour, image }
    });
  });
});

// PUT
app.put('/products/:id', (req, res) => {
  const { name, price, size, colour, image } = req.body || {};
  let fields = [], values = [];
  if (name) { fields.push("name = ?"); values.push(name); }
  if (price) { fields.push("price = ?"); values.push(price); }
  if (size) { fields.push("size = ?"); values.push(size); }
  if (colour) { fields.push("colour = ?"); values.push(colour); }
  if (image) { fields.push("image = ?"); values.push(image); }

  if (fields.length === 0) return res.status(400).json({ message: "At least one field required" });

  values.push(req.params.id);
  const sql = `UPDATE products SET ${fields.join(", ")} WHERE id = ?`;
  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ success: true, message: "Product updated successfully" });
  });
});

app.delete('/products/:id', (req, res) => {
  const sql = "DELETE FROM products WHERE id = ?";
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ success: true, message: "Product deleted successfully" });
  });
});
// enquiry
app.post("/enquiry", (req, res) => {
  const { name, price } = req.body;

  const sql = "INSERT INTO enquiries (product_name, price) VALUES (?, ?)";

  db.query(sql, [name, price], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });

    res.json({ succes :true, message: "Enquiry saved" });
  });
});
  // Payments
app.post("/payments", (req, res) => {
  const { productName, price, status } = req.body;

  const sql = "INSERT INTO payments (product_name, price, status) VALUES (?, ?, ?)";

  db.query(sql, [productName, price, status], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });

    res.json({ success: true });
  });
});
/* ------------------ START SERVER ------------------ */
app.listen(5000, () => console.log('Server running on http://localhost:5000'));