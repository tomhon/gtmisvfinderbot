

var express = require('express');
var bodyParser = require('body-parser');
var cache = require('memory-cache');
var router = express.Router();


var server = express();
// server.use(bodyParser.urlencoded({ extended: true})); 

// server.set('views', __dirname + '/views');

// //Use ejs library for rendering 
// server.set('view engine', 'ejs');

// //hooks up status.js
// // server.use('/status', require('./status')); //commented out to eliminate bot blocking issue

// var restify = require('restify');
var builder = require('botbuilder');
// var server = restify.createServer(); 
server.listen(process.env.port || 80, function () {
    console.log('%s listening to %s', server.name, server.url); 
});

var debugMode = false;

function verboseDebug(event, session) {
    if (debugMode) {
    if (session) {session.send(event);}
    console.log(event);
    }
}


//V4 Branch -------------------------------------------------------------------------------------------

// /*-----------------------------------------------------------------------------
// This Bot demonstrates how to use an IntentDialog with a LuisRecognizer to add 
// natural language support to a bot. The example also shows how to use 
// UniversalBot.send() to push notifications to a user.

// For a complete walkthrough of creating this bot see the article below.

//     http://docs.botframework.com/builder/node/guides/understanding-natural-language/

// -----------------------------------------------------------------------------*/

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



// set up SQL server connection using Application Environment Variables

var appMappingArray = new Array();

function application() {
    this.ApplicationId = 0;
    this.ApplicationName = "";
    this.CrmApplicationId = "";
    this.AccountId = 0;
    this.AccountName = "";
    this.PlatformName = "";
    this.AzureMarketPlaceUrl = "";
    this.Url = "";
}


var appconfig = {
        userName: process.env.SQLuserName,
        password: process.env.SQLpassword,
        server: process.env.SQLserver,
        // If you are on Microsoft Azure, you need this:
        options: {encrypt: true, database: process.env.appSQLdatabase}
    };


// Create bot and bind to console
// var connector = new builder.ConsoleConnector().listen();
// var bot = new builder.UniversalBot(connector);

var appconnection = new Connection(appconfig);
appconnection.on('connect', function(err) {
    // If no error, then good to proceed.
    
        if (err) {
        //    console.log(err);
            arrayErr.push(err);
        } else {
          console.log("Connected to " + this.config.server + " " + this.config.options.database);
          arrayErr.push("Connected to " + this.config.server + " " + this.config.options.database);
          loadappMappingArray();  

        };
        
        
});

 //function to execute SQL query    
    
 function loadappMappingArray() {
      
        request = new Request("SELECT ApplicationId, ApplicationName, CrmApplicationUrl, AccountId, AccountName, PlatformName, AzureMarketPlaceUrl, Url FROM dbo.Applications", function(err) {
         if (err) {
            console.log(err);
            arrayErr.push(err);
          }
        else {
            console.log('SQL request succeeded ');
            arrayErr.push("SQL request succeeded");
          }
        });

    //unpack data from SQL query
        request.on('row', function(columns) {
            var oApplication = new application();
            columns.forEach(function(column) {
              if (column.value === null) {
                // mappingArray.push('');
              } else {
                    switch(column.metadata.colName) {
                        case "ApplicationId": 
                            oApplication.ApplicationId = column.value;
                            break;
                        case "ApplicationName":
                            oApplication.ApplicationName = column.value;
                            break;
                        case "CrmApplicationUrl":
                            oApplication.CrmApplicationUrl = column.value;
                            break;
                        case "AccountId":
                            oApplication.AccountId = column.value;
                            break;  
                        case "AccountName":
                            oApplication.AccountName = column.value;
                            break; 
                        case "PlatformName":
                            oApplication.PlatformName = column.value;
                            break;  
                        case "AzureMarketPlaceUrl":
                            oApplication.AzureMarketPlaceUrl = column.value;
                            break;                                                           
                         case "Url":
                            oApplication.Url = column.value;
                            break;   
                       }  

                    }

            });
            appMappingArray.push(oApplication);
            verboseDebug(oApplication);
            console.log(appMappingArray.length);
        }); 

        appconnection.execSql(request);
    };


//===============================================
// Load ApplicationCountry data
//===============================================

