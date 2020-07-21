import {EventHarness} from "../framework/EventHarness";
import {deep_clone} from "../utils/deep_clone";
import {SVG} from "./SVG";
import {MapDataseriesStyle} from "./MapDataseriesStyle";
import {object_is_empty} from "../utils/object_is_empty";
import {logError} from "../utils/logError";
import {safeEncodeUriComponent} from "../utils/safeEncodeUriComponent";
import {MapControl} from "./MapControl";
import {MapConfiguration} from "./MapConfiguration";

export class MapStyle extends EventHarness {
    /**
     *
     * @type number
     */
    pageWidth;

    /**
     *
     * @type number
     */
    pageHeight;

    /**
     *
     * @type string
     */
    pageSizeUnits;

    /**
     * Map settings relating to presentational details
     * (see also MapConfiguration)
     *
     * @constructor
     */
    constructor() {
        super();

        /**
         *
         * @type {Array.<MapDataseriesStyle>}
         */
        this.series = [];

        this.vcLists = [];
        this.gisAreaIds = [];
        this.gisAreaNames = [];
        this.swRefs = [];
        this.neRefs = [];
        this.areaListTypes = [];
        this.areaListClipFlags = [];
        this.areaListBackgrounds = [];
        this.areaListLineWeights = [];
        this.areaListLineColours = [];

        this.pageWidth = MapControl.pageSizes[MapStyle.prototype.pageSize].width;
        this.pageHeight = MapControl.pageSizes[MapStyle.prototype.pageSize].height;
        this.pageSizeUnits = MapControl.pageSizes[MapStyle.prototype.pageSize].units;
    };
}

/**
 *
 * @type {Array.<MapDataseriesStyle>}
 */
MapStyle.prototype.series = null;

/**
 * index into MapStyleTemplates used to look-up default styles
 *
 * @type {number}
 */
MapStyle.prototype.templateNumber = 0;

/**
 * The following are the default style settings for different map types,
 * these are held separately so that the settings can be initialised and switched between when map type changes
 * while still remembering to some extent the previously chosen options
 */

MapStyle.prototype.statusMarkerStyles = {
    '-' : SVG.SYMBOLID.EX, // unknown status (MAPPING_STATUS_SPECIAL_UNKNOWN) => SVG::SYMBOL_EX
    'n' : SVG.SYMBOLID.FILLEDCIRCLE, // broad status native (TaxonStatus::BROAD_STATUS_NATIVE) => SVG::SYMBOL_FILLEDCIRCLE
    'a' : SVG.SYMBOLID.FILLEDDIAMOND, // broad status alien (TaxonStatus::BROAD_STATUS_ALIEN) => SVG::SYMBOL_FILLEDDIAMOND
    '?'	: SVG.SYMBOLID.OPENSQUARE, // mixed status (TaxonStatus::MAPPING_STATUS_SPECIAL_MIXED) => SVG::SYMBOL_OPENSQUARE'?'
    'c' : SVG.SYMBOLID.FILLEDUPTRIANGLE // casual (TaxonStatus::BROAD_STATUS_CASUAL) => SVG::SYMBOL_FILLEDUPTRIANGLE
};

/**
 * As dataset styling and labeling uses a numeric series, whereas status codes are alphabetic need to map
 * between the two
 *
 * @type {Array.<string>}
 */
MapStyle.numericToStatusMapping = [
    '-', //TaxonStatus::MAPPING_STATUS_SPECIAL_UNKNOWN,
    'n', //TaxonStatus::BROAD_STATUS_NATIVE,
    'a', //TaxonStatus::BROAD_STATUS_ALIEN,
    '?', //TaxonStatus::MAPPING_STATUS_SPECIAL_MIXED, // mixed status
    'c' //TaxonStatus::BROAD_STATUS_CASUAL
];

/**
 * default colours, keyed by series item number, numberOfPartitions and then by each individual partition
 * initialised by loaded style template settings
 *
 * @type Object
 */
MapStyle.prototype.partitionColours = [{
    1 : {
        0 : '00cc00'
    },
    2 : {
        0 : 'd2935b',
        1 : '051844'
    },
    8 : {
        0 : 'f4f6f3',
        1 : 'd7e5e9',
        2 : 'd3a6db',
        3 : 'd2935b',
        4 : '1caa28',
        5 : '051844',
        6 : 'ee0000', // @todo set sensible colours
        7 : '00ee00' // @todo set sensible colours
    }
}];

