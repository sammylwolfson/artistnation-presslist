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

router.get("/search", (req, res) => {
  console.log("RQ", req.query);
  Journalist.findAll({
    where: req.query,
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
