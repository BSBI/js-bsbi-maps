/**
 * encodes uri component according to RFC3986
 * (notably, single quotes are also escaped)
 * see https://developer.mozilla.org/en/docs/JavaScript/Reference/Global_Objects/encodeURIComponent
 *
 * @param {string} str URI part to escape
 * @return {string}
 */
export function safeEncodeUriComponent(str) {
    return encodeURIComponent(str).replace(/[!'()]/g, escape).replace(/\*/g, "%2A");
}
