/*
 * BSBI database project
 * (c) 2014,2020 Botanical Society of the Britain and Ireland
 *
 * @author Tom Humphrey <tom.humphrey@bsbi.org>
 */

import {ColourScheme} from "./ColourScheme";

export class ConstantColourScheme extends ColourScheme {
	/**
	 * @type {number}
	 */
	_numericRGB;

	/**
	 * @type {string}
	 */
	_cssRGB;

	/**
	 * @type {object}
	 */
	_components;

	/**
	 *
	 * @param {number} r
	 * @param {number} g
	 * @param {number} b
	 */
	set_rgb(r, g, b) {
		this.r = r;
		this.g = g;
		this.b = b;

		this._numericRGB = ((r & 255) << 16) | ((g & 255) << 8) | (b & 255);
		//this._cssRGB = sprintf('#%06x', this._numericRGB);
		this._cssRGB = `#${this._numericRGB.toString(16).padStart(6, '0')}`;
		this._components = {r : r, g : g, b : b};
	}

	rgb(value) {
		//no-op
	}

	get_hex_rgb(value) {
		return this._numericRGB;
	}

	get_css_rgb(value) {
		return this._cssRGB;
	}

	get_component_rgb(value) {
		return this._components;
	}
}