MapStyle.prototype.opacities = [0.7];

/**
 * default partition colours - initialised by loaded style style template settings
 *
 * @type Object
 */
MapStyle.prototype.partitionOpacities = [{
    1 : {
        0 : '0.7'
    },
    2 : {
        0 : '0.7',
        1 : '0.7'
    },
    8 : {
        0 : '0.7',
        1 : '0.7',
        2 : '0.7',
        3 : '0.7',
        4 : '0.7',
        5 : '0.7',
        6 : '0.7',
        7 : '0.7'
    }
}];

/**
 * default partition colours - initialised by loaded style template settings
 *
 * @type Object
 */
MapStyle.prototype.partitionMarkerStyles = [{
    1 : {
        0 : SVG.SYMBOLID.FILLEDSQUARE
    },
    2 : {
        0 : SVG.SYMBOLID.FILLEDSQUARE,
        1 : SVG.SYMBOLID.FILLEDSQUARE
    },
    8 : {
        0 : SVG.SYMBOLID.FILLEDSQUARE,
        1 : SVG.SYMBOLID.FILLEDSQUARE,
        2 : SVG.SYMBOLID.FILLEDSQUARE,
        3 : SVG.SYMBOLID.FILLEDSQUARE,
        4 : SVG.SYMBOLID.FILLEDSQUARE,
        5 : SVG.SYMBOLID.FILLEDSQUARE,
        6 : SVG.SYMBOLID.FILLEDSQUARE,
        7 : SVG.SYMBOLID.FILLEDSQUARE
    }
}];

/**
 * if set (default) then include Channel Islands on the map
 *
 * @type boolean
 */
MapStyle.prototype.mapci = true;

/**
 * default layout for the northern isles
 * see php GridsquareListController::NORTHERN_ISLES_
 *
 * default = '' (NORTHERN_ISLES_IN_SITU)
 *
 * @type string
 */
MapStyle.prototype.northernIslesFormat = '';

/*
MapStyle.prototype.vcLists = [];
MapStyle.prototype.gisAreaIds = [];
MapStyle.prototype.gisAreaNames = [];
MapStyle.prototype.swRefs = [];
MapStyle.prototype.neRefs = [];
MapStyle.prototype.areaListTypes = [];
MapStyle.prototype.areaListClipFlags = [];
MapStyle.prototype.areaListBackgrounds = [];
MapStyle.prototype.areaListLineWeights = [];
MapStyle.prototype.areaListLineColours = [];
*/

MapStyle.prototype.showcoast = true;
MapStyle.prototype.coastweight = 0.8;
MapStyle.prototype.coastcolour = '1919FF';

MapStyle.prototype.seaFlag = true;
MapStyle.prototype.seacolour = 'E6EFFF';
MapStyle.prototype.landcolour = 'FFFFFF';

MapStyle.prototype.autoGridFlag = true;

/**
 * is set then dispay county boarders as map backdrop
 * default false
 *
 * @type {boolean}
 */
MapStyle.prototype.countyBackdrop = false;

/**
 *
 * @type {Object}
 */
MapStyle.prototype.grid = {
    1 : false,
    2 : false,
    10 : false,
    100 : true
};

MapStyle.prototype.gridStyle = {
    1 : '1,1',
    2 : '',
    10 : '',
    100 : ''
};

MapStyle.prototype.gridColour = {
    1 : '808080',
    2 : '008000',
    10 : '808080',
    100 : '0000ff'
};

MapStyle.prototype.gridWeight = {
    1 : '0.1',
    2 : '0.2',
    10 : '0.25',
    100 : '0.5'
};

MapStyle.prototype.labelGrid = {
    1 : false,
    2 : false,
    10 : false,
    100 : false
};

MapStyle.prototype.titleFlag = true;

MapStyle.prototype.captionFlag = true;

/**
 *
 * @type string
 */
MapStyle.prototype.keypos = 'tr'; // default to top-right

/**
 *
 * @type string
 */
MapStyle.prototype.pageSize = 'a4';

