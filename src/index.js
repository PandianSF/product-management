const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool, Client } = require("pg");

const users = [];
const product = [];

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  type: "postgres",
  user: "pandianr",
  host: "localhost",
  database: "postgres",
  password: "root",
  port: 5432,
});

app.use(bodyParser.json());
app.use(cors());

app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("req data====>>", req.body);

    const userExists = await (
      await pool.connect()
    ).query(`SELECT * FROM users WHERE email='${email}'`);
    console.log(userExists.rows, email);

    if (userExists.rows.length > 0) throw new Error("User already Exists");

    if (userExists.rows.length < 1) {
      const userName = req.body.userName;
      const pass = req.body.password;
      const saltRounds = 10;
      const password = await bcrypt.hash(pass, saltRounds);
      const matching = await bcrypt.compare(pass, password);
      const sec = { userName, password };
      const userId = Math.floor(Math.random() * 1000);
      const newUser = { ...sec, email, userId };

      const sql = `INSERT INTO users (email,userid,username,password) VALUES ('${email}', ${userId}, '${userName}', '${password}')`;
      pool.query(sql, (err, res) => {
        console.log(err, res);
      });

      res.send({
        status: "SUCCESS",
        data: newUser,
        message: "User profile created successfully",
      });
    }
  } catch (err) {
    res.send({
      status: "ERROR",
      message: err.message,
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const userExists = await (
      await pool.connect()
    ).query(`SELECT * FROM users WHERE email='${email}'`);
    console.log(userExists.rows, email);
    if (userExists.rows.length > 0) {
      let user = userExists.rows[0];

      let hashedPass = user.password;
      const matching = await bcrypt.compare(password, hashedPass);

      if (matching === true) {
        const payload = {
          email: email,
          userId: user.userid,
        };
        const secret = "your-secret-key";
        const options = { expiresIn: "1h" };
        const token = jwt.sign(payload, secret, options);
        res.send({
          status: "SUCCESS",
          data: token,
          message: "login successfully!",
        });
      } else {
        throw new Error("Incorrect password");
      }
    } else throw new Error("User doesnt exists");
  } catch (err) {
    res.send({
      status: "ERROR",
      message: err.message,
    });
  }
});

app.post("/create", async (req, res) => {
  try {
    const token = req.headers.authorization;
    const { name, price, quantity, active } = req.body;
    const secret = "your-secret-key";
    const userAuthDecoded = await jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        throw new Error("Invalid Token");
      } else {
        return decoded;
      }
    });

    let userId = userAuthDecoded.userId;
    let email = userAuthDecoded.email;
    let productId = Math.floor(Math.random() * 1000);

    const userExists = await (
      await pool.connect()
    ).query(`SELECT * FROM users WHERE email='${email}'`);
    console.log(
      `${productId}', ${userId}, '${name}', '${price}','${quantity},'${active}`
    );
    if (userExists.rows.length > 0) {
      const sql = `INSERT INTO products (productid,userid,name,price,quantity,active) VALUES ('${productId}', ${userId}, '${name}', ${price},${quantity},${active})`;
      pool.query(sql);

      res.send({
        status: "SUCCESS",
        data: {
          productId,
          userId,
          name,
          price,
          quantity,
          active,
        },
        message: "Product created successfully!",
      });
    } else {
      throw new Error("Not an Authorised User");
    }
  } catch (err) {
    res.send({
      status: "ERROR",
      message: err.message,
    });
  }
});

app.get("/getProductsByUserId", async (req, res) => {
  console.log("Request received to fetch products");
  try {
    const token = req.headers.authorization;
    const secret = "your-secret-key";
    const userAuthDecoded = await jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        throw new Error("Invalid Token");
      } else {
        return decoded;
      }
    });

    let userId = userAuthDecoded.userId;
    let email = userAuthDecoded.email;

    console.log(userId, email, "User Details");

    const userExists = await (
      await pool.connect()
    ).query(`SELECT * FROM users WHERE email='${email}'`);

    if (userExists.rows.length > 0) {
      const products = await (
        await pool.connect()
      ).query(`SELECT * FROM products WHERE userid='${userId}'`);

      if (products.rows.length === 0)
        res.send({
          status: "SUCCESS",
          products: products.rows,
          message: "No Products found for the user",
        });

      res.send({
        status: "SUCCESS",
        products: products.rows,
        message: "Products Fetched Successfully",
      });
    } else {
      throw new Error("Not an Authorised User");
    }
  } catch (err) {
    res.send({
      status: "ERROR",
      message: err.message,
    });
  }
});

app.delete("/remove/:productId", async (req, res) => {
  try {
    const token = req.headers.authorization;
    const secret = "your-secret-key";
    const userAuthDecoded = await jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        throw new Error("Invalid Token");
      } else {
        return decoded;
      }
    });

    let userId = userAuthDecoded.userId;
    let email = userAuthDecoded.email;

    const userExists = await (
      await pool.connect()
    ).query(`SELECT * FROM users WHERE email='${email}'`);

    if (userExists.rows.length > 0) {
      const productId = req.params.productId;
      console.log(productId);
      const sql = `DELETE FROM products WHERE productId='${productId}'`;
      console.log(productId);
      try {
        (await pool.connect()).query(sql);
        res.send({
          status: "SUCCESS",
          message: "Product removed successfully",
        });
      } catch (e) {
        throw new Error("Error occurred while removing product");
      }
    }
  } catch (err) {
    res.send({
      status: "ERROR",
      message: err.message,
    });
  }
});

app.listen(3000, async () => {
  await pool.connect();
  // pool.query(
  //   "CREATE TABLE users (userId INT PRIMARY KEY , userName VARCHAR(250), email VARCHAR(250), password VARCHAR(250))",
  //   (err, res) => {
  //     console.log(err, res);
  //   }
  // );

  // pool.query(
  //   "CREATE TABLE products (productId INT PRIMARY KEY , userId INT, name VARCHAR(250), price INT, quantity INT,  active BOOLEAN )",
  //   (err, res) => {
  //     if (res) console.log("Database Tables Created");
  //   }
  // );

  console.log("Server Started");
});
