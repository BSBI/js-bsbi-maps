let domEventStack = [];
let domEventTargets = [];
let domEventMethodNames = [];
let domEventTypes = [];
let domEventCapturing = [];

/**
 *
 * @param {EventTarget} target
 * @param {string} eventName
 * @param {Object} obj
 * @param {string} methodName
 * @param {*=} param
 * @param {boolean=} capturing
 * @return {number} ref to attached function, which is returned (in case needed for removal later)
 * @deprecated avoid as this wrapper is no longer needed (prefer addEventListener)
 */
export function registerDOMEventHandler(target,eventName,obj,methodName,param,capturing) {
    if (!target) {
        throw new Error('Failed to register event handler for unset target, eventName = ' + eventName + ' methodName=' + methodName);
    }

    const stackElement = domEventStack.length;

    domEventStack[stackElement] = (event) => {
        return obj[methodName](event, target, param);
    };

    target.addEventListener(eventName, domEventStack[stackElement], capturing == true);

    domEventTargets[stackElement] = target;
    domEventMethodNames[stackElement] = methodName;
    domEventTypes[stackElement] = eventName;
    domEventCapturing[stackElement] = (capturing == true);

    return stackElement; // ref to attached function, which is returned (in case needed for removal later)
}

/**
 *
 * @param {?string} handler
 * @returns {null}
 */
export function removeDomEventHandler(handler) {
    if (handler != null) { // may be null or undefined so must compare using != rather than !==
        if (domEventStack[handler] && domEventTargets[handler] && domEventTargets[handler].removeEventListener) {
            domEventTargets[handler].removeEventListener(domEventTypes[handler],domEventStack[handler], domEventCapturing[handler]);
            //var idString=domEventMethodNames[handler]+" "+domEventTargets[handler]+" "+domEventTypes[handler];
            delete domEventStack[handler];
            delete domEventMethodNames[handler];
            delete domEventTypes[handler];
            delete domEventTargets[handler];
            delete domEventCapturing[handler];
        } else {
            throw new Error('bsbidb: event remove failure (DOM)');
            //throw new Error('bsbidb: event remove failure (DOM) ' + arguments.callee.caller.toString());
        }
    }
    return null;
}

/**
 * registers callback using bind where available
 * NB the parameters for the callback function differ from those for register_dom_event_handler
 * parameters are: {*=}param, {Event} event
 *
 * in the callback the targetElement is available as event.currentTarget
 *
 * @param {EventTarget} targetElement
 * @param {string} eventName
 * @param {Object} callbackObject
 * @param {Function} callbackMethod
 * @param {*=} param
 * @param {boolean=} capturing
 * @return {number} ref to attached function, which is returned (in case needed for removal later)
 */
export function registerBoundEventHandler(targetElement, eventName, callbackObject, callbackMethod, param, capturing) {
    if (!targetElement) {
        throw new Error('Failed to register bound event handler for unset target, eventName = ' + eventName + ' method=' + callbackMethod);
    }

    var stackElement = domEventStack.length;
    domEventStack[stackElement] =
        ((param === undefined) ? callbackMethod.bind(callbackObject, null) : callbackMethod.bind(callbackObject, param))
        ;

    targetElement.addEventListener(eventName, domEventStack[stackElement], capturing == true);

    domEventTargets[stackElement] = targetElement;

    domEventTypes[stackElement] = eventName;
    domEventCapturing[stackElement] = (capturing == true);

    return stackElement; // ref to attached function, which is returned (in case needed for removal later)
}
