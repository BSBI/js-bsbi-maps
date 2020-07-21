import {EventHarness} from "../framework/EventHarness";
import {escapeHTML} from "../utils/escapeHTML";
import {MapHistory} from "./MapHistory";
import {
    registerBoundEventHandler,
    registerDOMEventHandler,
    removeDomEventHandler
} from "../utils/registerDOMEventHandler";
import {MapConfiguration} from "./MapConfiguration";
import {MapStyle} from "./MapStyle";
import {object_is_empty} from "../utils/object_is_empty";
import {post} from "../utils/post";
import {callback_external_param} from "../utils/callback_external_param";
import {StaticClientsideSVGMap} from "./StaticClientsideSVGMap";
import {GMap} from "./GMap";
import {uniqueId} from "../utils/uniqueId";
import {MapDataseriesConfiguration} from "./MapDataseriesConfiguration";
import {MapDataseriesStyle} from "./MapDataseriesStyle";
import {logError} from "../utils/logError";
import {debugged_json_parse} from "../utils/debugged_json_parse";
import {getTaxonNamestringByEntityId} from "../utils/getTaxonNamestringByEntityId";
import {MapControlPanel} from "./MapControlPanel";
import {stop_event} from "../utils/stopEvent";
import {add_class} from "../utils/add_class";
//import {cookies} from "../utils/cookies";

export const BSBIDB_URL = 'https://database.bsbi.org/';

export class MapControl extends EventHarness {
    static staticUrl = window.location.protocol + '//database.bsbi.org/';

    /**
     * cookie-free url for static content
     *
     * @type string
     */
    static staticPath = window.location.protocol + '//database.bsbi.org/';

    static ICON_PLUSBUTTON = MapControl.staticPath + "img/icons/plusbutton.png";

    static ICON_DELETEBUTTON = MapControl.staticPath + "img/icons/Xbutton.png";

    static ICON_PATH = MapControl.staticPath + 'img/icons/';

    static merge_keys(target, source) {
        if (source !== null) {
            for(var key in source) {
                if (source.hasOwnProperty(key)) {
                    if ((!target.hasOwnProperty(key)) ||
                        (typeof(source[key]) !== 'object') ||
                        (source[key] === null) ||
                        (typeof(source[key]) !== typeof(target[key]))
                    ) {
                        // simple property or complex property that's completely missing

                        if (source[key] !== null && typeof source[key] !== 'undefined') {
                            target[key] = debugged_json_parse(JSON.stringify(source[key])); // deep clone, breaking links
                        }
                    } else {
                        MapControl.merge_keys(target[key], source[key]);
                    }
                }
            }
        }
        return target;
    }
}

MapControl.imgPath = '';
MapControl.scriptPath = '';
MapControl.technicalSupportContact = 'tom.humphrey@bsbi.org';
MapControl.localProxyScriptPrefix = '';

MapControl.SVG_CONTEXT = 'svg';
MapControl.GMAP_CONTEXT = 'gmap';
MapControl.SVG_LOCAL_CONTEXT = 'localsvg';

MapControl.EVENT_REGISTER_TABS_HOOK = 'registertabshook'; // hook to allow buttons for other context tabs (e.g. msb data table) to be registered

MapControl.EVENT_TAB_CONTEXT_CHANGE = 'tabcontextchange'; // fired by maptype_switch_click_handler when displayed context needs to be changed

MapControl.EVENT_ENUMERATE_CONTEXTS = 'enumeratecontexts';

MapControl.LOCAL_STORAGE_KEY = 'maptheme45';

/**
 * map-related query string parameters
 *
 * @type {string}
 */
MapControl.prototype.queryParams = '';

/**
 *
 * @type {MapControlPanel}
 */
MapControl.prototype.controls = null;

/**
 * if set then update the window hash when the mapped taxon selection changes
 *
 * @type {boolean}
 */
MapControl.varyUrlHash = false;

/**
 * if set then update the window title when the mapped taxon selection changes
 *
 * @type {boolean}
 */
MapControl.varyPageTitle = false;

MapControl.defaultPageTitle = 'BSBI maps';

MapControl.pageTitlePrefix = '';
MapControl.pageTitleSuffix = ' distribution map (BSBI)';

/**
 *
 * @type {MapStyle}
 */
MapControl.mapStyle = null;

/**
 *
 * @type MapConfiguration
 */
MapControl.mapConfiguration = null;

/**
 * Id threshold for user-defined map theme templates (user templates have Id's greater than this). Built-in default templates start from zero
 *
 * @type Number
 */
MapControl.USER_DEFINED_TEMPLATES_BASE_ID = 1024;

/**
 * Reads counties from this.vicecounties to initialise map options
 * adds a list of vicecounties to a map options object (unstructured, of the the type used to pass to initialise())
 *
 * @param {object} options
 * @param {string[]} vicecounties
 * @return {object} options
 */
MapControl.set_vice_county_map_options = function (options, vicecounties) {
    options.config.defaultVCList = vicecounties.join(',');

    if (!options.hasOwnProperty('style')) {
        options.style = {};
    }

    if (vicecounties.length > 5) {
        options.style.vcLists = [vicecounties.join(',')];
        options.style.areaListTypes = [MapConfiguration.AREA_TYPE_VC];
        options.style.areaListClipFlags = [true];
    } else {
        options.style.vcLists = vicecounties;
        options.style.areaListTypes = [];
        options.style.areaListClipFlags = [];
        options.style.areaListBackgrounds = [];
        options.style.areaListLineWeights = [];
        options.style.areaListLineColours = [];

        for(var n = vicecounties.length; n--;) {
            options.style.areaListTypes.push(MapConfiguration.AREA_TYPE_VC);
            options.style.areaListClipFlags.push(true);
            options.style.areaListBackgrounds.push('ffffff');
            options.style.areaListLineWeights.push(0.25);
            options.style.areaListLineColours.push('000000');
        }
    }

    return options;
};

/**
 * Displays warning banner if the script detects that it has not loaded itself correctly
 *
 * @param {string} message
 * @returns {undefined}
 */
MapControl.reload_warning = function(message) {
    var container = document.getElementsByTagName('body')[0].appendChild(document.createElement('div'));
    container.className = 'reloadwarning';
    container.style.position = 'fixed';
    container.style.top = '250px';
    container.style.left = '0px';
    container.style.fontSize = '1.5em';
    container.style.backgroundColor = 'white';
    container.style.width = '100%';
    container.style.margin = '1em 4em 1em 4em';
    container.style.padding = '1em';
    container.style.borderWidth = '3px';

    container.innerHTML =
        '<h2>The maps page has not loaded correctly</h2><p>' + escapeHTML(message) + '</p>' +
        '<p>Please try <a href="#" onclick="window.location.reload(true);">reloading the page</a>.</p><p>If the problem persists then please <a href="mailto:' + MapControl.technicalSupportContact + '" title="email BSBI support">let us know</a>.</p>'
    ;
};

/**
 *
 * @param {{config: Object, style: Object, series: Object, useTabs: boolean}} settings object consisting of config, style and series[{config:{},style:{}]
 */