// set up SQL server connection using Application Environment Variables

var appCountriesMappingArray = new Array();

function ApplicationCountry() {
    this.ApplicationCountryId = 0;
    this.ApplicationId = 0;
    this.AreaId = 0;
    this.AreaName = "";
    this.CountryId = 0;
    this.CountryName = "";
    this.HasSellers = "";
}


// var appCountriesconfig = {
//         userName: process.env.SQLuserName || 'Teslovetohack@k9',
//         password: process.env.SQLpassword || 'Building9',
//         server: process.env.SQLserver || 'k9.database.windows.net',
//         // If you are on Microsoft Azure, you need this:
//         options: {encrypt: true, database: process.env.appSQLdatabase || 'isvpartnerbot'}
//     };


// Create bot and bind to console
// var connector = new builder.ConsoleConnector().listen();
// var bot = new builder.UniversalBot(connector);

var appCountriesconnection = new Connection(appconfig);
appCountriesconnection.on('connect', function(err) {
    // If no error, then good to proceed.
    
        if (err) {
        //    console.log(err);
            arrayErr.push(err);
        } else {
          console.log("Connected to " + this.config.server + " " + this.config.options.database);
          arrayErr.push("Connected to " + this.config.server + " " + this.config.options.database);
          loadappCountriesMappingArray();  

        };
        
        
});

 //function to execute SQL query    
    
 function loadappCountriesMappingArray() {
      
        request = new Request("SELECT ApplicationCountryId, ApplicationId, AreaId, AreaName, CountryId, CountryName, HasSellers FROM dbo.ApplicationCountries", function(err) {
         if (err) {
            console.log(err);
            arrayErr.push(err);
          }
        else {
            console.log('SQL request succeeded ');
            arrayErr.push("SQL request succeeded");
          }
        });

    //unpack data from SQL query
        request.on('row', function(columns) {
            var oApplicationCountry = new ApplicationCountry();
            columns.forEach(function(column) {
              if (column.value === null) {
                // mappingArray.push('');
              } else {
                    switch(column.metadata.colName) {
                        case "ApplicationCountryId": 
                            oApplicationCountry.ApplicationCountryId = column.value;
                            break;
                        case "ApplicationId":
                            oApplicationCountry.ApplicationId = column.value;
                            break;
                        case "AreaId":
                            oApplicationCountry.AreaId = column.value;
                            break;
                        case "AreaName":
                            oApplicationCountry.AreaName = column.value;
                            break;  
                        case "CountryId":
                            oApplicationCountry.CountryId = column.value;
                            break; 
                        case "CountryName":
                            oApplicationCountry.CountryName = column.value;
                            break;  
                        case "HasSellers":
                            oApplicationCountry.HasSellers = column.value;
                            break;                                                             
                       }  

                    }

            });
            appCountriesMappingArray.push(oApplicationCountry);
            console.log(oApplicationCountry);
            console.log(appCountriesMappingArray.length);
        }); 

        appCountriesconnection.execSql(request);
    };



// Create bot and bind to console
// var connector = new builder.ConsoleConnector().listen();
// var bot = new builder.UniversalBot(connector);


// set up SQL server connection using Application Environment Variables
//Load ApplicationIndutries table

var appIndustriesMappingArray = new Array();

function ApplicationIndustry() {
    this.ApplicationId = 0;
    this.IndustryId = 0;
    this.IndustryName = "";
    this.ParentIndustryId = 0;
    this.ParentIndustryName = "";
}


// Create bot and bind to console
// var connector = new builder.ConsoleConnector().listen();
// var bot = new builder.UniversalBot(connector);

