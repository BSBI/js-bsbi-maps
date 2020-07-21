import {EventHarness} from "../framework/EventHarness";
import {MapConfiguration} from "./MapConfiguration";
import {BinaryGridsquareListSource} from "./BinaryGridsquareListSource";
import {debugged_json_parse} from "../utils/debugged_json_parse";
import {get} from "../utils/get";
import {BSBIDB_URL, MapControl} from "./MapControl";
import {MapKey} from "./MapKey";
import {
    registerBoundEventHandler,
    registerDOMEventHandler,
    removeDomEventHandler
} from "../utils/registerDOMEventHandler";
import {merge_status_codes} from "../utils/merge_status_codes";
import {selectOption} from "../utils/selectOption";
import {add_class} from "../utils/add_class";
import {remove_class} from "../utils/remove_class";
import {uniqueId} from "../utils/uniqueId";
import {escapeHTML} from "../utils/escapeHTML";
import {stop_event} from "../utils/stopEvent";

//const BSBIDB_URL = 'https://database.bsbi.org/';

export class MapDataseriesConfiguration extends EventHarness {

    /**
     *
     * @type {boolean}
     */
    annotateLegendWithFreq = false;

    constructor(seriesNumber, mapConfiguration) {
        super();

        this.seriesNumber = parseInt(seriesNumber, 10); // make sure seriesNumber is a number

        this.partitionLabels = {};
        this.partitionLabels[MapConfiguration.PARTITION_TYPE.DATECLASS] = MapConfiguration.prototype.dateClassLabels;
        this.partitionLabels[MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_1930] =
            ['pre-1930', '1930 onwards'];
        this.partitionLabels[MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_1950] =
            ['pre-1950', '1950 onwards'];
        this.partitionLabels[MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_1970] =
            ['pre-1970', '1970 onwards'];
        this.partitionLabels[MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_1987] =
            ['pre-1987', '1987 onwards'];
        this.partitionLabels[MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_2000] =
            ['pre-2000', '2000 onwards'];
        this.partitionLabels[MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_2010] =
            ['pre-2010', '2010 onwards'];
        this.partitionLabels[MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_2020] =
            ['pre-2020', '2020 onwards'];
        this.partitionLabels[MapConfiguration.PARTITION_TYPE.DATE_CUSTOM] = ['']; // this will be initialised after the series descriptor has loaded
        this.partitionLabels[MapConfiguration.PARTITION_TYPE.OTHER] = [''];

        // unfortunately unpartitioned is represented by '' rather than 'other'
        // merge the two labels here
        this.partitionLabels[MapConfiguration.PARTITION_TYPE.UNPARTITIONED] = this.partitionLabels[MapConfiguration.PARTITION_TYPE.OTHER];

        this.sourceData = new BinaryGridsquareListSource;

        if (mapConfiguration.showGoogleMap) {
            this.mapKey = new MapKey;
        }

        /**
         * sparse array, keyed by search table column number (from 0)
         * It only includes entries for columns with partitioned freq or numerical values
         *
         * @type {Array.<Object>}
         */
        this.savedSearchNumericDataColumns = [];

        this.domEventHandles = {};
    };
}

/**
 * the user-assigned data-series label
 * default blank, in which case get_series_label() returns a meaningful default based on the series' data content
 *
 * @type {string}
 */
MapDataseriesConfiguration.prototype.label = '';

MapDataseriesConfiguration.prototype.containerRowId = null;

MapDataseriesConfiguration.prototype.seriesLabelId = null;

/**
 * if set then are transitioning from one state to another due to browser navigation
 * so don't add new history state
 *
 * @type {boolean}
 */
MapDataseriesConfiguration.prototype.inHistoryStateTransition = false;

MapDataseriesConfiguration.prototype.datasetIsPrimarySearchResult = false;

MapDataseriesConfiguration.prototype.get_series_label = function() {
    if (this.label !== '') {
        return this.label;
    } else {
        if (this.controllerName === MapConfiguration.CONTROLLER_SAVEDSEARCH) {
            if (this.seriesNumber === 0) {
                return 'search results';
            } else {
                return 'series ' + this.seriesNumber;
            }
        } else {
            // taxon data set

            return this.taxonName;
        }
    }
};

/**i
 *
 * @param {MapHistory} hashState
 * @returns {Object} seriesParams
 */
MapDataseriesConfiguration.prototype.add_series_to_hash = function(hashState) {
    var seriesParams = {};

    if (this.label) {
        seriesParams.label = this.label;
    }

    if (this.controllerName !== MapConfiguration.CONTROLLER_TAXONMAP) {
        // controller name is not default
        seriesParams.controllerName = this.controllerName;
    }

    if (MapDataseriesConfiguration.get_controller_specific_config_options.hasOwnProperty(this.controllerName)) {
        seriesParams = MapDataseriesConfiguration.get_controller_specific_config_options[this.controllerName].call(this, seriesParams); // note the ugly rebinding of this, otherwise 'this' transfers to the array
    } else {
        console.log('unrecognized controller name "' + this.controllerName + '" in MapDataseriesConfiguration.prototype.add_series_to_hash');
    }

    hashState.add_series_configuration(seriesParams);

    return seriesParams;
};

/**
 * flag marks series that haven't been loaded before (or since a fundamental change)
 * default true, cleared during load process
 * set again if a major change happens (e.g. a change of taxon name), but not on minor (e.g. partitioning) changes
 *
 * @type boolean
 */
MapDataseriesConfiguration.prototype.newLoadFlag = true;

MapDataseriesConfiguration.prototype.destroy = function() {
    this.sourceData.destroy();
    this.sourceData = null;

    if (this.savedSearchDropBox) {
        this.savedSearchDropBox.destroy();
        this.savedSearchDropBox = null;
    }

    if (this.taxonDropBox) {
        this.taxonDropBox.destroy();
        this.taxonDropBox = null;
    }

    if (this.mapKey) {
        this.mapKey.destroy();
        this.mapKey = null;
    }

    if (this.containerRowId) {
        var container = document.getElementById(this.containerRowId);
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        this.containerRowId = null;
    }
    this.controllerInterface = null;

    // clear associated dom events
    if (this.domEventHandles) {
        for (var key in this.domEventHandles) {
            if (this.domEventHandles.hasOwnProperty(key)) {
                removeDomEventHandler(this.domEventHandles[key]);
            }
        }
    }
    this.domEventHandles = {};

    this.destructor();
};

MapDataseriesConfiguration.prototype.set_controller = function(controllerName) {
    this.controllerName = controllerName;
    this.controllerInterface = new MapControl.controllerInterfaces[this.controllerName];
    this.controllerInterface.refresh_expected_number_of_partitions_and_symbols(this);
};

MapDataseriesConfiguration.prototype.get_default_min_frequency = function() {
    let min;
    if (this.sourceData.descriptor) {
        min = this.sourceData.descriptor.minFrequencies[this.partitionType];
    }
    return min > 0 ? 0 : min;
};

MapDataseriesConfiguration.prototype.get_default_max_frequency = function() {
    if (this.sourceData.descriptor) {
        return this.sourceData.descriptor.maxFrequencies[this.partitionType];
    } else {
        return null;
    }
};

/**
 *
 * @param {MapConfiguration} mapConfig
 * @returns {string}
 */
MapDataseriesConfiguration.prototype.generate_data_url = function(mapConfig) {
    return MapControl.scriptPath + "/mapbinary.php?ctl=" + this.controllerName +
            "&searchtype=" + this.searchType + "&uid=" + uid + "&" +
            MapDataseriesConfiguration.prototype.generate_data_url_controllers[this.controllerName].call(this, mapConfig)
        ;
};

MapDataseriesConfiguration.prototype.generate_data_url_controllers = {};

/**
 * @param {MapConfiguration} mapConfig
 * @this MapDataseriesConfiguration
 * @returns {string}
 */
MapDataseriesConfiguration.prototype.generate_data_url_controllers[MapConfiguration.CONTROLLER_SAVEDSEARCH] = function(mapConfig) {
    if (!this.savedSearchId) {
        throw new Error('missing query identifier for data url');
    }

    let dataUrl = "savedsearchid=" + this.savedSearchId + "&";

    let gridUnit = 'gridref';

    if (this.partitionType === MapConfiguration.PARTITION_TYPE.OTHER) {
        // custom frequency search results

        dataUrl += "parttype=other&";

        if (this.frequencyColumnIndex) {
            dataUrl += "freqindex=" + this.frequencyColumnIndex + "&";

            if (this.percentageFreqFlag) {
                dataUrl += "freqper100=1&"; // plot % freqs
            }
        }

        if (mapConfig.groupFilterString !== '') {
            dataUrl += "gpfilter=" + mapConfig.groupFilterString + "&";
        }
    } else {
        // if not a custom frequency search then force partitioning by dateclass
        // (even though partitions may be collapsed down when the map is drawn)

        if (this.searchType === MapConfiguration.SEARCHTYPE_PRESENCE ||
            this.searchType === MapConfiguration.SEARCHTYPE_RECORD_FREQ) {
            dataUrl += "parttype=dateclass&";
        } else {
            dataUrl += "parttype=&"; // unpartitioned for 'distinct' types that are less amenable to aggregation

            // force particular fixed grid unit for taxon/species 'distinct' counting
            gridUnit = this.gridResolution;
        }

        dataUrl += "grouped=1&partcode=*&statusfilter=" + this.statusFilter + "&";

        if (this.dateBoundary === MapConfiguration.LATEST_DATE) {
            dataUrl += "dateboundary=" + MapConfiguration.LATEST_DATE + "&";
        }
    }

    dataUrl += 'grid=' + gridUnit + '&';

    return dataUrl;
};

/**
 * @param {MapConfiguration} mapConfig
 * @this MapDataseriesConfiguration
 * @returns {string}
 */
MapDataseriesConfiguration.prototype.generate_data_url_controllers[MapConfiguration.CONTROLLER_TAXONMAP] = function(mapConfig) {
    if (!this.taxonEntityId) {
        throw new Error('missing taxon identifier for data url');
    }

    return "grid=gridref&parttype=dateclass&partcode=*&statusfilter=" + (this.statusFilter ? this.statusFilter : MapDataseriesConfiguration.STATUS_FILTER_HECTAD) +
        "&taxonentity=" + this.taxonEntityId + "&" +
        (this.dataSourceId ? ("datasource=" + this.dataSourceId + "&") : '');
};

