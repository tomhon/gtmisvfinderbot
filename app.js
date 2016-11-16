

var restify = require('restify');
var server = restify.createServer();
// var o = require('odata');
var cache = require('memory-cache');
var builder = require('botbuilder');


var AppInsights = require('applicationinsights');
var appInsightsClient = AppInsights.getClient();
appInsightsClient.trackEvent("ISV Finder Bot Started");


server.listen(process.env.port || 3978, function () {
    console.log('%s listening to %s', server.name, server.url); 
});

var debugMode = false;

function verboseDebug(event, session) {
    if (debugMode || (process.env.NODE_ENV == "development" )) {
    if (session) {session.send(event);}
    console.log(event);
    }
}



//Connect to SQL Server
var Request = require('tedious').Request;
var TYPES = require('tedious').TYPES; 
var Connection = require('tedious').Connection;

//initialize mapping data array

//mappingArray is sourced from SQL Server
var mappingArray = new Array();

function isv() {
    this.id = 0;
    this.title = "";
    this.TE = "";
    this.BE = "";
}


//error logging array
var arrayErr = new Array();



// set up K9 SQL server connection using Application Environment Variables

var k9config = {
    userName: process.env.SQLuserName,
    password: process.env.SQLpassword,
    server: process.env.SQLserver,
    // If you are on Microsoft Azure, you need this:
    options: {encrypt: true, database: process.env.SQLdatabase}
};

var k9connection = new Connection(k9config);
k9connection.on('connect', function(err) {
    // If no error, then good to proceed.
    
        if (err) {
           console.log(err);

        } else {
          console.log("Connected to " + this.config.server + " " + this.config.options.database);
          arrayErr.push("Connected to " + this.config.server);
          loadk9MappingArray();  

        };
        
        
});
 //function to execute SQL query    
    
 function loadk9MappingArray() {
      
        request = new Request("SELECT VsoId, Title, AssignedTE, AssignedBE FROM dbo.PartnerIsvs", function(err) {
         if (err) {
            console.log(err);
            arrayErr.push(err);
          }
        else {
            console.log('SQL request succeeded');
            arrayErr.push("SQL request succeeded");
          }
        });

    //unpack data from SQL query
        request.on('row', function(columns) {
            var oIsv = new isv();
            columns.forEach(function(column) {
              if (column.value === null) {
                // mappingArray.push('');
              } else {
                    switch(column.metadata.colName) {
                        case "AssignedTE": 
                            oIsv.TE = column.value;
                            break;
                        case "AssignedBE":
                            oIsv.BE = column.value;
                            break;
                        case "Title":
                            oIsv.title = column.value;
                            break;
                        case "VsoId":
                            oIsv.id = column.value;
                            break;  
                        }  

                    }

            });
            mappingArray.push(oIsv);
            // console.log(oIsv);
        }); 

        k9connection.execSql(request);
    };








//Configure Odata Source 


//
// Set up Connection to GTM SQL db
//
var GTMconfig = {
    userName: process.env.GTMSQLuserName,
    password: process.env.GTMSQLpassword,
    server: process.env.GTMSQLserver,
    options: {encrypt: true, database: process.env.GTMSQLdatabase}
};

var GTMconnection = new Connection(GTMconfig);
GTMconnection.on('connect', function(err) {
    // If no error, then good to proceed.
            if (err) {
            verboseDebug(err);
            arrayErr.push(err.message);
        } else {
        verboseDebug("Connected to " + this.config.server + " " + this.config.options.database);



        };               
});

function isvCard() {
    this.appId = 0;
    this.isvName = "";
    this.appName = "";
    this.industry = "";
    this.crossIndustry = "";
    this.platform = "";
    this.sellCountry = "";
    this.originCountry = "";
    this.gtmTier = "";
    this.businessModel = "";
    this.readiness = "";
    this.gtmContact = "";
    this.pbeContact = "";
    this.teContact = "";
    this.url = "";
}

var queryString = "";
var noResults = true;
var resultsArray = new Array();


//===============================================
// Create Readiness name to value map
//===============================================

var readinessMap = new Array();
    readinessMap[0] = "Not Ready";
    readinessMap[1] = "Co-Marketing Ready";
    readinessMap[2] = "Co-Sell Ready";
    readinessMap[3] = "Co-Sell Recomended";

// Create bot and bind to chat
var connector = new builder.ChatConnector({
    appId: process.env.AppID,
    appPassword: process.env.AppSecret
    });
var bot = new builder.UniversalBot(connector);

var searchLimit = 5; //restrict number of results found


server.post('/api/messages', connector.listen());