MapControl.prototype.initialise = function(settings) {
    if (!MapControl.hasOwnProperty('renderScriptUrls')) {
        // scriptPath may be set after initial page load, so can't initialise these paths at top-level of file

        MapControl.renderScriptUrls = {
            'svg': MapControl.localProxyScriptPrefix + '/mapsvg.php?', // currently proxy rather than cross-origin, as embedded script does not work
            'svgPng': MapControl.scriptPath + '/mapsvg_png.php?',
            'svgPdf': MapControl.scriptPath + '/mapsvg_pdf.php?',
            'svgDocx': MapControl.scriptPath + '/mapsvg_docx.php?',
            'uni': MapControl.scriptPath + '/mapsvg_uniconvertor.php?'
        };
    }

    // if (!hasOwnProperty('uintFetchFunctions')) {
    //     initialise_binary_int_fetch_functions();
    // }

    MapHistory.historyChangesSuspendedDuringInitialisation = true;

    this._initialise_from_settings(settings);

    if (MapControl.varyUrlHash && !this.popstateHandle) {
        this.popstateHandle = registerDOMEventHandler(window, 'popstate', this, 'pop_state_handler');
    }

    if (this.mapConfiguration.showStaticMap) {
        if (false) {
            this.bindListener(MapControl.EVENT_ENUMERATE_CONTEXTS, this, MapControl.prototype.register_static_map_context);
            this.bindListener(MapControl.EVENT_TAB_CONTEXT_CHANGE, this, MapControl.prototype.svg_map_context_change_handler);
        } else {
            this.staticMap = new StaticClientsideSVGMap();
            this.staticMap.applyConfiguration(this.mapConfiguration);

            this.addListener(MapControl.EVENT_ENUMERATE_CONTEXTS, this.staticMap.register_context.bind(this.staticMap));
            this.addListener(MapControl.EVENT_TAB_CONTEXT_CHANGE, this.staticMap.context_change_handler.bind(this.staticMap));
        }
    }

    if (this.mapConfiguration.showGoogleMap) {
        this.gmap = new GMap();
        this.gmap.apply_configuration(this.mapConfiguration);

        this.addListener(MapControl.EVENT_ENUMERATE_CONTEXTS, GMap.prototype.register_context.bind(this.gmap));
        this.addListener(MapControl.EVENT_TAB_CONTEXT_CHANGE, GMap.prototype.context_change_handler.bind(this.gmap));
    }

    if (settings.tabSet) {
        this.tabSet = settings.tabSet;
        this.useTabs = true;
    } else {
        this.containerId = settings.containerId;

        var containerEl = document.getElementById(this.containerId);

        if (!containerEl) {
            throw new Error("Container element for map not found");
        }

        if (settings.useTabs) {
            this.tabSet = new YAHOO.widget.TabView(containerEl);
            this.useTabs = true;
        } else {
            this.useTabs = false;
            containerEl.classList.add('mapcontaineruntabbed');
        }
    }

    this.fireEvent(MapControl.EVENT_ENUMERATE_CONTEXTS);

    if (this.useTabs) {
        this.bindListener(MapControl.EVENT_REGISTER_TABS_HOOK, this, MapControl.prototype.assemble_tabbed_contexts);
    } else {
        this.bindListener(MapControl.EVENT_REGISTER_TABS_HOOK, this, MapControl.prototype.assemble_contexts);
    }

    this.fireEvent(MapControl.EVENT_REGISTER_TABS_HOOK, this.contexts);

    MapHistory.historyChangesSuspendedDuringInitialisation = false;
};

/**
 *
 * @param {MapControl} mapControl
 */
MapControl.prototype.register_static_map_context = function(mapControl) {
    var container = document.createElement('div');
    this.staticMapTabElId = container.id = uniqueId('staticmap');

    mapControl.register_context(MapControl.SVG_LOCAL_CONTEXT, {
        label: 'printable map',
        labelToolTip: 'switch to printable map view',
        container: container,
        contentFinalizeCallback: MapControl.prototype.set_content.bind(this)
    });
};

/**
 * called by context providers in response to an EVENT_ENUMERATE_CONTEXTS request
 *
 * @param {string} contextName
 * @param {object} contextParameters
 * @returns {undefined}
 */
MapControl.prototype.register_context = function(contextName, contextParameters) {
    /*
     * contextParameters = {
     *   label: label
     *   labelToolTip: text
     *   container: element - container element, not yet attached to DOM // can be null if context provider prefers delayed loading during finalize callback
     *   contentFinalizeCallback: callable - called after container is attached
     * }
     */

    if (!this.contexts) {
        this.contexts = {};
    }

    this.contexts[contextName] = contextParameters;
};

MapControl.prototype.assemble_tabbed_contexts = function(mapControl, eventName, contexts) {
    for (var contextName in contexts) {
        if (contexts.hasOwnProperty(contextName)) {
            var context = contexts[contextName];

            context.tab = new YAHOO.widget.Tab({
                label : context.label,
                contentEl : context.container,
                active : this.mapConfiguration.defaultTab === contextName
            });
            this.tabSet.addTab(context.tab);

            context.tab.addListener('activeChange', (function(that, contextName) {
                return function(state) {
                    if (state.newValue) {
                        // activeChange is fired twice, false for previous deselected tab and true for newly selected tab
                        // are only interested in the new selection event

                        var contextParams = {oldContext: that.controls.idListKey, newContext: contextName};

                        that.controls.set_options_availability(contextName);

                        that.fireEvent(MapControl.EVENT_TAB_CONTEXT_CHANGE, contextParams);
                        MapHistory.modify_state({tab: contextParams.oldContext}, true); // make sure that the current entry has the old state (overwrite current state)
                        MapHistory.modify_state({tab: contextParams.newContext}); // add a new browser history entry

                        that.test_for_series_prompt_on_no_content();
                    }
                };
            })(this, contextName));

            if (context.contentFinalizeCallback) {
                YAHOO.util.Event.onContentReady(context.container.id, context.contentFinalizeCallback);
            }
        }
    }
};

/**
 *
 *
 */
MapControl.prototype.assemble_contexts = function(mapControl, eventName, contexts) {
    var contentContainer = document.getElementById(mapControl.containerId);

    // kludge - eventually the default keywords should be changed to match (dropping 'googlemap' etc.)
    if (this.mapConfiguration.defaultTab === 'googlemap') {
        this.mapConfiguration.defaultTab = MapControl.GMAP_CONTEXT
    } else if (this.mapConfiguration.defaultTab === 'staticmap') {
        this.mapConfiguration.defaultTab = MapControl.SVG_LOCAL_CONTEXT
    }

    for (var contextName in contexts) {
        if (contexts.hasOwnProperty(contextName)) {
            var context = contexts[contextName];

            // console.log(context);

            context.container.style.display = (this.mapConfiguration.defaultTab === contextName) ? 'block' : 'none';

            contentContainer.appendChild(context.container);

            context.contentFinalizeCallback();
        }
    }
};

MapControl.prototype._initialise_from_settings = function(settings) {

    this.mapConfiguration = new MapConfiguration;

    this.mapStyle = new MapStyle;

    var configList = settings.config;
    var stylesList = settings.style;
    var series = settings.series;
    var key;

    if (!series) {
        throw new Error('Series settings missing from map configuration');
    }

    // set templateNumber here, so that base template is loaded before the other settings
    if (settings.style &&
        ('templateNumber' in settings.style) &&
        settings.style !== '' &&
        settings.style !== null &&
        (typeof settings.style !== 'undefined')
    ) {
        if (settings.style.templateNumber === 'local') {
            // special case, need to retrieve locally saved settings first

            settings.style.templateNumber = this.get_default_theme_id();
        }
        this.mapStyle.templateNumber = settings.style.templateNumber;
    } else {
        // set template number from cookies
        this.mapStyle.templateNumber = this.get_default_theme_id();
    }

    // copy across a template style to the local defaults in this.mapStyle
    // (note that templateNumber 0 is a valid default, whereas explicit 'null' means don't use a template)
    if (this.mapStyle.templateNumber !== null) {
        this.mapStyle.load_template();
    }

    // oneoff kludge to truely propagate default
    if ('defaultPartitionType' in configList) {
        MapConfiguration.prototype.defaultPartitionType = configList.defaultPartitionType;
    }

    for (key in configList) {
        if (configList.hasOwnProperty(key)) {
            this.mapConfiguration[key] = configList[key];
        }
    }

    for (key in stylesList) {
        if (stylesList.hasOwnProperty(key) &&
            stylesList[key] !== null &&
            (typeof stylesList[key] !== 'undefined') &&
            key !== 'partitionColours' && key !== 'partitionMarkerStyles'
        ) {
            this.mapStyle[key] = stylesList[key];
        }
    }

    for (var n in series) {
        if (series.hasOwnProperty(n)) {
            if (!this.mapConfiguration.hasOwnProperty(n)) {
                // create the series

                this.mapConfiguration.series[n] = new MapDataseriesConfiguration(n, this.mapConfiguration);
                this.mapConfiguration.series[n].partitionType = this.mapConfiguration.defaultPartitionType;

                if (n === '0') {
                    this.mapConfiguration.series[n].datasetIsPrimarySearchResult = true;
                }

                this.mapStyle.series[n] = new MapDataseriesStyle(this.mapStyle);
            }
            var dataseriesConfig = this.mapConfiguration.series[n];
            var dataseriesStyles = this.mapStyle.series[n];

            MapControl.merge_keys(dataseriesStyles, series[n].style);
            MapControl.merge_keys(dataseriesConfig, series[n].config);

            dataseriesConfig.set_controller(dataseriesConfig.controllerName); // set controller name also initialises related settings
        }
    }
};

