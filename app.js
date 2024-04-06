const http = require("http");
const express = require("express");
const { join } = require("path");
const body_parser = require("body-parser");
const path = require("path");
const db = require("./db");
const { log } = require("sharp/lib/libvips");

let app = express();
const httpServer = http.createServer(app);

app.use(body_parser.json());
app.use(body_parser.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, "public")));

const base = path.join(__dirname, "public/");

app.get("/", (req, res) => {
  res.sendFile(base + "/index.html");
});

app.post("/sendContact", async (req, res) => {
  let obj = req.body;
  try {
    await db.insert("contact", obj);
    res.send({ success: true });
  } catch (error) {
    res.send({ success: false, error });
  }
});

let port = 1111;
httpServer.listen(port, () => console.log(`Sever running on http://localhost:${port}`));
