import {EventHarness} from "../framework/EventHarness";
import {object_is_empty} from "../utils/object_is_empty";
import {get_input_colour, initialise_input_colour, set_input_colour} from "../utils/colour_support";
import {uniqueId} from "../utils/uniqueId";
import {StoppedGradientColourScheme} from "./StoppedGradientColourScheme";
import {coloured_css_gradient} from "../utils/coloured_css_gradient";
import {ConstantColourScheme} from "./ConstantColourScheme";
import {MapStyle} from "./MapStyle";
import {selectOption} from "../utils/selectOption";
import {MapConfiguration} from "./MapConfiguration";
import {SVG} from "./SVG";
import {escapeHTML} from "../utils/escapeHTML";

export class MapDataseriesStyle extends EventHarness {

    /**
     * Groups the dataseries-specific presentational details
     *
     * @param {MapStyle} mapStyle
     * @constructor
     */
    constructor(mapStyle) {
        super();
        this.seriesNumber = mapStyle.series.length;
        this.itemNumber = Object.keys(mapStyle.series).length;

        //this.apply_style_defaults(mapStyle, itemNumber);
        this.apply_style_defaults(mapStyle);
    }
}

/**
 * polychrome (spectral) gradient
 */
MapDataseriesStyle.FREQUENCY_STYLE_HEATMAP = 'h';

/*
 * monochromatic gradient
 */
MapDataseriesStyle.FREQUENCY_STYLE_SIMPLE_GRADIENT = 'c';

/*
 * single colour (ignore frequency)
 */
MapDataseriesStyle.FREQUENCY_STYLE_CONSTANTCOLOUR = 's';

MapDataseriesStyle.prototype.frequencyContinuousKeyScale = true;

/**
 * partitions are keyed primarily by partition type
 * so that each partitioning scheme can separately keep its own set of styles
 *
 * @type Object
 */
MapDataseriesStyle.prototype.partitions = null;

//MapDataseriesStyle.prototype.markers = MapStyle.prototype.statusMarkerStyles;
MapDataseriesStyle.prototype.markers = null;

MapDataseriesStyle.prototype.frequencyStyle = 'c'; // colour series
MapDataseriesStyle.prototype.freqMarkerStyle = 'sf';

/**
 *
 * @type number
 */
MapDataseriesStyle.prototype.opacity = 0.7;

/**
 * if set then use the user-supplied minimum scale value
 *
 * @type boolean
 */
MapDataseriesStyle.prototype.frequencyMinScaleManual = false;

/**
 *
 * @type boolean
 */
MapDataseriesStyle.prototype.frequencyMaxScaleManual = false;


/**
 *
 * @param {Object} styleTemplate
 * @returns {undefined}
 */
MapDataseriesStyle.prototype.apply_style_defaults = function(styleTemplate) {
    this.partitions = {};

    var itemNumber = this.itemNumber;

    for (var t in MapConfiguration.PARTITION_TYPE) {
        if (MapConfiguration.PARTITION_TYPE.hasOwnProperty(t)) {
            var partitionType = MapConfiguration.PARTITION_TYPE[t];

            var typesNumberOfPartitions = MapConfiguration.NUMBER_OF_PARTITIONS[partitionType];

            this.partitions[partitionType] = [];
            //console.log(styleTemplate.partitionMarkerStyles);
            for (var p = typesNumberOfPartitions; p--;) {
                //console.log(p + ' ' + itemNumber + ' ' + styleTemplate.partitionMarkerStyles.length + ' ' + typesNumberOfPartitions + ' ' + partitionType);

                // ignore instances with obsolete invalid number of partitions
                // left-over from previous non-expanded dateclass version
                if (styleTemplate.partitionColours[itemNumber % styleTemplate.partitionColours.length].hasOwnProperty(typesNumberOfPartitions) &&
                    styleTemplate.partitionMarkerStyles[itemNumber % styleTemplate.partitionMarkerStyles.length].hasOwnProperty(typesNumberOfPartitions)
                ) {
                    // have valid current template with the neccessary fields

                    // initialise defaults
                    this.partitions[partitionType][p] = {
                        colour: styleTemplate.partitionColours[itemNumber % styleTemplate.partitionColours.length][typesNumberOfPartitions][p],
                        marker: styleTemplate.partitionMarkerStyles[itemNumber % styleTemplate.partitionMarkerStyles.length][typesNumberOfPartitions][p],
                        hidden: false
                    };
                }
            }
        }
    }
    this.opacity = styleTemplate.opacities[itemNumber % styleTemplate.opacities.length];

    // unfortunately unpartitioned is represented by '' rather than 'other'
    // merge the two definitions
    this.partitions[MapConfiguration.PARTITION_TYPE.UNPARTITIONED] = this.partitions[MapConfiguration.PARTITION_TYPE.OTHER];

    this.markers = {};
    for (var key in MapStyle.prototype.statusMarkerStyles) {
        if (MapStyle.prototype.statusMarkerStyles.hasOwnProperty(key)) {
            this.markers[key] = MapStyle.prototype.statusMarkerStyles[key];
        }
    }
};

