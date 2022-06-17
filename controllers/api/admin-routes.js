const router = require("express").Router();
const { Admin } = require("../../models");
const withAuth = require("../../utils/auth");

// /api/admin routes

//get all admin
router.get("/", (req, res) => {
  Admin.findAll({
    attributes: { exclude: ["password"] },
  })
    .then((dbAdminData) => res.status(200).json(dbAdminData))
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

// get admin by id
router.get("/:id", (req, res) => {
  Admin.findOne({
    attributes: { exclude: ["password"] },
    where: {
      id: req.params.id,
    },
  })
    .then((dbAdminData) => {
      if (!dbAdminData) {
        res.status(404).json({ message: "No admin found with this id" });
        return;
      }
      res.status(200).json(dbAdminData);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

// create admin
router.post("/", withAuth, (req, res) => {
  Admin.create({
    username: req.body.username,
    password: req.body.password,
  })
    .then((dbAdminData) => {
      if (req.session.mainAdmin) {
        res.redirect('/admins');
        return;
      }
      req.session.save(() => {
        req.session.user_id = dbAdminData.id;
        req.session.username = dbAdminData.username;
        req.session.loggedIn = true;

        console.log(dbAdminData);
        res.json(dbAdminData);
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

// admin login
router.post("/login", (req, res) => {
  console.log(req.body);
  Admin.findOne({
    where: {
      username: req.body.username,
    },
  }).then((dbAdminData) => {
    if (!dbAdminData) {
      res.status(404).json({ message: "No admin found with that username" });
      return;
    }
    const validPassword = dbAdminData.checkPassword(req.body.password);
    if (!validPassword) {
      res.status(400).json({ message: "incorrect password" });
      return;
    }

    req.session.save(() => {
      req.session.user_id = dbAdminData.id;
      req.session.username = dbAdminData.username;
      req.session.loggedIn = true;

      res.json({ user: dbAdminData, message: "logged in" });
    });
  });
});

//admin logout
router.post("/logout", (req, res) => {
  if (req.session.loggedIn) {
    req.session.destroy(() => {
      res.status(204).end();
    });
  } else {
    res.status(404).end();
  }
});

// change password
router.put("/password", withAuth, (req, res) => {
  Admin.update(
    {
      password: req.body.new_password,
    },
    {
      individualHooks: true,
      where: {
        id: req.session.user_id,
      },
    }
  )
    .then((dbAdminData) => {
      if (!dbAdminData[0]) {
        res.status(404).json({ message: "No admin found with this id" });
        return;
      }
      res.status(200).json(dbAdminData);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

// change username
router.put("/username", withAuth, (req, res) => {
  Admin.update(
    {
      username: req.body.username,
    },
    {
      where: {
        id: req.session.user_id,
      },
    }
  )
    .then((dbAdminData) => {
      if (!dbAdminData[0]) {
        res.status(404).json({ message: "No admin found with this id" });
        return;
      }
      res.status(200).json(dbAdminData);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

// delete admin
router.delete("/:id", withAuth, (req, res) => {
  Admin.destroy({
    where: {
      id: req.params.id,
    },
  })
    .then((dbAdminData) => {
      if (!dbAdminData) {
        res.status(404).json({ message: "No admin found with this id" });
        return;
      }
      res.json(dbAdminData);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(err);
    });
});

module.exports = router;