/**
 * @param {MapConfiguration} mapConfig
 * @this MapDataseriesConfiguration
 * @returns {string}
 */
MapDataseriesConfiguration.prototype.generate_data_url_controllers[MapConfiguration.CONTROLLER_TAXONSTATUS] = function(mapConfig) {
    if (!this.taxonEntityId) {
        throw new Error('missing taxon identifier for data url');
    }

    return "grid=" + this.gridResolution + "&parttype=dateclass&partcode=*&statusscheme=" + this.statusSchemeId + "&taxonentity=" + this.taxonEntityId + "&";
};

MapDataseriesConfiguration.prototype.statusMarkerLabels = {
    '-' : 'unknown status',
    'n' : 'native',
    'a' : 'introduced/alien',
    '?'	: 'mixed status',
    'c' : 'casual'
};

/**
 * for customn frequency results this is the optional column number to
 * use (instead of the default 'freq' column)
 *
 * '_' => total of all frequency subdivisions across row
 *
 * @type {number|string|null}
 */
MapDataseriesConfiguration.prototype.frequencyColumnIndex = null;

/**
 * if set then the custom freq column value should be plotted as a percentage of the row total freq
 *
 * @type {boolean}
 */
MapDataseriesConfiguration.prototype.percentageFreqFlag = false;

/**
 *
 * @type BinaryGridsquareListSource
 */
MapDataseriesConfiguration.prototype.sourceData = null;

/**
 * GridSquareListController name code
 *
 * @type string
 */
MapDataseriesConfiguration.prototype.controllerName = '';

MapDataseriesConfiguration.prototype.controllerInterface = null;

/**
 * see MapConfiguration.prototype.searchTypeOptions
 *
 * @type string
 */
MapDataseriesConfiguration.prototype.searchType = MapConfiguration.SEARCHTYPE_PRESENCE;

/**
 * filter to apply to saved search results or non-status taxon results
 * (this is independent of statusSchemeId, so that switching to a taxon status source and then back to DDb results
 * doesn't alter the filter)
 *
 * '',
 * 'a' : atlas
 * 'h' : hectad status
 *
 * @type string
 */
MapDataseriesConfiguration.prototype.statusFilter = '';

/**
 * (this is independent of statusFilter, so that switching to a taxon status source and then back to DDb results
 * doesn't alter the filter)
 *
 * '',
 * 'a' : atlas
 * 'h' : hectad status
 *
 * @type string
 */
MapDataseriesConfiguration.prototype.statusSchemeId = '';

MapDataseriesConfiguration.prototype.mapPercentageFreq = false;

/**
 * when partitioning by date controls whether to use the min or max boundary
 * changes to this entail a refresh of the cached data
 * (default low-boundary)
 *
 * @type string
 */
MapDataseriesConfiguration.prototype.dateBoundary = MapConfiguration.EARLIEST_DATE;

/**
 * search reference (may be by hashed id rather than by xml)
 *
 * @type string
 */
MapDataseriesConfiguration.prototype.queryString = '';

/**
 * search query xml string
 *
 * @type string
 */
MapDataseriesConfiguration.prototype.queryXmlString = '';

/**
 * query template for click-through results
 * if empty then don't allow click-through
 *
 * @type string
 */
//MapDataseriesConfiguration.prototype.resultsTemplate = '';

/**
 *
 * @type number
 */
MapDataseriesConfiguration.prototype.numberOfPartitions = null;

MapDataseriesConfiguration.prototype.partitionType = MapConfiguration.PARTITION_TYPE.UNPARTITIONED;

/**
 * 1 => recent on top
 * 0 => earliest on top
 *
 * @type number
 */
MapDataseriesConfiguration.prototype.stackOrder = 1;

/**
 *
 * @type boolean
 */
MapDataseriesConfiguration.prototype.frequencyResultsFlag = false;

//MapDataseriesConfiguration.prototype.staticGridUnit = 'hectad';
//MapDataseriesConfiguration.prototype.dynamicGridUnit = 'gridref';

MapDataseriesConfiguration.prototype.gridResolution = 'hectad';

MapDataseriesConfiguration.ZOOM_MODE_BEST_WITH_RESIDUE = 'rb';
MapDataseriesConfiguration.ZOOM_MODE_BEST = 'b';
MapDataseriesConfiguration.ZOOM_MODE_UPTO_WITH_RESIDUE = 'rt';
MapDataseriesConfiguration.ZOOM_MODE_UPTO = 't';
MapDataseriesConfiguration.ZOOM_MODE_ONLY_THIS = 'o';

MapDataseriesConfiguration.STATUS_FILTER_HECTAD = 'h';
MapDataseriesConfiguration.STATUS_FILTER_ATLAS2000 = 'a';
MapDataseriesConfiguration.STATUS_FILTER_POSTATLAS2000 = 'e';
MapDataseriesConfiguration.STATUS_FILTER_ATLAS2000_STATUSED_ONLY = 'f';

MapDataseriesConfiguration.STATUS_SCHEME_ID_HECTAD = 'h';
MapDataseriesConfiguration.STATUS_SCHEME_ID_ATLAS2000 = 'a';

/**
 *
 *
 * @type {Array.<Object>}
 */
MapDataseriesConfiguration.ZOOM_PRECISION_OPTIONS = [
    {label: 'zoom to best available', value: MapDataseriesConfiguration.ZOOM_MODE_BEST_WITH_RESIDUE, precision: 10000, isDefault: true, description: "Use the best available resolution, but continue to show less detailed records when zoomed in."},
    {label: 'zoom to best available, (without residue)', value: MapDataseriesConfiguration.ZOOM_MODE_BEST, isDefault: false, description: "Use the best available resolution, hiding less detailed records when zoomed in."},
    {label: 'zoom up to', value: MapDataseriesConfiguration.ZOOM_MODE_UPTO_WITH_RESIDUE, isDefault: false, description: "Allow zooming up to the specified resolution, while also continuing to display any less detailed records when zoomed in."},
    {label: 'zoom up to, (without residue)', value: MapDataseriesConfiguration.ZOOM_MODE_UPTO, isDefault: false, description: "Allow zooming up to the specified resolution, hiding less detailed records when zoomed in."},
    {label: 'specified resolution', value: MapDataseriesConfiguration.ZOOM_MODE_ONLY_THIS, isDefault: false, description: "Show only data of the specified resolution."}
];

MapDataseriesConfiguration.prototype.zoomMode = MapDataseriesConfiguration.ZOOM_MODE_BEST_WITH_RESIDUE;

MapDataseriesConfiguration.prototype.partitionLabels = null;

MapDataseriesConfiguration.TAXON_SEARCH_TYPES = 't';

/**
 * test if the data series has been set (i.e. whether there is a saved search or taxon name etc. specified
 *
 * @returns {boolean}
 */
MapDataseriesConfiguration.prototype.has_content = function() {
    switch (this.controllerName) {
        case MapConfiguration.CONTROLLER_SAVEDSEARCH:
            return !!this.savedSearchId;

        case MapConfiguration.CONTROLLER_TAXONMAP:
        case MapConfiguration.CONTROLLER_TAXONSTATUS:
            return !!this.taxonEntityId;

        default:
            throw new Error('Unrecognized controller in "' + this.controllerName + '" in MapDataseriesConfiguration.prototype.has_content');
    }
};

MapDataseriesConfiguration.prototype._set_taxon_controller_type = function() {
    if (this.controllerName !== MapConfiguration.CONTROLLER_TAXONMAP &&
        this.controllerName !== MapConfiguration.CONTROLLER_TAXONSTATUS) {
        // was an incompatible controller, so need to reset panel

        this.set_controller(MapConfiguration.CONTROLLER_TAXONSTATUS);

        this.apply_configuration_options();
    }

    var taxonSourceEl = document.getElementById(this.taxonSearchTypeId);
    var taxonSource = taxonSourceEl.options[taxonSourceEl.selectedIndex].value;

    if (taxonSource === 'ddb') {
        if (this.controllerName !== MapConfiguration.CONTROLLER_TAXONMAP) {
            //this.controllerName = MapConfiguration.CONTROLLER_TAXONMAP;
            this.set_controller(MapConfiguration.CONTROLLER_TAXONMAP);

            this.apply_configuration_options();
        }
    } else {
        if (this.controllerName !== MapConfiguration.CONTROLLER_TAXONSTATUS) {
            this.set_controller(MapConfiguration.CONTROLLER_TAXONSTATUS);
            this.apply_configuration_options();
        }

        this.statusSchemeId = taxonSource; // menu doubles-up as selector for status filter
    }
};

MapDataseriesConfiguration.prototype.read_options = function() {
    if (this.datasetIsPrimarySearchResult) {
        // if the primary controller is SavedSearch then controller is immutable,
        // otherwise for taxon controllers there's scope to pick between ddb and status

        if (this.controllerName !== MapConfiguration.CONTROLLER_SAVEDSEARCH) {
            this._set_taxon_controller_type();
        }
    } else {
        var seriesTypeEl = document.getElementById(this.dataSeriesTypeElementId);
        var seriesType = seriesTypeEl.options[seriesTypeEl.selectedIndex].value;

        // may have got here just after a change of controller, in which case the menu options will be irrelevant
        // and new options need to be set

        // series type should be either MapConfiguration.CONTROLLER_SAVEDSEARCH
        // or MapDataseriesConfiguration.TAXON_SEARCH_TYPES

        if (seriesType === MapDataseriesConfiguration.TAXON_SEARCH_TYPES) {
            this._set_taxon_controller_type();
        } else if (this.controllerName !== MapConfiguration.CONTROLLER_SAVEDSEARCH) {
            this.set_controller(MapConfiguration.CONTROLLER_SAVEDSEARCH);
            this.apply_configuration_options();
        }
    }

    this.read_controller_options[this.controllerName].call(this);

    if (this.has_content()) {
        // if the series isn't set then grid resolution etc may not have been initialised
        var gridResolutionEl = document.getElementById(this.gridResolutionElementId);
        this.gridResolution = gridResolutionEl.options[gridResolutionEl.selectedIndex].value;

        var zoomModeEl = document.getElementById(this.zoomModeElementId);
        this.zoomMode = zoomModeEl.options[zoomModeEl.selectedIndex].value;

        // data series label
        this.label = document.getElementById(this.seriesLabelId).value.trim();

        this.controllerInterface = new MapControl.controllerInterfaces[this.controllerName];
        this.controllerInterface.refresh_expected_number_of_partitions_and_symbols(this);
        this.set_partition_filter();
    }
};

