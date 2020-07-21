import {SVG} from "./SVG";

export class ColourScheme {

    /**
     * Colour mapping functions
     * @constructor
     */
    constructor() {
        this.stopOffsets = [0, 1];
    }
}

ColourScheme.prototype.r = null;
ColourScheme.prototype.g = null;
ColourScheme.prototype.b = null;

ColourScheme.CSS_OUTLINED_ZERO_COLOUR = 'gray';

/**
 * minimum frequency
 *
 * @type number
 */
ColourScheme.prototype.min = 0;

/**
 * maximum frequency
 *
 * @type number
 */
ColourScheme.prototype.max = 1;

/**
 * If set then the scale legend should reflect the explicitly specified min max values
 * (i.e. these are not just inferred from the data)
 * default false
 *
 * @type boolean
 */
ColourScheme.prototype.useExplicitFrequencySettings = false;

/**
 * if set then points that the colour-scheme applies to should have variable
 * area depending on the value
 * default false
 *
 * @type boolean
 */
ColourScheme.prototype.varyPointSizeFlag = false;

/**
 * if set then show zero-values as an outlined marker
 *
 * @type boolean
 */
ColourScheme.prototype.outlineZerosFlag = false;

//	protected abstract function rgb($value);

ColourScheme.FREQUENCY_MARKER_FILLED_SQUARE = 'sf';
//ColourScheme.FREQUENCY_MARKER_OPEN_SQUARE = 'so';
ColourScheme.FREQUENCY_MARKER_FILLED_CIRCLE = 'cf';
//ColourScheme.FREQUENCY_MARKER_OPEN_CIRCLE = 'co';

ColourScheme.prototype.frequencyMarkerStyle = ColourScheme.FREQUENCY_MARKER_FILLED_CIRCLE;

/**
 * if set then plot frequencies scale using a continuous gradient rather than as discreet exemplar colours
 * (actually colours used on map are always continuous)
 *
 * @type boolean
 */
ColourScheme.prototype.plotKeyAsContinuousGradient = false;

/**
 *
 * @param {number} x
 * @param {number} y
 * @param {number} centreX
 * @param {number} centreY
 * @param {number} scale
 * @param {number} xm
 * @param {number} ym
 * @returns {Object}
 */
ColourScheme.scale_square = function(x, y, centreX, centreY, scale, xm, ym) {
    const dx = x - centreX;
    const dy = y - centreY;

    const hyp = Math.sqrt((dx * dx) + (dy * dy)) * scale;
    const angle = Math.atan(dy / dx);
    return {
        x : centreX + ((Math.cos(angle) * hyp) * xm),
        y : centreY - ((Math.sin(angle) * hyp) * ym)
    };
};

/**
 *
 * @param {Object} points {sw: {x: n,y: n}, nw: {x: n,y: n}, ne: {x: n,y: n}, se: {x: n,y: n}}
 * @param {number} freq
 * @param {number} opacity
 * @param {number} tileDimension base square size in metres
 * @param {boolean} scaleValueByArea
 * @return SVGElement
 * @throws Error
 */
