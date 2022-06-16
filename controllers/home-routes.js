const router = require("express").Router();
const sequelize = require("../config/connection");
const { Journalist, Admin } = require("../models");
const withAdminAuth = require("../utils/adminAuth");
const withAuth = require("../utils/auth");

router.get("/", withAuth, (req, res) => {
  res.render("homepage", {
    loggedIn: req.session.loggedIn,
    mainAdmin: req.mainAdmin
  });
});

router.get("/login", (req, res) => {
  if (req.session.loggedIn) {
    res.redirect("/");
    return;
  }
  res.render("login");
});

router.get("/journalists", withAuth, (req, res) => {
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
    order: ["first_name"],
  })
    .then((dbJournalistData) => {
      const journalists = dbJournalistData.map((journalist) =>
        journalist.get({ plain: true })
      );
      res.render("journalists", {
        journalists,
        loggedIn: req.session.loggedIn,
        mainAdmin: req.mainAdmin
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

router.get("/search", withAuth, (req, res) => {
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
    order: ["first_name"],
  })
    .then((dbJournalistData) => {
      const journalists = dbJournalistData.map((journalist) =>
        journalist.get({ plain: true })
      );
      res.render("journalists", {
        journalists,
        loggedIn: req.session.loggedIn,
        search: true,
        mainAdmin: req.mainAdmin
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

router.get('/edit/journalist/:id', withAuth, (req, res)=>{
  Journalist.findOne({
    where: {
      id: req.params.id,
    },
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
      if (!dbJournalistData) {
        res.status(404).json({ message: "No journalist found with that id" });
        return;
      }
      const journalist = dbJournalistData.get({ plain: true });
      res.render("single-journalist", {
        journalist,
        loggedIn: true,
        mainAdmin: req.mainAdmin
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

router.get("/settings", withAuth, (req, res) => {
  if (!req.session.loggedIn) {
    res.redirect("/login");
    return;
  }
  res.render("settings", {
    loggedIn: req.session.loggedIn,
    mainAdmin: req.mainAdmin
  });
});


router.get('/admins', withAdminAuth, (req, res)=>{
  Admin.findAll({
    attributes: { exlude: ['password'] }
  })
  .then((dbAdminData) => {
    const admins = dbAdminData.map(admin=>admin.get({ plain: true }))
    res.render('admins', { 
      admins,
      loggedIn: true,
      mainAdmin: req.mainAdmin
     })
  })
  .catch((err) => {
    console.log(err);
    res.status(500).json(err);
  });
});

module.exports = router;
