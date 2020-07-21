/*
 * BSBI database project
 * (c) 2014,2020 Botanical Society of the Britain and Ireland
 *
 * @author Tom Humphrey <tom.humphrey@bsbi.org>
 */

/**
 * Colour mapping functions
 *
 */
export class ColourScheme {
	/**
	 * @type {number}
	 */
	r;

	/**
	 * @type {number}
	 */
	g;

	/**
	 * @type {number}
	 */
	b;

	midpoint;

	static CSS_OUTLINED_ZERO_COLOUR = 'gray';

	/**
	 * minimum frequency
	 *
	 * @var {number}
	 */
	min = 0;

	/**
	 * maximum frequency
	 *
	 * @var {number}
	 */
	max = 1;

	/**
	 * If set then the scale legend should reflect the explicitly specified min max values
	 * (i.e. these are not just inferred from the data)
	 * default false
	 *
	 * @var boolean
	 */
	useExplicitFrequencySettings = false;

	/**
	 * if set then points that the colour-scheme applies to should have variable
	 * area depending on the value
	 * default false
	 *
	 * @var boolean
	 */
	varyPointSizeFlag = false;

	/**
	 * if set then show zero-values as an outlined marker
	 *
	 * @var boolean
	 */
	outlineZeroesFlag = false;

	rgb(value) {}

	static FREQUENCY_MARKER_FILLED_SQUARE = 'sf';
	static FREQUENCY_MARKER_FILLED_CIRCLE = 'cf';

	frequencyMarkerStyle = ColourScheme.FREQUENCY_MARKER_FILLED_CIRCLE; // self::FREQUENCY_MARKER_FILLED_SQUARE;

	/**
	 * if set then plot frequencies scale using a continuous gradient rather than as discreet exemplar colours
	 * (actually colours used on map are always continuous)
	 *
	 * @var boolean
	 */
	plotKeyAsContinuousGradient = false;

	/**
	 * for linear gradients divide the range using spot colours at specified offsets (fraction from 0 - 1)
	 * default is just a start (0) and end (1)
	 *
	 * @var float[]
	 */
	stopOffsets = [0, 1];

	/**
	 *
	 * @param {[number, number, number, number, number]} row (lx,ly,hx,hy,freq)
	 * @return string
	 * @throws Exception
	 */
	svg_frequency_marker(row) {
		switch (this.frequencyMarkerStyle) {
			case ColourScheme.FREQUENCY_MARKER_FILLED_SQUARE: {
				let width,inset,svgString;
				if (this.varyPointSizeFlag && (row[4] > 0 || !this.outlineZeroesFlag)) {
					// vary the area of points in proportion to value
					// (unless outlined zero - which needs to be full size)

					width = (row[2] - row[0]);
					inset = (width - Math.sqrt((row[4] / this.max) * width * width)) / 2;
				} else {
					inset = 0;
				}

				svgString = SVG.rect(
					(row[0] + inset) / 1000,
					(row[3] + inset) / 1000,
					(row[2] - row[0] - (inset * 2)) / 1000,
					(row[1] - row[3] - (inset * 2)) / 1000,

					((row[4] > 0 || !this.outlineZeroesFlag) ?
							{
								fill: this.get_css_rgb(row[4]),
								stroke: 'none',
								'stroke-width': '0'
							}
							:
							{
								fill: 'none',
								stroke: ColourScheme.CSS_OUTLINED_ZERO_COLOUR, // this.get_css_rgb(row[4]), // // can't use scale colour as won't show against background
								'stroke-width': '1'
							}
					)
				);

				return svgString;
			}
			case ColourScheme.FREQUENCY_MARKER_FILLED_CIRCLE: {
				let radius, unscaledRadius, svgString;
				radius = (row[2] - row[0]) / 2;
				unscaledRadius = radius;

				if (this.varyPointSizeFlag && (row[4] > 0 || !this.outlineZeroesFlag)) {
					// vary the area of points in proportion to value
					// (unless outlined zero - which needs to be full size)

					radius = Math.sqrt((row[4] / this.max) * radius * radius);
				}

				svgString = SVG.circle(
					(row[0] + unscaledRadius) / 1000, // centre x
					(row[3] + unscaledRadius) / 1000, // centre y
					(this.varyPointSizeFlag ?
						//sqrt((row[4] / this.max) * radius * radius)
						sqrt(row[4] / this.max) * radius
						:
						radius
					) / 1000, // radius
					((row[4] > 0 || !this.outlineZeroesFlag) ?
						{fill : this.get_css_rgb(row[4])}
					:
						{fill : 'none',
							stroke : this.get_css_rgb(row[4]),
							'stroke-width' : '2'
						}
					)
				);

				return svgString;
			}
			default:
				throw new Error(`Unrecognized frequency marker style '${this.frequencyMarkerStyle}'`);
		}
	}

	get_component_rgb(value) {
		this.rgb(value);

		return {r : this.r, g : this.g, b : this.b};
	}

	// apply_to_gd(value, image) {
	// 	this.rgb(value);
	//
	// 	return imagecolorallocate(image, this.r, this.g, this.b);
	// }

	get_hex_rgb(value) {
		this.rgb(value);

		return ((this.r & 255) << 16) | ((this.g & 255) << 8) | (this.b & 255);
	}

	get_css_rgb(value) {
		this.rgb(value);

		let rgb = `${this.r.toString(16)}${this.g.toString(16)}${this.b.toString(16)}`; //sprintf('#%02x%02x%02x', this.r, this.g, this.b);

		if (rgb.length > 7) {
			console.log(`problem rgb: ${rgb} ${this.r} ${this.g} ${this.b} ${value} ${this.midpoint} ${this.max} ${this.min}`);
		}

		return rgb;
	}

	set_min_max(minFreq, maxFreq) {
		this.min = minFreq;
		this.max = maxFreq;
	}
}


