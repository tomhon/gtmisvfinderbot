

var restify = require('restify');
var server = restify.createServer();
var o = require('odata');
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



// set up SQL server connection using Application Environment Variables

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
        //    console.log(err);
            arrayErr.push(err);
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

//basic config 
o().config({
  endpoint: process.env.odataEndpoint,   // your odata endpoint for the service 
//   endpoint: 'http://services.odata.org/V4/OData/OData.svc',   // your odata endpoint for the service 
  json: false,       // currently only json is supported 
  version: 1,       // oData version (currently supported version 4\. However most also work with version 3.) 
  strictMode: false, // strict mode throws exceptions, non strict mode only logs them 
  start: null,      // a function which is executed on loading 
  ready: null,      // a function which is executed on ready 
  error: null,      // a function which is executed on error 
  headers: [],      // an array of additional headers e.g.: [{name:'headername',value:'headervalue'}] 
  username: process.env.odataUsername,   // a basic auth username 
  password: process.env.odataPassword,   // a basic auth password 
  isAsync: true     // set this to false to make synced (a)jax calls. (doesn't work with basic auth!) 
});


 //===============================================
 //Loads Application data into array Applications
 //===============================================

function loadApplicationsArray () {
    o('Applications').get(function(data) {
        Applications = data;
        console.log("Applications Data Loaded - array length: %s", Applications.length);
    });
}

//===============================================
// Load ApplicationCountry data
//===============================================

function loadApplicationCountriesArray () {
    o('ApplicationCountries').get(function(data) {
        ApplicationCountries = data;    
        console.log("Application Countries Data Loaded - array length: %s", ApplicationCountries.length);
    });
}

//===============================================
// Load ApplicationIndustries data
//===============================================

function loadApplicationIndustriesArray () {
    o('ApplicationIndustries').get(function(data) {
        ApplicationIndustries = data;
        console.log("Application Industries Data Loaded - array length: %s", ApplicationIndustries.length);
    });
}

//===============================================
// Load ApplicationIndustries data
//===============================================

function loadApplicationContactsArray() {
    o('ApplicationContacts').get(function(data) {
        ApplicationContacts = data;
        console.log("Application Contacts Data Loaded - array length: %s", ApplicationContacts.length);
    });
}

//===============================================
// Load ApplicationMaterials data
//===============================================

function loadApplicationMaterialsArray () {
    o('ApplicationMaterials').get(function(data) {
        ApplicationMaterials = data;
        console.log("Application Materials Data Loaded - array length: %s", ApplicationMaterials.length);
    });
}

//===============================================
// Load data arrays from odata service
//===============================================

var Applications = new Array();
loadApplicationsArray();

var ApplicationCountries = new Array();
loadApplicationCountriesArray();

var ApplicationIndustries = new Array();
loadApplicationIndustriesArray();

var ApplicationContacts = new Array();
loadApplicationContactsArray();


var ApplicationMaterials = new Array();
loadApplicationMaterialsArray();

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
    if (!session.userData.geography) {session.userData.geography = "Any - Default"};
    if (!session.userData.industry) {session.userData.industry = "Any - Default"};
    if (!session.userData.platform) {session.userData.platform.name = "Any - Default"};
    if (!session.userData.readiness) {session.userData.readiness = "Any - Default"};
}


// Create LUIS recognizer that points at our model and add it as the root '/' dialog for our Cortana Bot.
var model = process.env.LUISServiceURL;
var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.use(builder.Middleware.firstRun({ version: 1.0, dialogId: '*:/firstRun' }));


bot.dialog('/', dialog);

bot.dialog('/firstRun', [ 
    function (session) { 
         builder.Prompts.text(session, "Hello... What's your name?"); 
     }, 
     function (session, results) { 
         // We'll save the users name and send them an initial greeting. All  
         // future messages from the user will be routed to the root dialog. 
         session.userData.name = results.response; 
         session.send("Hi %s, welcome to ISVFinderBot. I can help you recomend Applications for your partners as well as find DX contacts.", session.userData.name);
         session.replaceDialog('/Help');  
     } 
 ]); 




