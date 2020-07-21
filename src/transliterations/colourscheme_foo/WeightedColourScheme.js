/*
 * BSBI database project
 * (c) 2014,2020 Botanical Society of the Britain and Ireland
 *
 * @author Tom Humphrey <tom.humphrey@bsbi.org>
 */

import {ColourScheme} from "./ColourScheme";

export class WeightedColourScheme extends ColourScheme {
	redWeight = 0;
	greenWeight = 255;
	blueWeight = 0;
	redBase = 0;
	greenBase = 0;
	blueBase = 0;

	set_weights(redBase, greenBase, blueBase, redWeight, greenWeight, blueWeight) {
		if ((redWeight + redBase) > 255) {
			this.redWeight = redWeight / (redWeight + redBase) * 255;
			this.redBase = redBase / (redWeight + redBase) * 255;
		} else {
			this.redWeight = redWeight;
			this.redBase = redBase;
		}

		if ((greenWeight + greenBase) > 255) {
			this.greenWeight = greenWeight / (greenWeight + greenBase) * 255;
			this.greenBase = greenBase / (greenWeight + greenBase) * 255;
		} else {
			this.greenWeight = greenWeight;
			this.greenBase = greenBase;
		}

		if ((blueWeight + blueBase) > 255) {
			this.blueWeight = blueWeight / (blueWeight + blueBase) * 255;
			this.blueBase = blueBase / (blueWeight + blueBase) * 255;
		} else {
			this.blueWeight = blueWeight;
			this.blueBase = blueBase;
		}
	}

	/**
	 * @param minFreq
	 * @param maxFreq
	 * @throws Exception
	 */
	set_min_max(minFreq, maxFreq) {
		if (minFreq < 0) {
			throw new Error("Negative frequencies not allowed for WeightedColourScheme");
		}

		this.min = minFreq;
		this.max = maxFreq;
	}

	rgb(value) {
		if (value > this.max) {
			value = this.max;
		}

		this.r = this.redBase + this.redWeight - Math.floor(value / this.max * this.redWeight);
		this.g = this.greenBase + this.greenWeight - Math.floor(value / this.max * this.greenWeight);
		this.b = this.blueBase + this.blueWeight - Math.floor(value / this.max * this.blueWeight);
	}
}