/**
 *
 * @param {Object} styleTemplate
 * @param {Object} styleTarget
 * @returns {undefined}
 */
MapDataseriesStyle.prototype.filter_defaults = function(styleTemplate, styleTarget) {
    var itemNumber = this.itemNumber;

    for (var t in MapConfiguration.PARTITION_TYPE) {
        if (MapConfiguration.PARTITION_TYPE.hasOwnProperty(t)) {
            var partitionType = MapConfiguration.PARTITION_TYPE[t];

            var typesNumberOfPartitions = MapConfiguration.NUMBER_OF_PARTITIONS[partitionType];

            var templateColours = styleTemplate.partitionColours[itemNumber % styleTemplate.partitionColours.length][typesNumberOfPartitions];
            var templateMarkerStyles = styleTemplate.partitionMarkerStyles[itemNumber % styleTemplate.partitionMarkerStyles.length][typesNumberOfPartitions];

            for (var p = typesNumberOfPartitions; p--;) {
                var targetPartition = styleTarget.partitions[partitionType][p];

                if (targetPartition) {
                    if (templateColours && templateColours.hasOwnProperty(p) && targetPartition.colour === templateColours[p]) {
                        delete targetPartition.colour;
                    }
                    if (templateMarkerStyles && templateMarkerStyles.hasOwnProperty(p) && targetPartition.marker === templateMarkerStyles[p]) {
                        delete targetPartition.marker;
                    }
                    if (targetPartition.hidden === false) {
                        // ignore non-hidden partitions

                        delete targetPartition.hidden;
                    }
                }

                if (object_is_empty(targetPartition)) {
                    delete styleTarget.partitions[partitionType][p];
                }
            }

            if (object_is_empty(styleTarget.partitions[partitionType])) {
                delete styleTarget.partitions[partitionType];
            }
        }
    }

    if (object_is_empty(styleTarget.partitions)) {
        delete styleTarget.partitions;
    }

    if (styleTarget.seriesNumber === 0) {
        delete styleTarget.seriesNumber;
    }

    if (styleTarget.opacity === styleTemplate.opacities[itemNumber % styleTemplate.partitionColours.length]) {
        delete styleTarget.opacity;
    }

    // unfortunately unpartitioned is represented by '' rather than 'other'
    // merge the two definitions
    //this.partitions[MapConfiguration.PARTITION_TYPE.UNPARTITIONED] = this.partitions[MapConfiguration.PARTITION_TYPE.OTHER];

    for (var key in MapStyle.prototype.statusMarkerStyles) {
        if (MapStyle.prototype.statusMarkerStyles.hasOwnProperty(key)) {

            if (styleTarget.markers[key] === MapStyle.prototype.statusMarkerStyles[key]) {
                delete styleTarget.markers[key];
            }
        }
    }

    if (object_is_empty(styleTarget.markers)) {
        delete styleTarget.markers;
    }
};

MapDataseriesStyle.prototype.destroy = function() {
    if (this.containerRowId) {
        var container = document.getElementById(this.containerRowId);
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        this.containerRowId = null;
    }

    this.colourScheme = null;

    this.destructor();
};

/**
 * returns legend wrapped in an LI element
 *
 * @param {MapDataseriesConfiguration} mapDataseriesConfiguration
 * @param {boolean} multipleSeriesFlag
 * @returns {HTMLLIElement|null}
 */
MapDataseriesStyle.prototype.create_html_legend = function(mapDataseriesConfiguration, multipleSeriesFlag) {
    var svg = this.create_svg_legend(mapDataseriesConfiguration, multipleSeriesFlag);

    if (svg) {
        var li = document.createElement('li');

        if (multipleSeriesFlag) {
            var p = document.createElement('p');

            var seriesLabel;
            if (mapDataseriesConfiguration.mapKey.soleLabel) {
                // don't plot an overall series label as the single data value uses the same text
                seriesLabel = '';
            } else {
                seriesLabel = mapDataseriesConfiguration.get_series_label();
            }

            li.appendChild(p).appendChild(document.createTextNode(seriesLabel));
            svg.style.marginLeft = '10px';
            li.appendChild(svg);
        } else {
            li.appendChild(svg);
        }
        return li;
    } else {
        return null;
    }
};

/**
 * returns svg legend or null
 *
 * @param {MapDataseriesConfiguration} seriesConfig
 * @param {boolean} multipleSeriesFlag
 * @returns {?SVGElement}
 */
