const { Journalist } = require('../models');
const casual = require('casual')

const journalistData = [
    {
        first_name: casual.first_name,
        last_name: casual.last_name,
        company: casual.company_name,
        email: casual.email,
        city: casual.city
    },
    {
        first_name: casual.first_name,
        last_name: casual.last_name,
        company: casual.company_name,
        email: casual.email,
        city: casual.city
    },
    {
        first_name: casual.first_name,
        last_name: casual.last_name,
        company: casual.company_name,
        email: casual.email,
        city: casual.city
    },
    {
        first_name: casual.first_name,
        last_name: casual.last_name,
        company: casual.company_name,
        email: casual.email,
        city: casual.city
    },
    {
        first_name: casual.first_name,
        last_name: casual.last_name,
        company: casual.company_name,
        email: casual.email,
        city: casual.city
    },
    {
        first_name: casual.first_name,
        last_name: casual.last_name,
        company: casual.company_name,
        email: casual.email,
        city: casual.city
    },
    {
        first_name: casual.first_name,
        last_name: casual.last_name,
        company: casual.company_name,
        email: casual.email,
        city: casual.city
    },
    {
        first_name: casual.first_name,
        last_name: casual.last_name,
        company: casual.company_name,
        email: casual.email,
        city: casual.city
    },
    {
        first_name: casual.first_name,
        last_name: casual.last_name,
        company: casual.company_name,
        email: casual.email,
        city: casual.city
    },
    {
        first_name: casual.first_name,
        last_name: casual.last_name,
        company: casual.company_name,
        email: casual.email,
        city: casual.city
    },
    {
        first_name: casual.first_name,
        last_name: casual.last_name,
        company: casual.company_name,
        email: casual.email,
        city: casual.city
    },
    {
        first_name: casual.first_name,
        last_name: casual.last_name,
        company: casual.company_name,
        email: casual.email,
        city: casual.city
    },
    {
        first_name: casual.first_name,
        last_name: casual.last_name,
        company: casual.company_name,
        email: casual.email,
        city: casual.city
    },
    {
        first_name: casual.first_name,
        last_name: casual.last_name,
        company: casual.company_name,
        email: casual.email,
        city: casual.city
    }
];

const seedJournalist = () => Journalist.bulkCreate(journalistData);

module.exports = seedJournalist;