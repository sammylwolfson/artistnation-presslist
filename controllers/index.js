const router = require("express").Router();
const apiRoutes = require("./api");

router.use("/api", apiRoutes);

// if a request is made to endpoint that doesn't exist, a 404 error will occur
router.use((req, res) => {
  res.status(404).end();
});

module.exports = router;
