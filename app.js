//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const encrypt = require("mongoose-encryption");

const secret = process.env.DB_SECRET;

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));

// connect to DB
mongoose.connect("mongodb://localhost:27017/useDB");

// create schema
const userSchema = new mongoose.Schema({
    username: String,
    password: String
});



userSchema.plugin(encrypt, {secret: secret, encryptedChildren : ["password"]});
// create model
const User = mongoose.model("User", userSchema);

// home route
app.get("/", function (req, res) {
    res.render("home");
});

// login route
app.route("/login")
    .get(function (req, res) {
        res.render("login");
    })
    .post(function (req, res) {
        const username = req.body.username;
        const password = req.body.password;

        User.findOne({ email: username }, function (err, foundUser) {
            if (!err) {
                if (foundUser) {
                    if (foundUser.password === password) {
                        res.render("secrets");
                    }
                }

            } else { console.log(err); }
        });
    });

// register route
app.route("/register")
    .get(function (req, res) {
        res.render("register")
    })
    .post(function (req, res) {
        const newUser = User({
            username: req.body.username,
            password: req.body.password
        });

        newUser.save(function (err) {
            if (err) {
                console.log(err);
            } else {
                res.render("secrets");
            }
        });
    });

app.listen(3000, function () {
    console.log("Server started on port 3000");
});