MapControl.prototype.save_theme_handler = function(themeName, useLocalStorage) {
    if (useLocalStorage) {
        themeName = 'my settings';
    }

    var template = this.mapStyle.save_template(themeName);
    //console.log(template);

    // for each data series merge useful parameters into partitionColours and partitionMarkerStyles
    for (var n in template.series) {
        if (template.series.hasOwnProperty(n)) {

            var partitionBy = this.mapConfiguration.series[n].partitionType;
            var numberOfPartitions = this.mapStyle.series[n].partitions[partitionBy].length;

            for (var p = 0; p < numberOfPartitions; p++) {
                if (!template.partitionColours.hasOwnProperty(n)) {
                    // have a higher series number than the template previously had provision for
                    // (by default only three series are supported)

                    template.partitionColours[n] = {};
                }

                if (!template.partitionColours[n].hasOwnProperty(numberOfPartitions)) {
                    template.partitionColours[n][numberOfPartitions] = {};
                }

                template.partitionColours[n][numberOfPartitions][p] = this.mapStyle.series[n].partitions[partitionBy][p].colour;

                if (!template.partitionMarkerStyles.hasOwnProperty(n)) {
                    // have a higher series number than the template previously had provision for
                    // (by default only three series are supported)

                    template.partitionMarkerStyles[n] = {};
                }

                if (!template.partitionMarkerStyles[n].hasOwnProperty(numberOfPartitions)) {
                    template.partitionMarkerStyles[n][numberOfPartitions] = {};
                }

                template.partitionMarkerStyles[n][numberOfPartitions][p] = this.mapStyle.series[n].partitions[partitionBy][p].marker;
            }
        }
    }

    // purge empty arrays
    for (var key in template) {
        if (template.hasOwnProperty(key)) {
            if (typeof template[key] === 'object' && object_is_empty(template[key])) {
                delete template[key];
            }
        }
    }

    delete template.series;

    if (useLocalStorage) {
        this.save_theme_locally(template);
    } else {
        var data = {
            action : 'save',
            name : themeName,
            settings : JSON.stringify(template)
        };

        var req = new XMLHttpRequest();

        post(req, MapControl.scriptPath + '/maptheme.php', data, {
            200: callback_external_param(this, 'save_theme_response_handler', template),
            defaultHandler: callback_external_param(this, 'save_theme_error_response_handler')}
        );
    }
};

/**
 *
 * @param {XMLHttpRequest} request
 * @param {object} settings the data originally passed to the server
 * @returns {undefined}
 */
MapControl.prototype.save_theme_response_handler = function (request, settings) {
    //console.log('save_theme_response_handler');
    //console.log(request);

    if (request.responseXML) {
        var response  = request.responseXML.documentElement;

        var themeIdEls = response.getElementsByTagName('status'); // was themeId

        if (themeIdEls) {
            var themeId = parseInt(themeIdEls[0].firstChild.data, 10);
            MapStyleTemplates[themeId] = settings;
            this.mapStyle.templateNumber = themeId;

            this.set_default_theme_id(themeId);

            var templateMenuEl = document.getElementById(this.templateMenuId);
            templateMenuEl.options.length = 0; // clear exist menu
            this.set_template_menu_options(templateMenuEl);

            alert('saved theme');
        } else {
            alert('Oddd response from the server (missing theme id), may have failed to save theme.');
        }
    } else {
        alert('Unexpected response from the server, may have failed to save theme.');
    }
};

MapControl.prototype.save_theme_error_response_handler = function (status) {
    console.log('save_theme_error_response_handler' + status);
};

/**
 *
 * @param {object} settings theme template
 *
 * @returns {undefined}
 */
MapControl.prototype.save_theme_locally = function (settings) {
    try {
        window.localStorage.setItem(MapControl.LOCAL_STORAGE_KEY, JSON.stringify(settings));

        var themeId = 'local';
        MapStyleTemplates[themeId] = settings;
        this.mapStyle.templateNumber = themeId;

        this.set_default_theme_id(themeId);

        var templateMenuEl = document.getElementById(this.templateMenuId);
        templateMenuEl.options.length = 0; // clear exist menu
        this.set_template_menu_options(templateMenuEl);
    } catch (e) {
        // firefox can have problems with corrupt local storage
        //if(e.name == "NS_ERROR_FILE_CORRUPTED") {
        console.log('Failed to save theme, local storage may be corrupt.');
        logError('Failed to save theme, local storage may be corrupt. (fake error), error name = ' + e.name, '', 2791);
        //}
    }
};

MapControl.prototype.delete_all_series = function() {
    for (var seriesNumber in this.mapConfiguration.series) {
        if (this.mapConfiguration.series.hasOwnProperty(seriesNumber)) {
            this.mapConfiguration.series[seriesNumber].destroy();
            delete this.mapConfiguration.series[seriesNumber];
        }

        if (this.mapStyle.series.hasOwnProperty(seriesNumber)) {
            this.mapStyle.series[seriesNumber].destroy();
            delete this.mapStyle.series[seriesNumber];
        }
    }
};

MapControl.parse_query_params = function(query, queryParams) {
    query = query.substr(1); // skip first character '?' or '#'

    if (query) {
        var a = query.split('&');
        for (var i = a.length; i--;) {
            if (a.hasOwnProperty(i)) {
                var b = a[i].split('=');
                queryParams[decodeURIComponent(b[0])] = decodeURIComponent(b[1]);
            }
        }


    }
};

MapControl.normalize_url_as_hash = function() {
    var params = {};

    if (window.location.search) {
        MapControl.parse_query_params(window.location.search, params);
    }

    if (window.location.hash) {
        MapControl.parse_query_params(window.location.hash, params);
    }

    // need queryParams as array of uri encoded key values
    var queryParams = [];
    for (var key in params) {
        if (params.hasOwnProperty(key)) {
            if (params === 'style' || params === 'series') {
                // special case where value does not need to be uri encoded
                queryParams.push(encodeURIComponent(key) + '=' + params[key]);
            } else {
                queryParams.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
            }
        }
    }

    var uri;
    if ('origin' in window.location) {
        uri = window.location.origin + window.location.pathname + (queryParams ? ('#' + queryParams.sort().join('&')) : '');
    } else {
        // older IE doesn't have window.location.origin
        uri = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '') +
            window.location.pathname + (queryParams ? ('#' + queryParams.sort().join('&')) : '');
    }
    window.location.replace(uri); // redirect to a uri with all parameters in the uri hash, so that old browsers can modify them
};

/**
 *
 * @returns {Object} settings
 */
MapControl.settings_from_url = function() {
    /**
     *
     * @type {{style: string|undefined, series: string|undefined, taxonid: string|undefined, tab: string|undefined}}
     */
    var queryParams = {};
    var taxonId, seriesParams, styleObject;



    if (window.location.search) {
        MapControl.parse_query_params(window.location.search, queryParams);
    }

    // must evaluate location.search before location.hash
    // as hash should supersede search
    if (window.location.hash) {
        MapControl.parse_query_params(window.location.hash, queryParams);
    }

    if (queryParams.hasOwnProperty('style')) {
        styleObject = debugged_json_parse(LZString.decompressFromEncodedURIComponent(queryParams.style));
        delete queryParams.style;
    }

    if (queryParams.hasOwnProperty('series')) {
        seriesParams = debugged_json_parse(LZString.decompressFromEncodedURIComponent(queryParams.series));
        delete queryParams.series;
    } else {
        seriesParams = [{
            controllerName : MapConfiguration.CONTROLLER_TAXONMAP // default controller
        }];
    }

    if (queryParams.hasOwnProperty('taxonid')) {
        taxonId = queryParams.taxonid;
        delete queryParams.taxonid;

        if (taxonId) {
            seriesParams[0].taxonEntityId = taxonId;
            seriesParams[0].taxonName = getTaxonNamestringByEntityId(taxonId);
        }
    }

    var settings = {
        config : queryParams,
        series : []
    };

    if (queryParams.hasOwnProperty('tab')) {
        settings.tab = queryParams.tab;
        delete settings.config.tab;
    }

    var currentState = MapHistory.get_current_state();
    //console.log('currentState');
    //console.log(currentState);
    if (currentState.tab) {
        // state setting of tab supersedes uri tab setting
        settings.tab = currentState.tab;
    }

    for (var n in seriesParams) {
        if (seriesParams.hasOwnProperty(n)) {
            if (!seriesParams[n].controllerName) {
                seriesParams[n].controllerName = MapConfiguration.CONTROLLER_TAXONMAP; // default controller
            }

            if (seriesParams[n].taxonEntityId && !seriesParams[n].taxonName) {
                seriesParams[n].taxonName = getTaxonNamestringByEntityId(seriesParams[n].taxonEntityId);
            }

            settings.series.push({
                config : seriesParams[n],
                style : (styleObject && styleObject.series && styleObject.series.hasOwnProperty(n)) ? styleObject.series[n] : {}
            });
        }
    }

    if (styleObject) {
        if (styleObject.series) {
            delete styleObject.series;
        }
        settings.style = styleObject;
    }

    return settings;
};