bot.dialog('/menu', [
    function (session) {
        var msg = new builder.Message(session)
            .textFormat(builder.TextFormat.xml)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                 new builder.HeroCard(session)
                    .title("Hi %s! Welcome to ISVFinder", session.userData.name)
                    .subtitle("What are you looking for?")

                    .buttons([
                        builder.CardAction.imBack(session, "appSearchCriteria", "Applications"),
                        builder.CardAction.imBack(session, "dxContacts", "DX Contacts")
                        ]),
     
            ]);
        // builder.Prompts.choice(session, msg, "appSearchCriteria|dxContacts",{maxRetries: 0});
        builder.Prompts.text(session, msg,{maxRetries: 0});


    },
    function (session, results) {
        if  (results.response && (results.response == 'appSearchCriteria' || results.response == 'dxContacts')) {
            // Launch demo dialog
            verboseDebug('Spotted button press',session);
            session.beginDialog('/' + results.response);
        } else {
            // Exit the menu
            verboseDebug('no button press',session);
            //TO DO pass results for processing as normal client
            // session.replaceDialog(results.response);
            session.replaceDialog('/Help');
        }
    }    
])

bot.dialog('/Help', function (session, args, next) { 
    session.send( "Ask me.... Which Azure apps in Germany target telecommunications sector and are Co-Sell Ready?" ); 
    session.send( "... or Who is the TE for Amazon?" ); 
    session.send( "... or Who manages Facebook?" ); 
    session.send( "... or Which accounts does Ian manage?" ); 
    session.send('Number of results delivered = ' + searchLimit + " (type 'Settings' to change this)");
    session.endDialog();
    }); 


bot.dialog('/dxContacts', [
    function (session) {
        session.send( "Ask me... Who is the TE for Amazon?" ); 
        session.send( "... or Who manages Facebook?" ); 
        session.send( "... or Which accounts does Ian manage?" ); 
        session.endDialog();
            }
        ]);

dialog.matches(/menu/i, [
    function (session) {
        session.replaceDialog('/menu');
    }
])


// var platform = "";

dialog.matches('Find_App', [ 

    function (session, args) {
  
        verboseDebug('Find_App called',session);

        // Resolve and store any entities passed from LUIS.
        initializeSearch(session);
        var geographyEntity = builder.EntityRecognizer.findEntity(args.entities, 'builtin.geography.country');
        var anyGeography= true; 
        var platformEntity = builder.EntityRecognizer.findEntity(args.entities, 'Platform');
        var anyPlatform = true;
        var industryEntity = builder.EntityRecognizer.findEntity(args.entities, 'Industry');
        var anyIndustry = true;
        var readinessEntity = builder.EntityRecognizer.findEntity(args.entities, 'Readiness');           
        var anyReadiness = true;     

        if (geographyEntity) {
            session.userData.geography = geographyEntity.entity;
            verboseDebug('Geography found '+ session.userData.geography,session);
            anyGeography = false;
            } else {
                verboseDebug('Any Geography',session)
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
            anyPlatform = false;
            } else {
                verboseDebug('Any Platform',session)
            }
        
        if (industryEntity) {
            session.userData.industry = industryEntity.entity;
            verboseDebug('Industry found ' + session.userData.industry,session);
            anyIndustry = false;
            } else {
                verboseDebug('Any Industry',session)
            }
        
        if (readinessEntity) {
            session.userData.readiness = {'name': readinessEntity.entity , 'value': 0};
            verboseDebug('Readiness found ' + session.userData.readiness.name, session);
            anyReadiness = false;

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

            } else {
                verboseDebug('Any Readiness',session)
            }

        //search mapping array for country

        if (anyGeography || anyIndustry || anyPlatform || anyReadiness) {
            session.replaceDialog('/appSearchCriteria')
        } else {
            session.replaceDialog('/displayResults')
        }

        
        }
   

]);



