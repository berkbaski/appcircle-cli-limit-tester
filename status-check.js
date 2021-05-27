const minimist = require('minimist');
const { getLogs } = require('./log');
const { buildStatus, getToken, checkBuildStatus } = require('./app-circle-api');
require('dotenv').config();

const argv = minimist(process.argv.slice(2));

const uuid = argv['uuid'] || '';

let accessToken = undefined;

if (!uuid) {
    console.error('UUID param is required');
    return;
}

async function main() {
    try {
        const logs = getLogs();
        const selectedLog = logs[uuid];

        if (!selectedLog) {
            console.error('Log not found. Check your UUID');
            return;
        }

        const personalApiToken = process.env.AC_PAT;
        if (!personalApiToken) {
            console.error('PAT is required. You must add AC_PAT to .env file.\n');
            return;
        }

        accessToken = await getToken(personalApiToken);

        console.table({ buildCount: selectedLog.buildCount, uploadCount: selectedLog.uploadCount });

        const buildStatusList = [];

        for (const log of selectedLog.builds) {
            const statusResponse = await checkBuildStatus({
                latestCommitId: log.latestCommitId,
                taskId: log.taskId,
                access_token: accessToken
            });
            buildStatusList.push({ buildNumber: log.buildNumber, status: buildStatus[statusResponse.status] })
            console.info(`${log.buildNumber}. build status: ${buildStatus[statusResponse.status]}`);
        }
    } catch (error) {
        if (error.response) {
            switch (error.response.status) {
                case 401:
                    console.error('\nError: PAT is not valid');
                    break;
                case 402:
                    console.error('\nError: Payment required');
                    break;
                default:
                    console.error('\nAn error has occured. Details: ', error.response);
                    break;
            }
        } else {
            console.error('\nAn error has occurred. Details:', error);
        }
    }
}

main();