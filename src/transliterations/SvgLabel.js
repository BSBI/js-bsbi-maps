/**
 * Map svg rendering functions
 *
 * @author Tom Humphrey <tom.humphrey@bsbi.org>
 */

import {SvgMapComponent} from "./SvgMapComponent";

export class SvgLabel extends SvgMapComponent {
	width = 100;

	/**
	 *
	 * @var int
	 */
	numberOfLines = 1;

	/**
	 *
	 * @param {string} text
	 * @param {number} size
	 */
	set_label(text, size) {
		this.svgString += SVG.text(
			text,
			50,
			size,
			{'font-size' : size.toString(), 'text-anchor' : 'middle'}
			);
		this.height = size * 1.2;
	}
}