MapControl.prototype.pop_state_handler = function(event) {
    let gmapPosition;

    const settings = MapControl.settings_from_url();

    MapHistory.inHistoryStateTransition = true;

    if (this.mapConfiguration.showGoogleMap && this.gmap && this.gmap.gmap) { // googlebot only error: gmap may not exist here
        gmapPosition = this.gmap.get_position();
    }

    this.delete_all_series();

    settings.tabSet = this.tabSet;
    settings.containerId = this.containerId;

    this._initialise_from_settings(settings);

    //var controlsOuterContainer = document.getElementById(this.controlsOuterContainerId);
    //controlsOuterContainer.innerHTML = '';

    // @todo reimplement this
    console.log('in pop_state_handler deprecated attempt to re-establish tabSwitchButton');
    if (this.tabSwitchButton) {
        // controls inner html was annihilated
        // need to reinstate the tab switch button
        controlsOuterContainer.appendChild(this.tabSwitchButton);
    }

    if (this.googleMapElId) {
        if (this.gmap) {
            this.gmap.clear_events();
        }

        //if (this.gmap && this.gmap.gmap) {
        //	// remove google map event listeners first to possibly avoid IE11 'Unspecified error.'
        //	google.maps.event.clearInstanceListeners(this.gmap.gmap);
        //}
        document.getElementById(this.googleMapElId).innerHTML = '';
    }

    var currentTab;
    if (('tab' in settings) && this.controls.idListKey !== settings.tab) {
        currentTab = settings.tab;
        var previousTab = this.controls.idListKey;
        var tabChanged = true;
    } else {
        currentTab = this.controls.idListKey;
    }

    // if (this.controls) {
    //     console.log('destroying old map controls');
    //     this.controls.destroy();
    // }

    // this.controls = new MapControlPanel;
    // this.controls.create_panels(controlsOuterContainer, this);

    this.controls.addListener('changed', (panelContext) => {
        this.apply_options(panelContext);
    });

    this.apply_options({ localsvg : true, gmap : true });

    if (this.mapConfiguration.showGoogleMap) {
        if (gmapPosition) {
            this.gmap.set_initial_position(gmapPosition); // restore the current (pre-history change) map centre and zoom
        }
        this.gmap.finalise_gmap();
    }

    this.controls.set_options_availability(currentTab);

    if (tabChanged) {
        this.fireEvent(MapControl.EVENT_TAB_CONTEXT_CHANGE, {oldContext: previousTab, newContext: currentTab});
    }

    MapHistory.inHistoryStateTransition = false;
};

/**
 *
 * @param {Event} event
 * @param {Element} element
 * @param {string} newMapType
 */
MapControl.prototype.maptype_switch_click_handler = function(event, element, newMapType) {
    const contextParams = {oldContext: this.controls.idListKey, newContext: newMapType};
    this.controls.set_options_availability(newMapType);
    this.fireEvent(MapControl.EVENT_TAB_CONTEXT_CHANGE, contextParams);
    MapHistory.modify_state({tab: contextParams.oldContext}, true); // make sure that the current entry has the old state (overwrite current state)
    MapHistory.modify_state({tab: contextParams.newContext}); // add a new browser history entry

    this.test_for_series_prompt_on_no_content();

    return stop_event(event);
};

// /**
//  * if old context is SVG_CONTEXT then hide
//  * if new context id SVG_CONTEXT then unhide content
//  *
//  * @param {MapControl} mapControl
//  * @param {string} eventName
//  * @param {Object} contexts
//  * @param {string} contexts.oldContext
//  * @param {string} contexts.newContext
//  * @returns {undefined}
//  */
// MapControl.prototype.svg_map_context_change_handler = function(mapControl, eventName, contexts) {
//     //console.log('MapControl.prototype.svg_map_context_change_handler');
//     //console.log(arguments);
//
//     if (contexts.oldContext === MapControl.SVG_CONTEXT && contexts.oldContext !== contexts.newContext) {
//         document.getElementById(this.staticMapTabElId).style.display = 'none';
//     } else if (contexts.newContext === MapControl.SVG_CONTEXT) {
//         this.controls.set_container(document.getElementById(this.controlsOuterContainerId));
//         document.getElementById(this.staticMapTabElId).style.display = 'block';
//     }
// };

/**
 *
 * @param {Element} container
 * @param {string} ownContextName
 * @returns {undefined}
 */
MapControl.prototype.populate_context_switch_container = function (container, ownContextName) {
    if (!this.useTabs) {

        if (!this.contextSwitchButtons) {
            this.contextSwitchButtons = [];
            this.contextSwitchButtonEventHandles = [];
        }

        var tabSwitchContainer = container.appendChild(document.createElement('div'));
        tabSwitchContainer.style.position = 'absolute';
        tabSwitchContainer.style.right = '10px';
        tabSwitchContainer.style.top = '5px';

        for (var contextName in this.contexts) {
            if (contextName !== ownContextName && this.contexts.hasOwnProperty(contextName)) {
                var context = this.contexts[contextName];

                /*
                * context = {
                *   label: label
                *   labelToolTip: text
                *   container: element - container element, not yet attached to DOM // can be null if context provider prefers delayed loading during finalize callback
                *   contentFinalizeCallback: callable - called after container is attached
                * }
                */

                var tabSwitchButton = this.contextSwitchButtons[this.contextSwitchButtons.length] = document.createElement('div');
                tabSwitchButton.innerHTML = '<a href="#" title="' + context.labelToolTip + '">' + context.label + '</a>';
                tabSwitchButton.className = 'gmapheaderbutton';
                //tabSwitchButton.style.position = 'absolute';
                //tabSwitchButton.style.right = '10px';
                tabSwitchButton.style.cssFloat = 'right';
                tabSwitchContainer.appendChild(tabSwitchButton);

                this.contextSwitchButtonEventHandles[this.contextSwitchButtonEventHandles.length] =
                    registerDOMEventHandler(tabSwitchButton, 'click', this, 'maptype_switch_click_handler', contextName);
            }
        }
    }
};

