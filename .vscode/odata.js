// //basic config 
// o().config({
//   endpoint: process.env.odataEndpoint,   // your odata endpoint for the service 
// //   endpoint: 'http://services.odata.org/V4/OData/OData.svc',   // your odata endpoint for the service 
//   json: false,       // currently only json is supported 
//   version: 1,       // oData version (currently supported version 4\. However most also work with version 3.) 
//   strictMode: false, // strict mode throws exceptions, non strict mode only logs them 
//   start: null,      // a function which is executed on loading 
//   ready: null,      // a function which is executed on ready 
//   error: null,      // a function which is executed on error 
//   headers: [],      // an array of additional headers e.g.: [{name:'headername',value:'headervalue'}] 
//   username: process.env.odataUsername,   // a basic auth username 
//   password: process.env.odataPassword,   // a basic auth password 
//   isAsync: true     // set this to false to make synced (a)jax calls. (doesn't work with basic auth!) 
// });


//  //===============================================
//  //Loads Application data into array Applications
//  //===============================================

// function loadApplicationsArray () {
//     o('Applications').get(function(data) {
//         Applications = data;
//         console.log("Applications Data Loaded - array length: %s", Applications.length);
//     });
// }

// //===============================================
// // Load ApplicationCountry data
// //===============================================

// function loadApplicationCountriesArray () {
//     o('ApplicationCountries').get(function(data) {
//         ApplicationCountries = data;    
//         console.log("Application Countries Data Loaded - array length: %s", ApplicationCountries.length);
//     });
// }

// //===============================================
// // Load ApplicationIndustries data
// //===============================================

// function loadApplicationIndustriesArray () {
//     o('ApplicationIndustries').get(function(data) {
//         ApplicationIndustries = data;
//         console.log("Application Industries Data Loaded - array length: %s", ApplicationIndustries.length);
//     });
// }

// //===============================================
// // Load ApplicationIndustries data
// //===============================================

// function loadApplicationContactsArray() {
//     o('ApplicationContacts').get(function(data) {
//         ApplicationContacts = data;
//         console.log("Application Contacts Data Loaded - array length: %s", ApplicationContacts.length);
//     });
// }

// //===============================================
// // Load ApplicationMaterials data
// //===============================================

// function loadApplicationMaterialsArray () {
//     o('ApplicationMaterials').get(function(data) {
//         ApplicationMaterials = data;
//         console.log("Application Materials Data Loaded - array length: %s", ApplicationMaterials.length);
//     });
// }

// //===============================================
// // Load data arrays from odata service
// //===============================================

// // var Applications = new Array();
// // loadApplicationsArray();

// // var ApplicationCountries = new Array();
// // loadApplicationCountriesArray();

// // var ApplicationIndustries = new Array();
// // loadApplicationIndustriesArray();

// // var ApplicationContacts = new Array();
// // loadApplicationContactsArray();


// // var ApplicationMaterials = new Array();
// // loadApplicationMaterialsArray();