/**
 * default is 0 (automatic)
 * otherwise value in metres 100, 1000, 2000, 10000
 *
 * @type number
 */
MapStyle.prototype.gisSimplicity = 0;

/**
 * page dpi (constrained coded string, default = '')
 *
 * @type string
 */
MapStyle.prototype.pageDpi = '';

MapStyle.prototype.pageBackground = 'sea';
MapStyle.prototype.pageFrame = false;
MapStyle.prototype.mapFrame = false;
MapStyle.prototype.paddingN = 0;
MapStyle.prototype.paddingE = 0;
MapStyle.prototype.paddingS = 0;
MapStyle.prototype.paddingW = 0;

MapStyle.prototype.showCopyright = true;

MapStyle.prototype.templateNumber = 0;

MapStyle.prototype.use_template = function(templateNumber) {
    this.templateNumber = templateNumber;
    this.load_template();

    for (var n in this.series) {
        if (this.series.hasOwnProperty(n)) {
            this.series[n].apply_style_defaults(this);
        }
    }
};

MapStyle.prototype.load_template = function() {
    if (!window.hasOwnProperty('MapStyleTemplates')) {
        logError('Map style templates have failed to load. (fake error)', '', 6514);
        //alert('The maps page has not loaded correctly, please try reloading the page.');
        MapControl.reload_warning('The maps page has not loaded correctly (map style templates have failed).');
        throw new Error('MapStyleTemplates failed to load.');
    }

    if (!MapStyleTemplates.hasOwnProperty(this.templateNumber) || !MapStyleTemplates[this.templateNumber]) {
        // this might happen if referring to a template that has been deleted, or perhaps one that belongs to another user
        // (e.g. after following a link to map set up by a different user)
        // @todo use default template number rather than template zero
        console.log('Failed to find template number ' + this.templateNumber + ', resetting to zero.');
        this.templateNumber = 0;
    }

    var template = MapStyleTemplates[this.templateNumber];

    // need to avoid odd mixtures of styles
    // as different templates may provide for a differing number of separate data series
    // so if any definition is present then reset the previous completely
    if (template.partitionColours) {
        this.partitionColours = [];
    }

    if (template.partitionMarkerStyles) {
        this.partitionMarkerStyles = [];
    }

    //if (template.partitionOpacities) {
    //	this.partitionOpacities = [];
    //}

    if (template.opacities) {
        this.opacities = [];
    }

    for (var key in template) {
        if (template.hasOwnProperty(key)) {

            if (typeof template[key] === 'object' && template[key] !== null) {
                // shallow clone
                for (var subkey in template[key]) {
                    if (template[key].hasOwnProperty(subkey) && template[key][subkey] !== null && (typeof template[key][subkey] !== 'undefined')) {
                        if (!(key in this)) {
                            this[key] = {};
                        }

                        this[key][subkey] = template[key][subkey];
                    }
                }
            } else {
                this[key] = template[key];
            }

        }
    }

    //console.log(this.partitionColours);
};

/**
 *
 * @param {Object} styleDescriptor untyped style descriptor object
 * @returns {*}
 */
MapStyle.prototype.diff_template = function(styleDescriptor) {
    var baseTemplate = MapStyleTemplates[this.templateNumber];

    // these three come from the base template, so don't need saving
    delete styleDescriptor.partitionColours;
    delete styleDescriptor.partitionMarkerStyles;
    delete styleDescriptor.partitionOpacities;

    // remove things that are the same as the MapStyle prototype but not in the template
    // e.g. pageHeight
    // these should all be simple variables rather than objects
    for(let key in styleDescriptor) {
        if (styleDescriptor.hasOwnProperty(key)) {
            if (!(key in baseTemplate) && (key in MapStyle.prototype) && (styleDescriptor[key] === MapStyle.prototype[key])) {
                delete styleDescriptor[key];
            }
        }
    }

    MapStyle._remove_matching_keys(styleDescriptor, baseTemplate);

    for (let n in this.series) {
        // remove anything in the series that matches the prototype default
        if (styleDescriptor.series[n] && styleDescriptor.series.hasOwnProperty(n)) {
            for (let key in styleDescriptor.series[n]) {
                if (styleDescriptor.series[n].hasOwnProperty(key) &&
                    key in MapDataseriesStyle.prototype &&
                    styleDescriptor.series[n][key] === MapDataseriesStyle.prototype[key]
                ) {
                    delete styleDescriptor.series[n][key];
                }
            }
        }

        if (this.series.hasOwnProperty(n)) {
            this.series[n].filter_defaults(this, styleDescriptor.series[n]);

            if (object_is_empty(styleDescriptor.series[n])) {
                delete styleDescriptor.series[n];
            }
        }
    }

    if (object_is_empty(styleDescriptor.series)) {
        delete styleDescriptor.series;
    }

    if ('templateNumber' in styleDescriptor && styleDescriptor.templateNumber === '0') {
        // template number as a string may not be matched against the prototype default by the filters above
        delete styleDescriptor.templateNumber;
    }

    if (this.templateNumber && this.templateNumber !== '0' && this.templateNumber !== 0) {
        // only set if > 0
        styleDescriptor.templateNumber = this.templateNumber;
    }
    return styleDescriptor;
};

