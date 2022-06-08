const seedAdmins = require('./admin-seeds');
const seedJournalist = require('./jounnalist-seeds');

const sequalize = require('../config/connection');

const seedAll = async () =>{
    await sequalize.sync({ force: true });
    console.log('-----------------');
    await seedAdmins();
    console.log('-----------------');

    await seedJournalist();
    console.log('-----------------');

    process.exit(0);
};

seedAll();