// /**
//  * static map view
//  */
// MapControl.prototype.set_content = function() {
//     var container = document.getElementById(this.staticMapTabElId);
//
//     var controlsOuterContainer = container.appendChild(document.createElement('div'));
//     controlsOuterContainer.className = 'staticmapcontrolscontainer';
//     this.controlsOuterContainerId = controlsOuterContainer.id = uniqueId('staticmapcontrolsouter');
//
//     this.controls = new MapControlPanel;
//     this.controls.create_panels(controlsOuterContainer, this);
//
//     this.controls.addListener('changed', (context, eventName, panelContext) => {
//         this.apply_options(panelContext);
//     });
//
//     var previewContainerEl = container.appendChild(document.createElement('div'));
//     previewContainerEl.id = uniqueId('svgpreviewcontainer');
//
//     this.previewRefreshButtonId = uniqueId('refresh');
//
//     var button = document.createElement('button');
//     button.id = this.previewRefreshButtonId;
//     button.className = 'previewbutton';
//     button.appendChild(document.createTextNode('refresh map image'));
//     previewContainerEl.appendChild(button);
//
//     var svgContainerEl = previewContainerEl.appendChild(document.createElement('div'));
//     this.svgContainerId = svgContainerEl.id = uniqueId('svgdiv');
//     svgContainerEl.className = 'svgmap';
//     svgContainerEl.style.float = 'left';
//
//     var infoDivContainer = svgContainerEl.appendChild(document.createElement('div'));
//     infoDivContainer.style.zLayer = 101;
//     infoDivContainer.style.paddingLeft = '5px';
//     infoDivContainer.style.display = 'inline-block'; //IE7 ? 'inline' : 'inline-block';
//     infoDivContainer.style.float = 'left';
//     var infoDiv = infoDivContainer.appendChild(document.createElement('div'));
//     infoDiv.style.display = 'none';
//     infoDiv.className = 'gmapInfoContainer';
//     this.infoDivId = infoDiv.id = uniqueId('staticInfoContainer');
//
//     this.infoDivClickHandle = registerDOMEventHandler(infoDiv, 'click', this, 'info_panel_click_handler');
//
//     this.populate_context_switch_container(controlsOuterContainer, MapControl.SVG_CONTEXT);
//
//     //NEED TO REINSTATE THESE HELP MESSAGES
//     //Help.register_icon(document.getElementById('mappedareaheading' + this.idSuffix), "You can restrict the mapping to only the area covered by the specified bottom-left grid square. To cover more than a single square, also specify the NE corner to map up to. Leave both fields blank to include the whole area.");
//     //Help.register_icon(document.getElementById('weightheading' + this.idSuffix), "Specifies the line thickness in nominal pixels. For on screen use of images, values in the range 0.1 to 2 may be useful for grid lines. When printing images, if you have problems with missing or irregular grid lines then avoid values less than 1 for grid line weight.");
//
//     //jscolor.bind(); // use 3rd party colour picker, binds to class 'colour' input elements
//
//     Help.refresh();
//
//     this.controls.set_options_availability(MapControl.SVG_CONTEXT);
//     this.addListener('changed', this.refresh_preview_image.bind(this));
//
//     this.apply_options({ svg : true, gmap : true });
// };

/**
 *
 * @param {type} event
 * @returns {boolean}@param {Event} event
 */
MapControl.prototype.legend_panel_click_handler = function(event) {
    // a user's expectation is probably to be able to edit the legend, so if clicked, open the marker style tab

    this.controls.show('DataSeriesStyles');

    return stop_event(event);
};

/**
 *
 * @param {Event} event
 * @returns {boolean|void}
 */
MapControl.prototype.info_panel_click_handler = function(event) {
    var element = event.target || event.srcElement;

    var gr = element.getAttribute('data-gr');

    if (this.gmap && element.id === this.gmap.closeButtonId) {
        var infoDiv = document.getElementById(this.infoDivId);

        if (infoDiv) {
            infoDiv.style.display = 'none';
        }

        infoDiv = document.getElementById(this.gmap.infoDivId);
        if (infoDiv) {
            infoDiv.style.display = 'none';
        }

        return stop_event(event);
    }

    if (gr) {
        var seriesNumber = parseInt(element.getAttribute('data-seriesNumber'), 10);
        var series = this.mapConfiguration.series[seriesNumber];

        var dateType = element.getAttribute('data-date-type');
        var date = dateType ?
            {	type : dateType,
                from : element.getAttribute('data-date-from'),
                to : element.getAttribute('data-date-to')
            }
            :
            null;

        SearchForm.transform_xml_query(series.sourceData.descriptor.searchXml, gr, date, function(queryHash) {
            window.open(MapControl.scriptPath + queryPath + queryHash);
        });

        return stop_event(event);
    }
};

MapControl.prototype.exports_click_handler = function(eventName, mouseEvent, menuItem) {
    var url = MapControl.renderScriptUrls.uni + this.mapConfiguration.queryString + "&" + this.paramsForExport + "&format=" + menuItem.value;

    window.open(url, '_blank');
};

/**
 *
 * @param {object} details
 * @param {number} zoomPrecisionLevel
 * @returns {undefined}
 */
MapControl.prototype.refresh_info_panel = function(details, zoomPrecisionLevel) {
    var html = '';
    var partitionString;

    // get total number of series (whether loaded or not)
    // if > 1 then need to label the series in the info box
    var totalSeries = Object.keys(this.mapConfiguration.series).length;

    for (var seriesNumber in details.series) {
        if (details.series.hasOwnProperty(seriesNumber)) {
            var data = details.series[seriesNumber].data;
            var seriesConfig = this.mapConfiguration.series[seriesNumber];

            var nonCumulativeFreq = this.mapConfiguration.series[seriesNumber].searchType === MapConfiguration.SEARCHTYPE_TAXON_FREQ ||
                this.mapConfiguration.series[seriesNumber].searchType === MapConfiguration.SEARCHTYPE_SPECIES_FREQ;

            var l = data.length;
            var precisionLevel;

            if (l > 0) {
                if (seriesConfig.partition_filter) {
                    //for (precisionLevel = l - 1; precisionLevel >= 2; precisionLevel--) {
                    for (precisionLevel = l - 1; precisionLevel >= 0; precisionLevel--) {
                        data[precisionLevel] = seriesConfig.partition_filter(data[precisionLevel]);
                    }
                }

                html += '<table class="gmapresultsinfo"><thead>';

                var label = seriesConfig.get_series_label();

                if (totalSeries > 1 && label !== '') {
                    // show series name
                    html += '<tr><th colspan="' + (zoomPrecisionLevel - 2) + '">' + escapeHTML(label) + '</th></tr>';
                }

                html += '<tr><th></th>'; // first column is partition label

                var grStrings = [];


                for (precisionLevel = l - 1; precisionLevel >= 2; precisionLevel--) {
                    grStrings[precisionLevel] = details.nationalRef.to_gridref(GMap.precisionLevelMetres[precisionLevel]);
                    html += '<td>' + grStrings[precisionLevel] + '</td>';
                }
                html += '<th>' + details.nationalRef.country + '</th></thead><tbody>';


                if (seriesConfig.numberOfPartitions > 1) {
                    var partitionDates = MapConfiguration.PARTITION_DATES[seriesConfig.partitionType];

                    for (var p = 0; p < seriesConfig.numberOfPartitions; p++) {
                        html += '<tr><td>' + escapeHTML(seriesConfig.partitionLabels[seriesConfig.partitionType][p]) + '</td>';

                        for (precisionLevel = l - 1; precisionLevel >= 2; precisionLevel--) {
                            var partitionTotal = data[precisionLevel].partitions[p].childFreq + data[precisionLevel].partitions[p].residualFreq;
                            if (partitionTotal > 0) {
                                if (partitionDates) {
                                    partitionString = ' data-date-type="' + partitionDates[p].type + '" ';

                                    if (partitionDates[p].from) {
                                        partitionString += ' data-date-from="' + partitionDates[p].from + '" ';
                                    }

                                    if (partitionDates[p].to) {
                                        partitionString += ' data-date-to="' + partitionDates[p].to + '"';
                                    }
                                } else {
                                    partitionString = '';
                                }

                                html += '<td><a href="#" data-gr="' + grStrings[precisionLevel] + '" data-partition="' + p + '" data-seriesNumber="' + seriesNumber + '"' +
                                    partitionString +
                                    '>' + partitionTotal + '</a></td>';
                            } else {
                                html += '<td>' + partitionTotal + '</td>';
                            }
                        }

                        html += '<td>' + (data[0].partitions[p].childFreq + data[0].partitions[p].residualFreq) + '</td>';
                    }

                    // total (across all partitions)
                    html += '<tr><td>total</td>';
                } else {
                    // single partition, so use total value (unlabelled)
                    html += '<tr><td></td>';
                }

                var total;
                if (nonCumulativeFreq) {
                    // counting distinct species or taxa (values which are not cumulative over precision levels)
                    // so show only the count for the relevant precision (which will be the most precise)

                    total = data[l-1].residualTotal;

                    if (total > 0) {
                        html += '<td><a href="#" data-gr="' + grStrings[grStrings.length - 1] + '" data-seriesNumber="' + seriesNumber + '">' + total + '</a></td>';
                    } else {
                        html += '<td>' + total + '</td>';
                    }

                    for (precisionLevel = l - 2; precisionLevel >= 2; precisionLevel--) {
                        html += '<td></td>';

                    }

                    html += '<th></th>';
                } else {
                    for (precisionLevel = l - 1; precisionLevel >= 2; precisionLevel--) {
                        total = data[precisionLevel].childTotal + data[precisionLevel].residualTotal;

                        if (total > 0) {
                            html += '<td><a href="#" data-gr="' + grStrings[precisionLevel] + '" data-seriesNumber="' + seriesNumber + '">' + total + '</a></td>';
                        } else {
                            html += '<td>' + total + '</td>';
                        }
                    }

                    html += '<th>' + (data[0].childTotal + data[0].residualTotal) + '</th>';
                }

                html += '</tr></tbody></table><br />';
            }
        }
    }

    var infoDiv = document.getElementById(this.infoDivId);
    if (infoDiv) {
        if (html) {
            infoDiv.innerHTML = html;
            infoDiv.style.display = 'block';
        } else {
            infoDiv.style.display = 'none';
        }
    }
};

