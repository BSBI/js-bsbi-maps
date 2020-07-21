/*
 * BSBI database project
 * (c) 2014, 2020 Botanical Society of the Britain and Ireland
 *
 * @author Tom Humphrey <tom.humphrey@bsbi.org>
 */

import {SvgMapComponent} from "./SvgMapComponent";
import {ColourScheme} from "./colourscheme_foo/ColourScheme";
import {StoppedGradientColourScheme} from "./colourscheme_foo/StoppedGradientColourScheme";
import {LinearGreenColourScheme} from "./colourscheme_foo/LinearGreenColourScheme";
import {SVG} from "./SVG";

/**
 *
 */
export class SvgMapKey extends SvgMapComponent
{
	parentSvgContainer;

	static PADDING = 6;

	static ROW_HEIGHT = 20;

	static SYMBOL_SIZE = 10;

	static MIN_WIDTH = 100;

	/**
	 * expressed as string (but is legitimately allowed to be with or without units, per svg spec.)
	 */
	static FONT_SIZE = '14';

	numberOfItems = 0;

	maxLabelLength = 0;

	width;
	height;

	/**
	 *
	 * @param {SvgContainer} parentSvgContainer
	 * @param {number} xControlPoint
	 * @param {number} yControlPoint
	 */
	constructor(parentSvgContainer, xControlPoint=0, yControlPoint=0) {
		super(parentSvgContainer, xControlPoint, yControlPoint);

		this.height = SvgMapKey.PADDING;
		this.width = 120;
	}

	initialise_key() {
		//this.height = SvgMapKey.PADDING;
		//this.width = 120;
		//this.numberOfItems = 0;
	}

	_symbolScale = 1;

	set_marker_dimension(km) {
		if (SvgMapKey.SYMBOL_SIZE !== km) {
			this.symbolScale = SvgMapKey.SYMBOL_SIZE / km;
		}
	}

	static SERIES_LABEL_HEIGHT = 32;

	numberOfSeriesLabels = 0;

	add_series_label(label) {
		let y = SvgMapKey.PADDING + (this.numberOfItems * SvgMapKey.ROW_HEIGHT) + (this.numberOfSeriesLabels * SvgMapKey.SERIES_LABEL_HEIGHT);

		this.svgString += SVG.text(
			label,
			(SvgMapKey.PADDING * 1.5),
			y + 12,
			{'font-size' : SvgMapKey.FONT_SIZE}
			);
		this.numberOfSeriesLabels++;
	}

	/**
	 *
	 * @param {string} symbolName
	 * @param {string} label
	 */
	add_key_item(symbolName, label) {
		let y = SvgMapKey.PADDING + (this.numberOfItems * SvgMapKey.ROW_HEIGHT) + (this.numberOfSeriesLabels * SvgMapKey.SERIES_LABEL_HEIGHT);
		this.numberOfItems++;

		if (this.symbolScale === 1) {
			// marker is already 10km, no need for scaling
			this.svgString +=
				SVG.use_definition(symbolName, SvgMapKey.PADDING, y) +
					SVG.text(label, (SvgMapKey.PADDING * 2) + SvgMapKey.SYMBOL_SIZE, y + SvgMapKey.SYMBOL_SIZE, {'font-size' : SvgMapKey.FONT_SIZE});
		} else {
			// need to scale marker up to 10km equiv. size
			this.svgString +=
				SVG.use_definition(
					symbolName,
					0, 0,
					'', '', {'transform' : `translate(${SvgMapKey.PADDING} ${y}) scale(${this.symbolScale} ${this.symbolScale})`}
				) +
				SVG.text(label, (SvgMapKey.PADDING * 2) + SvgMapKey.SYMBOL_SIZE, y + SvgMapKey.SYMBOL_SIZE, {'font-size' : SvgMapKey.FONT_SIZE});
		}

		this.height += SvgMapKey.ROW_HEIGHT;

		if (label.length > this.maxLabelLength) {
			this.maxLabelLength = label.length;
			this.width = Math.max(SvgMapKey.MIN_WIDTH, (SvgMapKey.PADDING * 2) + SvgMapKey.SYMBOL_SIZE + (this.maxLabelLength * 12));
		}
	}

