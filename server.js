import express from "express";

import { readdirSync } from "fs";
import mongoose from "mongoose";
import cors from "cors";
import csrf from "csurf";
import cookieParser from "cookie-parser";
import Razorpay from "razorpay";

const morgan = require("morgan");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const csrfProtection = csrf({ cookie: true });
export const instance = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_API_SECRET,
});
//creatin express app
const app = express();

mongoose
  .connect(process.env.DATABASE, {})
  .then(() => console.log("DB connected"))
  .catch((err) => console.log("DB Error => ", err));

// middlewares
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
//coming data is json from frontend
app.use(express.json({ limit: "5mb" }));
//on which route we are in
// which method get or post
//speed of rendering
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
//route

readdirSync("./routes").map((r) => {
  app.use("/api", require(`./routes/${r}`));
});

//csrf
app.use(csrfProtection);

app.get("/api/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

//set port
const port = process.env.PORT || 8000;

app.listen(port, () => console.log(`server is running on port ${port}`));
