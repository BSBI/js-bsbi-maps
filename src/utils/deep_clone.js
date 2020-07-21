/**
 *
 * @param obj
 * @returns {*}
 */
import {debugged_json_parse} from "./debugged_json_parse";

export function deep_clone(obj) {
    // the 'undefined' test matters as otherwise the stringify - parse process can convert undefined to an unquoted string which can't then be reparsed as valid JSON, generating an error
    if (typeof obj !== 'undefined') {
        return debugged_json_parse(JSON.stringify(obj));
    } else {
        return undefined;
    }
}