MapDataseriesStyle.prototype.create_svg_legend = function(seriesConfig, multipleSeriesFlag) {
    var key = seriesConfig.mapKey;

    key.clear_content();

    if (seriesConfig.frequencyResultsFlag) {
        key.build_frequency_key(seriesConfig, this);
    } else {
        if (seriesConfig.numberOfPartitions > 1 || multipleSeriesFlag) {
            key.build_partitions_key(seriesConfig, this);
        }

        if (
            ((
                    (seriesConfig.controllerName === MapConfiguration.CONTROLLER_SAVEDSEARCH && seriesConfig.searchType === MapConfiguration.SEARCHTYPE_PRESENCE) ||
                    seriesConfig.controllerName === MapConfiguration.CONTROLLER_TAXONMAP
                ) && (seriesConfig.statusFilter !== '')
            )
            ||
            ( seriesConfig.controllerName === MapConfiguration.CONTROLLER_TAXONSTATUS )
        ) {
            key.add_status_markers_to_key(seriesConfig, this);
        }
    }

    return key.has_content() ? key.get_svg() : null;
};

/**
 *
 * @param {HTMLTableRowElement} containerRow
 * @param {Array.<MapDataseriesConfiguration>} seriesConfigs
 */
MapDataseriesStyle.prototype.init_style_panel = function(containerRow, seriesConfigs) {
    this.panelIds = {
        stackOrderTable : uniqueId('stackordertable'),
        stackReverse : uniqueId('stackreversemenu'),
        stackReverseLabel : uniqueId('stackreverselabel'),
        markerSuperimpose : uniqueId('superimpose'),
        freqPartitioningContainer : uniqueId('freqpartitioningcontainer'),
        freqColourSchemesTable : uniqueId('freqcolourscheme'),
        freqStyle : uniqueId('freqstyle'),
        freqVarySize : uniqueId('freqvarysize'),
        freqContinuousKeyScale : uniqueId('freqcontinuouskeyscale'),
        freqMin : uniqueId('freqmin'),
        userFreqMin : uniqueId('userfreqmin'),
        freqMax : uniqueId('freqmax'),
        userFreqMax : uniqueId('userfreqmax'),
        freqMarker : uniqueId('freqmarker'),
        partitioningContainer : uniqueId('partitioningcontainer'),
        partitioningOuterContainer : uniqueId('partitioningoutercontainer'), // extra div required because IE9 can't do innerHTML on tbodies
        opacityLabel : uniqueId('opacitylabel'),
        opacity : uniqueId('opacity'),
        partitionstbody : uniqueId('partitionstbody'),
        seriesLabel : uniqueId('serieslabelid'),
        partitionHeading : uniqueId('partitionheading'),
        headingRow : uniqueId('heading')
    };

    this.containerRowId = containerRow.id = uniqueId('styleseries');
    containerRow.className = 'styleseriescontainerrow';

    var id = this.panelIds;

    var td, tr;

    td = containerRow.appendChild(document.createElement('th'));
    td.className = 'styleserieslabelcell';
    td.innerHTML = '<p id="' + this.panelIds.seriesLabel + '">' + seriesConfigs[this.seriesNumber].get_series_label() + '</p>';

    var tdContainer = containerRow.appendChild(document.createElement('td'));

    this.partitionsContainerElementId = tdContainer.id = uniqueId('partitionscontainer');

    //var stoppedFreqStyleOptions = '';
    var colourStyles = StoppedGradientColourScheme.colourStyles;

    /*
    for(var styleName in colourStyles) {
        var colourScheme = colourStyles[styleName];

        stoppedFreqStyleOptions += '<option style="' + coloured_css_gradient(colourScheme.colours) + '" value="' + styleName + '">' + colourScheme.label + '</option>';
    }
    */

    var tableEl = tdContainer.appendChild(document.createElement('table'));
    tableEl.id = id.stackOrderTable;
    var bodyEl = tableEl.appendChild(document.createElement('tbody'));
    tr = bodyEl.appendChild(document.createElement('tr'));
    var label = tr.appendChild(document.createElement('td')).appendChild(document.createElement('label'));
    label.htmlFor = id.stackReverse;
    label.appendChild(document.createTextNode('stacking order'));
    label.id = id.stackReverseLabel;
    var stackMenu = tr.appendChild(document.createElement('td')).appendChild(document.createElement('select'));
    stackMenu.id = id.stackReverse;
    stackMenu.options[0] = new Option('recent on top', '1', true);
    stackMenu.options[1] = new Option('earliest on top', '0');
    label = tr.appendChild(document.createElement('td')).appendChild(document.createElement('label'));
    label.style.display = 'none';
    label.appendChild(document.createTextNode('superimpose symbols '));
    var superCheckbox = document.createElement('input');
    superCheckbox.type = 'checkbox';
    superCheckbox.id = id.markerSuperimpose;
    label.appendChild(superCheckbox);

    var div = tdContainer.appendChild(document.createElement('div'));
    div.id = id.freqPartitioningContainer;
    div.className = 'configsettings';
    div.style.display = 'none';

    tableEl = div.appendChild(document.createElement('table'));
    tableEl.id = id.freqColourSchemesTable;
    bodyEl = tableEl.appendChild(document.createElement('tbody'));
    tr = bodyEl.appendChild(document.createElement('tr'));
    label = tr.appendChild(document.createElement('td')).appendChild(document.createElement('label'));
    label.htmlFor = id.freqStyle;
    label.appendChild(document.createTextNode('colour scheme'));

    td = tr.appendChild(document.createElement('td'));
    td.colSpan = 2;
    var freqColourStylesMenu = td.appendChild(document.createElement('select'));
    freqColourStylesMenu.id = id.freqStyle;
    freqColourStylesMenu.options[0] = new Option('colour series', 'c', true);
    var n = 1;
    for(var styleName in colourStyles) {
        var colourScheme = colourStyles[styleName];
        var o = new Option(colourScheme.label, styleName);
        o.setAttribute('style', coloured_css_gradient(colourScheme.colours));
        freqColourStylesMenu.options[n++] = o;
    }
    freqColourStylesMenu.options[n] = new Option('single colour (ignore freq)', 's');

    tr = bodyEl.appendChild(document.createElement('tr'));
    td = tr.appendChild(document.createElement('td'));
    td.colSpan = 3;
    label = td.appendChild(document.createElement('label'));
    label.appendChild(document.createTextNode('vary marker size '));
    var varyCheckbox = document.createElement('input');
    varyCheckbox.type = 'checkbox';
    varyCheckbox.id = id.freqVarySize;
    varyCheckbox.value = '1';
    label.appendChild(varyCheckbox);

    tr = bodyEl.appendChild(document.createElement('tr'));
    td = tr.appendChild(document.createElement('td'));
    td.colSpan = 3;
    label = td.appendChild(document.createElement('label'));
    label.appendChild(document.createTextNode('continuous key scale '));
    var contCheckbox = document.createElement('input');
    contCheckbox.type = 'checkbox';
    contCheckbox.id = id.freqContinuousKeyScale;
    contCheckbox.value = '1';
    label.appendChild(contCheckbox);

    tr = bodyEl.appendChild(document.createElement('tr'));
    label = tr.appendChild(document.createElement('td')).appendChild(document.createElement('label'));
    label.htmlFor = id.freqMin;
    label.appendChild(document.createTextNode('minimum'));

    var input = document.createElement('input');
    input.type = 'checkbox';
    input.value = '1';
    input.id = id.userFreqMin;
    tr.appendChild(document.createElement('td')).appendChild(input);

    input = document.createElement('input');
    // if (html5InputTypeNumberAllowed) {
        input.type = 'number';
    // }
    input.id = id.freqMin;
    tr.appendChild(document.createElement('td')).appendChild(input);

    tr = bodyEl.appendChild(document.createElement('tr'));
    label = tr.appendChild(document.createElement('td')).appendChild(document.createElement('label'));
    label.htmlFor = id.freqMax;
    label.appendChild(document.createTextNode('maximum'));

    input = document.createElement('input');
    input.type = 'checkbox';
    input.value = '1';
    input.id = id.userFreqMax;
    tr.appendChild(document.createElement('td')).appendChild(input);

    input = document.createElement('input');
    // if (html5InputTypeNumberAllowed) {
        input.type = 'number';
    // }
    input.id = id.freqMax;
    tr.appendChild(document.createElement('td')).appendChild(input);

    tr = bodyEl.appendChild(document.createElement('tr'));
    label = tr.appendChild(document.createElement('td')).appendChild(document.createElement('label'));
    label.htmlFor = id.freqMarker;
    label.appendChild(document.createTextNode('marker style'));

    td = tr.appendChild(document.createElement('td'));
    td.colSpan = 2;
    var markerStyleMenu = td.appendChild(document.createElement('select'));
    markerStyleMenu.id = id.freqMarker;
    markerStyleMenu.options[0] = new Option('square', 'sf');
    markerStyleMenu.options[1] = new Option('circle', 'cf');

    div = tdContainer.appendChild(document.createElement('div'));
    div.id = id.partitioningOuterContainer;

    // @todo can probably do without these click handlers and set checkboxes when the settings are read
    //this.minFreqChangeHandle = registerDOMEventHandler(document.getElementById(id.freqMin), 'change', this, 'set_linked_checkbox_event_handler', id.userFreqMin);
    //this.maxFreqChangeHandle = registerDOMEventHandler(document.getElementById(id.freqMax), 'change', this, 'set_linked_checkbox_event_handler', id.userFreqMax);
};

