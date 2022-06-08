const router = require("express").Router();
const journalistsRoutes = require("./journalists-routes");
const adminRoutes = require("./admin-routes");

router.use("/journalists", journalistsRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
