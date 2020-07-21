import {object_is_empty} from "../utils/object_is_empty";

export class MapHistory {
    /**
     *
     * @param {MapConfiguration} mapConfiguration
     *
     * @constructor
     */
    constructor(mapConfiguration) {
        this.mapConfiguration = mapConfiguration;

        this.seriesConfigParams = [];

        this.queryParams = [];
    };
}

MapHistory.prototype.styleParamsString = '';

MapHistory.inHistoryStateTransition = false;

/**
 *
 * @param {object} params
 * @returns {undefined}
 */
MapHistory.prototype.set_style_params = function(params) {
    //console.log('set_style_params');
    //console.log(params);

    //this.styleParamsString = MapStyle._buildString(params.styleParamsObj) + MapStyle._buildString(params.pageParamsObj);

    //this.styleParamsString = '&style=' + encodeURIComponent(JSON.stringify(params));
    if (params) {
        this.styleParamsString = '&style=' + params;
        //console.log(this.styleParamsString);
    }
};

MapHistory.prototype.add_series_configuration = function(seriesParams) {
    this.seriesConfigParams.push(seriesParams);
};

MapHistory.prototype.add_param = function(key, value) {
    this.queryParams.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
};

MapHistory.prototype.add_safe_param = function(key, safeValue) {
    this.queryParams.push(encodeURIComponent(key) + '=' + safeValue);
};

MapHistory.prototype.process_series_config_params = function() {
    // check whether can use short maps syntax (specifying only the taxon entity id)
    if (this.seriesConfigParams.length === 1 &&
        //this.seriesConfigParams[0].controllerName === MapConfiguration.CONTROLLER_TAXONMAP
        (this.seriesConfigParams[0].hasOwnProperty('taxonEntityId'))
    ) {
        this.add_param('taxonid', this.seriesConfigParams[0].taxonEntityId);
        delete this.seriesConfigParams[0].taxonEntityId; // remove the now superfluous key

        if (object_is_empty(this.seriesConfigParams[0])) {
            // and the whole series config if that is now empty
            delete this.seriesConfigParams[0];
        }
    }

    if (!object_is_empty(this.seriesConfigParams)) {
        // serialize the set of series

        //console.log('series');
        //console.log(this.seriesConfigParams);

        //this.add_param('series', JSON.stringify(this.seriesConfigParams));
        this.add_safe_param('series', LZString.compressToEncodedURIComponent(JSON.stringify(this.seriesConfigParams)));
    }
};

MapHistory.mapsPathSegment = '/dev/mapstest/maps.php';

MapHistory.prototype.finalise = function() {
    if (this.seriesConfigParams.length) {
        this.process_series_config_params();
    }

    //console.log('considering hash state change');

    if (this.queryParams.length) {
        let hash = this.styleParamsString ? ('#' + this.styleParamsString.substr(1)) : ''; // skip the leading '&' character

        const paramsString = this.queryParams.length ? ('?' + this.queryParams.sort().join('&')) : '';

        if (MapHistory.historyChangesSuspendedDuringInitialisation) {
            //console.log('replacing state');
            history.replaceState(history.state, '', MapHistory.mapsPathSegment + paramsString + hash);
        } else {
            //console.log('pushing state');
            history.pushState(history.state, '', MapHistory.mapsPathSegment + paramsString + hash);
        }
    } else {
        let hash = this.styleParamsString ? ('#' + this.styleParamsString.substr(1)) : ''; // skip the leading '&' character

        if (MapHistory.historyChangesSuspendedDuringInitialisation) {
            //console.log('replacing state (no taxon list)');
            history.replaceState(history.state, '', MapHistory.mapsPathSegment + hash);
        } else {
            //console.log('pushing state (no taxon list)');
            history.pushState(history.state, '', MapHistory.mapsPathSegment + hash);
        }
    }
};

/**
 * sets a (hidden, non-uri) state parameter and pushes a new browser state entry
 * without modifying the uri
 *
 * @param {object} state
 * @param {boolean} replaceHistoryFlag
 * @param {boolean} overwriteObjectFlag
 */
MapHistory.modify_state = function (state, replaceHistoryFlag = false, overwriteObjectFlag = false) {
    let currentState = overwriteObjectFlag ? {} : history.state;

    if (!currentState) {
        currentState = {};
    }

    // clone into the state object
    for (let key in state) {
        if (state.hasOwnProperty(key)) {
            currentState[key] = state[key];
        }
    }

    if (replaceHistoryFlag) {
        history.replaceState(state, '');
    } else {
        history.pushState(state, '');
    }

};

MapHistory.get_current_state = function() {
    return history.state || {};
};
