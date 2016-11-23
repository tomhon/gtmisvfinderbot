var app = require('../app');
var builder = require('botbuilder');
var createQuery = require('../createQuery');


console.log('findGtmDialog registered');

app.dialog.matches('Find_GTM', [
    function (session, args, next) {
        app.appInsightsClient.trackEvent("Find_GTM called"); 
        app.verboseDebug('Find_GTM called', session);
        // Resolve and store any entities passed from LUIS.
        var isvEntity = builder.EntityRecognizer.findEntity(args.entities, 'ISV');
        if (isvEntity) {
            var isv = isvEntity.entity;
            next({response: isv});
            } else {
            // Prompt for isv
            builder.Prompts.text(session, 'Which ISV would you like to find the GTM PBE for?');
            } 
        }
    ,
    function (session, results, next) {
        if (results.response) {
            var isv = results.response;
            app.verboseDebug('ISV ' + isv + ' now recognized', session)
        }
        next({response: isv});

    }
    ,
    function (session, results) {
        var isv = results.response;
        app.verboseDebug('in FIND GTM lookup function, isv = ' + isv, session);
        app.contactQuery(session, createQuery.createContactQueryString(session, isv));
        session.endDialog();
        }
    ]);


   