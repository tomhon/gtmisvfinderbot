var app = require('./app');

//===============================================
// Piece together the query string to find Microsoft contacts for GTM ISVs
//==============================================


function createContactQueryString(session, searchISV) {

        contactQueryString = "SELECT dashboard.Contact.emailaddress, dashboard.Contact.firstname, dashboard.Contact.lastname, application.AccountName, Application.ApplicationName, Application.applicationId"
        + " from Application, dashboard.Contact"
        + " WHERE dashboard.Contact.applicationid = Application.ApplicationId AND dashboard.Contact.ContactTypeName = 'PBE GTM' AND Application.Readiness > 0"
        + " AND application.AccountName Like '" + searchISV + "'";

        app.verboseDebug(('Query =', contactQueryString));
        return contactQueryString;
};


//===============================================
// Piece together the query string to find applications
//==============================================

function createAppQueryString(session) {
        // appQueryString = "SELECT TOP " + searchLimit + " Application.ApplicationId, Application.ApplicationName, Application.AccountName, Application.IndustryName, Application.IndustrialSectorName, Application.PlatformName, Application.Readiness, Account.GtmTier, Country.Name AS CountryName, Channel.Name AS ChannelName" 
        var appQueryString;
        appQueryString = "SELECT DISTINCT Application.ApplicationId, Application.ApplicationName, Application.AccountName, Application.IndustryName, Application.IndustrialSectorName, Application.PlatformName, Application.Readiness, Application.IsAzure, Application.IsDynamics,Application.IsOffice365,Application.IsSqlServer,Application.IsWindows ,Account.GtmTier, Country.Name AS CountryName, Channel.Name AS ChannelName" 
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
        + ")";
        if (session.userData.geography == '%') {
            appQueryString = appQueryString + " AND Country.Name LIKE 'united states'" 
            } else {
                appQueryString = appQueryString + " AND Country.Name LIKE '" + session.userData.geography + "'" 
            };
        appQueryString = appQueryString + " AND Application.IndustrialSectorName LIKE '%" + session.userData.industry + "%'"
        + " AND Application.Readiness >= " + session.userData.readiness.value
        + " AND ApplicationCountry.HasSellers = 'true'"
        + " AND Channel.Name IS NOT NULL"
        + ") ORDER BY Application.Readiness DESC, country.Name ASC, channel.Name ASC";

        // verboseDebug(('Query =', appQueryString));
        return appQueryString;
};



module.exports.createContactQueryString = createContactQueryString;
module.exports.createAppQueryString = createAppQueryString;

