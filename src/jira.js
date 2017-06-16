const request = require('request');
const JiraClient = require('jira-connector');
const path = require('path');
const config = require(path.join(__dirname + '/conf/config.json'));

// Verbindung zum Jira Server
var jira = new JiraClient({
  host: config.jira_url,
  oauth: {
    token: config.token,
    token_secret: config.token_secret,
    consumer_key: config.consumer_key,
    private_key: config.private_key
  }
});

function init(app) {
  app.use('/', function (req, res) {
    // Sicherheitsprüfung
    if (config.mattermost_token !== req.body.token) {
      res.json({
        "response_type": "ephemeral",
        "text": "Security Token stimmt nicht überein"
      });
      return;
    }

    if (!/[A-Z]+-[0-9]+/.test(req.body.text)) {
      res.json({
        "response_type": "ephemeral",
        "text": "Keine gültige Ticketnummer gefunden"
      });
      return;
    }

    var machtes = req.body.text.match(/[A-Z]+-[0-9]+/mg);
    var attachments = {list: []};
    for (var i in machtes) {
      if (machtes.hasOwnProperty(i)) {
        var issueNummer = machtes[i].trim();
        jira.issue.getIssue({issueKey: issueNummer}, create_attachments(res, req, issueNummer, attachments, machtes.length));
      }
    }
  });
}

/**
 * Erzeugt ein Attachment pro Jira Issue.
 * Da Issues asynchron geladen werden, wird die komplette Nachricht zurück gegeben, wenn alle Callbacks geladen wurden.
 * @param res Response zum Klienten
 * @param req Request vom Klienten
 * @param issueNummer JIRA Nummer
 * @param attachments Array mit Attachments
 * @param callbackCount Anzahl der Callbacks, die erwartet werden.
 * @returns {Function} Callback Funktion
 */
function create_attachments(res, req, issueNummer, attachments, callbackCount) {
  return function (error, issue) {
    if (issue !== null) {
      var text = "[" + issueNummer + " " + issue.fields.summary + "](" + config.jira_url + "/browse/" + issueNummer + ")";
      var fixVersions = "";

      for (var id in issue.fields.fixVersions) {
        if (issue.fields.fixVersions.hasOwnProperty(id)) {
          fixVersions += issue.fields.fixVersions[id].name + ", "
        }
      }

      attachments.list.push({
        'fallback': 'Jira issue posted.',
        'text': text,
        'fields': [
          {
            'short': true,
            'title': 'Type',
            'value': issue.fields.issuetype.name
          },
          {
            'short': true,
            'title': 'Status',
            'value': issue.fields.status.name
          },
          {
            'short': true,
            'title': 'Assignee',
            'value': issue.fields.assignee !== null ? issue.fields.assignee.displayName : "Kein Bearbeiter"
          },
          {
            'short': true,
            'title': 'Versions',
            'value': fixVersions
          }
        ]
      });

      if (attachments.list.length === callbackCount) {
        res.json({
          'response_type': 'in_channel',
          'channel': req.body.channel_name,
          'username': req.body.user_name,
          'text': req.body.text,
          'attachments': attachments.list
        });
      }
    } else {
      console.log(error);
    }
  };
}


module.exports.init = init;