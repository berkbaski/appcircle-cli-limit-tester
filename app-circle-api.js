const https = require('https');
const qs = require('querystring');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const HOSTNAME = "https://api.appcircle.io";
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));
const buildStatus = {
    "0": "Success",
    "1": "Failed",
    "2": "Canceled",
    "3": "Timeout",
    "90": "Waiting",
    "91": "Running",
    "92": "Completing",
    "99": "Unknown"
};

function genericRequest(args) {
    let { options, data, onSuccess, onError } = args
    const req = https.request(options, function (res) {
        var chunks = [];

        res.on("data", function (chunk) {
            chunks.push(chunk);
        });

        res.on("end", function () {
            var body = Buffer.concat(chunks);
            onSuccess && onSuccess(body.toString());
        });

        req.on('error', error => {
            onError && onError(error);
        });
    });

    if (data) {
        req.write(data);
    }
    req.end();
}

async function getToken(pat) {
    var options = {
        "method": "POST",
        "hostname": "auth.appcircle.io",
        "path": "/auth/v1/token",
        "headers": {
            "accept": "application/json",
            "content-type": "application/x-www-form-urlencoded"
        }
    };

    return new Promise((res, rej) => {
        genericRequest({
            options: options,
            data: qs.stringify({ pat }),
            onSuccess: (bodyString) => {
                res((JSON.parse(bodyString).access_token));
            },
            onFailure: (error) => {
                rej(error);
            }
        });
    });
}

async function getDistributionProfiles(access_token) {
    try {
        const distProfiles = await axios.get(`${HOSTNAME}/distribution/v2/profiles`,
            {
                headers: {
                    "accept": "application/json",
                    "Authorization": `Bearer ${access_token}`
                }
            });
    } catch (error) {
        console.error(error);
    }
}

function createDistributionProfile(access_token) {
    var options = {
        "method": "POST",
        "hostname": "auth.appcircle.io",
        "path": "/distribution/v2/profiles",
        "headers": {
            "accept": "text/plain",
            "content-type": "application/json-patch+json",
            "Authorization": `Bearer ${access_token}`
        }
    };

    genericRequest({
        options: options,
        data: "{\"name\": \"my-test-dist1\"}",
        onSuccess: (bodyString) => {
            console.log('\x1b[36m', 'Created the distribution profile', '\x1b[0m');
            console.log((JSON.parse(bodyString)));
        },
        onFailure: (error) => {
            console.log(error);
        }
    });
}

function getTestingGroups(access_token) {
    var options = {
        "hostname": "auth.appcircle.io",
        "path": "/distribution/v2/testing-groups",
        "headers": {
            "accept": "application/json",
            "Authorization": `Bearer ${access_token}`
        }
    };
    genericRequest({
        options: options,
        onSuccess: (bodyString) => {
            console.log('\x1b[36m', 'Testing Groups: ', '\x1b[0m');
            console.log((JSON.parse(bodyString)));
        },
        onFailure: (error) => {
            console.log(error);
        }
    });
}

async function getBuildProfiles(access_token) {
    let buildProfiles = await axios.get(`${HOSTNAME}/build/v2/profiles`,
        {
            headers: {
                "accept": "application/json",
                "Authorization": `Bearer ${access_token}`
            }
        });
    console.log("Build profiles: ", buildProfiles);
}

// branch: args.branch,
// profileId: args.id,
// access_token: access_token
async function startBuild(options) {
    try {
        let getBranchListResponse = await axios.get(`${HOSTNAME}/build/v2/profiles/${options.profileId}`,
            {
                headers: {
                    "accept": "application/json",
                    "Authorization": `Bearer ${options.access_token}`
                }
            });

        const branches = getBranchListResponse.data.branches;
        const index = branches.findIndex(element => element.name === options.branch);
        const branchId = branches[index].id;

        const allCommitsByBranchId = await axios.get(`${HOSTNAME}/build/v2/commits?branchId=${branchId}`,
            {
                headers: {
                    "accept": "application/json",
                    "Authorization": `Bearer ${options.access_token}`
                }
            });
        const latestCommitId = allCommitsByBranchId.data[0].id;

        const buildResponse = await axios.post(`${HOSTNAME}/build/v2/commits/${latestCommitId}?purpose=1`,
            qs.stringify({ sample: 'test' }),
            {
                headers: {
                    "accept": "*/*",
                    "authorization": `Bearer ${options.access_token}`,
                    "content-type": "application/x-www-form-urlencoded"
                }
            }
        );
        return { ...buildResponse.data, latestCommitId };
    } catch (error) {
        throw new Error(error);
    }
}

async function checkBuildStatus(options) {
    const taskStatus =
        await axios.get(`${HOSTNAME}/build/v2/commits/${options.latestCommitId}/builds/${options.taskId}/status`,
            {
                headers: {
                    "accept": "application/json",
                    "Authorization": `Bearer ${options.access_token}`
                }
            });
    return taskStatus.data;
}

async function uploadArtifact(options) {
    return new Promise((res, rej) => {
        const form = new FormData();
        const apkFile = fs.createReadStream(options.app);

        form.append('File', apkFile);
        if (options.message) {
            form.append('Message', options.message);
        }
        const req = https.request(
            {
                host: 'api.appcircle.io',
                path: `/distribution/v2/profiles/${options.profileId}/app-versions`,
                method: 'POST',
                headers: {
                    ...form.getHeaders(),
                    "accept": "*/*",
                    "authorization": `Bearer ${options.access_token}`
                },
            },
            response => {
                response.setEncoding('utf8');
                if ([200, 201, 202].includes(response.statusCode)) {
                    response.on('data', data => {
                        return res(JSON.parse(data));
                    });
                } else {
                    return rej(response.statusMessage);
                }
            }
        );

        form.pipe(req);
    });
}

module.exports = {
    buildStatus,
    getToken,
    getDistributionProfiles,
    createDistributionProfile,
    getTestingGroups,
    getBuildProfiles,
    startBuild,
    checkBuildStatus,
    uploadArtifact
}