var appIndustriesconnection = new Connection(appconfig);
appIndustriesconnection.on('connect', function(err) {
    // If no error, then good to proceed.
    
        if (err) {
        //    console.log(err);
            arrayErr.push(err);
        } else {
          console.log("Connected to " + this.config.server + " " + this.config.options.database);
          arrayErr.push("Connected to " + this.config.server + " " + this.config.options.database);
          loadappIndustriesMappingArray();  

        };
        
        
});

 //function to execute SQL query    
    
 function loadappIndustriesMappingArray() {
      
        request = new Request("SELECT ApplicationId, IndustryId, IndustryName, ParentIndustryId, ParentIndustryName FROM dbo.ApplicationIndustries", function(err) {
         if (err) {
            console.log(err);
            arrayErr.push(err);
          }
        else {
            console.log('SQL request succeeded ');
            arrayErr.push("SQL request succeeded");
          }
        });

    //unpack data from SQL query
        request.on('row', function(columns) {
            var oApplicationIndustry = new ApplicationIndustry();
            columns.forEach(function(column) {
              if (column.value === null) {
                // mappingArray.push('');
              } else {
                    switch(column.metadata.colName) {
                        case "ApplicationId": 
                            oApplicationIndustry.ApplicationId = column.value;
                            break;
                        case "IndustryId":
                            oApplicationIndustry.IndustryId = column.value;
                            break;
                        case "IndustryName":
                            oApplicationIndustry.IndustryName = column.value;
                            break;  
                        case "ParentIndustryId":
                            oApplicationIndustry.ParentIndustryId = column.value;
                            break; 
                        case "ParentIndustryName":
                            oApplicationIndustry.ParentIndustryName = column.value;
                            break;                                                              
                       }  

                    }

            });
            appIndustriesMappingArray.push(oApplicationIndustry);
            console.log(oApplicationIndustry);
            console.log(appIndustriesMappingArray.length);
        }); 

        appIndustriesconnection.execSql(request);
    };



// Create bot and bind to console
// var connector = new builder.ConsoleConnector().listen();
// var bot = new builder.UniversalBot(connector);




// Create bot and bind to chat
var connector = new builder.ChatConnector({
    appId: process.env.AppID,
    appPassword: process.env.AppSecret
    });
var bot = new builder.UniversalBot(connector);

var searchLimit = 10; //restrict number of results found

server.post('/api/messages', connector.listen());

// Create LUIS recognizer that points at our model and add it as the root '/' dialog for our Cortana Bot.
var model = process.env.LUISServiceURL;
var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', dialog);
// var platform = "";

// Add intent handlers

dialog.matches('Find_App', [ 

    function (session, args) {
        // Resolve and store any entities passed from LUIS.
        var geographyEntity = builder.EntityRecognizer.findEntity(args.entities, 'builtin.geography.country');
        var anyGeography= true; 
        var platformEntity = builder.EntityRecognizer.findEntity(args.entities, 'Platform');
        var anyPlatform = true;
        var industryEntity = builder.EntityRecognizer.findEntity(args.entities, 'Industry');
        var anyIndustry = true;
        var readinessEntity = builder.EntityRecognizer.findEntity(args.entities, 'Readiness');           
        var anyReadiness = true;     
        // session.send('Find_App called');

        if (geographyEntity) {
            var geography = new RegExp(geographyEntity.entity, 'i');
            verboseDebug('Geography found '+ geography,session);
            anyGeography = false;
            } else {session.send('Any Geography' )}
        if (platformEntity) {
            var platform = new RegExp(platformEntity.entity, 'i');
            verboseDebug('Platform found ' + platform,session);
            anyPlatform = false;
            } else {session.send('Any Platform')}
        if (industryEntity) {
            var industry = new RegExp( industryEntity.entity, 'i');
            verboseDebug('Industry found ' + industry,session);
            anyIndustry = false;
            } else {session.send('Any Industry')}
        if (readinessEntity) {
            var readiness = new RegExp( readinessEntity.entity, 'i');
            verboseDebug('Readiness found ' + readiness,session);
            anyReadiness = false;
            } else {session.send('Any Readiness')}

        //search mapping array for country


        var found = 0;
        var i = 0;
        while ( (i < (appCountriesMappingArray.length) ) && found < searchLimit ) {
            if (appCountriesMappingArray[i]) {
                // session.send(appCountriesMappingArray[x].CountryName);
                if (appCountriesMappingArray[i].CountryName.match(geography) || anyGeography) {
        //         //post results to chat
                    verboseDebug('found country ' + geography + i, session);
                    //
                    // look for app & match industry
                    //
                    var j = 0;
                    while ( (j < (appIndustriesMappingArray.length) ) && found < searchLimit ) {
                        if (appIndustriesMappingArray[j]) {
                            if(appIndustriesMappingArray[j].ApplicationId === appCountriesMappingArray[i].ApplicationId) {
                            // session.send(appCountriesMappingArray[x].CountryName);
                                if (appIndustriesMappingArray[j].ParentIndustryName.match(industry) || anyIndustry) {
                        //         //post results to chat
                                    verboseDebug('found Industry ' + appIndustriesMappingArray[j].ParentIndustryName + j, session);


                                    //
                                    // look for app & match platform
                                    //

                                        var l = 0;
                                        while ( ( l < appMappingArray.length ) && found < searchLimit ) {
                                            if (appMappingArray[l]) {
                                                if ((appMappingArray[l].ApplicationId === appIndustriesMappingArray[j].ApplicationId) && (appMappingArray[l].PlatformName.match(platform)) ) {
                                                    // session.send("Application: %s is available in %s" , appMappingArray[l].ApplicationName, appCountriesMappingArray[i].CountryName);
                                                    
                                                    verboseDebug("AppID: " + appMappingArray[l].ApplicationId, session);
                                                    
                                                    //create herocard for each application found
                                                    var card = new builder.HeroCard(session)
                                                        .title(appMappingArray[l].ApplicationName)
                                                        .subtitle(appMappingArray[l].AccountName + ', '+ appCountriesMappingArray[i].CountryName)
                                                        .text('Platform: '+ appMappingArray[l].PlatformName + ' Industry: ' + appIndustriesMappingArray[j].ParentIndustryName)
                                                        .tap(builder.CardAction.openUrl(session, appMappingArray[l].Url ))
                                                    var msg = new builder.Message(session)
                                                        .attachmentLayout(builder.AttachmentLayout.carousel)
                                                        .attachments([card]);
                                                    session.send(msg);
                                                    found++;
                                                }
                                            };
                                            l++;
                                            }

                                    //
                                    //end of app search loop
                                    //
                                }
                            }
                        }  
                        j++; 
                    }
                    //
                    //end of industry search loop
                    //


                    }
                }
            i++;
            }

    if (!found>0) {
        session.send( "Sorry, I couldn't find an application in " + geography);
        };


        
    }


]);
//===============================End of Find_App==========================

