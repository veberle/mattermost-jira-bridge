'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const oauth_connect = require('./oauth_connect');
const path = require('path');
const config = require(path.join(__dirname + '/conf/config.json'));

// Constants
const PORT = 3000;

// App
const app = express();

app.use(bodyParser.json());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// initialize the jira bridge or start oauth config module
if (config.configured !== undefined) {
  const jira = require('./jira');
  jira.init(app);
} else {
  oauth_connect.init(app);
}

app.listen(PORT, "0.0.0.0");
console.log('Running on http://localhost:' + PORT);