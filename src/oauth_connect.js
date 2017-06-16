const path = require('path');
const fs = require('fs');
const JiraClient = require('jira-connector');

function init(app) {
  app.set('views', path.join(__dirname, '/views'));
  app.set('view engine', 'pug');

  app.get('/', function (req, res) {
    res.render('oauth_step1');
  });

  app.post('/setup/step1', function (req, res) {
    console.log(req.body);

    fs.writeFile(path.join(__dirname + '/conf/config.json'), JSON.stringify(req.body),
      function (err) {
        if (err) {
          res.send(err);
          return console.log(err);
        }
        step1(res);
      });
  });

  app.post('/setup/step2', function (req, res) {
    console.log(req.body);
    step2(res, req.body.verification_code);
  });

  app.post('/setup/step3', function (req, res) {
    console.log(req.body);
    step3(res, req.body.ticket);
  });
}

/**
 * This will output something similar to the following:

 {
     url: 'https://jenjinstudios.atlassian.net/plugins/servlet/oauth/authorize?oauth_token=some-token-here',
     token: 'some-token-here',
     token_secret: 'some-secret-here'
 }

 You can then visit the specified URL, which will display a page asking you to allow or deny the request for access.
 Allowing access will display a verifier code.
 */
function step1(res) {
  console.log("-> oauth step 1");
  var config = require(path.join(__dirname + '/conf/config.json'));
  JiraClient.oauth_util.getAuthorizeURL({
    host: config.jira_url,
    oauth: {
      consumer_key: config.consumer_key,
      private_key: config.private_key
    }
  }, function (error, oauth) {
    console.log(oauth);
    config.token = oauth.token;
    config.token_secret = oauth.token_secret;
    config.jira_oauth_url = oauth.url;

    fs.writeFile(path.join(__dirname + '/conf/config.json'), JSON.stringify(config),
      function (err) {
        if (err) {
          res.send(err);
          return console.log(err);
        }
        res.render('oauth_step2', {jira_oauth_url: config.jira_oauth_url});
      });

  });
}

/**
 * This will query Jira for an Access Token, which will then be printed to the screen. Finally, you're ready to access Jira with OAuth!
 *
 */
function step2(res, oauth_verifier) {
  console.log("-> oauth step 2");
  var config = require(path.join(__dirname + '/conf/config.json'));

  console.log(config.jira_url);
  JiraClient.oauth_util.swapRequestTokenWithAccessToken({
    host: config.jira_url,
    oauth: {
      token: config.token,
      token_secret: config.token_secret,
      oauth_verifier: oauth_verifier,
      consumer_key: config.consumer_key,
      private_key: config.private_key
    }
  }, function (error, accessToken) {
    console.log(accessToken);
    config.token = accessToken;
    fs.writeFile(path.join(__dirname + '/conf/config.json'), JSON.stringify(config),
      function (err) {
        if (err) {
          res.send(err);
          return console.log(err);
        }
        res.render('oauth_step3');
      });
  });
}

/**
 * Read a ticket from JIRA to test the configuration
 */
function step3(res, ticket) {
  console.log("-> oauth step 3");
  var config = require(path.join(__dirname + '/conf/config.json'));

  var jira = new JiraClient({
    host: config.jira_url,
    oauth: {
      consumer_key: config.consumer_key,
      private_key: config.private_key,
      token: config.token,
      token_secret: config.token_secret
    }
  });

  jira.issue.getIssue({issueKey: ticket}, function (error, issue) {
    console.log("JIRA Request complete");
    if (error !== null) {
      res.send(JSON.stringify(error));
    } else {
      config.configured = true;
      fs.writeFile(path.join(__dirname + '/conf/config.json'), JSON.stringify(config),
        function (err) {
          if (err) {
            res.send(err);
            return console.log(err);
          }
          res.send("Setup completed! Please restart this bridge to use!");
        });

    }
  });
}

module.exports.init = init;