import {uniqueId} from "../utils/uniqueId";
import {ConstantColourScheme} from "./ConstantColourScheme";
import {MapConfiguration} from "./MapConfiguration";
import {SVG} from "./SVG";

export class MapKey {

    /**
     * @constructor
     */
    constructor() {
    //this.svgRoot = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    }
}

/**
 * initialised by a call to clear_content or by initialize_freq_scale
 * cannot initialise in constructor due to problems with IE9, where error
 * results if document.createElementNS is called too quickly,
 * see https://code.google.com/p/svgweb/issues/detail?id=625
 *
 * @type Element
 */
MapKey.prototype.svgRoot = null;

MapKey.prototype.clear_content = function() {
    if (this.svgRoot && this.svgRoot.parentNode) {
        this.svgRoot.parentNode.removeChild(this.svgRoot);
    }
    this.svgRoot = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.numberOfItems = 0;
    this.maxLabelLength = 0;
    this.width = MapKey.prototype.width;
};

/**
 *
 * @returns {Element}
 */
MapKey.prototype.get_svg = function() {
    var height = this.numberOfItems * MapKey.ROW_HEIGHT;

    this.svgRoot.setAttributeNS('', 'width', this.width + 'px');
    this.svgRoot.setAttributeNS('', 'height', height + 'px');
    this.svgRoot.setAttributeNS('', 'viewBox', "0 0 " + (this.width - 1) + " " + (height - 1));

    return this.svgRoot;
};

MapKey.prototype.numberOfItems = 0;
MapKey.prototype.maxLabelLength = 0;


MapKey.PADDING = 6;

MapKey.ROW_HEIGHT = 20;

MapKey.SYMBOL_SIZE = 10;

MapKey.MIN_WIDTH = 100;

MapKey.FONT_SIZE = 14;

MapKey.prototype.width = MapKey.MIN_WIDTH;

/**
 *
 * @param {number} maxValue
 * @param {number} maxTicks
 * @returns {number}
 */
MapKey.tick_interval = function(maxValue, maxTicks) {
    // see http://stackoverflow.com/questions/361681/algorithm-for-nice-grid-line-intervals-on-a-graph

    var min = maxValue / maxTicks;
    var	magnitude = Math.pow(10, Math.floor(Math.log(min) / Math.log(10)));
    var residual = min / magnitude;
    var interval;

    if (residual > 5) {
        interval = 10 * magnitude;
    } else if (residual > 2) {
        interval = 5 * magnitude;
    } else if (residual > 1) {
        interval = 2 * magnitude;
    } else {
        interval = magnitude;
    }

    return interval;
};

MapKey.prototype.interval = null;
MapKey.prototype.minFreq = null;
MapKey.prototype.maxFreq = null;

/**
 *
 *
 * @param {ColourScheme} colourScheme
 * @param {number} maxFreq
 * @param {number=} minFreq default 0
 * @param {number=} maxNumberOfIntervals default 6
 *
 * @return ColourScheme
 */
MapKey.prototype.initialize_freq_scale = function(colourScheme, maxFreq, minFreq, maxNumberOfIntervals) {
    if (!this.svgRoot) {
        // used to be initialised in the constructor,
        // but that could cause problems for IE9 if called too early
        // see https://code.google.com/p/svgweb/issues/detail?id=625
        this.svgRoot = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    }

    minFreq = minFreq || 0;
    maxNumberOfIntervals = maxNumberOfIntervals || 6;

    //if (!colourScheme) {
    //	colourScheme = (minFreq < 0) ? new StoppedGradientColourScheme : new LinearGreenColourScheme;
    //}

    if (colourScheme.useExplicitFrequencySettings) {
        this.interval = MapKey.tick_interval(maxFreq - minFreq, maxNumberOfIntervals);
    } else {
        // implicitly starting from 0, which will not be plotted on the scale
        this.interval = MapKey.tick_interval(maxFreq, maxNumberOfIntervals);
        minFreq = 0;
    }

    this.maxFreq = Math.ceil(maxFreq / this.interval) * this.interval;

    this.minFreq = minFreq;
    colourScheme.set_min_max(minFreq, this.maxFreq);

    return colourScheme;
};

MapKey.prototype.destroy = function() {
    this.svgRoot = null;
};

/**
 *
 * @param {MapDataseriesConfiguration} seriesConfig
 * @param {MapDataseriesStyle} seriesStyle
 */
MapKey.prototype.build_frequency_key = function(seriesConfig, seriesStyle) {
    var rowHeight = MapKey.ROW_HEIGHT;
    var keyText = '';
    var colourScheme = seriesStyle.colourScheme;
    var textEl;

    var initial = (this.minFreq <= 0) ? 0 : 1;

    var n, maxLimit, minLimit;
    if (!colourScheme.useExplicitFrequencySettings) {
        if (this.minFreq >= 0) {
            n = this.interval;
            minLimit = 0;
        } else {
            n = this.minFreq + (initial * this.interval);
            minLimit = this.minFreq;
        }

        maxLimit = this.maxFreq + initial;
    } else {
        n = this.minFreq;
        maxLimit = this.maxFreq;
        minLimit = this.minFreq;
    }

    var lines = 0;
    var usedN;
    var scaleMarks = [];

    if (maxLimit) {
        // have a valid value for maxLimit
        // @todo check how this works for negative values (e.g. scale from -ve to 0)

        for (var i = 0; n <= maxLimit; i++) {
            if (!colourScheme.useExplicitFrequencySettings) {
                // usedN is off-by-one for all but the first value, to make scale numbers round
                //usedN = n - initial;
                usedN = n;
            } else {
                //logger("using explicit frequency, usedN = " + n);
                usedN = n;
            }

            var y = MapKey.PADDING + (i * rowHeight);

            // shouldn't usually scale the key points, because the scale isn't comparable anyway
            // only do so when marker sizes set to vary and there is no colour information to convey
            if (colourScheme instanceof ConstantColourScheme && colourScheme.varyPointSizeFlag) {

                // ly and hy deliberately reversed
                // *1000 scaling to counteract scaling applied in svg_frequency_marker
                //svg = colourScheme.svg_frequency_marker(array(
                //	MapKey.PADDING * 1000, // lx
                //	(y + MapKey.SYMBOL_SIZE) * 1000, // ly
                //	(MapKey.PADDING + MapKey.SYMBOL_SIZE) * 1000, // hx
                //	y * 1000,// hy
                //	usedN //freq
                //));

                //this.svgString += svg;
            } else if (!colourScheme.plotKeyAsContinuousGradient) {
                // fixed size markers

                var svgMarker = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
                svgMarker.setAttributeNS('', 'x', MapKey.PADDING);
                svgMarker.setAttributeNS('', 'y', y);
                svgMarker.setAttributeNS('', 'width', MapKey.SYMBOL_SIZE);
                svgMarker.setAttributeNS('', 'height', MapKey.SYMBOL_SIZE);

                if (n > 0 || !colourScheme.outlineZerosFlag) {
                    svgMarker.setAttributeNS('', 'fill', colourScheme.get_css_rgb(usedN));
                } else {
                    svgMarker.setAttributeNS('', 'fill', 'none');
                    svgMarker.setAttributeNS('', 'stroke', colourScheme.get_css_rgb(usedN));
                    svgMarker.setAttributeNS('', 'stroke-width', 2);
                }

                this.svgRoot.appendChild(svgMarker);
            }

            if (colourScheme.plotKeyAsContinuousGradient) {
                // save values of N for later plotting of markers
                scaleMarks.push(usedN);
            } else {
                keyText = Math.floor(usedN).toString(); //sprintf('%d' , usedN);

                textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
                textEl.setAttributeNS('', 'x', (MapKey.PADDING * 2) + MapKey.SYMBOL_SIZE);
                textEl.setAttributeNS('', 'y', y + MapKey.SYMBOL_SIZE);
                textEl.setAttributeNS('', 'font-size', MapKey.FONT_SIZE);
                textEl.appendChild(document.createTextNode(keyText));
                this.svgRoot.appendChild(textEl);
            }

            if (n < 0 && (n+this.interval) > 0) {
                n = 0;
            } else {
                n += this.interval;

                if (!colourScheme.plotKeyAsContinuousGradient) {
                    // kludge to extend scale to include maximum value
                    if (n > maxLimit && (n < (maxLimit + this.interval))) {
                        n = maxLimit;
                    }
                }
            }
            lines++;
        }

        if (colourScheme.plotKeyAsContinuousGradient) {
            // plot a single box with a gradient fill
            // numeric labels will already have been plotted above

            // can't use maxLimit as may be > colour scale

            var gradientEl = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            var gradientId = uniqueId('FreqKeyGradient');
            gradientEl.setAttributeNS('', 'id', gradientId);
            gradientEl.setAttributeNS('', 'x1', 0);
            gradientEl.setAttributeNS('', 'x2', 0);
            gradientEl.setAttributeNS('', 'y1', 0);
            gradientEl.setAttributeNS('', 'y2', 1);

            // stops positions expressed as float from 0 to 1
            for(var stopN in colourScheme.stopOffsets) {
                if (colourScheme.stopOffsets.hasOwnProperty(stopN)) {
                    var stop = colourScheme.stopOffsets[stopN];

                    var stopEl = gradientEl.appendChild(document.createElementNS("http://www.w3.org/2000/svg", 'stop'));
                    stopEl.setAttributeNS('', 'offset', stop);
                    stopEl.setAttributeNS('', 'stop-color', colourScheme.get_css_rgb(((this.maxFreq - this.minFreq) * stop) + this.minFreq));
                }
            }
            this.svgRoot.appendChild(gradientEl);

            var rectEl = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
            rectEl.setAttributeNS('', 'x', MapKey.PADDING);
            rectEl.setAttributeNS('', 'y', MapKey.PADDING);
            rectEl.setAttributeNS('', 'width', MapKey.SYMBOL_SIZE);
            rectEl.setAttributeNS('', 'height', y);
            rectEl.setAttributeNS('', 'fill', 'url(#' + gradientId + ')');
            rectEl.setAttributeNS('', 'stroke', 'none');
            rectEl.setAttributeNS('', 'stroke-width', 0);
            this.svgRoot.appendChild(rectEl);

            var xOffset = MapKey.PADDING + MapKey.SYMBOL_SIZE;
            var xLength = MapKey.PADDING / 2;

            for (i in scaleMarks) {
                if (scaleMarks.hasOwnProperty(i)) {
                    n = scaleMarks[i];

                    if (n <= this.maxFreq) {
                        var markerY = MapKey.PADDING + ((y / (this.maxFreq - minLimit)) * n) + (n < this.maxFreq && n > minLimit ? 1 : (n == this.maxFreq ? -0.25 : 0.25)); // 1 is the stroke width (looks messy if marker is hanging off the end

                        var markEl = document.createElementNS("http://www.w3.org/2000/svg", 'path');
                        markEl.setAttributeNS('', 'd', 'M' + xOffset + ',' + markerY + ' l' + xLength + ',0');
                        markEl.setAttributeNS('', 'fill', 'none');
                        markEl.setAttributeNS('', 'stroke', colourScheme.get_css_rgb(n));
                        markEl.setAttributeNS('', 'stroke-width', (n == minLimit || n == this.maxFreq) ? 0.5 : 1);
                        this.svgRoot.appendChild(markEl);

                        keyText = Math.floor(n).toString(); //sprintf('%d' , n);
                        textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
                        textEl.setAttributeNS('', 'x', (MapKey.PADDING * 2) + MapKey.SYMBOL_SIZE);
                        textEl.setAttributeNS('', 'y', markerY + (MapKey.SYMBOL_SIZE / 2));
                        textEl.setAttributeNS('', 'font-size', MapKey.FONT_SIZE);
                        textEl.appendChild(document.createTextNode(keyText));
                        this.svgRoot.appendChild(textEl);
                    }
                }
            }
        }

        this.height += (rowHeight * lines);
        this.width = 100;

        this.numberOfItems = lines;
    } else {
        this.numberOfItems = 0;
    }
};

/**
 * soleLabel is marker to avoid plotting the same text for a single marker and the series label
 * if set then don't plot a category label
 *
 * @type boolean
 */
MapKey.prototype.soleLabel = false;

/**
 *
 * @param {MapDataseriesConfiguration} seriesConfig
 * @param {MapDataseriesStyle} seriesStyle
 */
MapKey.prototype.build_partitions_key = function(seriesConfig, seriesStyle) {
    var pStart, pEnd, pInc, marker;
    if (seriesConfig.stackOrder) {
        // recent on top

        pStart = seriesConfig.numberOfPartitions - 1;
        pEnd = -1;
        pInc = -1;
    } else {
        pStart = 0;
        pEnd = seriesConfig.numberOfPartitions;
        pInc = 1;
    }

    var totals = seriesConfig.sourceData.fetch_data_for_top_level(
        seriesConfig.numberOfPartitions,
        seriesConfig.partition_filter ? seriesConfig.partition_filter.bind(seriesConfig) : null); // for each partition get total across British Isles
    // logger(totals);

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

    for (var p = pStart; p !== pEnd; p += pInc) {
        if (!seriesStyle.partitions[seriesConfig.partitionType][p].hidden) {
            if (!statusFilteringFlag) {
                // no status so use partition symbols

                marker = seriesStyle.partitions[seriesConfig.partitionType][p].marker;
            } else {
                marker = 'specialcolourswatch';
            }

            var label;

            // soleLabel is marker to avoid plotting the same text for a single marker and the series label
            this.soleLabel = false;

            if (seriesConfig.partitionLabels[seriesConfig.partitionType][p] !== '') {
                // have an explicit series label
                //label = seriesConfig.partitionLabels[seriesConfig.partitionType][p];

            } else {
                if (seriesConfig.numberOfPartitions === 1) {
                    //label = seriesConfig.get_series_label();
                    this.soleLabel = true;
                } else {
                    //label = '';
                }
            }

            label = seriesConfig.partitionLabels[seriesConfig.partitionType][p] !== '' ?
                seriesConfig.partitionLabels[seriesConfig.partitionType][p]
                :
                (seriesConfig.numberOfPartitions === 1 ? seriesConfig.get_series_label() : '');

            if (seriesConfig.annotateLegendWithFreq) {
                label += ' (' + totals[p] + ' record' + (totals[p] === 1 ? '' : 's') + ')';
            }

            var title = totals[p] + ' record' + (totals[p] === 1 ? '' : 's');

            this._add_key_item(
                marker,
                label,
                '#' + seriesStyle.partitions[seriesConfig.partitionType][p].colour,
                '#' + seriesStyle.partitions[seriesConfig.partitionType][p].colour,
                title
            );
        }
    }
};

/**
 *
 * @param {string} symbolName
 * @param {string} label
 * @param {string} strokeColour
 * @param {string} fillColour
 * @param {string} title
 */
MapKey.prototype._add_key_item = function (symbolName, label, strokeColour, fillColour, title) {
    var y = MapKey.PADDING + (this.numberOfItems * MapKey.ROW_HEIGHT);
    this.numberOfItems++;

    var specialWidth = (symbolName === 'specialcolourswatch') ?
        MapKey.SYMBOL_SIZE * 1.5
        :
        MapKey.SYMBOL_SIZE
    ;

    //function(pointSW, pointNW, pointNE, pointSE, strokeColour, fillColour, opacity)

    // for key plotting N and S must be swapped as y-axis direction is reversed compared with map plotting
    this.svgRoot.appendChild(SVG.SYMBOL[symbolName].plot(
        {x: MapKey.PADDING, y: y + MapKey.SYMBOL_SIZE}, // pointNW
        {x: MapKey.PADDING, y: y}, // pointSW
        {x: MapKey.PADDING + specialWidth, y: y}, // pointSE
        {x: MapKey.PADDING + specialWidth, y: y + MapKey.SYMBOL_SIZE}, // pointNE
        strokeColour, fillColour, 1
    ));

    var textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textEl.setAttributeNS('', 'x', (MapKey.PADDING * 2) + specialWidth);
    textEl.setAttributeNS('', 'y', y + MapKey.SYMBOL_SIZE);

    if (title) {
        var titleEl = document.createElementNS("http://www.w3.org/2000/svg", "title");
        titleEl.appendChild(document.createTextNode(title));
        textEl.appendChild(titleEl);
    }

    textEl.appendChild(document.createTextNode(label));

    this.svgRoot.appendChild(textEl);

    this.height += MapKey.ROW_HEIGHT;

    if (label.length > this.maxLabelLength) {
        this.maxLabelLength = label.length;
        this.width = Math.max(MapKey.MIN_WIDTH, (MapKey.PADDING * 2) + specialWidth + (this.maxLabelLength * 8));
    }
};

/**
 *
 * @param {MapDataseriesConfiguration} seriesConfig
 * @param {MapDataseriesStyle} seriesStyle
 * @param {number=} maxPrecisionLevel (where 2 is hectad)
 */
MapKey.prototype.add_status_markers_to_key = function(seriesConfig, seriesStyle, maxPrecisionLevel) {
    var statusUsage = seriesConfig.sourceData.enumerate_status(maxPrecisionLevel || 6);

    var colour = (seriesConfig.numberOfPartitions > 1) ?
        'black'
        :
        '#' + seriesStyle.partitions[seriesConfig.partitionType][0].colour // only single partition, so use its colour for the status symbols
    ;

    for (var status in statusUsage) {
        if (statusUsage.hasOwnProperty(status)) {
            this._add_key_item(
                seriesStyle.markers[status],
                seriesConfig.statusMarkerLabels[status],
                colour,
                colour
            );
        }
    }
};

/**
 *
 * @returns {boolean}
 */
MapKey.prototype.has_content = function() {
    return this.numberOfItems > 0;
};