MapDataseriesConfiguration.prototype.set_partition_filter = function() {
    if (this.sourceData && this.sourceData.data_loaded() && this.numberOfPartitions !== this.sourceData.descriptor.numberOfPartitions) {
        this.partition_filter = this.partition_filters[this.partitionType];
    } else {
        this.partition_filter = null;
    }
};

/**
 * reference to function that coalesces partitions
 * default null for no filtering,
 * otherwise set up by GmapTile.prototype.initialise_partition_filter
 *
 * @type {?Function}
 */
MapDataseriesConfiguration.prototype.partition_filter = null;

MapDataseriesConfiguration.prototype.partition_filters = {};

/**
 * no partition subfiltering needed if dividing by all date classes
 */
MapDataseriesConfiguration.prototype.partition_filters[MapConfiguration.PARTITION_TYPE.DATECLASS] = null;

/**
 * no partition subfiltering needed if dividing by all available date classes
 */
MapDataseriesConfiguration.prototype.partition_filters[MapConfiguration.PARTITION_TYPE.DATE_CUSTOM] = null;

/**
 * lump partitions into two sets (0 - 3) (4 - 7)
 *
 * @this MapDataseriesConfiguration
 * @param {Object} square
 * @returns {Object}
 */
MapDataseriesConfiguration.prototype.partition_filters[MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_1987] = function(square) {
    // a 'square' consists of
    // tileX
    // tileY
    // tileDimension
    // childFreq
    // residualFreq
    // partitions
    // children
    // precision

    // where each partition has:
    // childFreq
    // residualFreq
    // status

    var origParts = square.partitions;

    square.partitions = [ {
        childFreq : origParts[0].childFreq + origParts[1].childFreq + origParts[2].childFreq + origParts[3].childFreq,
        residualFreq : origParts[0].residualFreq + origParts[1].residualFreq + origParts[2].residualFreq + origParts[3].residualFreq,
        status : merge_status_codes(origParts[0].status , origParts[1].status , origParts[2].status + origParts[3].status)
    },
        {
            childFreq : origParts[4].childFreq + origParts[5].childFreq + origParts[6].childFreq + origParts[7].childFreq,
            residualFreq : origParts[4].residualFreq + origParts[5].residualFreq + origParts[6].residualFreq + origParts[7].residualFreq,
            status : merge_status_codes(origParts[4].status , origParts[5].status, origParts[6].status, origParts[7].status)
        }
    ];

    return square;
};

/**
 * lump partitions into two sets (0 - 1) (2 - 7)
 *
 * @this MapDataseriesConfiguration
 * @param {Object} square
 * @returns {Object}
 */
MapDataseriesConfiguration.prototype.partition_filters[MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_1950] = function(square) {
    var origParts = square.partitions;

    square.partitions = [ {
        childFreq : origParts[0].childFreq + origParts[1].childFreq,
        residualFreq : origParts[0].residualFreq + origParts[1].residualFreq,
        status : merge_status_codes(origParts[0].status , origParts[1].status)
    },
        {
            childFreq : origParts[2].childFreq + origParts[3].childFreq + origParts[4].childFreq + origParts[5].childFreq + origParts[6].childFreq + origParts[7].childFreq,
            residualFreq : origParts[2].residualFreq + origParts[3].residualFreq + origParts[4].residualFreq + origParts[5].residualFreq + origParts[6].residualFreq + origParts[7].residualFreq,
            status : merge_status_codes(origParts[2].status, origParts[3].status, origParts[4].status, origParts[5].status, origParts[6].status, origParts[7].status)
        }
    ];

    return square;
};

/**
 * lump partitions into two sets (0 - 2) (3 - 7)
 *
 * @this MapDataseriesConfiguration
 * @param {Object} square
 * @returns {Object}
 */
MapDataseriesConfiguration.prototype.partition_filters[MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_1970] = function(square) {
    var origParts = square.partitions;

    square.partitions = [ {
        childFreq : origParts[0].childFreq + origParts[1].childFreq + origParts[2].childFreq,
        residualFreq : origParts[0].residualFreq + origParts[1].residualFreq + origParts[2].residualFreq,
        status : merge_status_codes(origParts[0].status, origParts[1].status, origParts[2].status)
    },
        {
            childFreq : origParts[3].childFreq + origParts[4].childFreq + origParts[5].childFreq + origParts[6].childFreq + origParts[7].childFreq,
            residualFreq : origParts[3].residualFreq + origParts[4].residualFreq + origParts[5].residualFreq + origParts[6].residualFreq + origParts[7].residualFreq,
            status : merge_status_codes(origParts[3].status, origParts[4].status, origParts[5].status, origParts[6].status , origParts[7].status)
        }
    ];

    return square;
};

/**
 * lump partitions into two sets (0) (1 - 7)
 *
 * @this MapDataseriesConfiguration
 * @param {Object} square
 * @returns {Object}
 */
MapDataseriesConfiguration.prototype.partition_filters[MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_1930] = function(square) {
    var origParts = square.partitions;

    square.partitions = [ {
        childFreq : origParts[0].childFreq,
        residualFreq : origParts[0].residualFreq,
        status : merge_status_codes(origParts[0].status)
    },
        {
            childFreq : origParts[1].childFreq + origParts[2].childFreq + origParts[3].childFreq + origParts[4].childFreq + origParts[5].childFreq + origParts[6].childFreq + origParts[7].childFreq,
            residualFreq : origParts[1].residualFreq + origParts[2].residualFreq + origParts[3].residualFreq + origParts[4].residualFreq + origParts[5].residualFreq + origParts[6].residualFreq + origParts[7].residualFreq,
            status : merge_status_codes(origParts[1].status, origParts[2].status, origParts[3].status, origParts[4].status, origParts[5].status, origParts[6].status, origParts[7].status)
        }
    ];

    return square;
};

/**
 * lump partitions into two sets (0 - 4) (5 - 7)
 *
 * @this MapDataseriesConfiguration
 * @param {Object} square
 * @returns {Object}
 */
MapDataseriesConfiguration.prototype.partition_filters[MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_2000] = function(square) {
    var origParts = square.partitions;

    square.partitions = [ {
        childFreq : origParts[0].childFreq + origParts[1].childFreq + origParts[2].childFreq + origParts[3].childFreq + origParts[4].childFreq,
        residualFreq : origParts[0].residualFreq + origParts[1].residualFreq + origParts[2].residualFreq + origParts[3].residualFreq + origParts[4].residualFreq,
        status : merge_status_codes(origParts[0].status, origParts[1].status, origParts[2].status, origParts[3].status, origParts[4].status)
    },
        {
            childFreq : origParts[5].childFreq + origParts[6].childFreq + origParts[7].childFreq,
            residualFreq : origParts[5].residualFreq + origParts[6].residualFreq + origParts[7].residualFreq,
            status : merge_status_codes(origParts[5].status, origParts[6].status, origParts[7].status)
        }
    ];

    return square;
};

/**
 * lump partitions into two sets (0 - 5) (6 - 7)
 *
 * @this MapDataseriesConfiguration
 * @param {Object} square
 * @returns {Object}
 */
MapDataseriesConfiguration.prototype.partition_filters[MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_2010] = function(square) {
    var origParts = square.partitions;

    square.partitions = [ {
        childFreq : origParts[0].childFreq + origParts[1].childFreq + origParts[2].childFreq + origParts[3].childFreq + origParts[4].childFreq + origParts[5].childFreq,
        residualFreq : origParts[0].residualFreq + origParts[1].residualFreq + origParts[2].residualFreq + origParts[3].residualFreq + origParts[4].residualFreq + origParts[5].residualFreq,
        status : merge_status_codes(origParts[0].status, origParts[1].status, origParts[2].status, origParts[3].status, origParts[4].status, origParts[5].status)
    },
        {
            childFreq : origParts[6].childFreq + origParts[7].childFreq,
            residualFreq : origParts[6].residualFreq + origParts[7].residualFreq,
            status : merge_status_codes(origParts[6].status, origParts[7].status)
        }
    ];

    return square;
};

/**
 * lump partitions into two sets (0 - 6) (7)
 *
 * @this MapDataseriesConfiguration
 * @param {Object} square
 * @returns {Object}
 */
MapDataseriesConfiguration.prototype.partition_filters[MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_2020] = function(square) {
    var origParts = square.partitions;

    square.partitions = [ {
        childFreq : origParts[0].childFreq + origParts[1].childFreq + origParts[2].childFreq + origParts[3].childFreq + origParts[4].childFreq + origParts[5].childFreq + origParts[6].childFreq,
        residualFreq : origParts[0].residualFreq + origParts[1].residualFreq + origParts[2].residualFreq + origParts[3].residualFreq + origParts[4].residualFreq + origParts[5].residualFreq + origParts[6].residualFreq,
        status : merge_status_codes(origParts[0].status , origParts[1].status , origParts[2].status , origParts[3].status , origParts[4].status, origParts[5].status , origParts[6].status)
    },
        {
            childFreq : origParts[7].childFreq,
            residualFreq : origParts[7].residualFreq,
            status : origParts[7].status
        }
    ];

    return square;
};

/**
 * lump all partitions together
 *
 * @param {Object} square
 * @this MapDataseriesConfiguration
 * @returns {Object}
 */
MapDataseriesConfiguration.prototype.partition_filters[MapConfiguration.PARTITION_TYPE.OTHER] = function(square) {
    // a 'square' consists of
    // tileX
    // tileY
    // tileDimension
    // childFreq
    // residualFreq
    // partitions
    // children
    // precision

    // where each partition has:
    // childFreq
    // residualFreq
    // status

    var numberOfSourcePartitions = this.sourceData.descriptor.numberOfPartitions;

    if (numberOfSourcePartitions > 1) { // this test shouldn't be needed as should never be called if 1 == 1 (source number of part == target number of part)
        var origParts = square.partitions;

        if (numberOfSourcePartitions === 8) {
            // short-cut optimization
            square.partitions = [ {
                childFreq : square.childFreq,
                residualFreq : square.residualFreq,
                status : merge_status_codes(origParts[0].status, origParts[1].status, origParts[2].status, origParts[3].status, origParts[4].status, origParts[5].status, origParts[6].status, origParts[7].status)
            }];
        } else {
            // other number of partitions

            var statuses = [];
            for (var i = numberOfSourcePartitions; i--;) {
                statuses[i] = origParts[0].status;
            }

            square.partitions = [ {
                childFreq : square.childFreq,
                residualFreq : square.residualFreq,
                status : merge_status_codes.apply(this, statuses)
            }];
        }
    } else {
        console.log('partition filter miscalled where source partitions already == target partitions');
    }

    return square;
};