// Add intent handlers

bot.dialog('/appSearchCriteria', [ 

    function (session) {
     
        verboseDebug('appSearchCriteria called',session);
        initializeSearch(session);

        var msg = new builder.Message(session)
            .textFormat(builder.TextFormat.xml)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([

                new builder.HeroCard(session)
                    .title("Here are the Application types I'm going to look for")
                    .subtitle("Press Find Apps or change any search parameter")

                    .buttons([
                        builder.CardAction.imBack(session, "changeGeography", "Geography: " + session.userData.geography),
                        builder.CardAction.imBack(session, "changePlatform", "Platform: " + session.userData.platform.name),
                        builder.CardAction.imBack(session, "changeIndustry", "Industry: " + session.userData.industry),
                        builder.CardAction.imBack(session, "changeReadiness", "Readiness: " + session.userData.readiness.name),
                        builder.CardAction.imBack(session, "displayResults", "Find Apps")
                    ])
     
            ]);
        builder.Prompts.choice(session, msg, "changeGeography|changePlatform|changeIndustry|changeReadiness|displayResults", {maxRetries: 0})


    },
    function (session, results) {
        if (results.response && results.response.entity != '(quit)') {
            // Launch demo dialog
            session.beginDialog('/' + results.response.entity);
        } else {
            // Exit the menu
            session.endDialog();
        }

    }

]);

bot.dialog('/changeGeography', [
    function (session) {
        builder.Prompts.text(session, 'Type a geography or leave it blank to search everywhere', {maxRetries: 0} );
    },
    function (session, results) {
        session.userData.geography = results.response;
        verboseDebug(results.response,session);
        session.replaceDialog('/appSearchCriteria');
    }
]);

bot.dialog('/changePlatform', [
    function (session) {
        builder.Prompts.choice(session, 'Select a platform',"Azure|Dynamics|Office365|SQL Server|Windows|Any" , {maxRetries: 0});
    },
    function (session, results) {
        if (results.response) {
            session.userData.platform = {'name': "Any" , 'IsAzure': false, 'IsDynamics': false, 'IsOffice365': false, 'IsSqlServer': false, 'IsWindows': false};

            if (results.response.entity == "Azure") { 
                    session.userData.platform = {'name': "Azure", 'IsAzure' : true}
                    verboseDebug('IsAzure = '+ session.userData.platform.IsAzure, session);
                    }
            if (results.response.entity == "Dynamics") { 
                    session.userData.platform = {'name' : "Dynamics", 'IsDynamics': true};
                    verboseDebug('IsDynamics = '+ session.userData.platform.IsDynamics, session);
                    }
            if (results.response.entity == "Office365") { 
                    session.userData.platform = {'name' : "Office365", 'IsOffice365' : true};
                    verboseDebug('IsOffice365 = '+ session.userData.platform.IsOffice365, session);
                    }
            if (results.response.entity == "SQL Server") { 
                    session.userData.platform = {'name': "SQL Server", 'IsSqlServer' : true};
                    verboseDebug('IsSqlServer = '+ session.userData.platform.IsSqlServer, session);
                    }
            if (results.response.entity == "Windows") { 
                    session.userData.platform = {'name' : "Windows", 'IsWindows': true};
                    verboseDebug('IsWindows = '+ session.userData.platform.IsWindows, session);
                    }
        }

        verboseDebug(results.response,session);
        session.replaceDialog('/appSearchCriteria');
    }
]);

bot.dialog('/changeIndustry', [
    function (session) {
        builder.Prompts.text(session, 'Enter an industry  or leave it blank to search all', {maxRetries: 0} );
    },
    function (session, results) {
        session.userData.industry = results.response;
        verboseDebug(results.response,session);
        session.replaceDialog('/appSearchCriteria');
    }
]);