/**
 * Abstract gridsquare list controller shim
 *
 * @constructor
 */
MapControl.ControllerInterface = function() {};

/**
 * number of separate datasets, 1 expect for combination controller
 *
 * @type number
 */
MapControl.ControllerInterface.prototype.numberOfDatasets = 1;

/**
 * Saved Search controller shim
 *
 * @constructor
 */
MapControl.SavedSearchControllerInterface = function() {};

MapControl.SavedSearchControllerInterface.prototype = new MapControl.ControllerInterface;
MapControl.SavedSearchControllerInterface.constructor = MapControl.SavedSearchControllerInterface;

/**
 *
 * @param {MapDataseriesConfiguration} mapDataseriesConfig
 */
MapControl.SavedSearchControllerInterface.prototype.refresh_expected_number_of_partitions_and_symbols = function(mapDataseriesConfig) {
    if (mapDataseriesConfig.searchType === MapConfiguration.SEARCHTYPE_PRESENCE) {
        if (mapDataseriesConfig.partitionType !== MapConfiguration.PARTITION_TYPE.DATE_CUSTOM) {
            mapDataseriesConfig.numberOfPartitions = MapConfiguration.NUMBER_OF_PARTITIONS[mapDataseriesConfig.partitionType];
        } else {
            mapDataseriesConfig.numberOfPartitions = mapDataseriesConfig.numberOfCustomDateClasses;
        }
    } else {
        mapDataseriesConfig.numberOfPartitions = 1;
    }
};

/**
 *
 * @param {Object} urlParams
 * @param {Object} seriesConfig serialised series configuration object (*not* a MapDataseriesConfiguration object)
 * @returns {undefined}
 */
MapControl.SavedSearchControllerInterface.prototype.read_series_url_params = function(urlParams, seriesConfig) {
    urlParams.savedsearchid = seriesConfig.savedSearchId;

    if (seriesConfig.savedSearchCustomFieldsFlag) {
        // custom frequency search results

        if (!(seriesConfig.savedSearchDateClassFrequenciesFlag && (seriesConfig.parttype === MapConfiguration.PARTITION_TYPE.OTHER || seriesConfig.parttype === MapConfiguration.PARTITION_TYPE.UNPARTITIONED))) {
            urlParams.parttype = MapConfiguration.PARTITION_TYPE.OTHER;
        }

        if (seriesConfig.frequencyColumnIndex) {
            urlParams.freqindex = seriesConfig.frequencyColumnIndex;

            if (seriesConfig.percentageFreqFlag) {
                urlParams.freqper100 = '1'; // plot % freqs
            }
        }
    } else {
        urlParams.grouped = '1';
    }
};

/**
 * Single taxon (DDb data) controller shim
 *
 * @constructor
 */
MapControl.TaxonMapControllerInterface = function() {};

MapControl.TaxonMapControllerInterface.prototype = new MapControl.ControllerInterface;
MapControl.TaxonMapControllerInterface.constructor = MapControl.TaxonMapControllerInterface;

/**
 *
 * @param {MapDataseriesConfiguration} mapDataseriesConfig
 */
MapControl.TaxonMapControllerInterface.prototype.refresh_expected_number_of_partitions_and_symbols = function(mapDataseriesConfig) {
    if (mapDataseriesConfig.searchType === MapConfiguration.SEARCHTYPE_PRESENCE) {
        mapDataseriesConfig.numberOfPartitions = MapConfiguration.NUMBER_OF_PARTITIONS[mapDataseriesConfig.partitionType];
    } else {
        mapDataseriesConfig.numberOfPartitions = 1;
    }
};

/**
 *
 * @param {Object} urlParams
 * @param {MapDataseriesConfiguration} seriesConfig
 * @returns {undefined}
 */
MapControl.TaxonMapControllerInterface.prototype.read_series_url_params = function(urlParams, seriesConfig) {
    urlParams.taxonentity = seriesConfig.taxonEntityId;

    if (seriesConfig.dataSourceId) {
        // DDB data source id (only applicable in special cases, e.g. Kew MSB maps)
        urlParams.datasource = seriesConfig.dataSourceId;
    }

    if (seriesConfig.includeDoNotMapped) {
        // mainly relevant to PlantAlert maps
        urlParams.includedonotmapped = true;
    }
};

/**
 * Single taxon (DDb data) controller shim
 *
 * @constructor
 */
MapControl.TaxonStatusControllerInterface = function() {};

MapControl.TaxonStatusControllerInterface.prototype = new MapControl.ControllerInterface;
MapControl.TaxonStatusControllerInterface.constructor = MapControl.TaxonStatusControllerInterface;

/**
 *
 * @param {MapDataseriesConfiguration} mapDataseriesConfig
 */
MapControl.TaxonStatusControllerInterface.prototype.refresh_expected_number_of_partitions_and_symbols = function(mapDataseriesConfig) {
    if (mapDataseriesConfig.searchType === MapConfiguration.SEARCHTYPE_PRESENCE) {
        mapDataseriesConfig.numberOfPartitions = MapConfiguration.NUMBER_OF_PARTITIONS[mapDataseriesConfig.partitionType];
    } else {
        mapDataseriesConfig.numberOfPartitions = 1;
    }
};

/**
 *
 * @param {Object} urlParams
 * @param {MapDataseriesConfiguration} seriesConfig
 * @returns {undefined}
 */
MapControl.TaxonStatusControllerInterface.prototype.read_series_url_params = function(urlParams, seriesConfig) {
    urlParams.taxonentity = seriesConfig.taxonEntityId;
};

/**
 * minimal client-side shims for the various gridsquare list controllers
 * functionality includes calculating the number of partitions and marker styles
 *
 * @type Object
 */
MapControl.controllerInterfaces = {
    ss : MapControl.SavedSearchControllerInterface,
    dm : MapControl.TaxonMapControllerInterface,
    st : MapControl.TaxonStatusControllerInterface
};

/**
 * called when page is first opened, or after a map view switch
 * if the map has no data series content set then automatically open
 * the dataseries/taxon panel
 *
 * @returns {undefined}
 */
MapControl.prototype.test_for_series_prompt_on_no_content = function() {
    var hasContent = false;
    for (var n in this.mapConfiguration.series) {
        if (this.mapConfiguration.series.hasOwnProperty(n)) {
            if (this.mapConfiguration.series[n].has_content()) {
                hasContent = true;
                break;
            }
        }
    }

    if (!hasContent) {
        this.controls.show('DataPartitioning');
    }
};

MapControl.prototype.destroy = function() {
    //this.mouseMoveHandle = removeDomEventHandler(this.mouseMoveHandle);
    //this.clickHandle = removeDomEventHandler(this.clickHandle);
};

MapControl.gridIntervals = [100, 10, 2, 1];

/**
 * if set then provide option to save theme to local storage
 * (only do this if user is not logged in and local storage is available)
 *
 * @type boolean
 */
MapControl.saveLocalOptionsFlag = null;

MapControl.pageSizes = {
    'a4' : {label: 'A4 page (portrait)', width: 210, height: 297, units:'mm', unitIndex:0},
    'a5' : {label: 'A5 page (portrait)', width: 148, height: 210, units:'mm', unitIndex:0},
    'old' : {label: '927 x 1250px (old BSBI maps)', width: 927, height: 1250, units:'px', unitIndex:2},
    'uc' : {label: 'unconstrained (best-fit of map)', width: '', height: '', units:'px', unitIndex:2},
    'user' : {label: 'other', width: null, height: null, units:null} // user-specified dimensions
};

/**
 *
 * @param {string} optionElId id of the associated option element (which should be ticked)
 * @param {string=} colourElId id of colour element
 */