MapDataseriesConfiguration.prototype.partition_filters[''] = MapDataseriesConfiguration.prototype.partition_filters[MapConfiguration.PARTITION_TYPE.OTHER];

MapDataseriesConfiguration.prototype.read_controller_options = {};

/**
 *
 * @returns {undefined}
 */
MapDataseriesConfiguration.prototype._read_options_for_ddb_data_type_searches = function() {
    var partitionTypeEl;
    var searchTypeEl = document.getElementById(this.searchTypeOptionsId);
    if (!searchTypeEl) {
        throw new Error('Failed to recover searchTypeEl in _read_options_for_ddb_data_type_searches.');
    }
    if (!this.savedSearchCustomFieldsFlag || this.savedSearchDateClassFrequenciesFlag) {
        // either not custom grouping, or custom grouping that supports date classes
        partitionTypeEl = document.getElementById(this.partitionMenuId);
        this.partitionType = partitionTypeEl.options[partitionTypeEl.selectedIndex].value;
    } else {
        this.partitionType = MapConfiguration.PARTITION_TYPE.OTHER;
    }

    var searchType = searchTypeEl.options[searchTypeEl.selectedIndex].value;

    if (!this.savedSearchCustomFieldsFlag ||
        (this.savedSearchCustomFieldsFlag && searchType === MapConfiguration.SEARCHTYPE_PRESENCE)
    ) {
        this.searchType = searchType;

        this.frequencyResultsFlag = MapConfiguration.frequencySearchTypes.indexOf(this.searchType) !== -1;

        if (this.frequencyResultsFlag) {
            this.partitionType = '';

            if (this.searchType === MapConfiguration.SEARCHTYPE_SPECIES_FREQ || this.searchType === MapConfiguration.SEARCHTYPE_TAXON_FREQ) {
                console.log('Forcing fixed zoom for search type: ' + this.searchType);
                this.force_fixed_zoom();
            }
        } else {
            partitionTypeEl = document.getElementById(this.partitionMenuId);
            this.partitionType = partitionTypeEl.options[partitionTypeEl.selectedIndex].value;
            //console.log('partition type = ' + this.partitionType);

            var dateBoundaryEl = document.getElementById(this.dateBoundaryTypeId);
            this.dateBoundary = dateBoundaryEl.options[dateBoundaryEl.selectedIndex].value;

            var statusFilterEl = document.getElementById(this.statusFilterMenuId);
            this.statusFilter = statusFilterEl.options[statusFilterEl.selectedIndex].value;
        }
    } else {
        // search type other means that the controller is providing complex frequency results rather than records
        //this.partitionType = MapConfiguration.PARTITION_TYPE.UNPARTITIONED;

        //var searchType = searchTypeEl.options[searchTypeEl.selectedIndex].value;

        this.frequencyResultsFlag = (searchType !== MapConfiguration.SEARCHTYPE_PRESENCE);

        if (searchType === MapConfiguration.SEARCHTYPE_PRESENCE || searchType === MapConfiguration.SEARCHTYPE_OTHER) {
            this.searchType = searchType;
            this.frequencyColumnIndex = null;

            this.partitionType = MapConfiguration.PARTITION_TYPE.UNPARTITIONED;
        } else {
            // search using one of the other data columns
            this.partitionType = MapConfiguration.PARTITION_TYPE.OTHER;

            this.searchType = MapConfiguration.SEARCHTYPE_OTHER;

            this.frequencyColumnIndex = (searchType.substr(1, 1) === '_') ? '_' : parseInt(searchType.substr(1), 10);
            this.percentageFreqFlag = (searchType.substr(-1) === '%');
        }

        if (this.sourceData.descriptor.customDistinctGroupingFlag && !(searchType === MapConfiguration.SEARCHTYPE_PRESENCE)) {
            console.log('Forcing fixed zoom for distinct custom search type.');
            this.force_fixed_zoom();
        }
    }
};

/**
 *
 * @returns {undefined}
 */
MapDataseriesConfiguration.prototype.force_fixed_zoom = function() {
    this.zoomMode = MapDataseriesConfiguration.ZOOM_MODE_ONLY_THIS;

    var zoomModeEl = document.getElementById(this.zoomModeElementId);
    selectOption(zoomModeEl, MapDataseriesConfiguration.ZOOM_MODE_ONLY_THIS);
};

/**
 * SavedSearch controller options depend on whether the search results are records or custom grouped data
 *
 * @this MapDataseriesConfiguration
 * @returns {undefined}
 */
MapDataseriesConfiguration.prototype.read_controller_options[MapConfiguration.CONTROLLER_SAVEDSEARCH] = function () {
    this.set_controller(MapConfiguration.CONTROLLER_SAVEDSEARCH);
    this._read_options_for_ddb_data_type_searches();

    //saved search id will have been set during dropbox change events
};

/**
 * unpartitioned, frequency and date-class partitioning allowed
 * status options allowed (atlas or hectad status) for presence/absence results
 *
 * taxon name will have been set during dropbox change events
 *
 * @todo need to read date from / date to (decide if these options should still be offered)
 * @this MapDataseriesConfiguration
 * @returns {undefined}
 */
MapDataseriesConfiguration.prototype.read_controller_options[MapConfiguration.CONTROLLER_TAXONMAP] = function () {
    this.set_controller(MapConfiguration.CONTROLLER_TAXONMAP);

    if (this.taxonEntityId) {
        // panel will only have been fully configured once a taxon has been selected
        this._read_options_for_ddb_data_type_searches();
    }
};

/**
 * allows unpartitioned or date-class partitioning allowed (no frequencies)
 * no explicit status filter type menu
 * no date boundary
 *
 * @this MapDataseriesConfiguration
 * @returns {undefined}
 */
MapDataseriesConfiguration.prototype.read_controller_options[MapConfiguration.CONTROLLER_TAXONSTATUS] = function () {
    this.set_controller(MapConfiguration.CONTROLLER_TAXONSTATUS);

    this.searchType = MapConfiguration.SEARCHTYPE_PRESENCE; // taxon status list based results can only be presence/absence
    this.frequencyResultsFlag = false;

    var partitionTypeEl = document.getElementById(this.partitionMenuId);
    this.partitionType = partitionTypeEl.options[partitionTypeEl.selectedIndex].value;

    this.dateBoundary = MapConfiguration.EARLIEST_DATE;
};

/**
 *
 */
MapDataseriesConfiguration.prototype.apply_configuration_options = function () {
    if (MapDataseriesConfiguration.apply_controller_specific_config_options.hasOwnProperty(this.controllerName)) {
        MapDataseriesConfiguration.apply_controller_specific_config_options[this.controllerName].call(this); // note the ugly rebinding of this, otherwise 'this' transfers to the array
    } else {
        console.log('unrecognized controller name "' + this.controllerName + '" in MapDataseriesConfiguration.prototype.apply_configuration_options');
    }

    // data series label
    document.getElementById(this.seriesLabelId).value = this.label.trim();
    this.set_partition_filter();
    //console.log('MapDataseriesConfiguration.prototype.apply_configuration_options');
};

/**
 *
 * @namespace
 */
MapDataseriesConfiguration.apply_controller_specific_config_options = {};

/**
 *
 * @namespace
 */
MapDataseriesConfiguration.get_controller_specific_config_options = {};

MapDataseriesConfiguration.DATE_PARTITION_MENU_OPTIONS = {
    dateclass : 'date class',
    date2020 : 'date pre-2020/2020-onwards',
    date2010 : 'date pre-2010/2010-onwards',
    date2000 : 'date pre-2000/2000-onwards',
    date1987 : 'date pre-1987/1987-onwards',
    date1970 : 'date pre-1970/1970-onwards',
    date1950 : 'date pre-1950/1950-onwards',
    date1930 : 'date pre-1930/1930-onwards'
};

/**
 * updates the available options to reflect availability of dateclasses
 *
 * @param {boolean} visible
 */
MapDataseriesConfiguration.prototype.refresh_partition_type_menu = function(visible) {
    var partitionMenuEl = document.getElementById(this.partitionMenuId);
    partitionMenuEl.options.length = 0; // truncate the old menu
    partitionMenuEl.options[0] = new Option('unpartitioned', '', true);

    // default to dateclass options unless source data is more constrained
    var sourcePartitioning = this.savedSearchFrequencyDateclassDivisionsType ?
        this.savedSearchFrequencyDateclassDivisionsType : MapConfiguration.DATECLASS_DIVISION_TYPES.DATECLASS;

    switch (sourcePartitioning) {
        case MapConfiguration.DATECLASS_DIVISION_TYPES.DATECLASS:
            var n = 1;
            for (var key in MapDataseriesConfiguration.DATE_PARTITION_MENU_OPTIONS) {
                if (MapDataseriesConfiguration.DATE_PARTITION_MENU_OPTIONS.hasOwnProperty(key)) {
                    partitionMenuEl.options[n] = new Option(MapDataseriesConfiguration.DATE_PARTITION_MENU_OPTIONS[key], key, false);
                    n++;
                }
            }
            break;

        case MapConfiguration.DATECLASS_DIVISION_TYPES.DATE_CUSTOM:
            partitionMenuEl.options[1] = new Option('dates', MapConfiguration.PARTITION_TYPE.DATE_CUSTOM, false);
            break;

        default:
            console.log("In refresh_partition_type_menu encountered unexpected sourcePartitioning '" + sourcePartitioning + "'.");
    }

    selectOption(partitionMenuEl, this.partitionType !== 'other' ? this.partitionType : '');
    document.getElementById(this.partitionMenuLabelId).style.display = visible ? 'block' : 'none';
};

