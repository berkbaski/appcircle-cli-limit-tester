const fs = require('fs');
require('dotenv').config();

function getLogs() {
    const jsonData = fs.readFileSync(`./tmp/${process.env.LOG_JSON_NAME}`);
    return JSON.parse(jsonData);
}

function setLogs(data) {
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFileSync(`./tmp/${process.env.LOG_JSON_NAME}`, jsonData);
}

module.exports = {
    getLogs,
    setLogs
}