bot.dialog('/changeReadiness', [
    function (session) {
        builder.Prompts.choice(session, 'Select required readiness', "Co-Marketing Ready|Co-Sell Ready|Co-Sell Recommended|Any" ,{maxRetries: 0} );
    },
    function (session, results) {

        session.userData.readiness = {'name': results.response.entity , 'value': 0};

            if ((session.userData.readiness.name == "not ready") || (session.userData.readiness.name == "Any")) { 
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
        session.replaceDialog('/appSearchCriteria');
    }
]);



bot.dialog('/displayResults', [
    function (session) {
            appInsightsClient.trackEvent("displayResults called");
            verboseDebug('Display Results',session);
            var results = new Array();

            findApplications(session.userData.geography, session.userData.platform, session.userData.industry, session.userData.readiness, results, searchLimit)
            if (results.length > 0 ) {
                results.forEach(function(item) {
                    //create herocard for each application found
                    var card = new builder.HeroCard(session)
                        .title(item.ApplicationName)
                        .subtitle(item.AccountName + ', '+ item.CountryName)
                        .text('Platform: '+ item.PlatformName + ' Industry: ' + item.ParentIndustryName + ' Readiness: '+ item.Readiness)
                        .tap(builder.CardAction.openUrl(session, item.Url ))
                    var msg = new builder.Message(session)
                        .attachmentLayout(builder.AttachmentLayout.carousel)
                        .attachments([card]);
                    session.send(msg);
                });
            } else {
                session.send("Sorry, I couldn't find any applications that match your search parameters");
                //ideally route back to appSearchCriteria
                // session.replaceDialog('/appSearchCriteria')
            }
            session.endDialog();
    }
]);



function findApplications(geography, platform, industry, readiness, results, maxResultLength) {


        verboseDebug('Entering findApplications. ' + ApplicationCountries.length);

        //initialize search loop variables
        var outputValues = "";
        var geographyRegExp = new RegExp (geography, 'i');
        var platformRegExp = new RegExp (platform.name, 'i');
        var industryRegExp = new RegExp (industry, 'i');
        var readinessRegExp = new RegExp (readiness, 'i');


        // //create dummy data
        // outputValues = {
        //     'ApplicationName': "DummyApp1",
        //     'AccountName': "Account1",
        //     'PlatformName': "PlatName1",
        //     'ParentIndustryName': "IndustryName1",
        //     'CountryName': "CountryName1",
        //     'Readiness': "Co Sell Ready",
        //     'Url': 'http://Microsoft.com'
        // };
        // results.push(outputValues);

        // outputValues = {
        //     'ApplicationName': "DummyApp2",
        //     'AccountName': "Account2",
        //     'PlatformName': "PlatName2",
        //     'ParentIndustryName': "IndustryName2",
        //     'CountryName': "CountryName2",
        //     'Readiness': "Co Sell Ready",
        //     'Url': 'http://Microsoft.com'
        // };
        // results.push(outputValues);
    



        //seachIndustries
        var i=0; //iteration counter for ApplicationIndustries array
        while ( (i<ApplicationIndustries.length) && (results.length < maxResultLength)) {
            if (ApplicationIndustries[i].ParentIndustryName.match(industryRegExp)) {
                verboseDebug('Found Industries ='+ i);
                //found correct Industry
                //searchApplicationPlatforms
                var j=0 //iteration counter for Applications array
                while ( (j<Applications.length) && (results.length < maxResultLength)) {
                    if ((ApplicationIndustries[i].ApplicationId === Applications[j].ApplicationId)
                        && ( (platform.IsAzure && Applications[j].IsAzure) 
                            || (platform.IsDynamics && Applications[j].IsDynamics )
                            || (platform.IsOffice365 && Applications[j].IsOffice365 )
                            || (platform.IsSqlServer && Applications[j].IsSqlServer )
                            || (platform.IsWindows && Applications[j].IsWindows )
                            )
                        ) {
                        verboseDebug('Found Industries ='+ i +', Applications ='+ j);
                        //found correct Application
                        //searchCountries
                        var k=0; //iteration counter for ApplicationCountries array
                        while ( (k<ApplicationCountries.length) && (results.length < maxResultLength)) {
                            if ( (ApplicationCountries[k].CountryName.match(geographyRegExp)) 
                                    && (Applications[j].ApplicationId === ApplicationCountries[k].ApplicationId) 
                                    && (Applications[j].Readiness >= (readiness.value)) //test for Readiness match
                                    ) {
                                verboseDebug('Found Industries ='+ i +', Applications ='+ j + ', Countries =' + k);
                                //found correct geography
                                outputValues = {
                                    'ApplicationName': Applications[j].ApplicationName,
                                    'AccountName': Applications[j].AccountName,
                                    'PlatformName': platform.name,
                                    'ParentIndustryName': ApplicationIndustries[i].ParentIndustryName,
                                    'CountryName': ApplicationCountries[k].CountryName,
                                    'Readiness': readinessMap[Applications[j].Readiness],
                                    'Url': Applications[j].Url
                                };
                            console.log(Applications[j]);
                            results.push(outputValues);
                            }
                            k++;
                        }
                        //end of searchCountries
                    }
                    j++;
                }
                //end of searchApplicationPlatforms
            }
            i++;        
        }
        //end of searchIndustries
    }
//===============================End of Find_App==========================

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
    // session.send( "Local Partner data is live = " + (partnerISV.length > 0)); 
    //list all errors

    //reload odata
    loadApplicationsArray();
    loadApplicationCountriesArray();
    loadApplicationIndustriesArray();
    loadApplicationContactsArray();
    loadApplicationMaterialsArray();

    arrayErr.forEach(function(item) {
        session.send( "K9 Bot = " + item); 
    });
    session.send( "K9 data is live = " + (mappingArray.length > 0)); 
    session.send( "isvfinderbot applications data is live = " + (Applications.length > 0)); 
        session.send( "isvfinderbot applicationCountry data is live = " + (ApplicationCountries.length > 0)); 
                // session.endDialog("Session Ended");
    });