/**
 * @this MapDataseriesConfiguration
 * @memberof MapDataseriesConfiguration
 * @instance
 * @param {Object} params
 * @return Object params
 */
MapDataseriesConfiguration.get_controller_specific_config_options[MapConfiguration.CONTROLLER_SAVEDSEARCH] = function(params) {

    params.taxonEntityId = this.savedSearchId;

    if (MapDataseriesConfiguration.prototype.gridResolution !== this.gridResolution) {
        params.gridResolution = this.gridResolution;
    }
    if (MapDataseriesConfiguration.prototype.zoomMode !== this.zoomMode) {
        params.zoomMode = this.zoomMode;
    }
    if (MapDataseriesConfiguration.prototype.searchType !== this.searchType) {
        params.searchType = this.searchType;
    }
    if (MapDataseriesConfiguration.prototype.frequencyResultsFlag !== this.frequencyResultsFlag) {
        params.frequencyResultsFlag = this.frequencyResultsFlag;
    }
    if (MapDataseriesConfiguration.prototype.dataSourceId !== this.dataSourceId) {
        params.dataSourceId = this.dataSourceId;
    }
    if (MapDataseriesConfiguration.prototype.includeDoNotMapped !== this.includeDoNotMapped) {
        params.includeDoNotMapped = this.includeDoNotMapped;
    }

    // N.B. comparison with MapConfiguration.prototype.defaultPartitionType
    if (MapConfiguration.prototype.defaultPartitionType !== this.partitionType) {
        params.partitionType = this.partitionType;
    }

    //if (MapDataseriesConfiguration.prototype.statusFilter !== this.statusFilter) {
    //	params.statusFilter = this.statusFilter;
    //}
    //if (MapDataseriesConfiguration.prototype.dateBoundary !== this.dateBoundary) {
    //	params.dateBoundary = this.dateBoundary;
    //}

    if (this.savedSearchCustomFieldsFlag) {
        if (this.frequencyColumnIndex !== '') {
            params.frequencyColumnIndex = this.frequencyColumnIndex;
        }
        if (this.percentageFreqFlag !== '') {
            params.percentageFreqFlag = this.percentageFreqFlag;
        }
    }

    return params;
};

/**
 * @this MapDataseriesConfiguration
 * @memberof MapDataseriesConfiguration
 * @instance
 */
MapDataseriesConfiguration.apply_controller_specific_config_options[MapConfiguration.CONTROLLER_SAVEDSEARCH] = function apply_saved_search_specific_config_options_savedsearch () {

    if (!this.datasetIsPrimarySearchResult) {
        document.getElementById(this.savedSearchSectionId).style.display = 'block';
    }

    var labelEl = document.getElementById(this.taxonSearchTypeLabelId);
    if (labelEl) {
        labelEl.style.display = 'none';
    }

    if (this.savedSearchId && this.savedSearchMetadataReady) {
        var searchTypeMenu = document.getElementById(this.searchTypeOptionsId);

        // reset and reconstruct the search type menu
        searchTypeMenu.options.length = 0;

        searchTypeMenu.options[0] =
            new Option('presence / absence', MapConfiguration.SEARCHTYPE_PRESENCE, true); //new Option(item.label, item.value, defaultflag, selectedflag);

        if (!this.savedSearchCustomFieldsFlag) {
            searchTypeMenu.options[1] = new Option('number of records', MapConfiguration.SEARCHTYPE_RECORD_FREQ, false);
            searchTypeMenu.options[2] = new Option('number of taxa', MapConfiguration.SEARCHTYPE_TAXON_FREQ, false);
            searchTypeMenu.options[3] = new Option('number of species', MapConfiguration.SEARCHTYPE_SPECIES_FREQ, false);

            selectOption(searchTypeMenu, this.searchType);
        } else {
            // @todo 'total frequency' should be customized to indecate 'total number of records' v's any setting based on the query's DISTINCT clause
            searchTypeMenu.options[1] = new Option('total frequency', MapConfiguration.SEARCHTYPE_OTHER, false);
            //console.log(this.savedSearchNumericDataColumns);
            var l = this.savedSearchNumericDataColumns.length;

            // savedSearchNumericDataColumns is a sparse array, keyed by search table column number (from 0)
            // It only includes entries for columns with partitioned freq or numerical values

            if (l) {
                var numberOfPartitionedFreqColumns = 0; // number of partitioned freq columns (as distinct from just numeric data columns)

                for (var n = 0; n < l; n++) {
                    if (this.savedSearchNumericDataColumns.hasOwnProperty(n)) {
                        var column = this.savedSearchNumericDataColumns[n];

                        searchTypeMenu.options[searchTypeMenu.options.length] = new Option(column.label, 'o' + n, false);

                        if (column.type === MapDataseriesConfiguration.COLUMNTYPE_PARTITIONED_FREQ) {
                            numberOfPartitionedFreqColumns++;
                            searchTypeMenu.options[searchTypeMenu.options.length] = new Option(column.label + ' as % of total', 'o' + n + '%', false);
                        }
                    }
                }

                if (Object.keys(this.savedSearchNumericDataColumns).length > 1) {
                    searchTypeMenu.options[searchTypeMenu.options.length] = new Option('total of sub-columns', 'o_', false);

                    if (numberOfPartitionedFreqColumns > 1) {
                        searchTypeMenu.options[searchTypeMenu.options.length] = new Option('total of sub-columns as % of total', 'o_%', false);
                    }
                }
            }

            selectOption(searchTypeMenu, this.searchType +
                (this.frequencyColumnIndex ? (this.frequencyColumnIndex + (this.percentageFreqFlag ? '%' : '')) : ''));
        }

        document.getElementById(this.searchTypeOptionsLabelId).style.display = 'block';

        if (this.savedSearchDateClassFrequenciesFlag || !this.savedSearchCustomFieldsFlag) {
            // either have a standard result set (not odd frequency columns) or
            // have frequency columns including dateclass subdivisions

            if (this.searchType === MapConfiguration.SEARCHTYPE_PRESENCE) {
                if (this.partitionType === MapConfiguration.PARTITION_TYPE.OTHER) {
                    // special case  where custom frequency search, but which supports dateclasses
                    // (due to presence of dateclass freq partitioning)

                    this.partitionType = MapConfiguration.PARTITION_TYPE.DATECLASS;
                }

                // only display status for presence/absence results
                selectOption(document.getElementById(this.statusFilterMenuId), this.statusFilter);
                document.getElementById(this.statusFilterLabelId).style.display = 'block';

                //selectOption(document.getElementById(this.partitionMenuId), this.partitionType);
                //document.getElementById(this.partitionMenuLabelId).style.display = 'block';
                this.refresh_partition_type_menu(true);

                selectOption(document.getElementById(this.dateBoundaryTypeId), this.dateBoundary);
                document.getElementById(this.dateBoundaryTypeLabelId).style.display = (this.partitionType === '' ? 'none' : 'inline');
            } else {
                if (this.savedSearchCustomFieldsFlag) {
                    this.partitionType = MapConfiguration.PARTITION_TYPE.OTHER;
                }
                document.getElementById(this.statusFilterLabelId).style.display = 'none';
                document.getElementById(this.partitionMenuLabelId).style.display = 'none';
                document.getElementById(this.dateBoundaryTypeLabelId).style.display = 'none';
            }
        } else {
            this.partitionType = MapConfiguration.PARTITION_TYPE.OTHER;

            document.getElementById(this.statusFilterLabelId).style.display = 'none';
            document.getElementById(this.partitionMenuLabelId).style.display = 'none';
            document.getElementById(this.dateBoundaryTypeLabelId).style.display = 'none';
        }

        document.getElementById(this.gridResolutionLabelElementId).style.display = 'inline';
        document.getElementById(this.zoomModeLabelElementId).style.display = 'inline';
        this.set_grid_resolution_options(this.minGridsquarePrecisionLevel, this.maxGridsquarePrecisionLevel);
    } else {
        // the search form isn't ready yet because either a saved search hasn't been selected
        // or its metadata hasn't loaded yet
        // so hide everything

        document.getElementById(this.searchTypeOptionsLabelId).style.display = 'none';

        document.getElementById(this.statusFilterLabelId).style.display = 'none';
        document.getElementById(this.partitionMenuLabelId).style.display = 'none';
        document.getElementById(this.dateBoundaryTypeLabelId).style.display = 'none';

        document.getElementById(this.gridResolutionLabelElementId).style.display = 'none';
        document.getElementById(this.zoomModeLabelElementId).style.display = 'none';

        if (this.sourceData && !this.savedSearchId) {
            this.sourceData.destroy();
            this.sourceData = new BinaryGridsquareListSource;
        }
    }

    document.getElementById(this.taxonSectionId).style.display = 'none';
};

MapDataseriesConfiguration.precisions = {
    1 : {label: 'hectad (10km sq)', value: 'hectad'},
    2 : {label: 'tetrad (2km sq)', value: 'tetrad'},
    3 : {label: 'monad (1 km sq)', value: 'monad'},
    4 : {label: 'hectare (100m sq)', value: '100m'},
    5 : {label: '10 m sq', value: '10m'}
};

MapDataseriesConfiguration.KEY_TO_PRECISION = {
    'hectad' : 1,
    'tetrad' : 2,
    'monad' : 3,
    '100m' : 4,
    '10m' : 5
};

/**
 * sparse array, keyed by search table column number (from 0)
 * It only includes entries for columns with partitioned freq or numerical values
 *
 * @type {Array.<Object>}
 */
MapDataseriesConfiguration.prototype.savedSearchNumericDataColumns = null;

/**
 *
 * @param {number} minPrecision
 * @param {number} maxPrecision
 */
