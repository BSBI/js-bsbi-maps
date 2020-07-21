import {EventHarness} from "../framework/EventHarness";
import {MapControl} from "./MapControl";

/**
 * Configuration options related to the map data source
 * (i.e. data-related rather than presentational)
 *
 */
export class MapConfiguration extends EventHarness {
    /**
     * see MapConfiguration.PARTITION_TYPE
     * @type {string}
     */
    partitionType;

    constructor() {
        super();

        this.defaultPartitionLabels = [];

        /**
         * container for data-series specific configuration
         *
         * @type {Array.<MapDataseriesConfiguration>}
         */
        this.series = [];
    };
}

MapConfiguration.SEARCHTYPE_RECORD_FREQ = 'f';
MapConfiguration.SEARCHTYPE_PRESENCE = 'p';
MapConfiguration.SEARCHTYPE_TAXON_FREQ = 't';
MapConfiguration.SEARCHTYPE_SPECIES_FREQ = 's';
MapConfiguration.SEARCHTYPE_OTHER = 'o';

MapConfiguration.EARLIEST_DATE = 'e';
MapConfiguration.LATEST_DATE = 'l';
MapConfiguration.RANGE_DATE = 'r';

/**
 * if set then allow users to click through to underlying data
 *
 * @type {boolean}
 */
MapConfiguration.prototype.allowClickThrough = true;

MapConfiguration.prototype.showCopyrightOption = false;

//MapConfiguration.prototype.defaultPartitionLabels = [];

MapConfiguration.PARTITION_TYPE = {
    DATECLASS : 'dateclass',
    DATE_BOUNDARY_1930 : 'date1930',
    DATE_BOUNDARY_1950 : 'date1950',
    DATE_BOUNDARY_1970 : 'date1970',
    DATE_BOUNDARY_1987 : 'date1987',
    DATE_BOUNDARY_2000 : 'date2000',
    DATE_BOUNDARY_2010 : 'date2010',
    DATE_BOUNDARY_2020 : 'date2020',
    DATE_CUSTOM : 'datecustom',
    OTHER : 'other',
    UNPARTITIONED : ''
};

MapConfiguration.DATECLASS_DIVISION_TYPES = {
    DATECLASS : 'bsbi',
    DATE_CUSTOM : 'custom'
};

/**
 *
 * @type {string}
 */
MapConfiguration.prototype.defaultPartitionType = MapConfiguration.PARTITION_TYPE.UNPARTITIONED;

/**
 * packed id or ''
 *
 * @type String
 */
MapConfiguration.prototype.dataSourceId = '';

/**
 *
 * @type {boolean}
 */
MapConfiguration.prototype.includeDoNotMapped = false;

/**
 *
 * @type {{"": number, date2020: number, date2010: number, other: number, dateclass: number, date1970: number, date2000: number, date1950: number, date1930: number, datecustom: number, date1987: number}}
 */
MapConfiguration.NUMBER_OF_PARTITIONS = {
    'dateclass' : 8,
    'date1930' : 2,
    'date1950' : 2,
    'date1970' : 2,
    'date1987' : 2,
    'date2000' : 2,
    'date2010' : 2,
    'date2020' : 2,
    'other' : 1,
    '' : 1,
    'datecustom' : 8 // placeholder with excess partitions to fill in styles (not all of which may be used)
};

/**
 * lat lng centroid (as comma-delimited string)
 * @type {string}
 */
MapConfiguration.prototype.centroid = '';

/**
 * array of markers to be shown on google map
 * see GMap.set_markers()
 *
 * @type {Array.<{gridref : GridRefGB|GridRefIE|GridRefCI}>}
 */
MapConfiguration.prototype.markers = null;

/**
 * if set then used as google maps zoom level
 *
 * @type {number|null}
 */
MapConfiguration.prototype.zoom = null;

MapConfiguration.AREA_TYPE_VC = 'vc';

/**
 * single grid-square or gridref-delimited ares
 *
 * @type string
 */
MapConfiguration.AREA_TYPE_GRIDSQUARE = 'gr';

