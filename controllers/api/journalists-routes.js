const router = require("express").Router();
const Journalist = require("../../models/Journalist");
const withAuth = require("../../utils/auth");
// /api/journalists routes

// get all journalists
router.get("/", withAuth, (req, res) => {
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
    .then((dbJournalistData) => res.json(dbJournalistData))
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

// get journalist by id???
router.get("/:id", withAuth, (req, res) => {
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
      res.json(dbJournalistData);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

// get journalists by search for: first name, last name, city, email, company, date added
router.post("/search", withAuth, (req, res) => {
  // logic to omit from where if null
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
      if (!dbJournalistData) {
        res
          .status(404)
          .json({ message: "No journalist found matching this criteria" });
        return;
      }
      res.status(200).json(dbJournalistData);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

// create new journalist
router.post("/", withAuth, (req, res) => {
  Journalist.create({
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    company: req.body.company,
    email: req.body.email,
    city: req.body.city
  })
    .then((dbJournalistData) => res.json(dbJournalistData))
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});
// update journalist
router.put("/:id", (req, res) => {
  Journalist.update(req.body, {
    where: {
      id: req.params.id,
    },
  })
    .then((dbJournalistData) => {
      if (!dbJournalistData) {
        res.status(404).json({ message: "No journalist found with that id" });
        return;
      }
      res.json(dbJournalistData);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

// delete journalist
router.delete("/:id", withAuth, (req, res) => {
  Journalist.destroy({
    where: {
      id: req.params.id,
    },
  })
    .then((dbJournalistData) => {
      if (!dbJournalistData) {
        res.status(404).json({ message: "No journalist found with that id" });
        return;
      }
      res.json(dbJournalistData);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

module.exports = router;