MapDataseriesConfiguration.prototype.set_grid_resolution_options = function(minPrecision, maxPrecision) {
    var menu = document.getElementById(this.gridResolutionElementId);

    menu.options.length = 0; // reset

    var currentPrecision = MapDataseriesConfiguration.KEY_TO_PRECISION[this.gridResolution];
    if (currentPrecision < minPrecision) {
        this.gridResolution = MapDataseriesConfiguration.precisions[minPrecision].value;
    } else if (currentPrecision > maxPrecision) {
        this.gridResolution = MapDataseriesConfiguration.precisions[maxPrecision].value;
    }

    var n = 0;
    for (var p = minPrecision; p <= maxPrecision; p++) {
        if (MapDataseriesConfiguration.precisions.hasOwnProperty(p)) {
            menu.options[n] =
                new Option(MapDataseriesConfiguration.precisions[p].label,
                    MapDataseriesConfiguration.precisions[p].value,
                    n === 0,
                    this.gridResolution === MapDataseriesConfiguration.precisions[p].value);

            if (MapDataseriesConfiguration.precisions[p].hasOwnProperty('description')) {
                menu.options[n].title = MapDataseriesConfiguration.precisions[p].hasOwnProperty('description');
            }
        } else {
            throw new Error("Grid precision out of range.");
        }

        n++;
    }

    selectOption(document.getElementById(this.zoomModeElementId), this.zoomMode);

    var grResolutionLabel = document.getElementById(this.gridResolutionLabelElementId);
    var grZoomLabel = document.getElementById(this.zoomModeLabelElementId);

    if (this.has_content()) {
        grZoomLabel.style.display = 'block';
        grResolutionLabel.style.display = 'block';

        if (this.zoomMode === MapDataseriesConfiguration.ZOOM_MODE_BEST_WITH_RESIDUE ||
            this.zoomMode === MapDataseriesConfiguration.ZOOM_MODE_BEST) {

            // grid-resolution field is irrelevant in this case
            // so if currently displaying zoomable map then it should be hidden
            grResolutionLabel.classList.add('gmap_irrelevant');
        } else {
            grResolutionLabel.classList.remove('gmap_irrelevant');
        }
    } else {
        grZoomLabel.style.display = 'none';
        grResolutionLabel.style.display = 'none';
    }
};

/**
 *
 * @returns {undefined}
 */
MapDataseriesConfiguration.prototype.apply_taxon_specific_controller_config_options = function() {
    var savedSearchSectionEl = document.getElementById(this.savedSearchSectionId);
    if (savedSearchSectionEl) {
        savedSearchSectionEl.style.display = 'none';
    }

    document.getElementById(this.taxonSectionId).style.display = 'block';

    if (this.taxonEntityId) {
        document.getElementById(this.searchTypeOptionsLabelId).style.display = 'block';
        document.getElementById(this.taxonSearchTypeLabelId).style.display = 'block';
    } else {
        // no taxon selected, so hide the remaining options
        document.getElementById(this.searchTypeOptionsLabelId).style.display = 'none';
        document.getElementById(this.taxonSearchTypeLabelId).style.display = 'none';
    }
};

/**
 * @this MapDataseriesConfiguration
 * @memberof MapDataseriesConfiguration
 * @instance
 * @param {Object} params
 * @return Object params
 */
MapDataseriesConfiguration.get_controller_specific_config_options[MapConfiguration.CONTROLLER_TAXONMAP] = function(params) {

    params.taxonEntityId = this.taxonEntityId;

    if (MapDataseriesConfiguration.prototype.gridResolution !== this.gridResolution) {
        params.gridResolution = this.gridResolution;
    }
    if (MapDataseriesConfiguration.prototype.zoomMode !== this.zoomMode) {
        params.zoomMode = this.zoomMode;
    }
    if (MapDataseriesConfiguration.prototype.searchType !== this.searchType) {
        params.searchType = this.searchType;
    }
    if (MapDataseriesConfiguration.prototype.statusFilter !== this.statusFilter) {
        params.statusFilter = this.statusFilter;
    }
    if (MapDataseriesConfiguration.prototype.dateBoundary !== this.dateBoundary) {
        params.dateBoundary = this.dateBoundary;
    }
    if (MapDataseriesConfiguration.prototype.frequencyResultsFlag !== this.frequencyResultsFlag) {
        params.frequencyResultsFlag = this.frequencyResultsFlag;
    }

    // N.B. comparison with MapConfiguration.prototype.defaultPartitionType
    if (MapConfiguration.prototype.defaultPartitionType !== this.partitionType) {
        params.partitionType = this.partitionType;
    }

    return params;
};

/**
 * @this MapDataseriesConfiguration
 * @memberof MapDataseriesConfiguration
 * @instance
 */
MapDataseriesConfiguration.apply_controller_specific_config_options[MapConfiguration.CONTROLLER_TAXONMAP] = function() {
    this.apply_taxon_specific_controller_config_options();
    this.set_grid_resolution_options(this.minGridsquarePrecisionLevel, this.maxGridsquarePrecisionLevel);

    selectOption(document.getElementById(this.taxonSearchTypeId), 'ddb');

    if (this.taxonEntityId) {
        // set up search type options to allow presence/absence or frequency

        const searchTypeMenu = document.getElementById(this.searchTypeOptionsId);

        searchTypeMenu.options.length = 0;
        searchTypeMenu.options[0] = new Option('presence / absence', MapConfiguration.SEARCHTYPE_PRESENCE, true);
        searchTypeMenu.options[1] = new Option('number of records', MapConfiguration.SEARCHTYPE_RECORD_FREQ);

        selectOption(searchTypeMenu, this.searchType);
        document.getElementById(this.searchTypeOptionsLabelId).style.display = 'block';

        if (this.searchType === MapConfiguration.SEARCHTYPE_PRESENCE) {
            // only display status for presence/absence results
            selectOption(document.getElementById(this.statusFilterMenuId), this.statusFilter);
            document.getElementById(this.statusFilterLabelId).style.display = 'block';

            this.refresh_partition_type_menu(true);

            selectOption(document.getElementById(this.dateBoundaryTypeId), this.dateBoundary);
            document.getElementById(this.dateBoundaryTypeLabelId).style.display = (this.partitionType === '' ? 'none' : 'inline');
        } else {
            document.getElementById(this.statusFilterLabelId).style.display = 'none';
            document.getElementById(this.partitionMenuLabelId).style.display = 'none';
            document.getElementById(this.dateBoundaryTypeLabelId).style.display = 'none';
        }
    } else {
        document.getElementById(this.statusFilterLabelId).style.display = 'none';
        document.getElementById(this.partitionMenuLabelId).style.display = 'none';
        document.getElementById(this.dateBoundaryTypeLabelId).style.display = 'none';

        if (this.sourceData) {
            this.sourceData.destroy();
            this.sourceData = new BinaryGridsquareListSource;
        }
    }
};

/**
 * @this MapDataseriesConfiguration
 * @memberof MapDataseriesConfiguration
 * @instance
 * @param {Object} params
 * @return Object params
 */
MapDataseriesConfiguration.get_controller_specific_config_options[MapConfiguration.CONTROLLER_TAXONSTATUS] = function(params) {

    params.taxonEntityId = this.taxonEntityId;

    if (MapDataseriesConfiguration.prototype.zoomMode !== this.zoomMode) {
        params.zoomMode = this.zoomMode;
    }
    if (MapDataseriesConfiguration.prototype.statusSchemeId !== this.statusSchemeId) {
        params.statusSchemeId = this.statusSchemeId;
    }
    if (MapDataseriesConfiguration.prototype.partitionType !== this.partitionType) {
        params.partitionType = this.partitionType;
    }

    return params;
};

/**
 * @this MapDataseriesConfiguration
 * @memberof MapDataseriesConfiguration
 * @instance
 */
MapDataseriesConfiguration.apply_controller_specific_config_options[MapConfiguration.CONTROLLER_TAXONSTATUS] = function() {
    this.apply_taxon_specific_controller_config_options();

    this.minGridsquarePrecisionLevel = 1; // hectad
    this.maxGridsquarePrecisionLevel = 1; // hectad
    this.gridResolution = 'hectad';
    this.set_grid_resolution_options(this.minGridsquarePrecisionLevel, this.maxGridsquarePrecisionLevel);

    if (this.statusSchemeId === '') {
        this.statusSchemeId = 'h';
    }

    selectOption(document.getElementById(this.taxonSearchTypeId), this.statusSchemeId);

    document.getElementById(this.statusFilterLabelId).style.display = 'none';

    if (this.taxonEntityId) {
        //@todo need option to show presence/absence rather than status

        this.refresh_partition_type_menu(true);
        document.getElementById(this.dateBoundaryTypeLabelId).style.display = 'none';

        document.getElementById(this.searchTypeOptionsLabelId).style.display = 'none';
    } else {
        if (this.sourceData) {
            this.sourceData.destroy();
            this.sourceData = new BinaryGridsquareListSource;
        }
    }
};

/**
 * grid square options for use when including other results sets
 *
 * @type Object
 */
//MapDataseriesConfiguration.GRID_SQUARE_OPTIONS = {
//	'hectad' : {label: 'hectad (10km square)', value: 'hectad', precision: 10000, isDefault: true},
//	'tetrad' : {label: 'tetrad (2km square)', value: 'tetrad', precision: 2000, isDefault: false},
//	'monad' : {label: 'monad (1km square)', value: 'monad', precision: 1000, isDefault: false}
//	//'100m' : {label: 'hectare (100m square)', value: '100m', precision: 100, isDefault: false}
//};

/**
 *
 * @param {Element} tBody
 * @param {MapConfiguration} mapConfiguration
 */