MapConfiguration.PARTITION_DATES = {
    dateclass : [
        {type: MapConfiguration.LATEST_DATE, to : 1929},
        {type: MapConfiguration.RANGE_DATE, from : 1930, to : 1949},
        {type: MapConfiguration.RANGE_DATE, from : 1950, to : 1969},
        {type: MapConfiguration.RANGE_DATE, from : 1970, to : 1986},
        {type: MapConfiguration.RANGE_DATE, from : 1987, to : 1999},
        {type: MapConfiguration.RANGE_DATE, from : 2000, to : 2009},
        {type: MapConfiguration.RANGE_DATE, from : 2010, to : 2019},
        {type: MapConfiguration.EARLIEST_DATE, from : 2020}
    ],
    date1930 :	[{type: MapConfiguration.LATEST_DATE, to : 1929}, {type: MapConfiguration.EARLIEST_DATE, from : 1930}],
    date1950 :	[{type: MapConfiguration.LATEST_DATE, to : 1949}, {type: MapConfiguration.EARLIEST_DATE, from : 1950}],
    date1970 :	[{type: MapConfiguration.LATEST_DATE, to : 1969}, {type: MapConfiguration.EARLIEST_DATE, from : 1970}],
    date1987 :	[{type: MapConfiguration.LATEST_DATE, to : 1986}, {type: MapConfiguration.EARLIEST_DATE, from : 1987}],
    date2000 :	[{type: MapConfiguration.LATEST_DATE, to : 1999}, {type: MapConfiguration.EARLIEST_DATE, from : 2000}],
    date2010 :	[{type: MapConfiguration.LATEST_DATE, to : 2009}, {type: MapConfiguration.EARLIEST_DATE, from : 2010}],
    date2020 :	[{type: MapConfiguration.LATEST_DATE, to : 2019}, {type: MapConfiguration.EARLIEST_DATE, from : 2020}],
    'other' : null,
    '' : null
};

MapConfiguration.prototype.dateClassLabels = {
    0 : 'pre-1930',
    1 : '1930 - 1949',
    2 : '1950 - 1969',
    3 : '1970 - 1986',
    4 : '1987 - 1999',
    5 : '2000 - 2009',
    6 : '2010 - 2019',
    7 : '2020 onwards'
};

MapConfiguration.frequencySearchTypes = [
    MapConfiguration.SEARCHTYPE_RECORD_FREQ,
    MapConfiguration.SEARCHTYPE_TAXON_FREQ,
    MapConfiguration.SEARCHTYPE_SPECIES_FREQ,
    MapConfiguration.SEARCHTYPE_OTHER // used for partitioned frequency results (i.e. where the partitioning is part of the base search)
];

MapConfiguration.CONTROLLER_SAVEDSEARCH = 'ss';
MapConfiguration.CONTROLLER_ALLHECTADS = 'ah';
MapConfiguration.CONTROLLER_TAXONMAP = 'dm';
MapConfiguration.CONTROLLER_TAXONSTATUS = 'st';
MapConfiguration.CONTROLLER_COMBINATION = 'co';

/**
 * container for data-series specific configuration
 *
 * @type {Array.<MapDataseriesConfiguration>}
 */
MapConfiguration.prototype.series = null;

/**
 * if set then can add saved search derrived data series to map, otherwise only
 * taxon distribution types are allowed
 * (default true)
 *
 * @type boolean
 */
MapConfiguration.prototype.allowSavedSearchDataSeries = true;

/**
 * if set then display BSBI logo on google map views
 * (default true, turned off for DDb search result views)
 *
 * @type boolean
 */
MapConfiguration.prototype.bsbiWatermark = true;

/**
 * if set then display BSBI copyright message on google map views
 * (default true, turned off for gridref picker views)
 *
 * @type boolean
 */
MapConfiguration.prototype.bsbiGmapCopyright = true;

/**
 * cached search descriptors (not the full data)
 * keyed by savedSearchId
 *
 * @type Object
 */
MapConfiguration.savedSearchMetadataCache = {};

/**
 *
 * @param {MapDataseriesConfiguration} series
 * @returns {undefined}
 */
//MapConfiguration.prototype.initialize_series = function (series) {
//	this.series.push(series);
//};

/**
 *
 * @type string
 */
MapConfiguration.prototype.baseId = '';

MapConfiguration.prototype.country = 'gbie';

MapConfiguration.prototype.numberOfStatusMarkerStyles = 5;

/**
 * maximum permitted precision (integer)
 *
 * @type number
 */
MapConfiguration.prototype.maximumPrecision = 2000;

/**
 * if set then display a menu option to pick additional saved searches to display
 *
 * @type boolean
 */
MapConfiguration.prototype.showIncludeSavedSearchesOption = false;

/**
 * if set then display a menu option to pick additional saved searches to display
 *
 * @type boolean
 */
//MapConfiguration.prototype.showGroupFilterOption = false;

/**
 * if set the show option for status source
 * (i.e. Atlas or current hectad status)
 *
 * @type boolean
 */
//MapConfiguration.prototype.showStatusFilterOption = false;

/**
 *
 * @type string
 */
MapConfiguration.prototype.groupFilterString = '';

/**
 * for frequency search results this is 'frequency', 'presence/absence' and sub-column specific options (as absolute freq or % of total)
 *
 * for full-data search results this is presence/absence, number of records/taxa/species
 *
 * changing this requires a refresh of the cached data (unless switch is to/from presence only)
 *
 * @type {Array.<{key: string, label: string}>}
 */
//MapConfiguration.prototype.searchTypeOptions = [
//	{key: 'o', label: 'frequency'},
//	{key: 'p', label: 'presence/absence'}
//];

MapConfiguration.prototype.partitionByOptions = [
];

/**
 *
 * @type string
 */
