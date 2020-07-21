/**
 *
 * @constructor
 */
import {ColourScheme} from "./ColourScheme";

export class ConstantColourScheme extends ColourScheme {

}

ConstantColourScheme.prototype.set_rgb = function(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;

    this.numericRGB = ((r & 255) << 16) | ((g & 255) << 8) | (b & 255);
    this.cssRGB = '#' + ('00000' + this.numericRGB.toString(16)).slice(-6);

    this.components = {
        r : r,
        g : g,
        b : b
    };
};

ConstantColourScheme.prototype.rgb = function(value) {
    //no-op
};

/**
 *
 * @param value ignored for ConstantColourScheme
 * @returns {*}
 */
ConstantColourScheme.prototype.get_hex_rgb = function(value) {
    return this.numericRGB;
};

/**
 *
 * @param value ignored for ConstantColourScheme
 * @returns {*}
 */
ConstantColourScheme.prototype.get_css_rgb = function(value) {
    return this.cssRGB;
};

/**
 *
 * @param value ignored for ConstantColourScheme
 * @returns {*}
 */
ConstantColourScheme.prototype.get_component_rgb = function(value) {
    return this.components;
};