function initializeSearch(session) {
        session.userData.geography = "%"
        session.userData.industry = "%"
        session.userData.platform = {'name': "%", 'IsAzure': true, 'IsDynamics': true, 'IsOffice365': true, 'IsSqlServer': true, 'IsWindows': true};
        session.userData.readiness = {'name': "Any", value: 0}
}

// Create LUIS recognizer that points at our model and add it as the root '/' dialog for our Cortana Bot.
var model = process.env.LUISServiceURL;
var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.use(builder.Middleware.firstRun({ version: 1.0, dialogId: '*:/firstRun' }));



bot.dialog('/', dialog);

//=============================
//Dialog to handle first run
//============================
bot.dialog('/firstRun', [ 
    function (session) { 
         builder.Prompts.text(session, "Hello... What's your name?"); 
     }, 
     function (session, results) { 
         // We'll save the users name and send them an initial greeting. All  
         // future messages from the user will be routed to the root dialog. 
         session.userData.name = results.response; 
         session.send("Hi %s, welcome to ISVFinderBot. I can help you recomend Applications for your partners as well as find DX contacts.", session.userData.name);
         initializeSearch(session);
         session.replaceDialog('/Help');  
     } 
 ]); 

//===============================================
// Piece together the query string
//==============================================

function createQueryString(session) {
        queryString = "SELECT TOP " + searchLimit + " Application.ApplicationId, Application.ApplicationName, Application.AccountName, Application.IndustryName, Application.IndustrialSectorName, Application.PlatformName, Application.Readiness, Account.GtmTier, Country.Name AS CountryName, Channel.Name AS ChannelName" 
        + " FROM dbo.Application" 
        + " LEFT JOIN dbo.Account ON Application.AccountId=Account.AccountId"
        + " LEFT JOIN dbo.ApplicationCountry ON Application.ApplicationID=ApplicationCountry.ApplicationId"
        + " LEFT JOIN dbo.Country ON ApplicationCountry.CountryId=Country.CountryId"
        + " LEFT JOIN dbo.ApplicationChannel ON Application.ApplicationId=ApplicationChannel.ApplicationId"
        + " LEFT JOIN dbo.Channel ON ApplicationChannel.ChannelId=Channel.ChannelId"
        + " WHERE ("
        + " ("
        +  "(Application.IsAzure = 'true' AND Application.IsAzure = '" + session.userData.platform.IsAzure + "')"
        +  "OR (Application.IsDynamics = 'true' AND Application.IsDynamics = '" + session.userData.platform.IsDynamics + "')"
        +  "OR (Application.IsOffice365 = 'true' AND Application.IsOffice365 = '" + session.userData.platform.IsOffice365 + "')"
        +  "OR (Application.IsSqlServer = 'true' AND Application.IsSqlServer = '" + session.userData.platform.IsSqlServer + "')"
        +  "OR (Application.IsWindows = 'true' AND Application.IsWindows = '" + session.userData.platform.IsWindows + "')"
        + ")"
        + " AND Country.Name LIKE '" + session.userData.geography + "'"  
        + " AND Application.IndustrialSectorName LIKE '" + session.userData.industry + "'"
        + " AND Application.Readiness >= " + session.userData.readiness.value
        + " AND ApplicationCountry.HasSellers = 'true'"
        + " AND Channel.Name IS NOT NULL"
        + ") ORDER BY Application.Readiness DESC";

        verboseDebug(('Query =', queryString), session);
};
//===============================================
// Execute SQL Query, unpack results and send to bot
//===============================================
function GTMQuery(session, queryString) {
    //set up SQL request
    noResults = true; 
    resultsArray.length = 0;  
    request = new Request( queryString, function(err, rowCount) {
        if (err) {
        verboseDebug(err.message,session);
        }
    else {
        verboseDebug(('GTM SQL request succeeded - rowcount' + rowCount), session);
        if (rowCount === 0) { 
            session.send("I couldn't find any ISV solutions. Try changing your search parameters or start over.")};
        }
    });
    //unpack data from SQL query as it's returned
    request.on('row', function(columns) {
        verboseDebug('received data from SQL');
        var msg = new builder.Message(session);
        noResults=false;
        var card = new builder.HeroCard(session)
        var result = new isvCard();
        if (session.userData.platform.IsAzure) {result.platform = 'Azure'};
        if (session.userData.platform.IsDynamics) {result.platform = 'Dynamics'};
        if (session.userData.platform.IsOffice365) {result.platform = 'Office365'};
        if (session.userData.platform.IsSqlServer) {result.platform = 'SQL Server'};
        if (session.userData.platform.IsWindows) {result.platform = 'Windows'};                
        columns.forEach(function(column) {
            if (column.value === null) {
            // no data returned in row
            } else {
                switch(column.metadata.colName) {
                    case "ApplicationId":
                        result.appId = column.value;
                        result.url = "https://msgtm.azurewebsites.net/en-US/Applications/" + result.appId + "/view"
                        verboseDebug(result.appId);
                        appInsightsClient.trackEvent("AppId Found", result.appId);  
                        break;
                    case "ApplicationName": 
                        result.appName = column.value;
                        break;
                    case "AccountName": 
                        result.isvName = column.value;
                        break;
                    case "IndustrialSectorName":
                        result.crossIndustry = column.value;
                        break;
                    case "IndustryName":
                        result.industry = column.value;
                        break;
                    // case "PlatformName":
                    //     result.platform = column.value;
                    //     break;
                    case "CountryName":
                        result.sellCountry = column.value;
                        break;
                    case "GtmTier":
                        result.gtmTier = column.value;
                        break;
                    case "ChannelName":
                        result.businessModel = column.value;
                        break;
                    case "Readiness":
                        result.readiness = column.value;
                        break;                        
                    }  
                card
                    .title(result.appName.substr(0,24))
                    .subtitle(result.isvName.substr(0,14) + ', '+ result.sellCountry + ", " + result.gtmTier.substr(0,6))
                    .text( result.crossIndustry.substr(0,16) + ' | '+ result.businessModel.substr(0,16) + ' | '+ result.platform  + ' | '+ readinessMap[result.readiness])
                    .tap(builder.CardAction.openUrl(session, result.url ))
                msg
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments([card]);
                }
            });

        resultsArray.push(msg); //store result in resultArray
        session.send(msg);         //post result card to bot
    }); 

    //execute SQL request
    GTMconnection.execSql(request);
    };

