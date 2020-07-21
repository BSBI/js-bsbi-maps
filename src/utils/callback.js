/**
 * returns a wrapped method invocation
 *
 * @param {Object} obj
 * @param {string} methodName
 * @param {*=} param bound parameter
 * @deprecated should use bind() directly
 */
export function callback(obj, methodName, param) {
    try {
        return param === undefined ? (obj[methodName].bind(obj)) : (function(){return obj[methodName](param);});
    } catch(e) {
        e.message += ' methodName=' + methodName + (obj.label ? (' obj label: ' + obj.label):'');

        throw e;
    }
}
