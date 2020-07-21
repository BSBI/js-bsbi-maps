/**
 * returns a wrapped method invocation
 *
 * @param {Object} obj
 * @param {string} methodName
 * @param {*=} passthru
 * @deprecated
 */
export function callback_external_param(obj, methodName, passthru) {
    try {
        return passthru === undefined ? (obj[methodName].bind(obj)) : (function(param){return obj[methodName](param, passthru);});
    } catch(e) {
        e.message += ' methodName=' + methodName + (obj.label ? (' obj label: ' + obj.label):'');

        throw e;
    }
}
