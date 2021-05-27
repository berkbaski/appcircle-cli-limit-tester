# appcircle-cli-limit-tester
Limit Tester for AppCircle CLI
This CLI was created to test the limits of AppCircle.
## Project Setup
````shell
$ git clone https://github.com/berkbaski/appcircle-cli-limit-tester
````
## Install Dependencies
````shell
$ npm install
````
## Config
````env
AC_PAT=Your Personal API Token
APP_ID=Your app ID on AppCircle
DISTRIBUTE_PROFILE_ID=Your Distribute Profile ID on AppCircle
APP_PATH=File path of the app to be uploaded
APP_BRANCH=Branch name of the version to rebuild
BUILD_TRY_COUNT=Count of build
UPLOAD_TRY_COUNT=Count of upload
LOG_JSON_NAME=JSON file name to write logs
````
## Build & Upload
````shell
npm run start
````
## Check Build Status
````shell
npm run status-check -- --uuid="YOUR UUID"
````
## How to work?
This CLI sometimes communicate to [AppCircle CLI](https://github.com/appcircleio/appcircle-cli),
When you execute ````npm run start````,
  It will read the config values on your `.env` file. It's will throw an error if you don't have some values or have wrong values.
  It will start to build as many as your `BUILD_TRY_COUNT` number in your `.env` file.
  It will start to build as many as your `BUILD_TRY_COUNT` number in your `.env` file.