//---------------------------------------------------------------------------------------------------    
//handle the case where there's no recognized intent

dialog.matches('None', function (session, args, next) { 
    // session.send( "Welcome to ISVFinder on Microsoft Bot Framework. I can help you find the right ISV for your partner." ); 
    
    session.replaceDialog('/menu');
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
    session.send('DebugMode Enabled = ' + debugMode);
        //   session.endDialog("Session Ended");
    });  

//---------------------------------------------------------------------------------------------------



dialog.onDefault(builder.DialogAction.send("Welcome to ISVFinder on Microsoft Bot Framework. I can help you find the right ISV for your partner or find a DX contact."));

// dialog.onBegin(builder.DialogAction.send("What can I help you find? An Application or a DX Contact?"));


// Setup Restify Server 

server.get('/', function (req, res) { 
    cache.put("TEBEMappingList", mappingArray);
    console.log('cache activated'); 
    console.log('cache activated'); 
    res.send('isvfinderbot development environment -  Bot Running ' 
        + arrayErr.length + "\n" 
        + arrayErr[0] + "\n" 
        + arrayErr[1] + "\n" 
        + mappingArray.length + "\n"
        + process.env.AppID + "\n"
        + process.env.AppSecret + "\n"
        + Applications.length + "\n"
        + ApplicationCountries.length + "\n"
        + ApplicationIndustries.length
        ); 
    arrayErr.forEach(function(item) { 
    // console.log( "K9 Bot = " + item);  
    }); 
    // res.send('K9 Production Bot Running');
}); 


//some comments
