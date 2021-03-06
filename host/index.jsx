/**
 * @author Scott Lewis <scott@atomiclotus.net>
 * @copyright 2018 Scott Lewis
 * @version 1.0.0
 * @url http://github.com/iconifyit
 * @url https://atomiclotus.net
 *
 * ABOUT:
 *
 *    This script saves a list of open Illustrator documents for you to easily
 *    return to this work 'session' at a later time without searching for all
 *    of your open documents.
 *
 * NO WARRANTIES:
 *
 *   You are free to use, modify, and distribute this script as you see fit.
 *   No credit is required but would be greatly appreciated.
 *
 *   THIS SCRIPT IS OFFERED AS-IS WITHOUT ANY WARRANTY OR GUARANTEES OF ANY KIND.
 *   YOU USE THIS SCRIPT COMPLETELY AT YOUR OWN RISK AND UNDER NO CIRCUMSTANCES WILL
 *   THE DEVELOPER AND/OR DISTRIBUTOR OF THIS SCRIPT BE HELD LIABLE FOR DAMAGES OF
 *   ANY KIND INCLUDING LOSS OF DATA OR DAMAGE TO HARDWARE OR SOFTWARE. IF YOU DO
 *   NOT AGREE TO THESE TERMS, DO NOT USE THIS SCRIPT.
 */

/**
 * Declare the target app.
 */
#target illustrator

$.localize = true;

#include "Logger.jsx"
#include "JSON.jsx"
#include "Utils.jsx"
#include "Helpers.jsx"

var SESSION_NAME = getSessionName();

/**
 * @type {{
 *    SRCFOLDER: string,
 *    LOGFOLDER: string,
 *    LOGFILE: string,
 *    NO_OPEN_DOCS: *,
 *    NO_DOC_SELECTED: *,
 *    SESSION_SAVED: *,
 *    ENTER_FILENAME: *,
 *    JSON_EXT: string,
 *    TEXT_EXT: string
 * }}
 */
var CONFIG = {
    APP_NAME         : "ai-sessions",
    USER             : $.getenv('USER'),
    HOME             : $.getenv('HOME'),
    DOCUMENTS        : Folder.myDocuments,
    SRCFOLDER        : Folder.myDocuments + '/ai-sessions',
    LOGFOLDER        : Folder.myDocuments + '/ai-sessions/logs',
    LOGFILE          : Folder.myDocuments + '/ai-sessions/logs/' + SESSION_NAME  + '.log',
    NO_OPEN_DOCS     : localize({en_US: 'There are no open docs to save for this session'}),
    NO_DOC_SELECTED  : localize({en_US: 'You have not selected a session to open'}),
    NO_DOCS_TO_COPY  : localize({en_US: 'There are no open documents to copy'}),
    SESSION_SAVED    : localize({en_US: 'Your Session Was Saved!'}),
    JSON_EXT         : ".json",
    TEXT_EXT         : ".txt"
};

/**
 * The local scope logger object.
 * @type {Logger}
 */
var logger = new Logger(CONFIG.APP_NAME, CONFIG.LOGFOLDER);

logger.info("init " + SESSION_NAME);

/**
 * Run the script using the Module patter.
 */