//=============================
//Dialog to call GTMQuery
//============================
bot.dialog('/searchGTM', [ 
    function (session) { 
        verboseDebug('In searchGTM')
        createQueryString(session); //assemble query string
        GTMQuery(session, queryString); //search db and display results        
        verboseDebug('Exiting searchGTM');
        session.replaceDialog('/appSearchCriteria');
     } 
 ]); 


//=============================
//Dialog to display menu
//============================
bot.dialog('/menu', [
    function (session) {
        session.send("Hi %s! Welcome to ISVFinder", session.userData.name);
        session.send("What kind of ISV solution are you looking for?");
        session.endDialog("Use geography, industry, platform or ask for “help” to find out more about the search options or “start over” at any time. Eg. Manufacturing apps in Germany….");
    } 
])

//=============================
//Dialog to handle start over
//============================
bot.dialog('/startOver', [
    function (session) {
        initializeSearch(session);
        appInsightsClient.trackEvent("Start Over called");  
        session.send("Your search parameters have been cleared", session.userData.name);
        session.send("What kind of ISV solution are you looking for?");
        session.endDialog("Use geography, industry, platform or ask for “help” to find out more about the search options or “start over” at any time. Eg. Manufacturing apps in Germany….");
    }
])


//=============================
//Dialog to handle search for DX Contacts - currently not implemented TO DO
//============================
bot.dialog('/dxContacts', [
    function (session) {
        session.send( "Ask me... Who is the TE for Amazon?" ); 
        session.send( "... or Who manages Facebook?" ); 
        session.send( "... or Which accounts does Ian manage?" ); 
        session.endDialog();
            }
        ]);

//=============================
//Dialog to handle menu intent
//============================

dialog.matches(/menu/i, [
    function (session) {
        session.replaceDialog('/menu');
    }
])


//=============================
//Dialog to handle find_apps intent
//============================

