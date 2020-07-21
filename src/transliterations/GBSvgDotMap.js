/*
 * BSBI database project
 * (c) 2014,2020 Botanical Society of the Britain and Ireland
 *
 * @author Tom Humphrey <tom.humphrey@bsbi.org>
 *
 */

import {BritishIslesSvgDotMap} from "./BritishIslesSvgDotMap";
import {SVG} from "./SVG";

const NORTHERN_ISLES_IN_SITU = 's';
const NORTHERN_ISLES_BOXED = 'b';
const NORTHERN_ISLES_HIDDEN = 'h';
const NORTHERN_ISLES_ORKNEY_ONLY = 'o';

/**
 *
 */
export class GBSvgDotMap extends BritishIslesSvgDotMap
{
	static KM_HEIGHT = 1250;

	metresWidth = 700000;
	metresHeight = 1250000;
	width = 700;
	height = BritishIslesSvgDotMap.KM_HEIGHT;
	vcSuffix = ''; // 'H' for Irish vice-counties, '' for Britain
	country = 'gb';
	vcMax = 112;
	comment = 'GB dots';

	componentId = 'GBSvgDotMap';

	/**
	 *
	 * @param {SvgMapContainer} parentSvgContainer
	 * @param {number} xControlPoint
	 * @param {number} yControlPoint
	 * @param {string} northernIsles default '' (show in situ)
	 */
	constructor(parentSvgContainer, xControlPoint = 0.0, yControlPoint = 0.0, northernIsles = '') {
		super(parentSvgContainer, xControlPoint, yControlPoint);

		switch (northernIsles) {
			case NORTHERN_ISLES_BOXED:
			case NORTHERN_ISLES_HIDDEN:
				this.metresHeight = 1000000; //m
				this.height = 1000; // km

				if (SVG.svgTiny) {
					// svg tiny has no cropping support, so as kludge
					// vc 111 (which cuts the edge of the map) is not plotted
					// need to also ensure points in vc 111 also do not appear
					// by chopping off 20 km from dot plotting
					// without affecting the map height

					this.cropMaxY = 980; // km
				}
				break;

			case NORTHERN_ISLES_ORKNEY_ONLY:
				this.metresHeight = 1060000; //m
				this.height = 1060; // km
				break;

			case NORTHERN_ISLES_IN_SITU:
				this.metresHeight = 1250000;
				this.height = 1250; // km
				break;

			default:
				throw new Error(`Unrecognised northern isle mapping code '${northernIsles}'`);
		}
	}
}

