const router = require("express").Router();
const { Journalists } = require("../../models");

// /api/journalists routes

// get all journalists

// get journalist by id?

// get journalists by search for: first name, last name, city, email, company, date added
router.get(
  "/:first_name?/:last_name?/:city?/:email?/:company?/:date_added?",
  (req, res) => {
    // logic to omit from where if null
    let params = {};
    //if parameter is not null, add property to params object (may need to be !=" ")
    if (req.params.first_name) {
      params.first_name = req.params.first_name;
    }
    if (req.params.last_name) {
      params.last_name = req.params.last_name;
    }
    if (req.params.city) {
      params.city = req.params.city;
    }
    if (req.params.email) {
      params.email = req.params.email;
    }
    if (req.params.company) {
      params.company = req.params.company;
    }
    if (req.params.date_added) {
      params.date_added = req.params.date_added;
    }
    Journalists.findAll({
      where: params,
      attributes: [
        "id",
        "first_name",
        "last_name",
        "email",
        "city",
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
  }
);

// create new journalist

// update journalist

// delete journalist

module.exports = router;