dialog.matches('Find_App', [ 

    function (session, args) {
  
        verboseDebug('Find_App called',session);

        // Resolve and store any entities passed from LUIS.
        var geographyEntity = builder.EntityRecognizer.findEntity(args.entities, 'builtin.geography.country');

        var platformEntity = builder.EntityRecognizer.findEntity(args.entities, 'Platform');

        var industryEntity = builder.EntityRecognizer.findEntity(args.entities, 'Industry');
;
        var readinessEntity = builder.EntityRecognizer.findEntity(args.entities, 'Readiness');           
    

        if (geographyEntity) {
            session.userData.geography = geographyEntity.entity;
            verboseDebug('Geography found '+ session.userData.geography,session);
            }
       
        if (platformEntity) {
        session.userData.platform = {'name': platformEntity.entity , 'IsAzure': false, 'IsDynamics': false, 'IsOffice365': false, 'IsSqlServer': false, 'IsWindows': false};
            verboseDebug('Platform found ' + session.userData.platform.name,session);

            if (session.userData.platform.name == "azure") { 
                    session.userData.platform.IsAzure = true;
                    verboseDebug('IsAzure = '+ session.userData.platform.IsAzure, session);
                    }
            if (session.userData.platform.name == "dynamics") { 
                    session.userData.platform.IsDynamics = true;
                    verboseDebug('IsDynamics = '+ session.userData.platform.IsDynamics, session);
                    }
            if (session.userData.platform.name == "office365") { 
                    session.userData.platform.IsOffice365 = true;
                    verboseDebug('IsOffice365 = '+ session.userData.platform.IsOffice365, session);
                    }
            if (session.userData.platform.name == "sql server") { 
                    session.userData.platform.IsSqlServer = true;
                    verboseDebug('IsSqlServer = '+ session.userData.platform.IsSqlServer, session);
                    }
            if (session.userData.platform.name == "windows") { 
                    session.userData.platform.IsWindows = true;
                    verboseDebug('IsWindows = '+ session.userData.platform.IsWindows, session);
                    }
            }
        
        if (industryEntity) {
            session.userData.industry = industryEntity.entity;
            verboseDebug('Industry found ' + session.userData.industry,session);
            // anyIndustry = false;
            // } else {
            //     session.userData.industry = '%';
            //     verboseDebug('Any Industry',session)
            }
        
        if (readinessEntity) {
            session.userData.readiness = {'name': readinessEntity.entity , 'value': 0};
            verboseDebug('Readiness found ' + session.userData.readiness.name, session);
            if (session.userData.readiness.name == "not ready") { 
                    session.userData.readiness.value = 0;
                    verboseDebug('Readiness = '+ session.userData.readiness.value, session);
                    }
            if ((session.userData.readiness.name == "co - marketing ready") || (session.userData.readiness.name == "co marketing ready") ) { 
                    session.userData.readiness.value = 1;
                    verboseDebug('Readiness = '+ session.userData.readiness.value, session);
                    }
            if ((session.userData.readiness.name == "co - sell ready") || (session.userData.readiness.name == "co sell ready")) { 
                    session.userData.readiness.value = 2;
                    verboseDebug('Readiness = '+ session.userData.readiness.value, session);
                    }
            if ((session.userData.readiness.name == "co - sell recommended") || (session.userData.readiness.name == "co sell recommended")) { 
                    session.userData.readiness.value = 3;
                    verboseDebug('Readiness = '+ session.userData.readiness.value, session);
                    }
                verboseDebug(session.userData.readiness.name, session);
            }
            session.replaceDialog('/searchGTM')
        } 
]);


//=============================
//Dialog to display search criteria
//============================

bot.dialog('/appSearchCriteria', [ 
    function (session) {
        verboseDebug('appSearchCriteria called',session);
        var undefinedCriteria = "";
        var definedCriteria = "";
        if (session.userData.geography == '%') {undefinedCriteria = undefinedCriteria + 'Geography '} else {definedCriteria = definedCriteria + ' Geography = '+ session.userData.geography };
        if (session.userData.platform.name == '%') {undefinedCriteria = undefinedCriteria + 'Platform '} else {definedCriteria = definedCriteria + ' Platform = '+ session.userData.platform.name};
        if (session.userData.industry == '%') {undefinedCriteria = undefinedCriteria + 'Industry '} else {definedCriteria = definedCriteria + ' Industry = '+ session.userData.industry};
        if (session.userData.readiness.name == 'Any') {undefinedCriteria = undefinedCriteria + 'Readiness '} else {definedCriteria = definedCriteria + ' Readiness = '+ session.userData.readiness.name};
        if (definedCriteria !="") {session.send("Here’s what I heard:" + definedCriteria)} else {session.send("You haven't defined any search parameters")};
        if (undefinedCriteria !="") {session.send('You can refine by adding parameters for ' + undefinedCriteria)}
        session.endDialog();
        }
]);

bot.dialog('/changeGeography', [
    function (session) {
        builder.Prompts.text(session, "Enter a geography or 'Any' to search everywhere", {maxRetries: 0} );
    },
    function (session, results) {
        session.userData.geography = results.response;
        if ((session.userData.geography == "Any") || (session.userData.geography === 'any')) {session.userData.geography = '%'}
        //TO DO check valid geography
        verboseDebug(results.response,session);
        session.replaceDialog('/searchGTM');
    }
]);