	/**
	 * @todo check whether _tick_interval should validly be non-integer
	 *
	 * @param {number} maxValue
	 * @param {number} maxTicks
	 * @return {number}
	 */
	_tick_interval(maxValue, maxTicks) {
		/* see http://stackoverflow.com/questions/361681/algorithm-for-nice-grid-line-intervals-on-a-graph
	def BestTick(largest, mostticks):
    minimum = largest / mostticks
    magnitude = 10 ** math.floor(math.log(minimum) / math.log(10))
    residual = minimum / magnitude
    if residual > 5:
        tick = 10 * magnitude
    elif residual > 2:
        tick = 5 * magnitude
    elif residual > 1:
        tick = 2 * magnitude
    else:
        tick = magnitude
    return tick
		 */

		let min = maxValue / maxTicks;
		let magnitude = Math.pow(10, Math.floor(Math.log(min) / Math.log(10)));
		let residual = min / magnitude;
		let interval;

		if (residual > 5) {
			interval = 10 * magnitude;
		} else if (residual > 2) {
			interval = 5 * magnitude;
		} else if (residual > 1) {
			interval = 2 * magnitude;
		} else {
			interval = magnitude;
		}

		if (interval < 1) {
			interval = 1; // kludge to avoid decimals making a mess of freq scale
		} else {
			interval = Math.round(interval);
		}

		return interval;
	}

	_interval;
	_minFreq;
	_maxFreq;

	/**
	 *
	 *
	 * @param {ColourScheme} colourScheme
	 * @param {number} maxFreq
	 * @param {number} minFreq default 0.0
	 * @param {number} maxNumberOfIntervals = 6
	 *
	 * @return ColourScheme
	 * @throws Error
	 */
	initialize_freq_scale(colourScheme, maxFreq, minFreq = 0.0, maxNumberOfIntervals = 6) {
		if (!colourScheme) {
			colourScheme = (minFreq < 0) ? new StoppedGradientColourScheme : new LinearGreenColourScheme;
		}

		if (colourScheme.useExplicitFrequencySettings) {
			this.interval = this._tick_interval(maxFreq - minFreq, maxNumberOfIntervals);

			console.log("using explicit freq scale, interval = {this.interval}, max = {maxFreq}, min = {minFreq}");
		} else {
			// implicitly starting from 0, which will not be plotted on the scale

			this.interval = this._tick_interval(maxFreq, maxNumberOfIntervals);
			console.log("using automatic freq scale, interval = {this.interval}, max = {maxFreq}, min = {minFreq}");
		}

		this.maxFreq = Math.ceil(maxFreq/this.interval) * this.interval;

		this.minFreq = minFreq;
		colourScheme.set_min_max(minFreq, this.maxFreq);

		return colourScheme;
	}

