const router = require("express").Router();
const sequelize = require("../config/connection");
const { Journalist } = require("../models");

router.get("/", (req, res) => {
  if (!req.session.loggedIn) {
    res.redirect("/login");
    return;
  }
  res.render("homepage", {
    loggedIn: req.session.loggedIn,
  });
});

router.get("/login", (req, res) => {
  if (req.session.loggedIn) {
    res.redirect("/");
    return;
  }
  res.render("login");
});

router.get("/journalists", (req, res) => {
  Journalist.findAll({
    attributes: [
      "id",
      "first_name",
      "last_name",
      "company",
      "city",
      "created_at",
      "email",
    ],
  })
    .then((dbJournalistData) => {
      const journalists = dbJournalistData.map((journalist) =>
        journalist.get({ plain: true })
      );
      res.render("journalists", {
        journalists,
        loggedIn: req.session.loggedIn,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

router.post("/search", (req, res) => {
  let body = {};
  //if parameter is not null, add property to body object (may need to be !=" ")
  if (req.body.first_name) {
    body.first_name = req.body.first_name;
  }
  if (req.body.last_name) {
    body.last_name = req.body.last_name;
  }
  if (req.body.city) {
    body.city = req.body.city;
  }
  if (req.body.email) {
    body.email = req.body.email;
  }
  if (req.body.company) {
    body.company = req.body.company;
  }
  if (req.body.date_added) {
    body.date_added = req.body.date_added;
  }
  console.log("body", body);
  Journalist.findAll({
    where: body,
    attributes: [
      "id",
      "first_name",
      "last_name",
      "email",
      "city",
      "company",
      "created_at",
    ],
  })
    .then((dbJournalistData) => {
      const journalists = dbJournalistData.map((journalist) =>
        journalist.get({ plain: true })
      );

      console.log("response", journalists);
      res.render("journalists", {
        journalists,
        loggedIn: req.session.loggedIn,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

module.exports = router;
