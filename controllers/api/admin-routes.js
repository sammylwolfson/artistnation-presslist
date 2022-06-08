const router = require("express").Router();
const { Admin } = require("../../models");

// /api/admin routes

//get all admin
router.get("/", (req, res) => {});

// get admin by id
router.get("/:id", (req, res) => {});

// create admin
router.post("/", (req, res) => {});

// admin login
router.post("/login", (req, res) => {});

//admin logout
router.post("/logout", (req, res) => {});

// update admin
router.put("/:id", (req, res) => {});

// delete admin
router.delete("/:id", (req, res) => {});

module.exports = router;