/**
 *
 * @param {MapStyle} mapStyle
 * @param {MapConfiguration} mapConfiguration
 */
MapDataseriesStyle.prototype.build_partition_styles_content = function (mapStyle, mapConfiguration) {
    var label, p, id, key;
    var config = mapConfiguration.series[this.seriesNumber];

    this.partitionElementIds = {};

    // flag indicates whether using markers to show status
    var statusFilteringFlag = (
        ((
                (config.controllerName === MapConfiguration.CONTROLLER_SAVEDSEARCH && config.searchType === MapConfiguration.SEARCHTYPE_PRESENCE) ||
                config.controllerName === MapConfiguration.CONTROLLER_TAXONMAP
            ) && (config.statusFilter !== '')
        )
        ||
        ( config.controllerName === MapConfiguration.CONTROLLER_TAXONSTATUS )
    );

    var outerContainerEl = document.getElementById(this.panelIds.partitioningOuterContainer);
    outerContainerEl.innerHTML = '';

    var table = outerContainerEl.appendChild(document.createElement('table'));
    table.id = this.panelIds.partitioningContainer;
    table.className = 'configsettings';
    var thead = table.appendChild(document.createElement('thead'));
    var tr = thead.appendChild(document.createElement('tr'));
    tr.id = this.panelIds.headingRow;
    if (!(config.numberOfPartitions > 1)) {
        tr.style.display = 'none';
    }
    var th = tr.appendChild(document.createElement('th'));
    th.colSpan = 2;
    th.id = this.panelIds.partitionHeading;
    th.appendChild(document.createTextNode('partition'));

    th = tr.appendChild(document.createElement('th'));
    th.style.textAlign = 'left';
    th.appendChild(document.createTextNode('style'));

    var tbody = table.appendChild(document.createElement('tbody'));
    tbody.id = this.panelIds.partitionstbody;
    tr = tbody.appendChild(document.createElement('tr'));
    var td = tr.appendChild(document.createElement('td'));
    td.colSpan = 2;
    td = tr.appendChild(document.createElement('td'));
    label = td.appendChild(document.createElement('label'));
    label.id = this.panelIds.opacityLabel;
    label.style.verticalAlign = 'middle';
    label.appendChild(document.createTextNode('opacity '));

    var opacityInput = document.createElement('input');

    // if (html5InputTypeNumberAllowed) {
        opacityInput.type = 'range';
    // }

    opacityInput.min = '0';
    opacityInput.max = '1';
    opacityInput.step = '0.1';
    opacityInput.id = this.panelIds.opacity;
    opacityInput.value = this.opacity.toString();
    opacityInput.style.verticalAlign = 'middle';
    opacityInput.style.width = '3em';
    label.appendChild(opacityInput);

    var inputEl, symbolMenu, n;
    for(p = 0; p < config.numberOfPartitions; p++) {
        var partId = this.partitionElementIds[p] = {
            label : uniqueId('partitionlabel'),
            visible : uniqueId('partitionVisible'),
            colour : uniqueId('colour'),
            marker : uniqueId('marker')
        };

        label = config.partitionLabels[config.partitionType][p];

        if (label === '' || label === null) {
            label = (p in mapConfiguration.defaultPartitionLabels) ? mapConfiguration.defaultPartitionLabels[p] : 'undefined partition ' + p;
        }

        tr = tbody.appendChild(document.createElement('tr'));
        td = tr.appendChild(document.createElement('td'));

        if (config.numberOfPartitions > 1) {
            inputEl = document.createElement('input');
            inputEl.type = 'text';
            inputEl.value = label;
            inputEl.id = partId.label;
            inputEl.style.width = '6em';
            inputEl.autocomplete = 'off';
            td.appendChild(inputEl);
        } else {
            td.appendChild(document.createTextNode('data'));
        }

        inputEl = document.createElement('input');
        inputEl.type = 'checkbox';
        inputEl.id = partId.visible;
        inputEl.value = '1';
        inputEl.checked = (this.partitions.hasOwnProperty(config.partitionType) && this.partitions[config.partitionType].hasOwnProperty(p)) ?
            !this.partitions[config.partitionType][p].hidden
            :
            false;
        tr.appendChild(document.createElement('td')).appendChild(inputEl);

        inputEl = document.createElement('input');
        inputEl.id = partId.colour;

        if (this.partitions[config.partitionType].hasOwnProperty(p)) {
            initialise_input_colour(inputEl, this.partitions[config.partitionType][p].colour);
        } else {
            // broken fallback if stored partition config lacks some partitions (following expansion of dateclasses)
            initialise_input_colour(inputEl, MapStyle.prototype.partitionColours[0][8][p]);
        }

        td = tr.appendChild(document.createElement('td'));
        td.appendChild(inputEl);

        // (marker styles are hidden if used as status markers and set separately below)

        symbolMenu = td.appendChild(document.createElement('select'));
        symbolMenu.id = partId.marker;
        if (statusFilteringFlag) {
            symbolMenu.style.display = 'none';
        }

        n = 0;
        for(id in SVG.SYMBOLID) {
            key = SVG.SYMBOLID[id]; // indirection to avoid any special symbols

            if (this.partitions[config.partitionType].hasOwnProperty(p)) {
                symbolMenu.options[n] = new Option(
                    SVG.SYMBOL[key].label, // label
                    key, // value
                    n === 0, // default selected
                    this.partitions[config.partitionType][p].marker === key // selected
                );
            } else {
                // broken fallback if stored partition config lacks some partitions (following expansion of dateclasses)
                var defaultMarker = MapStyle.prototype.partitionMarkerStyles[0][8][p];
                symbolMenu.options[n] = new Option(
                    SVG.SYMBOL[key].label,
                    key,
                    n === 0,
                    defaultMarker === key
                );
            }
            n++;
        }
    }

    this.markerElementIds = {};

    if (statusFilteringFlag) {
        // markers used for status symbols

        for (p in config.statusMarkerLabels) {
            if (config.statusMarkerLabels.hasOwnProperty(p)) {
                var markerId = this.markerElementIds[p] = {
                    label : uniqueId('label'),
                    symbol : uniqueId('symbol')
                };

                if (config.statusMarkerLabels.hasOwnProperty(p)) {

                    label = config.statusMarkerLabels[p] !== '' ?
                        escapeHTML(config.statusMarkerLabels[p])
                        :
                        'marker ' + p
                    ;

                    // markers used for status
                    // labels should be readonly
                    // so hide input elements
                    // and colour/opacity

                    tr = tbody.appendChild(document.createElement('tr'));
                    td = tr.appendChild(document.createElement('td'));
                    td.appendChild(document.createTextNode(label + ' '));
                    inputEl = document.createElement('input');
                    inputEl.id = markerId.label;
                    inputEl.value = label;
                    inputEl.style.display = 'none';
                    tr.appendChild(document.createElement('td')); // empty cell
                    td = tr.appendChild(document.createElement('td'));
                    symbolMenu = td.appendChild(document.createElement('select'));
                    symbolMenu.id = markerId.symbol;
                }

                n = 0;
                for(id in SVG.SYMBOLID) {
                    key = SVG.SYMBOLID[id]; // indirection to avoid any special symbols

                    symbolMenu.options[n] = new Option(SVG.SYMBOL[key].label, key, n === 0, this.markers[p] === key); //new Option(item.label, item.value, defaultflag, selectedflag);
                    n++;
                }
            }
        }
    }

    //refresh the series label
    var seriesLabelEl = document.getElementById(this.panelIds.seriesLabel);

    if ('textContent' in seriesLabelEl) {
        seriesLabelEl.textContent = config.get_series_label();
    } else {
        seriesLabelEl.innerText = config.get_series_label();
    }
};