MapConfiguration.prototype.titleValue = '';

/**
 *
 * @type string
 */
MapConfiguration.prototype.captionValue = '';

MapConfiguration.prototype.numberOfDatasets = 1;

/**
 * when combining multiple result sets
 * this controls whether sets are displayed as separate partitions or
 * distinguished using marker styles
 * if a component dataset shows frequencies or is already partitioned then must use marker styles
 */
//MapConfiguration.prototype.combineResultsAsPartitions = false;

/**
 * numberOfMarkerStyles indicates the number of status symbols in use
 * (i.e. distinct symbol styles - with no colour information)
 *
 * @type number
 */
//MapConfiguration.prototype.numberOfMarkerStyles = null;


/**
 *
 * array of combined search objects consisting of:
 * {
 *	controller: controller code
 *	title: name of saved search or taxon name
 *	gridUnit: null or applicable grid unit (where null means same-as-main-search)
 *
 *	// controller specific options
 *	savedsearchId: id
 *	taxonEntityId: id (applicable to status map or cached taxon disty map)
 * }
 *
 * @type Object[]
 */
//MapConfiguration.prototype.combinedSearches = [];

MapConfiguration.prototype.showGoogleMap = true;

MapConfiguration.prototype.showStaticMap = true;

/**
 * if false then legend button is *never* shown
 * default, true, allows legend button to shown if relevant
 *
 * @type boolean
 */
MapConfiguration.prototype.allowLegendButon = true;

/**
 * if set (default true) then show an info panel when clicks on the map land on valid grid squares
 * affects registration of an event listener for GMap.EVENT_GRIDDED_MAP_CLICK events
 *
 * @type boolean
 */
MapConfiguration.prototype.allowMapDataInfoPanel = true;

/**
 * if set (default true) then show map controls (taxon selection, formatting etc)
 * FALSE for the gridref picker map
 *
 * @type boolean
 */
MapConfiguration.prototype.allowMapControls = true;

/**
 * if set (default true) then include 'historic maps' (from NLS)
 *
 * @type boolean
 */
MapConfiguration.prototype.allowHistoricMaps = true;

/**
 * css string with units
 *
 * @type string
 */
MapConfiguration.prototype.gmapCanvasWidth = '100%';

/**
 * css string with units
 *
 * @type string
 */
MapConfiguration.prototype.gmapCanvasHeight = '90vh'; //92vh 800px';

MapConfiguration.prototype.gmapTileSize = 256;

/**
 *
 * @param n
 * @returns {string}
 */
MapConfiguration.prototype.get_default_series_label = function(n) {
    switch (this.partitionType) {
        case MapConfiguration.PARTITION_TYPE.DATECLASS:
            return this.dateClassLabels[n];
        case MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_1930:
            return n ? 'pre-1930' : '1930 onwards';
        case MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_1950:
            return n ? 'pre-1950' : '1950 onwards';
        case MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_1970:
            return n ? 'pre-1970' : '1970 onwards';
        case MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_1987:
            return n ? 'pre-1987' : '1987 onwards';
        case MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_2000:
            return n ? 'pre-2000' : '2000 onwards';
        case MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_2010:
            return n ? 'pre-2010' : '2010 onwards';
        case MapConfiguration.PARTITION_TYPE.DATE_BOUNDARY_2020:
            return n ? 'pre-2020' : '2020 onwards';
        case MapConfiguration.PARTITION_TYPE.DATE_CUSTOM:
            console.log('get_default_series_label custom dates');
            //@todo check if calling get_default_series_label for PARTITION_TYPE.DATE_CUSTOM is a bug
            return '';

        default:
            return '';
    }
};

/**
 * returns a generated page title, based on the current map content
 *
 * @returns {string}
 */
MapConfiguration.prototype.get_page_title = function() {

    // don't bother with page titles unless using a modern browser
    // as titling is mostly done for SEO purposes
    if (Object.values) {
        var series = Object.values(this.series); // renumber

        if (1 === series.length) {
            // have simple case with single data series

            var singleSeries = series[0];

            if (singleSeries.controllerName === MapConfiguration.CONTROLLER_TAXONMAP && singleSeries.taxonName) {
                // have a taxon map controller and taxon name has been set

                return MapControl.pageTitlePrefix + singleSeries.taxonName + MapControl.pageTitleSuffix;
            }
        }
    }

    return MapControl.defaultPageTitle; // placeholder title
};

MapConfiguration.prototype.add_params_to_hash = function(hashState) {
    if (this.country !== MapConfiguration.prototype.country) {
        // not default
        hashState.add_param('country', this.country);
    }

    if (this.titleValue !== MapConfiguration.prototype.titleValue) {
        // not default
        hashState.add_param('titleValue', this.titleValue);
    }

    if (this.captionValue !== MapConfiguration.prototype.captionValue) {
        // not default
        hashState.add_param('captionValue', this.captionValue);
    }
};