bot.dialog('/changePlatform', [
    function (session) {
        builder.Prompts.choice(session, 'Select a platform',"Azure|Dynamics|Office365|SQL Server|Windows|Any" , {maxRetries: 0});
    },
    function (session, results) {
        if (results.response) {
            session.userData.platform = {'name': "None" , 'IsAzure': false, 'IsDynamics': false, 'IsOffice365': false, 'IsSqlServer': false, 'IsWindows': false};

            if (results.response.entity == "Azure") { 
                    session.userData.platform = {'name': "Azure", 'IsAzure' : true, 'IsDynamics': false, 'IsOffice365': false, 'IsSqlServer': false, 'IsWindows': false}
                    verboseDebug('IsAzure = '+ session.userData.platform.IsAzure, session);
                    }
            if (results.response.entity == "Dynamics") { 
                    session.userData.platform = {'name' : "Dynamics", 'IsAzure': false, 'IsDynamics': true, 'IsOffice365': false, 'IsSqlServer': false, 'IsWindows': false};
                    verboseDebug('IsDynamics = '+ session.userData.platform.IsDynamics, session);
                    }
            if (results.response.entity == "Office365") { 
                    session.userData.platform = {'name' : "Office365", 'IsAzure': false, 'IsDynamics': false, 'IsOffice365': true, 'IsSqlServer': false, 'IsWindows': false};
                    verboseDebug('IsOffice365 = '+ session.userData.platform.IsOffice365, session);
                    }
            if (results.response.entity == "SQL Server") { 
                    session.userData.platform = {'name': "SQL Server", 'IsAzure': false, 'IsDynamics': false, 'IsOffice365': false, 'IsSqlServer': true, 'IsWindows': false};
                    verboseDebug('IsSqlServer = '+ session.userData.platform.IsSqlServer, session);
                    }
            if (results.response.entity == "Windows") { 
                    session.userData.platform = {'name' : "Windows", 'IsAzure': false, 'IsDynamics': false, 'IsOffice365': false, 'IsSqlServer': false, 'IsWindows': true};
                    verboseDebug('IsWindows = '+ session.userData.platform.IsWindows, session);
                    }
            if (results.response.entity == "Any") { 
                    session.userData.platform = {'name': "%" , 'IsAzure': true, 'IsDynamics': true, 'IsOffice365': true, 'IsSqlServer': true, 'IsWindows': true};
                    verboseDebug('Any = '+ session.userData.platform, session);
                    }
        }

        verboseDebug(results.response,session);
        session.replaceDialog('/searchGTM');
    }
]);

bot.dialog('/changeIndustry', [
    function (session) {
        builder.Prompts.text(session, "Enter an industry or 'Any' to search all", {maxRetries: 0} );
    },
    function (session, results) {
        session.userData.industry = results.response;
        if ((session.userData.industry == "Any") || (session.userData.industry === 'any')) {session.userData.industry = '%'}
        //TO DO validate industry
        verboseDebug(results.response,session);
        session.replaceDialog('/searchGTM');
    }
]);

bot.dialog('/changeReadiness', [
    function (session) {
        builder.Prompts.choice(session, 'Select required readiness', "Co-Marketing Ready|Co-Sell Ready|Co-Sell Recommended|Any" ,{maxRetries: 0} );
    },
    function (session, results) {

        session.userData.readiness = {'name': results.response.entity , 'value': 0};

            if ((session.userData.readiness.name == "not ready") || (session.userData.readiness.name == "Any") || (session.userData.readiness.name == "any")) { 
                    session.userData.readiness.value = 0;
                    verboseDebug('Readiness = '+ session.userData.readiness.value, session);
                    }
            if (session.userData.readiness.name == "Co-Marketing Ready")  { 
                    session.userData.readiness.value = 1;
                    verboseDebug('Readiness = '+ session.userData.readiness.value, session);
                    }
            if (session.userData.readiness.name == "Co-Sell Ready") { 
                    session.userData.readiness.value = 2;
                    verboseDebug('Readiness = '+ session.userData.readiness.value, session);
                    }
            if (session.userData.readiness.name == "Co-Sell Recommended") { 
                    session.userData.readiness.value = 3;
                    verboseDebug('Readiness = '+ session.userData.readiness.value, session);
                    }

        verboseDebug(session.userData.readiness.name, session);
        session.replaceDialog('/searchGTM');
    }
]);


