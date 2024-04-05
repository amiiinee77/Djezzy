const http = require("http");
const express = require("express");
const fs = require("fs");
const { join } = require("path");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);

const body_parser = require("body-parser");
const path = require("path");
const bcrypt = require("bcrypt");
const multer = require("multer");
const cookieParser = require("cookie-parser");
const sharp = require("sharp");
const imageSize = require("image-size");
const logger = require("./logger");
const { dbConfig } = require("./config");
const db = require("./db");

let app = express();

const httpServer = http.createServer(app);

const sessionStore = new MySQLStore(dbConfig);
app.use(logger);
app.use(body_parser.json());
app.use(body_parser.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, "public")));
app.use(cookieParser());

app.use(
	session({
		secret: "mysecret",
		resave: false,
		saveUninitialized: false,
		store: sessionStore,
		cookie: {
				maxAge: 1000 * 60 * 60 * 24 * 30, // 30 jours
			secure: false,
			httpOnly: true,
			// domain:''
		},
	})
);
const base_url = path.join(__dirname, "public/");
GV = {};
//!----------------------------------------------------------------------------------------------------------------------
//!--------------------------------------------------------UPLOADS--------------------------------------------------------
//!----------------------------------------------------------------------------------------------------------------------
const upload_dir = "./public/img/uploads/";
const raw_upload_dir = upload_dir + "raw/";

const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, raw_upload_dir),
	filename: (req, file, cb) => cb(null, Date.now() + file.originalname.replace(/\s/g, "_")),
});
const upload = multer({ storage });

app.get("/", (req, res) => {
	res.sendFile(base_url + "/cart.html");
});

app.post("/loadProducts",async (req, res) =>{
	try {
		let products = await db.select("*","products")
		res.send({success:true,products})
		
	} catch (error) {
		res.send({success:false,error})
		
	}
})

app.post("/saveCart",async (req, res) =>{
	let {total,content} = req.body
	try {
		await db.insert("cart",{total,content})
		console.log(content);
		for(let element of Object.values(content)){
				let id = element.product_id
				let result = await db.select("quantity","products",{id})
				let stock = result[0].quantity
				calcStock(stock,element.quantity)
				await db.update("products",{quantity:stock},{id})
		}
		res.send({success:true})
		
	} catch (error) {
		res.send({success:false,error})
		
	}
})

function calcStock(stock,quantity){
	stock=stock-quantity
	return 
}
let port = 1111;
httpServer.listen(port, () => console.log(`Sever running on http://localhost:${port}`));