MapControl.prototype.colour_change = function(optionElId, colourElId) {
    var el = document.getElementById(optionElId);

    if (el) {
        el.checked = true;
    } else {
        //console.log(arguments);
    }

    if (colourElId) {
        el = document.getElementById(colourElId);

        //if(!el) {
        //	console.log('failed to read colourElId: ' + colourElId);
        //}

        if (el && el.value !== '') {

            el.color.fromString(el.value);
            el.value = '';
        }

        //jscolor.close_picker(); // force closed any open picker
    }
};

/**
 *
 * @param {HTMLElement} container
 */
MapControl.prototype.add_template_menu = function(container) {
    var el = container.appendChild(document.createElement('select'));

    this.templateMenuId = el.id = uniqueId('thememenu');

    this.set_template_menu_options(el);

    this.templateChangeHandle = registerBoundEventHandler(el, 'change', this, this.template_change_handler);
};

MapControl.prototype.set_template_menu_options = function(menuEl) {
    var n = 1;

    menuEl.options[0] = new Option('', '', true, this.mapStyle.templateNumber === null);

    if (this.saveLocalOptionsFlag && !('local' in MapStyleTemplates)) {

        try {
            var myTheme = window.localStorage.getItem(MapControl.LOCAL_STORAGE_KEY);
        } catch (e) {
            // firefox can have problems with corrupt local storage
            //if(e.name == "NS_ERROR_FILE_CORRUPTED") {
            console.log('Failed to save theme, local storage may be corrupt.');
            logError('Failed to get theme, local storage may be corrupt. (fake error), error name = ' + e.name, '', 5769);
            //}
        }
        if (myTheme) {
            MapStyleTemplates['local'] = debugged_json_parse(myTheme);
        }
    }

    for (var v in MapStyleTemplates) {
        if (MapStyleTemplates.hasOwnProperty(v)) {
            // must use '==' rather than '===' because of string / numeric conflict
            menuEl.options[n++] = new Option(MapStyleTemplates[v].name, v, false, v == this.mapStyle.templateNumber);
        }
    }
};

/**
 * store default theme id either in local storage or in a cookie
 *
 * @param {string} themeId
 * @returns {undefined}
 */
MapControl.prototype.set_default_theme_id = function(themeId) {
    try {
        window.localStorage.setItem('defaultThemeId', themeId);
    } catch (e) {
        // firefox can have problems with corrupt local storage
        //if(e.name == "NS_ERROR_FILE_CORRUPTED") {
        console.log('Failed to set theme, local storage may be corrupt.');
        logError('Failed to set theme, local storage may be corrupt. (fake error), error name = ' + e.name, '', 5799);
        //}
    }
};

/**
 * retrieve default theme id either from local storage or a cookie
 *
 * @returns {number}
 */
MapControl.prototype.get_default_theme_id = function() {
    var defaultThemeId;

    try {
        defaultThemeId = window.localStorage.getItem('defaultThemeId');

        if (defaultThemeId === 'local' && !('local' in MapStyleTemplates)) {
            var myTheme = window.localStorage.getItem(MapControl.LOCAL_STORAGE_KEY);
            if (myTheme) {
                MapStyleTemplates['local'] = debugged_json_parse(myTheme);
            } else {
                // reset default theme as local settings have gone
                defaultThemeId = 0;
            }
        }
    } catch(e) {
        if(e.name === "NS_ERROR_FILE_CORRUPTED") {
            console.log('Firefox local storage appears to be corrupted.');
            //alert("Sorry, it looks like your browser storage has been corrupted. Please clear your storage by going to Tools -> Clear Recent History -> Cookies and set time range to 'Everything'. This will remove the corrupted browser storage across all sites.");
        }
        defaultThemeId = 0;
    }

    return (defaultThemeId === null) ? 0 : defaultThemeId;
};

MapControl.prototype.template_change_handler = function(unused, event) {
    var el = document.getElementById(this.templateMenuId);
    var templateNumber = el.options[el.selectedIndex].value;

    if (templateNumber !== '') {
        this.set_default_theme_id(templateNumber);

        this.mapStyle.use_template(templateNumber);

        var templateNameEl = document.getElementById(this.themeNameElId);

        if (templateNumber > MapControl.USER_DEFINED_TEMPLATES_BASE_ID) {
            templateNameEl.value = MapStyleTemplates[templateNumber].name;
        } else {
            templateNameEl.value = '';
        }

        this.apply_options();
    }

    return stop_event(event);
};

/**
 * refreshes the visual state of the control based on supplied options and configuration
 *
 * @param {{svg : boolean, gmap : boolean}} context
 */
MapControl.prototype.apply_options = function(context) {
    for (let key in this.controls.panels) {
        if (this.controls.panels.hasOwnProperty(key)) {
            this.controls.panels[key].apply_options(this.mapStyle, this.mapConfiguration);
        }
    }

    this.refresh_urls(context);
    this.fireEvent('changed'); // event fired for the benefit of external listeners (e.g. to update titles etc.)
};

/**
 * reads values into the MapStyle object
 * and refreshes the html structure of the panel
 *
 */
MapControl.prototype.read_options = function() {
    if (this.errors && this.errors.length) {
        // have pre-existing error message displayed, clear it

        document.getElementById(this.svgContainerId).innerHTML = '';
    }

    this.errors = [];

    for (var key in this.controls.panels) {
        if (this.controls.panels.hasOwnProperty(key)) {
            this.controls.panels[key].read_options();

            if (this.controls.panels[key].errors.length) {
                this.errors.push({key : key, errors: this.controls.panels[key].errors});
            }
        }
    }
};

MapControl.prototype.compact_style_params = function() {
    var styleDescriptor = this.mapStyle.save_template();

    styleDescriptor = this.mapStyle.diff_template(styleDescriptor);
    //console.log(styleDescriptor);

    return object_is_empty(styleDescriptor) ? '' :
        LZString.compressToEncodedURIComponent(JSON.stringify(styleDescriptor));
};

/**
 *
 * @param {{ gmap: boolean, svg : boolean}} context
 */
MapControl.prototype.refresh_urls = function(context) {
    if (this.errors && this.errors.length) {
        // have pre-existing error message displayed, clear it

        console.log("in MapControl.prototype.refresh_urls need to access svg panel")
        document.getElementById(this.svgContainerId).innerHTML = '';
    }

    this.errors = [];

    var paramStrings = this.mapStyle.build_url(this);

    if (MapControl.varyUrlHash) {
        var hashState = new MapHistory(this.mapConfiguration);
        hashState.set_style_params(this.compact_style_params());
    }

    if (this.errors.length === 0) {
        this.queryParams = paramStrings.mapParams;
        this.paramsForExport = this.queryParams + paramStrings.pageParams;

        this.controls.panels.ExportLinks.set_urls(this.paramsForExport);

        var seriesChangedFlag = false;

        for (var seriesNumber in this.mapConfiguration.series) {
            if (this.mapConfiguration.series.hasOwnProperty(seriesNumber) && this.mapConfiguration.series[seriesNumber].has_content()) {
                var dataUrl = this.mapConfiguration.series[seriesNumber].generate_data_url(this.mapConfiguration);

                //console.log('data url for series ' + seriesNumber + ' = ' + dataUrl + ', current url = ' + this.mapConfiguration.series[seriesNumber].sourceData.url);

                if (!this.mapConfiguration.series[seriesNumber].sourceData || this.mapConfiguration.series[seriesNumber].sourceData.url !== dataUrl) {
                    seriesChangedFlag = true;
                    this.load_data(seriesNumber, dataUrl);
                }

                if (MapControl.varyUrlHash) {
                    this.mapConfiguration.series[seriesNumber].add_series_to_hash(hashState);
                }
            }
        }

        if (MapControl.varyUrlHash) {
            this.mapConfiguration.add_params_to_hash(hashState);
        }

        if (MapControl.varyPageTitle) {
            document.title = this.mapConfiguration.get_page_title();
        }

        if (!seriesChangedFlag) {
            // no change to source data blob url
            // so can refresh map image immediately

            this.fireEvent('changed', context);
        }

        if (MapControl.varyUrlHash && !MapHistory.inHistoryStateTransition) {
            hashState.finalise();
        }
    } else {
        this.controls.panels.ExportLinks.set_visibility(false);

        document.getElementById(this.previewRefreshButtonId).style.display = 'none';
        document.getElementById(this.svgContainerId).innerHTML = '<p>Please correct the following problems:</p><ul><li>' + this.errors.join('</li><li>') + '</li></ul>';
    }
};