MapDataseriesConfiguration.prototype.init_panel_options = function(tBody, mapConfiguration) {
    this.containerRowId = uniqueId('series_container_row');

    const tr = tBody.appendChild(document.createElement('tr'));
    tr.id = this.containerRowId;
    tr.className = 'styleseriescontainerrow';

    this.seriesLabelId = uniqueId('serieslabel');
    let cell = tr.appendChild(document.createElement('td'));
    cell.className = "styleserieslabelcell";

    let cellHTML = `<td class="styleserieslabelcell"><input type="text" id="${this.seriesLabelId}" value="" class="dataserieslabel" placeholder="data series label">`;

    if (this.datasetIsPrimarySearchResult && this.controllerName === MapConfiguration.CONTROLLER_SAVEDSEARCH) {
        cellHTML += '<p>(primary search results)</p></td>';
    } else {
        // show options to pick whether to show additional taxa or saved results sets

        this.dataSeriesTypeElementId = uniqueId('seriestype');
        this.deleteSeriesButtonId = uniqueId('delete');

        cellHTML += '<p>' +
            '<button class="img" id="' + this.deleteSeriesButtonId + '" title="remove data series"><img alt="delete" width="16" height="16" src="' + MapControl.ICON_DELETEBUTTON + '"></button> ';

        if (mapConfiguration.allowSavedSearchDataSeries) {

            cellHTML += '<select id="' + this.dataSeriesTypeElementId + '">' +
                '<option value="' + MapConfiguration.CONTROLLER_SAVEDSEARCH + '"' + (this.controllerName === MapConfiguration.CONTROLLER_SAVEDSEARCH ? ' selected' : '') + '>search results</option>' +
                '<option value="' + MapDataseriesConfiguration.TAXON_SEARCH_TYPES + '"' + (this.controllerName !== MapConfiguration.CONTROLLER_SAVEDSEARCH ? ' selected' : '') + '>taxon distribution</option>';
        } else {
            // only taxon types allowed, so provide no choice and hide control
            cellHTML += '<select id="' + this.dataSeriesTypeElementId + '" style="display: none;">' +
                '<option value="' + MapDataseriesConfiguration.TAXON_SEARCH_TYPES + '" selected>taxon distribution</option>';
        }

        cellHTML += '</select></p>';
    }

    cell.innerHTML = cellHTML;

    this.taxonSearchTypeLabelId = uniqueId('taxonsearchtypelabel');
    this.taxonSearchTypeId = uniqueId('taxonsearchtypemenu');

    this.taxonSectionId = uniqueId('taxonlabel');
    this.taxonDropBoxDivId = uniqueId('taxondropboxdiv');
    this.taxonDropBoxInputId = uniqueId('taxondropboxinput');

    cell = tr.appendChild(document.createElement('td'));

    const taxonSectionDiv = cell.appendChild(document.createElement('div'));
    taxonSectionDiv.id = this.taxonSectionId;
    taxonSectionDiv.className = 'maptaxonsectiondiv';
    taxonSectionDiv.setAttribute('style', "padding-top: 2px; padding-bottom: 2px; width: 28em; margin: 2px;"); // should use class

    const taxonDropboxLabel = document.createElement('label');
    taxonDropboxLabel.className = 'dropboxcontainer';
    taxonDropboxLabel.appendChild(document.createTextNode('taxon'));
    const taxonInput = document.createElement('input');
    taxonInput.id = this.taxonDropBoxInputId;
    taxonInput.setAttribute('style', "width: 24em; margin-left: 1em; border-style: solid; border-width: thin; border-color: gray; padding: 2px 2px 2px 3px;");
    taxonInput.value = this.taxonName;
    taxonInput.placeholder = 'taxon name';
    taxonDropboxLabel.appendChild(taxonInput);
    taxonSectionDiv.appendChild(taxonDropboxLabel);

    const taxonDropboxDiv = cell.appendChild(document.createElement('div'));
    taxonDropboxDiv.id = this.taxonDropBoxDivId;

    const sourceLabelEl = cell.appendChild(document.createElement('label'));
    sourceLabelEl.id = this.taxonSearchTypeLabelId;

    sourceLabelEl.innerHTML = 'source <select id="' + this.taxonSearchTypeId + '">' +
        '<option value="ddb">Records from the live database</option>' +
        '<option value="' + MapDataseriesConfiguration.STATUS_SCHEME_ID_HECTAD + '">Curated records (hectad status)</option>' +
        '<option value="' + MapDataseriesConfiguration.STATUS_SCHEME_ID_ATLAS2000 + '">Atlas 2000 records</option>' +
        '</select>';

    if (!this.datasetIsPrimarySearchResult) {
        this.savedSearchSectionId = uniqueId('savedsearchlabel');
        this.savedSearchDropBoxDivId = uniqueId('savedsearchdropboxdiv');
        this.savedSearchDropBoxInputId = uniqueId('savedsearchdropboxinput');

        const savedSearchDiv = cell.appendChild(document.createElement('div'));
        savedSearchDiv.id = this.savedSearchSectionId;

        savedSearchDiv.innerHTML = '<label class="dropboxcontainer">saved search ' +
            '<input type="text" id="' + this.savedSearchDropBoxInputId + '" style="width: 24em;" placeholder="saved search"></label>';

        const savedSearchDropboxDiv = cell.appendChild(document.createElement('div'));
        savedSearchDropboxDiv.id = this.savedSearchDropBoxDivId;
    }

    this.searchTypeOptionsLabelId = uniqueId('searchtypelabel');
    this.searchTypeOptionsId = uniqueId('searchtype');

    this.gridResolutionElementId = uniqueId('gridresolution');
    this.gridResolutionLabelElementId = uniqueId('gridresolutionlabel');
    this.zoomModeElementId = uniqueId('zoommode');
    this.zoomModeLabelElementId = uniqueId('zoommodelabel');

    const zoomOptionsDiv = cell.appendChild(document.createElement('div'));
    zoomOptionsDiv.setAttribute('style', "margin: 4px 2px 3px 3px;");

    let zoomOptionsDivHTML = '<label id="' + this.zoomModeLabelElementId + '" class="gmap_only">zoom option <select id="' + this.zoomModeElementId + '">';

    for(let n in MapDataseriesConfiguration.ZOOM_PRECISION_OPTIONS) {
        if (MapDataseriesConfiguration.ZOOM_PRECISION_OPTIONS.hasOwnProperty(n)) {
            const option = MapDataseriesConfiguration.ZOOM_PRECISION_OPTIONS[n];
            zoomOptionsDivHTML += '<option value="' + option.value + '" title="' + escapeHTML(option.description) + '">' + option.label + '</option>';
        }
    }

    zoomOptionsDivHTML += '</select>';
    zoomOptionsDiv.innerHTML = zoomOptionsDivHTML;

    const gridLabelEl = cell.appendChild(document.createElement('label'));
    gridLabelEl.id = this.gridResolutionLabelElementId;

    gridLabelEl.innerHTML = 'grid size <select id="' + this.gridResolutionElementId + '"></select></label>';

    // data type (i.e. frequency/presence-absence etc)
    const dataTypeLabelEl = cell.appendChild(document.createElement('label'));
    dataTypeLabelEl.id = this.searchTypeOptionsLabelId;
    dataTypeLabelEl.appendChild(document.createTextNode('show'));
    const searchTypeOptionsEl = dataTypeLabelEl.appendChild(document.createElement('select'));
    searchTypeOptionsEl.id = this.searchTypeOptionsId;
    //dataTypeLabelEl.innerHTML = 'show<select id="' + this.searchTypeOptionsId + '"></select>';

    this.partitionMenuLabelId = uniqueId('partitionmenulabel');
    this.partitionMenuId = uniqueId('partitionmenu');

    // e.g. dateclass partitioning
    const dateClassLabelEl = cell.appendChild(document.createElement('label'));
    dateClassLabelEl.id = this.partitionMenuLabelId;

    dateClassLabelEl.appendChild(document.createTextNode('partition by'));

    const partitionMenuEl = dateClassLabelEl.appendChild(document.createElement('select'));
    partitionMenuEl.id = this.partitionMenuId;
    this.refresh_partition_type_menu(true);

    this.dateBoundaryTypeLabelId = uniqueId('dateboundarylabel');
    this.dateBoundaryTypeId = uniqueId('dateboundary');

    // need an option for earliest or latest date boundary
    const dateBoundaryLabelEl = cell.appendChild(document.createElement('label'));
    dateBoundaryLabelEl.id = this.dateBoundaryTypeLabelId;
    dateBoundaryLabelEl.innerHTML =
        '<select id="' + this.dateBoundaryTypeId + '">' +
        '<option value="e">earliest date</option>' +
        '<option value="l">latest date</option>' +
        '</select> (date boundary)';

    this.statusFilterMenuId = uniqueId('statusfiltermenu');
    this.statusFilterLabelId = uniqueId('statusfilterlabel');

    const statusFilterLabelEl = cell.appendChild(document.createElement('label'));
    statusFilterLabelEl.id = this.statusFilterLabelId;
    statusFilterLabelEl.style.display = 'block';

    // ie9 fails to pick up onContentReady on this.statusFilterMenuId
    // so create everything manually without innerHTML
    statusFilterLabelEl.appendChild(document.createTextNode('filter status using '));
    const statusMenu = statusFilterLabelEl.appendChild(document.createElement('select'));
    statusMenu.id = this.statusFilterMenuId;
    statusMenu.options[0] = new Option("Don\u2019t show status", '');
    statusMenu.options[1] = new Option("Atlas 2020 (work-in-progress)", MapDataseriesConfiguration.STATUS_FILTER_HECTAD);
    statusMenu.options[2] = new Option("Atlas 2000 status", MapDataseriesConfiguration.STATUS_FILTER_ATLAS2000);
    statusMenu.options[3] = new Option("Atlas 2020 status excluding data from squares assigned status in 2000 ", MapDataseriesConfiguration.STATUS_FILTER_POSTATLAS2000);
    statusMenu.options[4] = new Option("Atlas 2000 status excluding data for unstatused hectads", MapDataseriesConfiguration.STATUS_FILTER_ATLAS2000_STATUSED_ONLY);

    if (!(this.datasetIsPrimarySearchResult && this.controllerName === MapConfiguration.CONTROLLER_SAVEDSEARCH)) {
        // register delete click event handler
        this.domEventHandles.deleteClickHandle = registerBoundEventHandler(document.getElementById(this.deleteSeriesButtonId), 'click', this, function() {
            this.fireEvent('delete');
        });
    }

    if (!this.datasetIsPrimarySearchResult) {
        // register savedsearch dropbox
        this.savedSearchDropBox = new SavedSearchDropBox();
        this.savedSearchDropBox.build(this.savedSearchDropBoxInputId, this.savedSearchDropBoxDivId);
        this.savedSearchDropBox.register_select_event_handler(this, function(unused, args) {
            var data = args[2]; // object literal of data for the result
            this.savedSearchId = data.id;
            this.searchType = MapConfiguration.SEARCHTYPE_PRESENCE; // reset this back to a safe default

            if (MapConfiguration.savedSearchMetadataCache.hasOwnProperty(this.savedSearchId)) {
                this.use_saved_search_metadata(this.savedSearchId);
            } else {
                this.savedSearchMetadataReady = false;
                this.load_saved_search_metadata(this.savedSearchId);
                //this.fireEvent('changed'); // fire an intial change event even though don't yet have info on the new saved search
                // second change event will be fired once the descriptor has loaded
            }
        });
        this.savedSearchDropBox.register_failed_select_event_handler(this, function() {
            this.savedSearchId = null;
            console.log('saved search failed selection');
            this.fireEvent('changed');
        });
    }

    // register taxon dropbox
    this.taxonDropBox = new OfflineTaxonDropBox();
    this.taxonDropBox.autoCompleteConfig = YuiDropBox.forcedSelectionSendEmptyConfig;

    this.taxonDropBox.minimumRankSort = TaxonDropBox.GENUS_SORT_ORDER;
    this.taxonDropBox.skipJunk = true;
    this.taxonDropBox.requireExtantDDbRecords = true;
    this.taxonDropBox.refresh_query_options();

    this.taxonDropBox.build(this.taxonDropBoxInputId, this.taxonDropBoxDivId);
    this.taxonDropBox.register_select_event_handler(this,
        /**
         * @param unused
         * @param {Array} args
         * @this MapDataseriesConfiguration
         */
        function(unused, args) {
            var data = args[2]; // object literal of data for the result

            if (data.acceptedEntityId) {
                // taxon was a non-accepted synonym, use accepted name instead

                this.taxonEntityId = data.acceptedEntityId;
                this.taxonName = data.acceptedNameString;
                document.getElementById(this.taxonDropBoxInputId).value = data.acceptedNameString;
            } else {
                this.taxonEntityId = data.entityId;
                this.taxonName = data.name;
            }
            this.fireEvent('changed');
        }
    );

    this.taxonDropBox.register_failed_select_event_handler(this, /** @this MapDataseriesConfiguration */ function() {
        //console.log('failed taxon select');

        this.taxonEntityId = null;
        this.taxonName = '';

        this.fireEvent('changed');
    });

    this.domEventHandles.dropboxKeyHandler = registerDOMEventHandler(taxonInput, 'keypress', this, 'taxon_dropbox_key_handler');
};

