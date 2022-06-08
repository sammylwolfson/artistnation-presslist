const router = require("express").Router();
const Journalist = require("../../models/Journalist");
const withAuth = require('../../utils/auth');
// /api/journalists routes

// get all journalists
router.get('/', withAuth, (req, res)=>{
    Journalist.findAll({
        attributes: [
            'id',
            'first_name',
            'last_name',
            'company',
            'created_at',
            'email'
        ]
    })
    .then(dbJournalistData=> res.json(dbJournalistData))
    .catch(err=>{
        console.log(err);
        res.status(500).json(err);
    });
});

// get journalist by id???
router.get('/:id', withAuth, (req, res)=>{
    Journalist.findOne({
        where: {
            id: req.params.id
        },
        attributes: [
            'id',
            'first_name',
            'last_name',
            'company',
            'created_at',
            'email'
        ]
    })
    .then(dbJournalistData=>{
        if (!dbJournalistData){
            res.status(404).json({ message: 'No journalist found with that id' });
            return;
        }
        res.json(dbJournalistData);
    })
    .catch(err=>{
        console.log(err);
        res.status(500).json(err);
    });
});

// get journalists by first name

// get journalists by last name

// get journalists by city

// get journalist by email

// get journalist company

// get journalists by date added

// create new journalist
router.post('/', withAuth, (req, res)=>{
    Journalist.create({
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        company: req.body.company,
        email: req.body.email
    })
    .then(dbJournalistData=>res.json(dbJournalistData))
    .catch(err=>{
        console.log(err);
        res.status(500).json(err);
    });
});
// update journalist
router.put('/:id', withAuth, (req, res)=>{
    Journalist.update(req.body, {
        where: {
            id: req.params.id
        }
    })
    .then(dbJournalistData=>{
        if (!dbJournalistData){
            res.status(404).json({ message: 'No journalist found with that id' });
            return;
        }
        res.json(dbJournalistData);
    })
    .catch(err=>{
        console.log(err);
        res.status(500).json(err);
    });
});

// delete journalist
router.delete('/:id', withAuth, (req, res)=>{
    Journalist.destroy({
        where: {
            id: req.params.id
        }
    })
    .then(dbJournalistData=>{
        if (!dbJournalistData){
            res.status(404).json({ message: 'No journalist found with that id' });
            return;
        }
        res.json(dbJournalistData);
    })
    .catch(err=>{
        console.log(err);
        res.status(500).json(err);
    });
});