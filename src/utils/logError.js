/**
 * reports a javascript error
 * @param {string} message
 * @param {string=} url
 * @param {string|number=} line
 * @param {number=} column
 * @param {Error=} errorObj
 */
import {create_xml_doc} from "./create_xml_doc";
import {MapControl} from "..";
import {xml_save} from "./xml_save";

export function logError(message, url, line, column, errorObj) {

    window.onerror = null;

    console.error(message, url, line, errorObj);

    if (console.trace) {
        console.trace('Trace');
    }

    var doc = create_xml_doc();
    var error = doc.createElement('error');

    if (line !== null && line !== undefined) {
        error.setAttribute('line', line);
    }

    if (errorObj && ('stack' in errorObj)) {
        error.setAttribute('stack', errorObj.stack);
    }

    if (url !== null && url !== undefined) {
        error.setAttribute('url', url);
    }

    if (window.location.search) {
        error.setAttribute('urlquery', window.location.search);
    }

    if (window.location.hash) {
        error.setAttribute('urlhash', window.location.hash);
    }

    //error.setAttribute('caller',window.onerror.caller||window.onerror.arguments.caller);
    if ('uid' in window && window.uid) {
        error.setAttribute('userid', window.uid);
    }

    var versions = '';
    for (var scriptName in scriptVersions) {
        if (scriptVersions.hasOwnProperty(scriptName)) {
            versions += scriptName + '.' + scriptVersions[scriptName] + ';';
        }
    }
    error.setAttribute('versions', versions);
    // noinspection PlatformDetectionJS
    error.setAttribute('browser', navigator.appName);
    error.setAttribute('browserv', navigator.appVersion);

    error.appendChild(doc.createTextNode(message));

    doc.documentElement.appendChild(error);

    var errorReportRequest = new XMLHttpRequest(); // create the request object

    var loggingUrl = MapControl.scriptPath + '/javascriptErrorLog.php?x=x';

    xml_save(errorReportRequest, loggingUrl, null, doc);

    window.onerror = logError; // turn on error handling again
    return true; // suppress normal error reporting
}