/**
 * called back after DOM is ready
 *
 * @param {MapConfiguration} mapConfiguration
 */
MapDataseriesStyle.prototype.finalise_partition_styles_content = function (mapConfiguration) {
    var config = mapConfiguration.series[this.seriesNumber];

    if (config.frequencyResultsFlag) {
        if (this.frequencyStyle) {
            selectOption(document.getElementById(this.panelIds.freqStyle), this.frequencyStyle);
        }

        if (this.frequencyVarySize === true || this.frequencyVarySize === false) {
            document.getElementById(this.panelIds.freqVarySize).checked = this.frequencyVarySize;
        }

        if (this.frequencyContinuousKeyScale === true || this.frequencyContinuousKeyScale === false) {
            document.getElementById(this.panelIds.freqContinuousKeyScale).checked = this.frequencyContinuousKeyScale;
        }

        if (this.frequencyMinScaleManual === true || this.frequencyMinScaleManual === false) {
            document.getElementById(this.panelIds.userFreqMin).checked = this.frequencyMinScaleManual;

            document.getElementById(this.panelIds.freqMin).value = (this.frequencyMinScaleManual) ?
                // if true then *not* auto - use the user-specified value
                this.frequencyMinScale
                :
                config.get_default_min_frequency()
            ;
        }

        if (this.frequencyMaxScaleManual === true || this.frequencyMaxScaleManual === false) {
            document.getElementById(this.panelIds.userFreqMax).checked = this.frequencyMaxScaleManual;

            document.getElementById(this.panelIds.freqMax).value = (this.frequencyMaxScaleManual) ?
                // if true then *not* auto - use the user-specified value
                this.frequencyMaxScale
                :
                config.get_default_max_frequency()
            ;
        }

        var freqMarkerStyleEl = document.getElementById(this.panelIds.freqMarker);
        this.freqMarkerStyle = freqMarkerStyleEl.options[freqMarkerStyleEl.selectedIndex].value;

        document.getElementById(this.panelIds.freqPartitioningContainer).style.display = 'block';
        document.getElementById(this.panelIds.partitioningContainer).style.display = 'none';
        document.getElementById(this.panelIds.stackOrderTable).style.display = 'none';
    } else {
        document.getElementById(this.panelIds.freqPartitioningContainer).style.display = 'none';
        document.getElementById(this.panelIds.partitioningContainer).style.display = 'block';
        document.getElementById(this.panelIds.stackOrderTable).style.display = config.partitionType !== '' ? 'block' : 'none';
    }

    if (config.numberOfPartitions) {

        if (config.numberOfPartitions > 1) {
            selectOption(document.getElementById(this.panelIds.stackReverse), config.stackOrder);

            document.getElementById(this.panelIds.stackReverse).style.display = 'inline';
            document.getElementById(this.panelIds.stackReverseLabel).style.display = 'inline';
        } else {
            document.getElementById(this.panelIds.stackReverse).style.display = 'none';
            document.getElementById(this.panelIds.stackReverseLabel).style.display = 'none';
        }

        if (this.superimpose === true || this.superimpose === false) {
            document.getElementById(this.panelIds.markerSuperimpose).checked = this.superimpose;
        }

        if (this.partitions[config.partitionType]) {

            //console.log('config.partitionType = ' + config.partitionType);
            //console.log(this.partitions[config.partitionType]);
            for (var p in this.partitions[config.partitionType]) {
                if (this.partitions[config.partitionType].hasOwnProperty(p) && p < config.numberOfPartitions) {
                    var styleEl = document.getElementById(this.partitionElementIds[p].marker);
                    if (styleEl) {
                        selectOption(styleEl, this.partitions[config.partitionType][p].marker);

                        var labelEl = document.getElementById(this.partitionElementIds[p].label);
                        if (labelEl && 'value' in labelEl) {
                            labelEl.value = config.partitionLabels[config.partitionType][p];
                        }

                        set_input_colour(document.getElementById(this.partitionElementIds[p].colour), this.partitions[config.partitionType][p].colour);
                        document.getElementById(this.partitionElementIds[p].visible).checked = !this.partitions[config.partitionType][p].hidden;
                    }
                }
            }
        }

        // flag indicates whether using markers to show status
        var statusFilteringFlag = (
            ((
                    (config.controllerName === MapConfiguration.CONTROLLER_SAVEDSEARCH && config.searchType === MapConfiguration.SEARCHTYPE_PRESENCE) ||
                    config.controllerName === MapConfiguration.CONTROLLER_TAXONMAP
                ) && (config.statusFilter !== '')
            )
            ||
            ( config.controllerName === MapConfiguration.CONTROLLER_TAXONSTATUS )
        );

        if (statusFilteringFlag) {
            // markers used for status symbols
            // only the marker style is exported

            if (this.markers) {
                for (var n in this.markers) {
                    if (this.markers.hasOwnProperty(n)) {
                        selectOption(document.getElementById(this.markerElementIds[n].symbol), this.markers[n]);
                    }
                }
            }
        }
    }
};