dialog.matches('Find_ISV_Contact', [
    function (session, args, next) {
        verboseDebug('Find_ISV_Contact called', session);
        // Resolve and store any entities passed from LUIS.
        var accountEntity = builder.EntityRecognizer.findEntity(args.entities, 'Account');
        if (accountEntity) {
            var account = accountEntity.entity;
            // console.log('Account ' + account + ' recognized');
            next({response: account});
            } else {
            // Prompt for account
            builder.Prompts.text(session, 'Which account would you like to find the TE for?');
            } 

        }
    ,
    function (session, results, next) {
        if (results.response) {
            var account = results.response;
            console.log('Account ' + account + ' now recognized')
        }
        next({response: account});

    }
    ,
    function (session, results) {
        var searchAccount = "";
        var account = results.response;
        console.log('in lookup function, account = ' + account);
        // session.send('in lookup function, account = ' + account);
        //create regex version of the searchAccount
        if (!account) {
                // console.log("Sorry, I couldn't make out the name of the account you are looking for.");
                builder.prompts.text(session, "Sorry, I couldn't make out the name of the account you are looking for.");
        } else { 
                (searchAccount = new RegExp(account, 'i'))

        //search mapping array for searchAccount
        var x = 0;
        var found = false;
                // Next line to assist with debugging
                // // console.log("Looking for account");
        while ( x < (mappingArray.length ) ) {
            if (mappingArray[x]) {
            if (mappingArray[x].title.match(searchAccount)) {
            //post results to chat
                // session.send('found account');
                if(mappingArray[x].TE) {
                    // var msg = "The TE for " + mappingArray[x] + " is " + mappingArray[x+1];
                    // console.log( msg); 
                    // session.send('te not null');
                    session.send("The TE for " + mappingArray[x].title + " is " + mappingArray[x].TE);
                    found = true;
                    }
                };
            }
            x++;

            if (x > 570) {session.send('loop counter = ' + x)}

            };
            if (!found) {
                session.send( "Sorry, I couldn't find the TE for " + account)
                };


            
        }

                    // next line to assist with debug
            //   session.endDialog("Dialog Ended");

    }
]);
//===============================End of Find_ISV_Contact==========================

dialog.matches('Settings', [
    function (session, args, next) {
        appInsightsClient.trackEvent("Settings called");  
        console.log('Settings Called');
        verboseDebug('Settings called',session);
        // Resolve and store any entities passed from LUIS.
        var numberEntity = builder.EntityRecognizer.findEntity(args.entities, 'builtin.number');
        if (numberEntity) {
            var number = numberEntity.entity;
            // console.log('Account ' + account + ' recognized');
            next({response: number});
            } else {
            // Prompt for account
            builder.Prompts.text(session, 'How many results would you like to see?');
            } 
        }
    ,
    function (session, results) {
        if (results.response) {
            var number = results.response;
        }
            searchLimit = number;
            console.log('Results now set to ' + number); 
        session.endDialog("Thanks! You'll now see %s results" , number);

    }
    
]);
//===============================End of Find_ISV_Contact==========================


dialog.matches('Find_TE', [
    function (session, args, next) {
        appInsightsClient.trackEvent("Find_TE called");  
        console.log('Find_TE called');
        // session.send('in Find_TE');
        // Resolve and store any entities passed from LUIS.
        var accountEntity = builder.EntityRecognizer.findEntity(args.entities, 'Account');
        if (accountEntity) {
            var account = accountEntity.entity;
            // console.log('Account ' + account + ' recognized');
            next({response: account});
            } else {
            // Prompt for account
            builder.Prompts.text(session, 'Which account would you like to find the TE for?');
            } 

        }
    ,
    function (session, results, next) {
        if (results.response) {
            var account = results.response;
            console.log('Account ' + account + ' now recongized')
        }
        next({response: account});

    }
    ,
    function (session, results) {
        var searchAccount = "";
        var account = results.response;
        console.log('in lookup function, account = ' + account);
        // session.send('in lookup function, account = ' + account);
        //create regex version of the searchAccount
        if (!account) {
                // console.log("Sorry, I couldn't make out the name of the account you are looking for.");
                builder.prompts.text(session, "Sorry, I couldn't make out the name of the account you are looking for.");
        } else { 
                (searchAccount = new RegExp(account, 'i'))

        //search mapping array for searchAccount
        var x = 0;
        var found = false;
                // Next line to assist with debugging
                // // console.log("Looking for account");
        while ( x < (mappingArray.length ) ) {
            if (mappingArray[x]) {
            if (mappingArray[x].title.match(searchAccount)) {
            //post results to chat
                // session.send('found account');
                if(mappingArray[x].TE) {
                    // var msg = "The TE for " + mappingArray[x] + " is " + mappingArray[x+1];
                    // console.log( msg); 
                    // session.send('te not null');
                    session.send("The TE for " + mappingArray[x].title + " is " + mappingArray[x].TE);
                    found = true;
                    }
                };
            }
            x++;

            if (x > 570) {session.send('loop counter = ' + x)}

            };
            if (!found) {
                session.send( "Sorry, I couldn't find the TE for " + account)
                };


            
        }

                    // next line to assist with debug
            //   session.endDialog("Dialog Ended");

    }
]);
//===============================End of Find TE==========================