dialog.matches('Find_ISV_Contact', [
    function (session, args, next) {
        console.log('Find_ISV_Contact called');
        session.send('Find_ISV_Contact called');
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
        session.endDialog('Results now set to ' + number);

    }
    
]);
//===============================End of Find_ISV_Contact==========================


dialog.matches('Find_TE', [
    function (session, args, next) {
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
    session.send( "Welcome to ISVFinder on Microsoft Bot Framework. I can help you find the right ISV for your partner." ); 
    // session.send( "Local Partner data is live = " + (partnerISV.length > 0)); 
    //list all errors
    arrayErr.forEach(function(item) {
        session.send( "K9 Bot = " + item); 
    });
    session.send( "K9 data is live = " + (mappingArray.length > 0)); 
    session.send( "isvfinderbot applications data is live = " + (appMappingArray.length > 0)); 
        session.send( "isvfinderbot applicationCountry data is live = " + (appCountriesMappingArray.length > 0)); 
                // session.endDialog("Session Ended");
    });

//---------------------------------------------------------------------------------------------------    
//handle the case where there's no recognized intent

dialog.matches('None', function (session, args, next) { 
    session.send( "Welcome to ISVFinder on Microsoft Bot Framework. I can help you find the right ISV for your partner." ); 
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

// Setup Restify Server 

server.get('/', function (req, res) { 
    cache.put("TEBEMappingList", mappingArray);
    console.log('cache activated'); 
    console.log('cache activated'); 
    res.send('isvfinderbot development environment -  Bot Running ' 
        + arrayErr.length + " " 
        + arrayErr[0] + " " 
        + arrayErr[1] + " " 
        + mappingArray.length + " "
        + process.env.AppID + " "
        + process.env.AppSecret + " "
        + appMappingArray.length + " "
        + appCountriesMappingArray.length + " "
        + appIndustriesMappingArray.length
        ); 
    arrayErr.forEach(function(item) { 
    // console.log( "K9 Bot = " + item);  
    }); 
    // res.send('K9 Production Bot Running');
}); 