/**
 * in-situ modification of newVersion removing any key with values matching baseVersion
 *
 * @param {object} newVersion
 * @param {object} baseVersion
 * @returns {object} newVersion
 */
MapStyle._remove_matching_keys = function(newVersion, baseVersion) {
    for(var key in newVersion) {
        if (newVersion.hasOwnProperty(key)) {
            if (key in baseVersion) {
                if (newVersion[key] === null) {
                    // typeof null is 'object'
                    if (baseVersion[key] === null) {
                        delete newVersion[key];
                    }
                } else if (typeof(newVersion[key]) === 'object') {
                    MapStyle._remove_matching_keys(newVersion[key], baseVersion[key]);

                    if (object_is_empty(newVersion[key])) {
                        // all the children are dead :(
                        delete newVersion[key];
                        //console.log('deleted for absent children key: ' + key);
                    }// else {
                    //	console.log(key + 'not empty');
                    //	console.log(newVersion[key]);
                    //}
                } else if (newVersion[key] === baseVersion[key]) {
                    delete newVersion[key];
                    //console.log('deleted key: ' + key);
                }
            } else {
                if (typeof(newVersion[key]) === 'object' && object_is_empty(newVersion[key])) {
                    delete newVersion[key];
                    //console.log('deleted for emptyness key: ' + key);
                }
            }
        }
    }

    return newVersion;
};

/**
 *
 * @param {string=} name
 * @returns {object}
 */
MapStyle.prototype.save_template = function(name) {
    if (name) {
        name = name.trim();
    }

    var template = {};

    for(var key in this) {
        if (this.hasOwnProperty(key) && typeof(this[key]) !== 'function'
            && key !== 'eventListeners'
            && key !== 'description'
        ) {
            if (key === 'series') {
                template.series = [];

                for (var n in this.series) {
                    if (this.series.hasOwnProperty(n)) {
                        var series = this.series[n];

                        template.series[n] = {
                            markers : deep_clone(series.markers),
                            opacity : deep_clone(series.opacity),
                            partitions : deep_clone(series.partitions),
                            freqMarkerStyle : series.freqMarkerStyle,
                            //frequencyContinuousKeyScale: series.frequencyContinuousKeyScale,
                            //frequencyMaxScaleManual : series.frequencyMaxScaleManual,
                            //frequencyMinScaleManual : series.frequencyMinScaleManual,
                            frequencyStyle : series.frequencyStyle,
                            //frequencyVarySize : series.frequencyVarySize,
                            seriesNumber : this.series[n].seriesNumber
                        };

                        if (series.frequencyContinuousKeyScale === !!series.frequencyContinuousKeyScale) {
                            template.series[n].frequencyContinuousKeyScale = series.frequencyContinuousKeyScale;
                        }
                        if (series.frequencyMaxScaleManual === !!series.frequencyMaxScaleManual) {
                            template.series[n].frequencyMaxScaleManual = series.frequencyMaxScaleManual;

                            if (series.frequencyMaxScaleManual) {
                                template.series[n].frequencyMaxScale = series.frequencyMaxScale;
                            }
                        }
                        if (series.frequencyMinScaleManual === !!series.frequencyMinScaleManual) {
                            template.series[n].frequencyMinScaleManual = series.frequencyMinScaleManual;

                            if (series.frequencyMinScaleManual) {
                                template.series[n].frequencyMinScale = series.frequencyMinScale;
                            }
                        }
                        if (series.frequencyVarySize === !!series.frequencyVarySize) {
                            template.series[n].frequencyVarySize = series.frequencyVarySize;
                        }
                    }
                }
            } else {
                template[key] = deep_clone(this[key]); // deep clone
            }
        }
    }

    if (name || name === '0') {
        template.name = name;
    }

    //console.log('template =');
    //console.log(template);

    return template;
};