MapControl.prototype.load_data = function(seriesNumber, dataUrl) {
    var dataLoadedHandle = this.mapConfiguration.series[seriesNumber].sourceData.bindListener('data loaded', this,
        /**
         *
         * @param {string} context
         * @param {string} eventName
         * @param invocationParameter
         * @param {number} seriesNumber
         * @this MapControl
         */
        function (context, eventName, invocationParameter, seriesNumber) {
            this.mapConfiguration.series[seriesNumber].sourceData.removeListener('data loaded', dataLoadedHandle);
            //console.log('data loaded, series ' + seriesNumber);

            this.mapConfiguration.series[seriesNumber].apply_search_metadata(this.mapConfiguration.series[seriesNumber].sourceData.descriptor);

            if (this.mapConfiguration.series[seriesNumber].datasetIsPrimarySearchResult && this.mapConfiguration.series[seriesNumber].newLoadFlag) {
                //set the caption text only as a one-off on first load of the primary data series
                this.mapConfiguration.captionValue = '' + this.mapConfiguration.series[seriesNumber].sourceData.descriptor.caption; // '' needed as must be co-erced to string (not null)

                this.mapConfiguration.series[seriesNumber].apply_configuration_options();
            }

            this.mapConfiguration.series[seriesNumber].newLoadFlag = false;

            this.mapConfiguration.series[seriesNumber].set_partition_filter();
            if (this.mapConfiguration.series[seriesNumber].frequencyResultsFlag) {
                this.mapStyle.series[seriesNumber].initialise_frequency_colour_scheme(this.mapConfiguration.series[seriesNumber]);
            }

            this.fireEvent('changed', context);
        },
        seriesNumber);

    this.mapConfiguration.series[seriesNumber].sourceData.load_binary(dataUrl);
};

//MapControl.prototype.previousPreviewQueryParams = null;

// MapControl.prototype.refresh_preview_image = function() {
//     var obj;
//
//     if (this.errors.length === 0) {
//         this.controls.panels.ExportLinks.set_visibility(true);
//
//         var previewButton = document.getElementById(this.previewRefreshButtonId);
//         previewButton.style.display = 'none'; // preview will be up-to-date again
//
//         if (this.staticSvgImageId) {
//             obj = document.getElementById(this.staticSvgImageId);
//         }
//
//         if (obj && this.previousPreviewQueryParams === this.queryParams && document.body.contains(obj)) {
//             // nothing to do map image is already displayed and is current
//
//             //console.log('skipping preview image redisplay');
//         } else {
//             var svgContainerEl = document.getElementById(this.svgContainerId);
//
//             if (this.mapDetectClickHandle) {
//                 this.mapDetectClickHandle = removeDomEventHandler(this.mapDetectClickHandle);
//             }
//
//             var pageYOffset = window.pageYOffset; // save window scroll position prior to redrawing map
//
//             this.previousPreviewQueryParams = this.queryParams;
//
//             // throw away any previous image
//             if (obj && obj.parentNode) {
//                 obj.parentNode.removeChild(obj);
//             }
//
//             this.staticSvgImageId = uniqueId('mapimage');
//
//             var url = MapControl.renderScriptUrls.svg + this.queryParams.replace(/^&/, '') + '&scripted=true&standalone=0';
//
//             obj = document.createElement('object');
//             obj.id = this.staticSvgImageId;
//
//             obj.style.display = 'block';
//             obj.className = 'svgmapobj';
//
//             registerBoundEventHandler(obj, 'load', this, this.svg_loaded, null, false);
//
//             obj.style.cssFloat = 'left';
//             obj.style.maxWidth = '80vw';
//             obj.style.height = '92vh';
//             obj.type = 'image/svg+xml';
//             obj.data = url;
//
//             svgContainerEl.insertBefore(obj, svgContainerEl.firstChild);
//
//             window.scrollTo(0, pageYOffset); // restore previous scroll position after refresh
//         }
//     }
// };

// /**
//  *
//  * @param ignore
//  * @param {Event} event
//  * @returns {boolean}
//  */
// MapControl.prototype.svg_loaded = function(ignore, event) {
//     /**
//      *
//      * @type {HTMLObjectElement}
//      */
//     var element = event.currentTarget;
//     var controlName = uniqueId('bsbiMapControl');
//
//     var objContext, that;
//
//     window[controlName] = this;
//
//     try {
//         // IE9 sometimes seems to have problems calling set_map_control_name
//         // I assume that onload fires prematurely before the script embedded in the object has loaded
//         // so need to test if function exists and if not wait and retry
//         if (element && element.contentDocument && element.contentDocument.set_map_control_name) {
//             element.contentDocument.set_map_control_name(controlName, this); // pass both an indirect and direct reference to cope with recent IE that doesn't allow break out from the svg object via window.parent
//
//             this.svg_content_ready_callback();
//         } else {
//             var errorEls;
//             if (element && element.contentDocument && (errorEls = element.contentDocument.getElementsByTagName('error')).length) {
//                 console.log('Have error in SVG response');
//                 console.log(element);
//                 console.log(errorEls[0]);
//             } else {
//                 console.log('set_map_control_name still not set, delaying 2s');
//
//                 objContext = element;
//                 that = this;
//
//                 setTimeout(function() {
//                     if (objContext && objContext.contentDocument && objContext.contentDocument.set_map_control_name) {
//                         objContext.contentDocument.set_map_control_name(controlName, that);
//
//                         that.svg_content_ready_callback();
//                     } else {
//                         // this can happen if svg load has failed
//                         // e.g. if result set has expired
//                         console.log('Have svg problem after delay');
//                         console.log(objContext);
//                     }
//                 }, 2000);
//             }
//         }
//     } catch (e) {
//         // IE 10 sometimes throws 'Access is denied.'
//         logError('Failed initial svg bind, will try again after delay.', '', 8514);
//         console.log('Failed initial svg bind, will try again after delay. (got exception)');
//
//         objContext = element;
//         that = this;
//
//         setTimeout(function() {
//             if (objContext && objContext.contentDocument && objContext.contentDocument.set_map_control_name) {
//                 objContext.contentDocument.set_map_control_name(controlName, that);
//
//                 that.svg_content_ready_callback();
//             } else {
//                 // this can happen if svg load has failed
//                 // e.g. if result set has expired
//                 console.log('Have svg problem after delay, in ie catch handler');
//                 console.log(objContext);
//             }
//         }, 2000);
//     }
//
//     return stop_event(event);
// };
//
// MapControl.prototype.staticSvgImageId = '';
//
// MapControl.prototype.svg_content_ready_callback = function() {
//     //console.log('mapimage content ready');
//     //console.log(this);
//
//     if (!this.loadingComplete) {
//         this.loadingComplete = true;
//         this.fireEvent('svgmaploaded');
//     }
//
//     if (this.mapDetectClickHandle) {
//         // do this again in case the event handler had already been reregistered during a race-condition.
//         this.mapDetectClickHandle = removeDomEventHandler(this.mapDetectClickHandle);
//     }
//     var mapDocument = document.getElementById(this.staticSvgImageId);
//     if (mapDocument && mapDocument.contentDocument && mapDocument.contentDocument.getElementsByTagName('svg')) {
//         mapDocument = mapDocument.contentDocument && mapDocument.contentDocument.getElementsByTagName('svg')[0];
//
//         if (mapDocument) {
//             //console.log('bound to svg');
//
//             //this.mapDetectClickHandle = registerBoundEventHandler(mapDocument, 'click', this.controls, this.controls.close_option_panes, null, false);
//
//             this.mapDetectClickHandle = registerBoundEventHandler(mapDocument, 'click', this.controls, function() {
//                 // N.B. called in the context of 'this.controls'
//                 this.close_option_panes();
//                 //jscolor.close_picker(); // shouldn't be needed but sometimes picker gets stuck
//             }, null, false);
//
//             //console.log('registered');
//         } else {
//             console.log('failed at final hurdle to bind click handler to svg');
//         }
//     } else {
//         console.log('failed to bind to svg');
//     }
// };

MapControl.prototype.print_click_handler = function(el) {
    //var printUrl = el.href;
    var printWindow = window.open(el.href, 'printmap');

    if (printWindow) {
        printWindow.print();

        //try {
        //	printWindow.close();
        //} catch (e) {}
    }

    return false; // prevent default click action
};
