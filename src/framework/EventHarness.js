export class EventHarness {
    /**
     *
     * @type {*[]}
     */
    _eventListeners = [];

    static STOP_PROPAGATION = 'STOP_PROPAGATION';

    /**
     *
     * @param {string} eventName
     * @param {Object} obj
     * @param {Function} method
     * @param {*=} constructionParam
     * @deprecated use addListener instead
     * @return {number} handle
     */
    bindListener (eventName, obj, method, constructionParam) {
        this._eventListeners = this._eventListeners || [];

        const handlerFunction =
            function(context, eventName, invocationParam) {
                return method.call(obj, context, eventName, invocationParam, constructionParam);
            };

        if (this._eventListeners[eventName]) {
            return (this._eventListeners[eventName].push(handlerFunction))-1;
        } else {
            this._eventListeners[eventName] = [handlerFunction];
            return 0; // first element in array
        }
    };

    /**
     *
     * @param {string} eventName
     * @param {Function} handler
     * @param {*=} constructionParam
     * @return {number} handle
     */
    addListener (eventName, handler, constructionParam = {}) {
        this._eventListeners = this._eventListeners || [];

        const handlerFunction =
            function(context, eventName, invocationParam = {}) {
                return handler({context, eventName, ...invocationParam, ...constructionParam});
            };

        if (this._eventListeners[eventName]) {
            return (this._eventListeners[eventName].push(handlerFunction)) - 1;
        } else {
            this._eventListeners[eventName] = [handlerFunction];
            return 0; // first element in array
        }
    };

    /**
     *
     * @param {string} eventName
     * @param {number} handle
     * @returns undefined
     */
    removeListener(eventName, handle) {
        if (this._eventListeners[eventName] && this._eventListeners[eventName][handle]) {
            delete this._eventListeners[eventName][handle];
        } else {
            console.log('trying to remove non-existent event handler, event = ' + eventName + ' handle = ' + handle);
        }
        return undefined;
    };

    /**
     *
     */
    destructor() {
        this._eventListeners = null;
    };

    /**
     *
     * @param {string} eventName
     * @param {Object=} param optional parameter to pass on to listener
     * @return void
     */
    fireEvent (eventName, param) {
        //console.log('fire event "' + eventName + '" called by '+this.fire_event.caller.caller+' invoked by '+this.fire_event.caller.caller.caller+' instigated by '+this.fire_event.caller.caller.caller.caller);

        if (this._eventListeners) {
            for (let f in this._eventListeners[eventName]) {
                if (this._eventListeners[eventName].hasOwnProperty(f)) {
                    if (this._eventListeners[eventName][f](this, eventName, arguments[1]) === EventHarness.STOP_PROPAGATION) {
                        break;
                    }
                }
            }
        }
    };
}