/**
 *
 * @param {MapDataseriesStyle} series
 */
MapStyle.prototype.add_series = function(series) {
    this.series[series.seriesNumber] = series;

    this.fireEvent('addedseries', series.seriesNumber);
};

/**
 *
 * @param {MapControl} mapControl
 * @returns {Object}
 */
MapStyle.prototype.build_url = function (mapControl) {
    var params = {}, dataSeriesParams = [], pageSizeParams = {};

    var mapConfiguration = mapControl.mapConfiguration;

    params.mapcountry = mapConfiguration.country;

    if (mapConfiguration.country === 'gbie') {
        if (!this.mapci) {
            params.mapci = 0; // only include param if CI are to be hidden (default is show)
        }

        if (this.northernIslesFormat) {
            params.scon = this.northernIslesFormat;
        }
    }

    if (this.countyBackdrop) {
        params.vcbg = '1';
    }

    if (this.areaListTypes.length > 0) {
        params.mapareatypes = this.areaListTypes;
        params.mapareaclip = this.areaListClipFlags;
        params.mapareabg = this.areaListBackgrounds;
        params.maparealine = this.areaListLineWeights;
        params.mapareafg = this.areaListLineColours;
    }

    if (this.vcLists.length > 0) {
        params.mapvcs = this.vcLists;
    }

    if (this.gisAreaIds.length > 0) {
        params.mapgisids = this.gisAreaIds;
        //params.mapgisnames = this.gisAreaNames;
    }

    if (this.swRefs.length > 0) {
        params.mapswrefs = this.swRefs;
        params.mapnerefs = this.neRefs;
    }

    if (this.showcoast) {
        params.showcoast = '1';

        params.coastweight = this.coastweight;
        params.coastcolour = this.coastcolour;
    } else {
        params.showcoast = '0';
    }

    if (this.seaFlag) {
        params.seacolour = this.seacolour;
        params.landcolour = this.landcolour;
    } else {
        params.seacolour = params.landcolour = '';
    }

    if (this.autoGridFlag) {
        params.autogrid = '1';
    }

    params.gridline = [];
    params.gridcolour = [];
    params.gridweight = [];
    params.gridstyle = [];
    params.gridlabel = [];

    for (var i = MapControl.gridIntervals.length; i--;) {
        var interval = MapControl.gridIntervals[i];

        if (this.grid[interval] ) {
            params.gridline[interval] = '1';
        }

        if (this.grid[interval] || this.autoGridFlag) {
            params.gridcolour[interval] = this.gridColour[interval];
            params.gridweight[interval] = this.gridWeight[interval];
            params.gridstyle[interval] = this.gridStyle[interval];

            if (this.labelGrid[interval]) {
                params.gridlabel[interval] = '1';
            }
        } else {
            params.gridline[interval] = '0';
        }
    }

    params.keypos = this.keypos;
    if (this.titleFlag && mapConfiguration.titleValue !== '') {
        params.title = mapConfiguration.titleValue;
    }

    if (this.captionFlag && mapConfiguration.captionValue !== '') {
        // caption length will already have been constrained to at most ~ 100 chars
        params.caption = mapConfiguration.captionValue;
    }

    if (!this.showCopyright) {
        params.cpyrt = '0'; // shown by default, so only include param if hiding
    }

    var numberOfValidDataseries = 0;

    let seriesConfig;
    for (let series in mapConfiguration.series) {
        if (mapConfiguration.series.hasOwnProperty(series) && mapConfiguration.series[series].has_content()) {
            numberOfValidDataseries++;

            seriesConfig = mapConfiguration.series[series];
            let seriesStyles = this.series[series];

            dataSeriesParams[series] = {};
            dataSeriesParams[series].ctl = seriesConfig.controllerName;
            dataSeriesParams[series].searchtype = seriesConfig.searchType;

            dataSeriesParams[series].grid = seriesConfig.gridResolution;

            dataSeriesParams[series].dl = seriesConfig.get_series_label();

            seriesConfig.controllerInterface.read_series_url_params(dataSeriesParams[series], seriesConfig);

            if (seriesConfig.searchType === MapConfiguration.SEARCHTYPE_PRESENCE) {
                dataSeriesParams[series].parttype = seriesConfig.partitionType;

                if ((!seriesConfig.savedSearchCustomFieldsFlag || seriesConfig.savedSearchDateClassFrequenciesFlag) &&
                    (seriesConfig.partitionType !== '' ||
                        seriesConfig.dateBoundary !== MapConfiguration.EARLIEST_DATE))
                {
                    dataSeriesParams[series].dateboundary = seriesConfig.dateBoundary;
                    dataSeriesParams[series].partcode = '*'; // kludge to get all partitions (otherwise no data is shown)
                }
            }

            if ((
                (seriesConfig.controllerName === MapConfiguration.CONTROLLER_SAVEDSEARCH && seriesConfig.searchType === MapConfiguration.SEARCHTYPE_PRESENCE) ||
                seriesConfig.controllerName === MapConfiguration.CONTROLLER_TAXONMAP
            ) && (seriesConfig.statusFilter !== '')) {

                dataSeriesParams[series].statusfilter = seriesConfig.statusFilter;
            } else if (seriesConfig.controllerName === MapConfiguration.CONTROLLER_TAXONSTATUS) {
                dataSeriesParams[series].statusscheme = seriesConfig.statusSchemeId;
            }

            // flag indicates whether using markers to show status
            var statusFilteringFlag = (
                ((
                        (seriesConfig.controllerName === MapConfiguration.CONTROLLER_SAVEDSEARCH && seriesConfig.searchType === MapConfiguration.SEARCHTYPE_PRESENCE) ||
                        seriesConfig.controllerName === MapConfiguration.CONTROLLER_TAXONMAP
                    ) && (seriesConfig.statusFilter !== '')
                )
                ||
                ( seriesConfig.controllerName === MapConfiguration.CONTROLLER_TAXONSTATUS )
            );

            if (seriesConfig.frequencyResultsFlag) {
                dataSeriesParams[series].fs = seriesStyles.frequencyStyle;
                dataSeriesParams[series].fv = seriesStyles.frequencyVarySize ? '1' : '0';
                dataSeriesParams[series].fcont = seriesStyles.frequencyContinuousKeyScale ? '1' : '0';

                if (seriesStyles.frequencyMinScaleManual) {
                    // if checked then *not* auto - use the user-specified value
                    dataSeriesParams[series].fmin = seriesStyles.frequencyMinScale;
                }

                if (seriesStyles.frequencyMaxScaleManual) {
                    // if checked then *not* auto - use the user-specified value
                    dataSeriesParams[series].fmax = seriesStyles.frequencyMaxScale;
                }

                dataSeriesParams[series].fmk = seriesStyles.freqMarkerStyle;
            } else {
                if (seriesConfig.numberOfPartitions > 1) {
                    dataSeriesParams[series].rev = parseInt(seriesConfig.stackOrder, 10) ? '1' : '0';
                }
                dataSeriesParams[series].sup = seriesStyles.superimpose ? '1' : '0';

                var p = '0';

                dataSeriesParams[series].opacity = seriesStyles.opacity;

                dataSeriesParams[series].pm = [];
                dataSeriesParams[series].pc = [];
                dataSeriesParams[series].hp = [];
                dataSeriesParams[series].pl = [];

                for (var n = 0; n < seriesConfig.numberOfPartitions; n++) {
                    if (p in seriesStyles.partitions[seriesConfig.partitionType] &&
                        seriesStyles.partitions[seriesConfig.partitionType].hasOwnProperty(p))
                    {
                        if (!statusFilteringFlag) {
                            // partition markers rather than status markers
                            dataSeriesParams[series].pm[p] = seriesStyles.partitions[seriesConfig.partitionType][p].marker;
                        }
                        dataSeriesParams[series].pc[p] = seriesStyles.partitions[seriesConfig.partitionType][p].colour;
                        dataSeriesParams[series].hp[p] = seriesStyles.partitions[seriesConfig.partitionType][p].hidden ? '1' : '0';

                        if (seriesConfig.partitionLabels[seriesConfig.partitionType][p] !== '') {
                            dataSeriesParams[series].pl[p] = seriesConfig.partitionLabels[seriesConfig.partitionType][p];
                        }

                    }
                    p = n + 1;
                }

                if (statusFilteringFlag) {
                    // markers used for status symbols
                    // export only the marker style

                    dataSeriesParams[series].dm = [];

                    n = 0;
                    for (var m in seriesStyles.markers) {
                        if (seriesStyles.markers.hasOwnProperty(m)) {
                            dataSeriesParams[series].dm[n++] = seriesStyles.markers[m];
                        }
                    }
                }
            }
        }
    }

    if (mapConfiguration.groupFilterString !== '' && seriesConfig.controllerName === MapConfiguration.CONTROLLER_SAVEDSEARCH) {
        params.gpfilter = mapConfiguration.groupFilterString;
    }

    pageSizeParams.pgsel = this.pageSize;

    if (this.pageSize !== 'uc') {
        pageSizeParams.pgw = this.pageWidth;
        pageSizeParams.pgh = this.pageHeight;
        pageSizeParams.pgunits = this.pageSizeUnits;
    }

    if (this.gisSimplicity) {
        pageSizeParams.simpl = this.gisSimplicity;
    }

    if (this.pageDpi) {
        pageSizeParams.dpi = this.pageDpi;
    }

    if (this.pageBackground) {
        pageSizeParams.pgbg = this.pageBackground;
    }

    if (this.pageFrame) {
        pageSizeParams.pgframe = '1';
    }

    if (this.mapFrame) {
        pageSizeParams.mapframe = '1';
    }

    if (this.paddingN) {
        pageSizeParams.padn = this.paddingN;
    }
    if (this.paddingE) {
        pageSizeParams.pade = this.paddingE;
    }
    if (this.paddingS) {
        pageSizeParams.pads = this.paddingS;
    }
    if (this.paddingW) {
        pageSizeParams.padw = this.paddingW;
    }

    let dataSeriesParamsString;
    if (numberOfValidDataseries === 1) {
        dataSeriesParamsString = MapStyle._buildString(dataSeriesParams[0], '');
    } else if (numberOfValidDataseries > 1) {
        dataSeriesParamsString = '&ctl=co'; // multiple series so use combination controller as master

        for(let series in dataSeriesParams) {
            if (dataSeriesParams.hasOwnProperty(series)) {
                dataSeriesParams[series]['subctl'] = dataSeriesParams[series]['ctl'];
                delete dataSeriesParams[series]['ctl'];

                dataSeriesParamsString += MapStyle._buildString(dataSeriesParams[series], '[' + series + ']');
            }
        }
    } else {
        // no valid data to plot
        dataSeriesParamsString = '&ctl=dm'; // 'safe' fallback for an empty map with nothing to plot
    }

    return {
        mapParams : MapStyle._buildString(params) + dataSeriesParamsString,
        pageParams : MapStyle._buildString(pageSizeParams),
        dataSeriesObj : dataSeriesParams,
        pageParamsObj : pageSizeParams,
        styleParamsObj : params
    };
};

/**
 *
 * @param {Array} params
 * @param {string=} keySuffix
 * @returns {string}
 */
MapStyle._buildString = function(params, keySuffix) {
    var paramString = '';

    if (!keySuffix) {
        keySuffix = '';
    }

    for (var key in params) {
        if (Array.isArray(params[key])) {
            for (var n in params[key]) {
                if (params[key].hasOwnProperty(n)) {
                    paramString += '&' + key + keySuffix + '[' + n + ']=' + safeEncodeUriComponent(params[key][n]);
                }
            }
        } else {
            paramString += '&' + key + keySuffix + '=' + safeEncodeUriComponent(params[key]);
        }
    }

    return paramString;
};