/**
 *
 * @param {MapConfiguration} mapConfiguration
 */
MapDataseriesStyle.prototype.read_options = function (mapConfiguration) {
    var styleEl;
    var config = mapConfiguration.series[this.seriesNumber];

    if (config.frequencyResultsFlag) {
        var frequencyStyleEl = document.getElementById(this.panelIds.freqStyle);
        this.frequencyStyle = frequencyStyleEl.options[frequencyStyleEl.selectedIndex].value;
        this.frequencyVarySize = document.getElementById(this.panelIds.freqVarySize).checked;
        this.frequencyContinuousKeyScale = document.getElementById(this.panelIds.freqContinuousKeyScale).checked;

        // if checked then *not* auto - use the user-specified value
        this.frequencyMinScaleManual = document.getElementById(this.panelIds.userFreqMin).checked;
        if (this.frequencyMinScaleManual) {
            // if checked then *not* auto - use the user-specified value

            // keep as string so that '' (use auto) can be distinguished from manual '0'
            this.frequencyMinScale = parseFloat(document.getElementById(this.panelIds.freqMin).value.trim());

            if (this.frequencyMinScale === '') {
                this.frequencyMinScaleManual = false;
            }
        } else {
            // @todo should probably read min frequency for dataSource descriptor if loaded
        }

        this.frequencyMaxScaleManual = document.getElementById(this.panelIds.userFreqMax).checked;
        if (this.frequencyMaxScaleManual) {
            // if checked then *not* auto - use the user-specified value

            this.frequencyMaxScale = parseFloat(document.getElementById(this.panelIds.freqMax).value.trim());

            if (this.frequencyMaxScale === '') {
                this.frequencyMaxScaleManual = false;
            }
        }

        var freqMarkerStyleEl = document.getElementById(this.panelIds.freqMarker);
        this.freqMarkerStyle = freqMarkerStyleEl.options[freqMarkerStyleEl.selectedIndex].value;
    }

    this.opacity = parseFloat(document.getElementById(this.panelIds.opacity).value.trim());

    if (config.numberOfPartitions) {
        //this.bgcomplete = !document.getElementById('bgemptyonly').checked;
        this.bgcomplete = true;

        var stackOrderEl = document.getElementById(this.panelIds.stackReverse);
        config.stackOrder = parseInt((stackOrderEl.options[stackOrderEl.selectedIndex].value), 10);
        this.superimpose = document.getElementById(this.panelIds.markerSuperimpose).checked;

        for (var p = 0; p < config.numberOfPartitions; p++) {
            styleEl = document.getElementById(this.partitionElementIds[p].marker);
            if (styleEl) {

                var labelEl = document.getElementById(this.partitionElementIds[p].label);

                var colourEl = document.getElementById(this.partitionElementIds[p].colour);

                this.partitions[config.partitionType][p] = {
                    marker : styleEl.options[styleEl.selectedIndex].value,
                    colour : get_input_colour(colourEl),
                    //colour : ('color' in colourEl) ? colourEl.color.toString() : '',
                    hidden : !document.getElementById(this.partitionElementIds[p].visible).checked

                };

                config.partitionLabels[config.partitionType][p] =
                    (labelEl && 'value' in labelEl) ? labelEl.value.trim() : mapConfiguration.get_default_series_label(p);
            }
        }

        // flag indicates whether using markers to show status
        var statusFilteringFlag = (
            ((
                    (config.controllerName === MapConfiguration.CONTROLLER_SAVEDSEARCH && config.searchType === MapConfiguration.SEARCHTYPE_PRESENCE) ||
                    config.controllerName === MapConfiguration.CONTROLLER_TAXONMAP
                ) && (config.statusFilter !== '')
            )
            ||
            ( config.controllerName === MapConfiguration.CONTROLLER_TAXONSTATUS )
        );

        if (statusFilteringFlag) {
            // markers used for status symbols
            // export only the marker style

            for (var m in this.markers) {
                if (this.markers.hasOwnProperty(m)) {
                    var markerEl = document.getElementById(this.markerElementIds[m].symbol);

                    this.markers[m] = markerEl.options[markerEl.selectedIndex].value;
                }
            }
        }
    }
};

