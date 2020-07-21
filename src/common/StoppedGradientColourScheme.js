import {ColourScheme} from "./ColourScheme";

export class StoppedGradientColourScheme extends ColourScheme {

    /**
     * @constructor
     * @extends {ColourScheme}
     */
    constructor() {
        super();
        this.set_named_style('heatmap');
    };
}

/**
 * point of transition between blue and red
 * default 0
 *
 * @type number
 */
StoppedGradientColourScheme.prototype.midpoint = 0;

StoppedGradientColourScheme.colourStyles = {
    heatmap : {
        colours : [[0, 0, 255], // blue start point
            [0x98, 0x00, 0x43], // purple mid-point
            [255, 0, 0]], // red end
        label : "'heatmap'"
    },
    fadedheatmap : {
        colours : [
            [255, 255, 255], // white start point
            [0, 0, 255], // blue mid-point
            [0x98, 0x00, 0x43], // purple mid-point
            [255, 0, 0]], // red end
        label : "'heatmap' (faded)"
    },
    linearred : {
        colours : [[255, 250, 250], // near-white start point
            [255, 0, 0]], // red end
        label : "linear red (white to red)"
    },
    linearredblack : {
        colours : [[255, 0, 0],
            [0, 0, 0]],
        label : "linear red (red to black)"
    },
    lineargreen : {
        colours : [[255, 250, 250], // near-white start point
            [0, 255, 0]], // green end
        label : "linear green (white to green)"
    },
    lineargreenblack : {
        colours : [[0, 255, 0],
            [0, 0, 0]],
        label : "linear green (green to black)"
    },
    greentored : {
        colours : [[0, 255, 0], [96, 64, 0],
            [255, 0, 0]],
        stops : [0, 0.27, 1],
        label : "green to red"
    }
};

/**
 *
 * @param {Array} colours
 * @return string css style
 */
const coloured_css_gradient = function(colours) {
    var colourStrings = [];

    for(var colour in colours) {
        if (colours.hasOwnProperty(colour)) {

            colourStrings.push('#' +
                ('0' + colours[colour][0].toString(16)).substr(-2) +// hex value padded to two digits
                ('0' + colours[colour][1].toString(16)).substr(-2) +
                ('0' + colours[colour][2].toString(16)).substr(-2)
            );
        }
    }
    return "background: linear-gradient(to right," + colourStrings.join(',') + ");";
};

StoppedGradientColourScheme.prototype.set_named_style = function(styleName) {
    var style = StoppedGradientColourScheme.colourStyles[styleName];

    this.set_colours(style['colours'], style['stops'] ? style['stops'] : null);
};

/**
 *
 * @param {Array} colours
 * @param {Array=} stopOffsets default null, if null then assume equal distribution of stop points (except where 0 is crossed, which should be fixed to boundary)
 */
StoppedGradientColourScheme.prototype.set_colours = function(colours, stopOffsets) {
    this.stopColours = colours;

    if (stopOffsets) {
        if (stopOffsets.length !== colours.length) {
            throw new Error("Mismatch between number of stop-offsets and stop-colours.");
        }

        this.stopOffsets = stopOffsets;
    } else {
        if (colours.length === 3 && this.min < 0 && this.max > 0) {
            // special case where colour boundary should be set at the zero-point transition

            var zeroBoundary = (-this.min) / (this.max - this.min);
            this.stopOffsets = [0, zeroBoundary, 1];
        } else {
            this.stopOffsets = [];

            for (var r = 0, n = 0; r <= 1; r+= 1/(colours.length - 1), n++) {
                this.stopOffsets[n] = r;
            }
        }
    }
};

/**
 *
 * @param {string} colourStyleName
 * @returns {string}
 */
StoppedGradientColourScheme.css_gradient = function(colourStyleName) {
    return coloured_css_gradient(StoppedGradientColourScheme.colourStyles[colourStyleName]['colours']);
};

/**
 *
 * @param {number} value float frequency
 */
StoppedGradientColourScheme.prototype.rgb = function(value) {
    if (value < this.min) {
        console.log("Gradient colour scheme, invalid value: " + value + " < " + this.min);
        value = this.min;
    } else if (value > this.max) {
        //console.log("Gradient colour scheme, invalid value: " + value + " > " + this.max);
        value = this.max;
    }

    var proportion = (value - this.min) / (this.max - this.min);

    var startN = 0;
    for(var n in this.stopOffsets) {
        if (this.stopOffsets.hasOwnProperty(n)) {
            var offset = this.stopOffsets[n];
            if (proportion < offset) {
                break;
            }

            startN = n;
        }
    }

    var localOffset = (startN === n) ?
        0
        :
        (proportion - this.stopOffsets[startN]) / (this.stopOffsets[n] - this.stopOffsets[startN]);

    this.r = Math.round(this.stopColours[startN][0] + ((this.stopColours[n][0] - this.stopColours[startN][0]) * localOffset));
    this.g = Math.round(this.stopColours[startN][1] + ((this.stopColours[n][1] - this.stopColours[startN][1]) * localOffset));
    this.b = Math.round(this.stopColours[startN][2] + ((this.stopColours[n][2] - this.stopColours[startN][2]) * localOffset));
};
