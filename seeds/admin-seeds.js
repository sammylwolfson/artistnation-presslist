const { Admin } = require('../models');

const adminData =
[
    {
        username: 'joel',
        password: 'password123'
    },
    {
        username: 'akeva',
        password: 'password123'
    },
    {
        username: 'sammy',
        password: 'password123'
    },
    {
        username: 'debbie',
        password: 'password123'
    }
];

const seedAdmins = () => Admin.bulkCreate(adminData, {individualHooks: true});

module.exports = seedAdmins;