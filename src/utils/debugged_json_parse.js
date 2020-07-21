import {logError} from "./logError";

export function debugged_json_parse(jsonText) {
    try {
        return JSON.parse(jsonText);
    } catch (e) {
        logError('Failed to parse json: ' + jsonText, '', 2687);
        throw e;
    }
}