var AiSessions = (function(CONFIG) {

    /**
     * Populates the sessions select list.
     */
   function doGetSessionsList() {

        var files = new Folder(CONFIG.SRCFOLDER).getFiles("*.json");
        var sessions = [];
        for (i=0; i<files.length; i++) {
            sessions.push(files[i].name);
        }

        if (sessions.length) {
            /**
             * Let's show the newest sessions at the top.
             */
            try {
                sessions.sort(function(a, b) {
                    var nameA = Utils.slugger(a.toUpperCase());
                    var nameB = Utils.slugger(b.toUpperCase());
                    if (nameA < nameB) {
                        return -1;
                    }
                    if (nameA > nameB) {
                        return 1;
                    }
                    // names must be equal
                    return 0;
                });
                sessions.reverse();
            }
            catch(e) {
                logger.error(e.message);
            }
        }

        return JSON.stringify(sessions);
    };

    /**
     * Callback to open the selected session.
     * @param filepath
     */
   function doOpenCallback(filepath) {

        filepath = CONFIG.SRCFOLDER + "/" + filepath;

        var theFile = new File(decodeURI(filepath));

        if (theFile.exists) {
            try {
                var session = Utils.read_json_file(theFile);

                if (typeof(session) == 'object') {

                    if (session.files) {
                        for(i=0; i<session.files.length; i++) {
                            var ai_file_path = decodeURIComponent(session.files[i]);
                            var thisFile = new File(ai_file_path);
                            if (thisFile.exists) {
                                doc = app.open(thisFile);
                                app.executeMenuCommand('fitall');
                            }
                        }
                    }
                }
            }
            catch(ex) {
                return ex.message;
            }
        }
        else {
            logger.error(
                localize({en_US: "%1 - %2 - File `%3` does not exist."}, $.line, $.fileName, filepath)
            );
        }
    };

    /**
     * Saves the current session.
     */
    function doSaveCallback() {

        var openDocs, sessionName;

        if (app.documents.length == 0) {
            alert(CONFIG.NO_OPEN_DOCS);
        }
        else {

            try {
                openDocs    = getOpenDocPathsQuoted();
                sessionName = getSessionName();

                CONFIG.LOGFILE = sessionName + ".log";

                Utils.write_file(
                    CONFIG.SRCFOLDER + "/" + sessionName + ".json",
                    '{"files":[\r' + '    ' + openDocs.join(',\r    ') + '\r]}',
                    true
                );

                return doGetSessionsList();
            }
            catch(ex) {
                logger.error(ex.message);
            }
        }
    };

    /**
     * Get full paths of all open documents.
     * @returns {Array}
     */
    function getOpenDocPaths() {
        var openDocs = [];
        for (x=0; x<app.documents.length; x++) {
            openDocs.push(app.documents[x].path + "/" + app.documents[x].name);
        }
        return openDocs;
    }

    /**
     * Get full paths of all open documents.
     * @returns {Array}
     */
    function getOpenDocPathsQuoted() {
        var openDocs = getOpenDocPaths();
        for (x=0; x<openDocs.length; x++) {
            openDocs[x] = '"' + openDocs[x] + '"';
        }
        return openDocs;
    }

    /**
     * Creates a web shortcut then opens it in the default browser.
     * @param address
     * @private
     */
    function doOpenWebAddress( address ) {
        try {
            Utils.write_exec(
                Folder.temp + '/' + now() + '-shortcut.url',
                '[InternetShortcut]' + '\r' + 'URL=' + encodeURI(address) + '\r'
            );
        }
        catch(e) {
            logger.error(e);
            prompt(
                Utils.i18n(
                    "The web address could not be automatically opened but you " +
                    "can copy & paste the address below to your browser."
                ),
                address
            );
        }
    };

    /**
     * Collection the open documents into the specified folder.
     * @private
     */
    function _doCollectOpenDocs() {

        var fileList;

        if (! app.documents.length) {
            alert(CONFIG.NO_DOCS_TO_COPY);
            return;
        }

        fileList = getOpenDocPaths();

        logger.info(fileList);

        if (! isEmpty(fileList)) {
            logger.info(Utils.i18n("fileList is not empty. Try to copy."));
            return _doCopyFiles(fileList);
        }
        else {
            return Utils.i18n("Cannot collect open docs. File list is empty");
        }
    };

    /**
     * Callback for sorting the file list.
     * @param   {File}  a
     * @param   {File}  b
     * @returns {number}
     */
    var comparator = function(a, b) {
        var nameA = Utils.slugger(a.name.toUpperCase());
        var nameB = Utils.slugger(b.name.toUpperCase());
        if (nameA < nameB) {
            return -1;
        }
        if (nameA > nameB) {
            return 1;
        }
        // names must be equal
        return 0;
    }

    /**
     * Private function to delete a session file.
     * @param sessionFileName
     * @private
     */
    function _doDeleteSession(sessionFileName) {
        var result = false;

        var dialogPrompt = Utils.i18n("Are you sure you want to delete the session `%1`?", sessionFileName);
        if ( confirm(dialogPrompt, sessionFileName) ) {
            if (sessionFile = getSessionFile(sessionFileName)) {
                result = sessionFile.remove() ?
                    "Session file was deleted" :
                    "Session file could not be deleted";
            }
        }
        else {
            result = "NOOO! Don't delete it!";
        }
        return JSON.stringify({result: Utils.i18n(result) });
    }

    /**
     * Private function to rename a session file.
     * @param sessionFileName
     * @private
     */
    function _doRenameSession(sessionFileName) {
        var result = false;

        var dialogPrompt = Utils.i18n("Enter a new name for the session `%1`?", sessionFileName);
        if ( newName = prompt(dialogPrompt, sessionFileName) ) {
            if (newName.toLowerCase().split(".").pop() != "json") {
                newName += ".json";
            }
            if (sessionFile = getSessionFile(sessionFileName)) {
                result = sessionFile.rename(newName) ?
                    "Session file was renamed" :
                    "Session file could not be renamed" ;
            }
        }
        return JSON.stringify({result: Utils.i18n(result) });
    }

    /**
     * Private function to open a session file.
     * @param sessionFileName
     * @private
     */
    function _doOpenSessionFile(sessionFileName) {
        if (sessionFile = getSessionFile(sessionFileName)) {
            sessionFile.execute();
        }
    }

    /**
     * Collect the files in the session to a new location.
     * @param sessionFileName
     * @private
     */
    function _doCopySessionDocs(sessionFileName) {
        if (sessionFile = getSessionFile(sessionFileName)) {
            var json = Utils.read_json_file(sessionFile);
            if (isDefined(json.files)) {
                _doCopyFiles(json.files);
            }
        }
    }

    /**
     * Private function to copy a list of files to a selected folder.
     * @param fileList
     * @private
     */
    function _doCopyFiles(fileList) {

        var destination, targetFolderPath, dialogPrompt;

        dialogPrompt     = Utils.i18n("Choose a folder to copy the documents to");
        destination      = Folder.selectDialog(dialogPrompt, Folder.myDocuments)
        targetFolderPath = new Folder(destination).absoluteURI;

        logger.info(targetFolderPath);

        try {

            for (i=0; i < fileList.length; i++) {

                theDoc = new File(fileList[i]);

                if (theDoc.exists) {
                    try {
                        theDoc.copy(Utils.getUniqueFileName(targetFolderPath, theDoc.name));
                    }
                    catch(ex) {
                        logger.error(ex.message);
                    }
                }
            }

            new Folder(destination).execute();
        }
        catch(ex) {
            logger.error(ex);
            return ex;
        }
        return Utils.i18n("Files copied successfully");
    }

    /**
     * Private function get a File object from the session filename.
     * @param sessionFileName
     * @returns {*}
     */
    function getSessionFile(sessionFileName) {
        var sessionFile = new File(CONFIG.SRCFOLDER + "/" + sessionFileName);
        return sessionFile.exists ? sessionFile : false ;
    }

    /**
     * Private method to open the log file.
     * @private
     */
    function _doOpenLogFile() {
        try {
            logger.info("LOG FILE : " + logger.file.absoluteURI);
            return logger.open();
        }
        catch(ex) {
            logger.error(ex);
            return ex;
        }
    }

    /**
     * Returns the public module object.
     */
    return {
        doSaveCallback: function() {
            return doSaveCallback();
        },

        doOpenCallback: function(filePath) {
            doOpenCallback(filePath);
        },

        initSessionsList: function() {
            return doGetSessionsList();
        },

        getOpenDocs : function() {
            return getOpenDocPaths();
        },

        openWebAddress : function(address) {
            return doOpenWebAddress(address);
        },

        doCollectOpenDocs : function() {
            return _doCollectOpenDocs();
        },

        doDeleteSession : function(sessionFileName) {
            return _doDeleteSession(sessionFileName);
        },

        doRenameSession : function(sessionFileName) {
            return _doRenameSession(sessionFileName);
        },

        doOpenSessionFile : function(sessionFileName) {
            _doOpenSessionFile(sessionFileName);
        },

        doCopySessionDocs : function(sessionFileName) {
            return _doCopySessionDocs(sessionFileName);
        },

        openLogFile : function() {
            return _doOpenLogFile();
        }
    }

})(CONFIG);



/**
 * Create a unique session name.
 * @returns {string}
 */
function getSessionName() {
    return Utils.dateFormat(new Date().getTime()) + '@' + new Date().getTime();
}

/**
 * Get number of open documents.
 * @returns {*}
 */
function getDocCount() {
    if (typeof(app.documents) != 'undefined') {
        return app.documents.length;
    }
    return 0;
}

/**
 * Use this to interface from client side.
 * Example: csxScript('log("some text", "info")')
 * @param message
 * @param type
 */
function csxLogger(message, type) {
    var logger = new Logger(CONFIG.APP_NAME, CONFIG.LOGFOLDER);
    logger.log( message, type );
}
