//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const secret = process.env.DB_SECRET;

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));

app.use(session({
    secret: process.env.DB_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// connect to DB
mongoose.connect("mongodb://localhost:27017/useDB");

// create schema
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// create model
const User = mongoose.model("User", userSchema);

// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy(User.authenticate()));

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

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

        const user = new User({
            username: username,
            password: password
        });
        req.login(user, function (err) {
            if (err) { console.log(err); }
            else {
                passport.authenticate('local')(req, res, function (err) {
                    res.redirect("/secrets");
                });
            }
        });

    });

// login route
app.route("/secrets")
    .get(function (req, res) {
        User.find({ secret: { $ne: null } }, function (err, foundUsers) {
            if (foundUsers) {
                res.render("secrets", { usersWithSecrets: foundUsers });
            }
        });

    });

// submit route
app.route("/submit")
    .get(function (req, res) {
        if (req.isAuthenticated()) {
            res.render("submit");
        } else {
            res.redirect("/login");
        }

    })
    .post(function (req, res) {
        User.findById(req.user.id, function (err, foundUser) {
            if (!err) {
                if (foundUser) {
                    foundUser.secret = req.body.secret;
                    foundUser.save(function (err) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            res.redirect("/secrets");
                        }
                    });
                }
            }
        });
    });


// logout route
app.post("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) {
            console.log(err);
        }
    });
    res.redirect('/');
});

// register route
app.route("/register")
    .get(function (req, res) {
        res.render("register")
    })
    .post(function (req, res) {
        const username = req.body.username;
        const password = req.body.password;

        User.register({ username: username, active: false }, password, function (err, user) {
            if (err) {
                console.log(err);
            } else {
                passport.authenticate('local')(req, res, function (err) {
                    res.redirect("/secrets");
                });
            }
        });
    });

// Oauth google
app.route("/auth/google")
    .get(passport.authenticate("google", { scope: ['profile'] }));

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });


// start server
app.listen(3000, function () {
    console.log("Server started on port 3000");
});