dialog.matches('Find_BE', [
    function (session, args, next) {
        appInsightsClient.trackEvent("Find_BE called");  
        console.log('Find_BE called');
        // Resolve and store any entities passed from LUIS.
        var accountEntity = builder.EntityRecognizer.findEntity(args.entities, 'Account');
        if (accountEntity) {
            var account = accountEntity.entity;
            // console.log('Account ' + account + ' recognized');
            next({response: account});
            } else {
            // Prompt for account
            builder.Prompts.text(session, 'Which account would you like to find the BE for?');
            } 
        }
    ,
    function (session, results, next) {
        if (results.response) {
            var account = results.response;
            console.log('Account ' + account + ' now recongized')
        }
        next({response: account});

    }
    ,
    function (session, results) {
        var searchAccount = "";
        var account = results.response;
        console.log('in lookup function, account = ' + account);
        //create regex version of the searchAccount
        if (!account) {
                // console.log("Sorry, I couldn't make out the name of the account you are looking for.");
                builder.prompts.text(session, "Sorry, I couldn't make out the name of the account you are looking for.");
        } else { 
                (searchAccount = new RegExp(account, 'i'))

        //search mapping array for searchAccount
        var x = 0;
        var found = false;
                // Next line to assist with debugging
                // // console.log("Looking for account");
        while ( x < mappingArray.length) {
            if (mappingArray[x].title.match(searchAccount)) {
            //post results to chat
                if(mappingArray[x].BE) {
                    // var msg = "The TE for " + mappingArray[x] + " is " + mappingArray[x+1];
                    // console.log( msg); 
                    session.send("The BE for " + mappingArray[x].title + " is " + mappingArray[x].BE);
                    found = true;
                    }
                };
            x++;
            };
            if (!found) {
                session.send( "Sorry, I couldn't find the BE for " + account)
                };

            // next line to assist with debug
            //   session.endDialog("Session Ended");
            
        }

    }
]);
//===============================End of Find BE==========================

dialog.matches('Find_Accounts', [function (session, args, next) { 
    appInsightsClient.trackEvent("Find_Accounts called");  
    //handle the case where intent is List Accounts for BE or TE
    // use bot builder EntityRecognizer to parse out the LUIS entities
    var evangelist = builder.EntityRecognizer.findEntity(args.entities, 'Evangelist'); 
    // session.send( "Recognized Evangelist " + evangelist.entity); 

    // assemble the query using identified entities   
    var searchEvangelist = "";

    //create regex version of the searchEvangelist
    if (!evangelist) {
            session.send("Sorry, I couldn't make out the name of the evangelist you are looking for.");
    } else { 
            (searchEvangelist = new RegExp(evangelist.entity, 'i'))

            // Next line to assist with debugging
            // session.send( "Looking for the accounts for " + searchEvangelist); 

            //search mapping array for searchAccount
            var x = 0;
            var found = false;
                    // Next line to assist with debugging
                    // // console.log("Looking for account");
            while ( x < mappingArray.length) {
                if (mappingArray[x].TE.match(searchEvangelist)) {
                //found TE match
                    if(mappingArray[x].title) {
                        session.send( mappingArray[x].TE + " is TE for " + mappingArray[x].title); 
                        found = true;
                        }
                    };
                if (mappingArray[x].BE.match(searchEvangelist)) {
                //found BE match
                    if(mappingArray[x]) {
                        session.send( mappingArray[x].BE + " is BE for " + mappingArray[x].title); 
                        found = true;
                        }
                    };
                x++
                };
                if (!found) {
                    session.send( "Sorry, I couldn't find the accounts for " + evangelist.entity)
                    };

                // next line to assist with debug
                //   session.endDialog("Session Ended");
                
            }
        }]);   






//===============================End of Find Accounts==========================

dialog.matches('Find_Both', [function (session, args, next) {
        appInsightsClient.trackEvent("Find_both_TE_and_BE called");   
        //    console.log(args.entities); 

        // use bot builder EntityRecognizer to parse out the LUIS entities
        var accountEntity = builder.EntityRecognizer.findEntity(args.entities, 'Account'); 

        // assemble the query using identified entities   
        var searchAccount = "";

        //create regex version of the searchAccount
        if (!accountEntity) {
                session.send("Sorry, I couldn't make out the name of the account you are looking for.");
        } else { 
                (searchAccount = new RegExp(accountEntity.entity, 'i'))

                // Next line to assist with debugging
                // session.send( "Looking for the TE for " + searchAccount); 

                //search mapping array for searchAccount
                var x = 0;
                var found = false;
                        // Next line to assist with debugging
                        // // console.log("Looking for account");
                while ( x < mappingArray.length) {
                    if (mappingArray[x].title.match(searchAccount)) {
                    //post results to chat
                        if(mappingArray[x].TE) {
                            session.send( "The TE for " + mappingArray[x].title + " is " + mappingArray[x].TE); 
                            found = true;
                            }
                        if(mappingArray[x].BE) {
                            session.send( "The BE for " + mappingArray[x].title + " is " + mappingArray[x].BE); 
                            found = true;
                            }
                        };
                    x++;
                    };
                    if (!found) {
                        session.send( "Sorry, I couldn't find the Evangelists for " + accountEntity.entity)
                        };

                    // next line to assist with debug
                    //   session.endDialog("Session Ended");
                    
                }}]);