ColourScheme.prototype.svg_frequency_marker = function(points, freq, opacity, tileDimension, scaleValueByArea) {
    let svgElement, sf;

    const unitScale = scaleValueByArea ?
        ((10000 * 10000) / (tileDimension * tileDimension))
        :
        1;

    switch (this.frequencyMarkerStyle) {
        case ColourScheme.FREQUENCY_MARKER_FILLED_SQUARE:
            sf = 1;

            let strokeColour, fill, strokeWidth;
            if (freq > 0 && !this.outlineZerosFlag) {
                fill = this.get_css_rgb(freq * unitScale);
                strokeColour = 'none';
                strokeWidth = 0;
            } else {
                fill = 'none';
                strokeColour = ColourScheme.CSS_OUTLINED_ZERO_COLOUR;
                strokeWidth = 1;
            }

            if (this.varyPointSizeFlag && (freq > 0 || !this.outlineZerosFlag)) {
                sf = (freq * unitScale) / this.max;
            }

            if (sf < 1) {
                sf = Math.sqrt(sf);

                const centreX = (points.sw.x + points.nw.x + points.ne.x + points.se.x) / 4;
                const centreY = (points.sw.y + points.nw.y + points.ne.y + points.se.y) / 4;

                //function(pointSW, pointNW, pointNE, pointSE, strokeColour, fillColour, opacity, strokeWidth)
                svgElement = SVG.SYMBOL[SVG.SYMBOLID.FILLEDSQUARE].plot(
                    ColourScheme.scale_square(points.sw.x, points.sw.y, centreX, centreY, sf, -1, 1), // sw
                    ColourScheme.scale_square(points.nw.x, points.nw.y, centreX, centreY, sf, -1, 1), // nw
                    ColourScheme.scale_square(points.ne.x, points.ne.y, centreX, centreY, sf, 1, -1), // ne
                    ColourScheme.scale_square(points.se.x, points.se.y, centreX, centreY, sf, 1, -1), // se

                    strokeColour,
                    fill,
                    (typeof opacity !== 'undefined') ? opacity : 1,
                    strokeWidth
                );
            } else {
                svgElement = SVG.SYMBOL[SVG.SYMBOLID.FILLEDSQUARE].plot(
                    points.sw, // sw
                    points.nw, // nw
                    points.ne, // ne
                    points.se, // se

                    strokeColour,
                    fill,
                    (typeof opacity !== 'undefined') ? opacity : 1,
                    strokeWidth
                );
            }

            return svgElement;

        case ColourScheme.FREQUENCY_MARKER_FILLED_CIRCLE:
            let radius = ((points.ne.x - points.nw.x) + (points.se.x - points.sw.x) +
                (points.se.y - points.ne.y) + (points.sw.y - points.nw.y)) / 8
            ;

            /*
            var radius = Math.min(
                    (points.ne.x - points.nw.x),
                    (points.se.x - points.sw.x),
                    (points.se.y - points.ne.y),
                    (points.sw.y - points.nw.y)) / 2;
            */
            //http://spencermortensen.com/articles/bezier-circle/

            //var unscaledRadius = radius;

            if (this.varyPointSizeFlag && (freq > 0 || !this.outlineZerosFlag)) {
                // vary the area of points in proportion to value
                // (unless outlined zero - which needs to be full size)

                sf = (freq * unitScale) / this.max;

                if (sf < 1) {
                    radius = Math.sqrt(sf) * radius;
                }
            }

            svgElement = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            svgElement.setAttributeNS('', 'cx', Math.round((points.sw.x + points.nw.x + points.ne.x + points.se.x) / 4).toString());
            svgElement.setAttributeNS('', 'cy', Math.round((points.sw.y + points.nw.y + points.ne.y + points.se.y) / 4).toString());
            svgElement.setAttributeNS('', 'r', Math.round(radius).toString());

            if (freq > 0 && !this.outlineZerosFlag) {
                svgElement.setAttributeNS('', "fill", this.get_css_rgb(freq * unitScale));

                if (typeof opacity !== 'undefined') {
                    svgElement.setAttributeNS('', "fill-opacity", opacity.toString());
                }
                svgElement.setAttributeNS('', "stroke", 'none');
            } else {
                svgElement.setAttributeNS('', "fill", 'none');
                svgElement.setAttributeNS('', "stroke", this.get_css_rgb(freq * unitScale));
                svgElement.setAttributeNS('', "stroke-width", '2');
            }

            return svgElement;

        default:
            throw new Error("Unrecognized frequency marker style '" + this.frequencyMarkerStyle + "'");
    }
};

ColourScheme.prototype.get_component_rgb = function(value) {
    this.rgb(value);

    return {'r' : this.r, 'g' : this.g, 'b' : this.b};
};

ColourScheme.prototype.get_hex_rgb = function(value) {
    this.rgb(value);

    return ((this.r & 255) << 16) | ((this.g & 255) << 8) | (this.b & 255);
};

ColourScheme.prototype.get_css_rgb = function(value) {
    this.rgb(value);

    return '#' +
        (("0" + this.r.toString(16)).slice(-2)) +
        (("0" + this.g.toString(16)).slice(-2)) +
        (("0" + this.b.toString(16)).slice(-2));
};

/**
 *
 * @param {number} minFreq
 * @param {number} maxFreq
 */
ColourScheme.prototype.set_min_max = function(minFreq, maxFreq) {
    this.min = minFreq;
    this.max = maxFreq;
};