MapDataseriesStyle.prototype.colourScheme = null;

MapDataseriesStyle.prototype.initialise_frequency_colour_scheme = function(seriesConfig) {
    var dataSource = seriesConfig.sourceData;
    var sourceMaxFrequency = dataSource.descriptor.maxFrequencies[seriesConfig.partitionType];
    var sourceMinFrequency = dataSource.descriptor.minFrequencies[seriesConfig.partitionType];
    var useExplicitFrequencySettings, maxFreq, minFreq;

    // test if can/should override calculated frequency range with user-specified limits
    if (this.frequencyMaxScaleManual) { // this.frequencyMaxScale >= sourceMaxFrequency
        maxFreq = this.frequencyMaxScale;
        useExplicitFrequencySettings = true;
    } else {
        maxFreq = sourceMaxFrequency;
        useExplicitFrequencySettings = false;
    }

    if (this.frequencyMinScaleManual && this.frequencyMinScale <= sourceMinFrequency) {
        minFreq = this.frequencyMinScale;
        useExplicitFrequencySettings = true;
    } else {
        minFreq = sourceMinFrequency;
    }

    if (minFreq < 0 && maxFreq > 0) {
        // compelled to use heat map

        this.colourScheme = new StoppedGradientColourScheme; // :
        this.colourScheme.set_min_max(minFreq, maxFreq);
        this.colourScheme.set_named_style('heatmap');
    } else {
        switch (this.frequencyStyle) {
            case MapDataseriesStyle.FREQUENCY_STYLE_SIMPLE_GRADIENT:
                this.colourScheme = new StoppedGradientColourScheme;
                this.colourScheme.set_min_max(minFreq, maxFreq);
                this.colourScheme.set_named_style('lineargreenblack');
                break;

            case MapDataseriesStyle.FREQUENCY_STYLE_HEATMAP:
                this.colourScheme = new StoppedGradientColourScheme;
                this.colourScheme.set_min_max(minFreq, maxFreq);
                this.colourScheme.set_named_style('heatmap');
                break;

            case MapDataseriesStyle.FREQUENCY_STYLE_CONSTANTCOLOUR:
                this.colourScheme = new ConstantColourScheme;
                this.colourScheme.set_rgb(0, 200, 0);
                this.colourScheme.set_min_max(minFreq, maxFreq);
                break;

            default:
                if (StoppedGradientColourScheme.colourStyles.hasOwnProperty(this.frequencyStyle)) {
                    this.colourScheme = new StoppedGradientColourScheme;
                    this.colourScheme.set_min_max(minFreq, maxFreq);
                    this.colourScheme.set_named_style(this.frequencyStyle);
                } else if (this.frequencyStyle.charAt(0) === '_') {
                    // constant colour specified as hexidecimal '_rrggbb'
                    var colour = this.frequencyStyle;

                    this.colourScheme = new ConstantColourScheme;
                    if (colour.length === 7) {
                        this.colourScheme.set_rgb(
                            parseInt(colour.substr(1,2), 16),
                            parseInt(colour.substr(3,2), 16),
                            parseInt(colour.substr(5,2), 16)
                        );
                    } else {
                        throw new Error("Unparsable colour '" + colour + "'.");
                    }

                    this.colourScheme.set_min_max(minFreq, maxFreq);
                } else {
                    throw new Error("Unrecognized frequency style '" + this.frequencyStyle + "'");
                }

        }

        // if plotting percentages then need a way to distinguish zero values
        this.colourScheme.outlineZerosFlag = !!seriesConfig.mapPercentageFreq;
    }

    this.colourScheme.varyPointSizeFlag = this.frequencyVarySize;
    this.colourScheme.plotKeyAsContinuousGradient = this.frequencyContinuousKeyScale;

    this.colourScheme.useExplicitFrequencySettings = useExplicitFrequencySettings;

    if (seriesConfig.mapKey) {
        // will only exist if google maps enabled
        seriesConfig.mapKey.initialize_freq_scale(this.colourScheme, maxFreq, minFreq);
    }

    this.colourScheme.frequencyMarkerStyle = this.freqMarkerStyle;
};
