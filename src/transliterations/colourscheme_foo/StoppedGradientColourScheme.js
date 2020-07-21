/*
 * BSBI database project
 * (c) 2014,2020 Botanical Society of the Britain and Ireland
 *
 * @author Tom Humphrey <tom.humphrey@bsbi.org>
 */

import {ColourScheme} from "./ColourScheme";

const range = (start, stop, step = 1) =>
	Array(Math.floor((stop - start) / step)).fill(start).map((x, i) => x + i * step);

export class StoppedGradientColourScheme extends ColourScheme {
	/**
	 * point of transition between blue and red
	 * default 0
	 *
	 * @var number
	 */
	midpoint = 0;

	/**
	 * @var array
	 */
	_stopColours;

	static COLOUR_STYLES = {
		'heatmap': {
			'colours': [[0, 0, 255], // blue start point
				[0x98, 0x00, 0x43], // purple mid-point
				[255, 0, 0]], // red end
			'label': "'heatmap'"
		},
		'fadedheatmap': {
			'colours': [
				[255, 255, 255], // white start point
				[0, 0, 255], // blue mid-point
				[0x98, 0x00, 0x43], // purple mid-point
				[255, 0, 0]], // red end
			'label': "'heatmap' (faded)"
		},
		'linearred': {
			'colours': [[255, 250, 250], // near-white start point
				[255, 0, 0]], // red end
			'label': "linear red (white to red)"
		},
		'linearredblack': {
			'colours': [[255, 0, 0],
				[0, 0, 0]],
			'label': "linear red (red to black)"
		},
		'lineargreen': {
			'colours': [[255, 250, 250], // near-white start point
				[0, 255, 0]], // green end
			'label': "linear green (white to green)"
		},
		'lineargreenblack': {
			'colours': [[0, 255, 0],
				[0, 0, 0]],
			'label': "linear green (green to black)"
		},
		'greentored': {
			'colours': [[0, 255, 0], [96, 64, 0],
				[255, 0, 0]],
			'stops': [0, 0.27, 1],
			'label': "green to red"
		},
	};

	/**
	 * StoppedGradientColourScheme constructor.
	 *
	 * @throws Exception
	 */
	constructor() {
		super();
		this.set_named_style('heatmap');
	}

	/**
	 * @param styleName
	 * @throws Exception
	 */
	set_named_style(styleName) {
		let style = StoppedGradientColourScheme.COLOUR_STYLES[styleName];

		this.set_colours(style['colours'], empty(style['stops']) ? null : style['stops']);
	}

	/**
	 *
	 * @param {Array} colours
	 * @param {?Array} stopOffsets default null, if null then assume equal distribution of stop points (except where 0 is crossed, which should be fixed to boundary)
	 * @throws Exception
	 */
	set_colours(colours, stopOffsets = null) {
		this._stopColours = colours;

		if (stopOffsets) {
			if (stopOffsets.length !== colours.length) {
				throw new Error("Mismatch between number of stop-offsets and stop-colours.");
			}

			this.stopOffsets = stopOffsets;
		} else {
			if (colours.length === 3 && this.min < 0 && this.max > 0) {
				// special case where colour boundary should be set at the zero-point transition

				const zeroBoundary = (-this.min) / (this.max - this.min);
				this.stopOffsets = [0, zeroBoundary, 1];
			} else {
				this.stopOffsets = range(0, 1, 1/(colours.length - 1));
			}
		}
	}

	static css_gradient(colourStyleName) {
		return StoppedGradientColourScheme._coloured_css_gradient(StoppedGradientColourScheme.COLOUR_STYLES[colourStyleName].colours);
	}

	/**
	 *
	 * @param {number[]} colours
	 * @return string css style
	 */
	static _coloured_css_gradient(colours) {
		return `background: linear-gradient(to right,${colours.map((colour) => `#${colour[0].toString(16)}${colour[1].toString(16)}${colour[2].toString(16)}`).join(',')});`;
	}

	/**
	 *
	 * @param {number} value
	 */
	rgb(value) {
		if (value < this.min) {
			//error_log("Heatmap colour scheme, invalid value: {value} < {this.min}");
			value = this.min;
		} else if (value > this.max) {
			//error_log("Heatmap colour scheme, invalid value: {value} > {this.max}");
			value = this.max;
		}

		let proportion;
		if ((this.max - this.min) > 0) {
			proportion = (value - this.min) / (this.max - this.min);
		} else {
			// avoid division by zero, but am unclear why this is happening
			// @todo investigate zero max-min in StoppedGradientColourScheme

			proportion = 0;
		}


		let startN = 0, n;
		for(n in this.stopOffsets) {
			let offset = this.stopOffsets[n];
			if (proportion < offset) {
				break;
			}

			startN = n;
		}

		let localOffset = (startN === n) ?
			0
			:
			(proportion - this.stopOffsets[startN]) / (this.stopOffsets[n] - this.stopOffsets[startN]);

		this.r = this._stopColours[startN][0] + ((this._stopColours[n][0] - this._stopColours[startN][0]) * localOffset);
		this.g = this._stopColours[startN][1] + ((this._stopColours[n][1] - this._stopColours[startN][1]) * localOffset);
		this.b = this._stopColours[startN][2] + ((this._stopColours[n][2] - this._stopColours[startN][2]) * localOffset);
	}
}
