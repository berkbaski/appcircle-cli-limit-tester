const { exec } = require("child_process");
const { getLogs, setLogs } = require('./log');
const { uploadArtifact, getToken, startBuild } = require('./app-circle-api');
const { v4: uuid } = require('uuid');

require('dotenv').config();

let accessToken = undefined;
let newLog = {};

async function main() {
    try {
        const personalApiToken = process.env.AC_PAT;
        if (!personalApiToken) {
            console.error('PAT is required. You must add AC_PAT to .env file.\n');
            return;
        }

        const appId = process.env.APP_ID;
        if (!appId) {
            console.error('APP_ID is required. You must add APP_ID to .env file.\n');
            return;
        }

        const profileId = process.env.DISTRIBUTE_PROFILE_ID;
        if (!profileId) {
            console.error('DISTRIBUTE_PROFILE_ID is required. You must add DISTRIBUTE_PROFILE_ID to .env file.\n');
            return;
        }

        const appPath = process.env.APP_PATH;
        if (!personalApiToken) {
            console.error('APP_PATH is required. You must add APP_PATH to .env file.\n');
            return;
        }

        const appBranch = process.env.APP_BRANCH || 'master';
        const buildCount = parseInt(process.env.BUILD_TRY_COUNT || 0);
        const uploadCount = parseInt(process.env.UPLOAD_TRY_COUNT || 0);

        accessToken = await getToken(personalApiToken);
        await setAccessTokenToEnvironmentVariables(accessToken);

        newLog = {
            id: uuid(),
            buildCount,
            uploadCount,
            date: new Date(),
            builds: [],
            uploads: []
        };

        console.info(`AppCircle Limit Tester will try ${buildCount} times build.\n`)

        for (let i = 1; i <= buildCount; i++) {
            await buildVersion(i, appId, appBranch);
        }

        console.log('---------------------------------------------------\n');

        console.info(`AppCircle Limit Tester will try ${uploadCount} times upload.\n`)

        for (let i = 1; i <= uploadCount; i++) {
            await uploadVersion(i, appPath, profileId);
        }

        const logs = getLogs();
        logs[newLog.id] = newLog;
        setLogs(logs);
    } catch (error) {
        console.error('An error has occurred. Details: ', error);
    }
}

main();

async function setAccessTokenToEnvironmentVariables(accessToken) {
    return new Promise((res, rej) => {
        process.env.AC_ACCESS_TOKEN = accessToken;
        exec(
            `export AC_ACCESS_TOKEN=${accessToken}
             bash -c 'echo $AC_ACCESS_TOKEN'
            `,
            (error, stdout, stderr) => {
                error ? rej(error) : res(true);
            }
        )
    })
}

async function buildVersion(buildNumber, appId, branch) {
    return new Promise(async (res, rej) => {
        const buildResponse = await startBuild({
            branch,
            profileId: appId,
            access_token: accessToken
        });
        newLog.builds.push({
            buildNumber,
            responseDate: new Date(),
            ...buildResponse
        });
        console.info(`Sent ${buildNumber}. build\n`);
        res();
    });
}

async function uploadVersion(buildNumber, appPath, profileId) {
    return new Promise(async (res, rej) => {
        try {
            const uploadResponse = await uploadArtifact({
                access_token: accessToken,
                app: appPath,
                profileId,
                message: `${buildNumber}. upload | AppCircle Limit Tester`
            });
            newLog.uploads.push({
                buildNumber,
                responseDate: new Date(),
                ...uploadResponse
            });
            console.info(`Sent ${buildNumber}. upload\n`);
            res();
        } catch (error) {
            rej(error);
        }
    });
}
