const router = require("express").Router();
const journalistsRoutes = require("./journalists-routes");

router.use("/journalists", journalistsRoutes);

module.exports = router;