//===============================End of Find Both==========================

//---------------------------------------------------------------------------------------------------    
//handle the case where there's a request to reload data

dialog.matches('Fetch', function (session, args, next) { 
    appInsightsClient.trackEvent("Find_Fetch called");  
    session.send( "Welcome to ISVFinder on Microsoft Bot Framework. I can help you find the right ISV for your partner." ); 
    arrayErr.forEach(function(item) {
        session.send( "K9 Bot = " + item); 
    });
    session.send( "K9 data is live = " + (mappingArray.length > 0)); 
    session.endDialog();
    });

//---------------------------------------------------------------------------------------------------    
//handle the case where there's no recognized intent

dialog.matches('None', function (session, args, next) { 
    // session.send( "Welcome to ISVFinder on Microsoft Bot Framework. I can help you find the right ISV for your partner." ); 
    if (!session.message.text.match(/start/i)) {session.replaceDialog('/menu')} else {session.replaceDialog('/startOver')};
    session.endDialog();
    });
//---------------------------------------------------------------------------------------------------    
//handle the case where intent is happy

dialog.matches('Happy', function (session, args, next) { 
    session.send( "Hope you enjoyed this as much as i did:-) " ); 

    });
//---------------------------------------------------------------------------------------------------    
//handle the case where intent is sad

dialog.matches('Sad', function (session, args, next) { 
    session.send( "Life? Don't talk to me about life. Did you know I've got this terrible pain in all the diodes down my left side? " );
    });    
//---------------------------------------------------------------------------------------------------    
//handle the case where intent is abuse

dialog.matches('Abuse', function (session, args, next) { 
    session.send( "Hey, don't be mean to me:-) " ); 
    });   

//---------------------------------------------------------------------------------------------------    
//handle the case where intent is help

dialog.matches('Help', function (session, args, next) { 
    appInsightsClient.trackEvent("Help called");  
    session.send( "Ask me Which Azure apps in Germany target telecommunications sector?" ); 
    session.send( "... or Who is the TE for Amazon?" ); 
    session.send( "... or Who manages Facebook?" ); 
    session.send( "... or Which accounts does Ian manage?" ); 
    debugMode = !debugMode;
    session.send('Number of results delivered = ' + searchLimit);
    session.endDialog();
    });  

//---------------------------------------------------------------------------------------------------

//---------------------------------------------------------------------------------------------------    
//handle the case where intent is help

bot.dialog('/Help', function (session, args, next) { 
    appInsightsClient.trackEvent("Help called");  
    session.send( "Ask me Which Azure apps in Germany target telecommunications sector?" ); 
    session.send( "... or Who is the TE for Amazon?" ); 
    session.send( "... or Who manages Facebook?" ); 
    session.send( "... or Which accounts does Ian manage?" ); 
    session.send('Number of results delivered = ' + searchLimit);
    session.endDialog();
    });  

dialog.onDefault(builder.DialogAction.send("Welcome to ISVFinder on Microsoft Bot Framework. I can help you find the right ISV for your partner or find a DX contact."));

// dialog.onBegin(builder.DialogAction.send("What can I help you find? An Application or a DX Contact?"));


// Setup Restify Server 

server.get('/', function (req, res) { 
    cache.put("TEBEMappingList", mappingArray);
    console.log('cache activated'); 
    console.log('cache activated'); 
    res.send('isvfinderbot development environment SQL BRANCH -  Bot Running ' 
        + arrayErr.length + "\n" 
        + arrayErr[0] + "\n" 
        + arrayErr[1] + "\n" 
        + mappingArray.length + "\n"
        + process.env.AppID + "\n"
        + process.env.AppSecret + "\n"
        // + Applications.length + "\n"
        // + ApplicationCountries.length + "\n"
        // + ApplicationIndustries.length
        ); 
    arrayErr.forEach(function(item) { 
    console.log( "K9 Bot = " + item);  
    }); 
    // res.send('K9 Production Bot Running');
}); 


//some comments
