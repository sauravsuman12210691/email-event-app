const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
require("./passport");
const emailRoutes = require('./routes/emailRoutes')

const app = express();
app.use(cors())

// app.use cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.get('/api/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.readonly'],
}));

app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect(`${process.env.CLIENT_URL}/dashboard`);
  }
);
app.use('/api/email', emailRoutes);


const PORT = process.env.PORT || 5500;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));