	/**
	 * adds freq scale to svg string
	 *
	 * @param {ColourScheme} colourScheme
	 * @param {string} label
	 * @throws {Error}
	 */
	add_freq_scale(colourScheme, label) {
		if (!label) {
			this.add_series_label(label);
		}

		// must have already called initialize_freq_scale

		let rowHeight = SvgMapKey.ROW_HEIGHT;
		let initial = (this.minFreq <= 0) ? 0 : 1;

		let maxLimit, n;
		if ((this.minFreq >= 0 && this.maxFreq == 1) || (this.minFreq == this.maxFreq)) { // cannot not use '===' here as may be string
			// don't show a continuous scale for presence/absence

			colourScheme.plotKeyAsContinuousGradient = false;
			colourScheme.useExplicitFrequencySettings = true;
			this.interval = 1;

			maxLimit = parseInt(this.maxFreq); // cast to numeric if necessary
			n = maxLimit;
		} else {
			if (!colourScheme.useExplicitFrequencySettings) {
				n = this.minFreq + (initial * this.interval);
				maxLimit = this.maxFreq + initial;
			} else {
				n = this.minFreq;
				maxLimit = this.maxFreq;
			}
		}
		let lines = 0;

		let yOrigin = SvgMapKey.PADDING + (this.numberOfItems * SvgMapKey.ROW_HEIGHT) + (this.numberOfSeriesLabels * SvgMapKey.SERIES_LABEL_HEIGHT);

		let scaleMarks = [];

		for (let i = 0; n <= maxLimit; i++) {
			let usedN;

			if (!colourScheme.useExplicitFrequencySettings) {
				// usedN is off-by-one for all but the first value, to make scale numbers round
				usedN = n - initial;
			} else {
				//error_log("using explicit frequency, usedN = {n}");
				usedN = n;
			}

			let y = yOrigin + (i * rowHeight);

			// shouldn't usually scale the key points, because the scale isn't comparable anyway
			// only do so when marker sizes set to vary and there is no colour information to convey
			if (colourScheme instanceof ConstantColourScheme && colourScheme.varyPointSizeFlag) {

				// ly and hy deliberately reversed
				// *1000 scaling to counteract scaling applied in svg_frequency_marker
				let svg = colourScheme.svg_frequency_marker([
					SvgMapKey.PADDING * 1000, // lx
					(y + SvgMapKey.SYMBOL_SIZE) * 1000, // ly
					(SvgMapKey.PADDING + SvgMapKey.SYMBOL_SIZE) * 1000, // hx
					y * 1000,// hy
					usedN //freq
                ]);

				this.svgString += svg;
			} else if (!colourScheme.plotKeyAsContinuousGradient) {
				// fixed size markers

				let svg = SVG.rect(
					SvgMapKey.PADDING, y, SvgMapKey.SYMBOL_SIZE, SvgMapKey.SYMBOL_SIZE,

					((n > 0 || !colourScheme.outlineZeroesFlag) ?
						{
							'fill': colourScheme.get_css_rgb(usedN)
						}
						:
						{
							'fill': 'none',
							'stroke': colourScheme.get_css_rgb(usedN),
							'stroke-width': '2'
						}
					)
				);

				this.svgString += svg;
			}

			if (colourScheme.plotKeyAsContinuousGradient) {
				// save values of N for later plotting of markers
				scaleMarks.push(usedN);
			} else {
				this.svgString += SVG.text(
					parseInt(usedN, 10).toString(),
					(SvgMapKey.PADDING * 2) + SvgMapKey.SYMBOL_SIZE,
					y + SvgMapKey.SYMBOL_SIZE,
					{'font-size' : SvgMapKey.FONT_SIZE}
				);
			}

			if (n < 0 && (n + this.interval) > 0) {
				n = 0;
			} else {
				n += this.interval;

				if (!colourScheme.plotKeyAsContinuousGradient) { // kludge to extend scale to include maximum value
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

			this.svgString += '<linearGradient id="FreqKeyGradient" x1="0" x2="0" y1="0" y2="1">';
			// stops expressed as float from 0 to 1
			for (let stop of colourScheme.stopOffsets) {
				this.svgString += `<stop offset="${stop}" stop-color="${colourScheme.get_css_rgb(((this.maxFreq - this.minFreq) * stop) + this.minFreq)}" />`;
			}
			this.svgString += '</linearGradient>';

			this.svgString += SVG.rect(
				SvgMapKey.PADDING, yOrigin, SvgMapKey.SYMBOL_SIZE, SvgMapKey.PADDING + y - yOrigin,
				{
					'fill': 'url(#FreqKeyGradient)',
					'stroke': 'none',
					'stroke-width': '0'
				}
			);

			for(let n of scaleMarks) {
				if (n <= this.maxFreq) {
					let xOffset = SvgMapKey.PADDING + SvgMapKey.SYMBOL_SIZE;
					let xLength = SvgMapKey.PADDING / 2;

					let markerY = yOrigin + (((SvgMapKey.PADDING + y - yOrigin) / (this.maxFreq - this.minFreq)) * n) + (n < this.maxFreq && n > this.minFreq ? 1 : (n == this.maxFreq ? -0.25 : 0.25)); // 1 is the stroke width (looks messy if marker is hanging off the end

					this.svgString += SVG.path("M{xOffset},{markerY} l{xLength},0",
						{
							'fill': 'none',
							'stroke': colourScheme.get_css_rgb(n),
							'stroke-width': (n == this.minFreq || n == this.maxFreq) ? '0.5' : '1'
						});

					this.svgString += SVG.text(
						parseInt(n, 10).toString(),
						(SvgMapKey.PADDING * 2) + SvgMapKey.SYMBOL_SIZE,
						markerY + (SvgMapKey.SYMBOL_SIZE / 2),
						{'font-size' : SvgMapKey.FONT_SIZE}
						);
				}
			}
		}

		this.height += (rowHeight * lines);
		this.width = 100;

		this.numberOfItems = lines;
	}
}
