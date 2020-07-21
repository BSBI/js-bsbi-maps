/*
 * BSBI database project
 * (c) 2014,2020 Botanical Society of the Britain and Ireland
 *
 * @author Tom Humphrey <tom.humphrey@bsbi.org>
 */

import {ColourScheme} from "./ColourScheme";

export class LinearGreenColourScheme extends ColourScheme {
	r = 0;
	b = 0;

	/**
	 * @param minFreq
	 * @param maxFreq
	 * @throws Exception
	 */
	set_min_max(minFreq, maxFreq) {
		if (minFreq < 0) {
			throw new Error("Negative frequencies not allowed for LinearColourScheme");
		}

		this.min = minFreq;
		this.max = maxFreq;
	}

	rgb(value) {
		if (value < this.min) {
			console.log("LinearGreen colour scheme, invalid value: {value} < {this.min}");
			value = this.min;
		} else if (value > this.max) {
			console.log("LinearGreen colour scheme, invalid value: {value} > {this.max}");
			value = this.max;
		}

		this.g = 255 - Math.floor(value / this.max * 255);
	}
}