/**
 * need to intercept return key presses which can spuriously pass to other elements
 * (notable firing the delete series button, even if hidden)
 *
 * @param {KeyboardEvent} event
 * @returns {boolean|void}
 */
MapDataseriesConfiguration.prototype.taxon_dropbox_key_handler = function (event) {

    if (event.keyCode === 13) {
        //console.log('intercepting return');
        return stop_event(event);
    }
};

/**
 *
 * @param {string} savedSearchId
 * @returns {undefined}
 */
MapDataseriesConfiguration.prototype.use_saved_search_metadata = function(savedSearchId) {
    if (this.savedSearchId === savedSearchId) {
        // only apply data if user hasn't meanwhile changed their mind and selected a different result set

        this.savedSearchMetadataReady = true; // have the meta data for the selected saved search

        this.apply_search_metadata(MapConfiguration.savedSearchMetadataCache[savedSearchId]);

        // apply before changed event so that form is initialised correctly
        //this.controllerInterface.refresh_expected_number_of_partitions_and_symbols(this);
        this.apply_configuration_options();

        //console.log('firing change event in use_saved_search_metadata');
        this.fireEvent('changed');
    }
};

/**
 * column contains a subdivision of the total frequency
 *
 * @type string
 */
MapDataseriesConfiguration.COLUMNTYPE_PARTITIONED_FREQ = 'pf';

/**
 * column contains a date class subdivision of the total frequency
 *
 * partition code of the form 'pfd' + dateclass number (single digit integer from 0)
 *
 * @type string
 */
MapDataseriesConfiguration.COLUMNTYPE_PARTITIONED_DATECLASS_FREQ = 'pfd';

MapDataseriesConfiguration.COLUMNTYPE_PARTITIONED_NUMERIC_DATA = 'pdn';

/**
 * frequency columns using the same units as the row total
 */
MapDataseriesConfiguration.COLUMNTYPE_TOTAL_FREQ = 'f';

/**
 * column is a group field label
 */
MapDataseriesConfiguration.COLUMNTYPE_GROUPING = 'g';

/**
 * see MapDataseriesConfiguration.precisions
 *
 * @type {number}
 */
MapDataseriesConfiguration.prototype.minGridsquarePrecisionLevel = 1; // hectad

/**
 * see MapDataseriesConfiguration.precisions
 *
 * @type {number}
 */
MapDataseriesConfiguration.prototype.maxGridsquarePrecisionLevel = 3; // monad

/**
 *
 * @returns {Array}
 */
MapDataseriesConfiguration.prototype.read_nonstandard_dateclass_columns = function() {
    //console.log('fetching custom date class columns');

    var dcCols = [];
    this.partitionLabels.datecustom = [];

    for (var n = 0, l = this.savedSearchColumnsDefinition.length; n < l; n++) {
        var column = this.savedSearchColumnsDefinition[n];

        if ((column.type === MapDataseriesConfiguration.COLUMNTYPE_PARTITIONED_FREQ || column.type === MapDataseriesConfiguration.COLUMNTYPE_PARTITIONED_DATECLASS_FREQ) &&
            column.subtype === 'dateclass') {

            // column.typeParam is a dateclass serial number (from 0)
            this.partitionLabels.datecustom[column.typeParam] = column.label;
            dcCols[column.typeParam] = column;
        }
    }

    this.numberOfCustomDateClasses = dcCols.length;

    return dcCols;
};

/**
 *
 * @param {Object} metadata
 * @param {boolean} metadata.customFieldsFlag
 * @param {boolean} metadata.customFieldsIncludeDateClassesFlag
 * @param {boolean} metadata.customDistinctGroupingFlag
 * @param {number} metadata.minGridsquarePrecisionLevel
 * @param {number} metadata.maxGridsquarePrecisionLevel
 * @param {Array<{type: string, subtype: string, typeParam: string}>} metadata.columnDefinitions
 * @param {?Object} metadata.attributes
 * @param {string} metadata.attributes.frequencyDateclassDivisionsType
 */
MapDataseriesConfiguration.prototype.apply_search_metadata = function(metadata) {
    this.savedSearchColumnsDefinition = metadata.columnDefinitions;
    this.savedSearchCustomFieldsFlag = metadata.customFieldsFlag;
    this.savedSearchDateClassFrequenciesFlag = metadata.customFieldsIncludeDateClassesFlag;

    //console.log('savedSearchDateClassFrequenciesFlag = ' + (this.savedSearchDateClassFrequenciesFlag ? 'true' : 'false'));

    if (this.savedSearchDateClassFrequenciesFlag &&
        ('attributes' in metadata) &&
        ('frequencyDateclassDivisionsType' in metadata.attributes)
    ) {

        this.savedSearchFrequencyDateclassDivisionsType = metadata.attributes.frequencyDateclassDivisionsType;
        if (this.savedSearchFrequencyDateclassDivisionsType === MapConfiguration.DATECLASS_DIVISION_TYPES.DATE_CUSTOM) {
            this.read_nonstandard_dateclass_columns();
        }
    } else {
        this.savedSearchFrequencyDateclassDivisionsType = MapConfiguration.DATECLASS_DIVISION_TYPES.DATECLASS;
    }

    this.minGridsquarePrecisionLevel = metadata.minGridsquarePrecisionLevel;
    this.maxGridsquarePrecisionLevel = metadata.maxGridsquarePrecisionLevel;

    if (metadata.customDistinctGroupingFlag) {
        if (this.searchType !== MapConfiguration.SEARCHTYPE_PRESENCE) {
            //console.log('Forcing fixed zoom for distinct custom search type during apply_search_metadata.');
            this.force_fixed_zoom();
        }
    }

    this.savedSearchNumericDataColumns = [];
    if (this.savedSearchCustomFieldsFlag) {
        // read available custom data columns
        //console.log(this.savedSearchColumnsDefinition);

        for (var columnNumber in this.savedSearchColumnsDefinition) {
            if (this.savedSearchColumnsDefinition.hasOwnProperty(columnNumber) &&
                (this.savedSearchColumnsDefinition[columnNumber].type === MapDataseriesConfiguration.COLUMNTYPE_PARTITIONED_FREQ ||
                    this.savedSearchColumnsDefinition[columnNumber].type === MapDataseriesConfiguration.COLUMNTYPE_PARTITIONED_NUMERIC_DATA))
            {
                //this.savedSearchNumericDataColumns.push(this.savedSearchColumnsDefinition[columnNumber]);
                this.savedSearchNumericDataColumns[columnNumber] = this.savedSearchColumnsDefinition[columnNumber];
            }
        }
    }
};

/**
 *
 * @param {string} savedSearchId
 */
MapDataseriesConfiguration.prototype.load_saved_search_metadata = function(savedSearchId) {
    var req = new XMLHttpRequest();
    this.req = req;

    get(req, BSBIDB_URL + 'savedsearchdescriptorJSON.php?savedsearchid=' + savedSearchId, {
        "200" : () => {
            MapConfiguration.savedSearchMetadataCache[savedSearchId] = debugged_json_parse(req.responseText);
            this.use_saved_search_metadata(savedSearchId);
        },
        defaultHandler : () => {
            console.log('unexpected response from load_saved_search_metadata');
        }
    }, 'text');
};



/**
 * if clear then the saved search descriptor associated with this series has not yet been loaded
 * (so e.g. the partition options menus etc will be unavailable)
 *
 * @type boolean
 */
MapDataseriesConfiguration.prototype.savedSearchMetadataReady = true;

/**
 *
 * @type string
 */
MapDataseriesConfiguration.prototype.savedSearchId = null;

/**
 * packed entity id
 *
 * @type {string}
 */
MapDataseriesConfiguration.prototype.taxonEntityId = null;

/**
 * packed id
 * used only in special-case applications (e.g. Kew MSB-only requests)
 *
 * @type {string}
 */
MapDataseriesConfiguration.prototype.dataSourceId = null;

/**
 *
 * @type {boolean}
 */
MapDataseriesConfiguration.prototype.includeDoNotMapped = false;

/**
 *
 * @type {string}
 */
MapDataseriesConfiguration.prototype.taxonName = '';

/**
 *
 * @type {Array<{
 * type: string,
 * subtype: string,
 * typeParam: string
 * }>}
 */
MapDataseriesConfiguration.prototype.savedSearchColumnsDefinition = null;

MapDataseriesConfiguration.prototype.savedSearchCustomFieldsFlag = null;
MapDataseriesConfiguration.prototype.savedSearchDateClassFrequenciesFlag = null;
