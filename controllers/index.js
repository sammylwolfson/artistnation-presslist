const router = require("express").Router();
const apiRoutes = require("./api");
const homeRoutes = require("./home-routes");

router.use("/api", apiRoutes);
router.use("/", homeRoutes);

// if a request is made to endpoint that doesn't exist, a 404 error will occur
router.use((req, res) => {
  res.status(404).end();
});

module.exports = router;
