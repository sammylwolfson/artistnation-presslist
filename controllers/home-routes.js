const router = require("express").Router();
const sequelize = require("../config/connection");
const {Journalist} = require("../models")

router.get("/", (req, res) => {
  res.render("homepage");
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
      const journalists = dbJournalistData.map((journalist) => journalist.get({ plain: true }));
     res.render("journalists",{journalists,loggedIn: req.session.loggedIn})
})
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

router.get('/journalist/:id', (req, res)=>{
  Journalist.findOne({
    where: {
      id: req.params.id
    },
    attributes: [
      "id",
      "first_name",
      "last_name",
      "company",
      "city",
      "created_at",
      "email",
    ]
  })
  .then(dbJournalistData=>{
    if(!dbJournalistData){
      res.status(404).json({ message: 'No journalist found with that id' });
      return;
    }
    const journalist = dbJournalistData.get({ plain: true });
    res.render(
      'single-journalist',
       {
        journalist,
        loggedIn: true
      })
  })
  .catch(err=>{
    console.log(err);
    res.status(500).json(err);
  });
});


router.get('/search/:id', (req, res)=>{
  console.log(req.params.id.split(','))
  Journalist.findAll({
    where: {
      id: req.params.id.split(',')
    },
    attributes: [
      "id",
      "first_name",
      "last_name",
      "company",
      "city",
      "created_at",
      "email",
    ]
  })
  .then(dbJournalistData=>{
    if(!dbJournalistData){
      res.status(404).json({ message: 'No journalist found with that id' });
      return;
    }
    const journalists = dbJournalistData.map((journalist) => journalist.get({ plain: true }));
    res.render(
      'journalists',
       {
        journalists,
        loggedIn: true
      })
  })
  .catch(err=>{
    console.log(err);
    res.status(500).json(err);
  });
});


module.exports = router;
