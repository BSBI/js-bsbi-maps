/*
 * BSBI database project
 * (c) 2014, 2020 Botanical Society of the Britain and Ireland
 *
 * @author Tom Humphrey <tom.humphrey@bsbi.org>
 *
 */

import {BritishIslesSvgDotMap} from "./BritishIslesSvgDotMap";

/**
 *
 */
class IESvgDotMap extends BritishIslesSvgDotMap
{
	KM_HEIGHT = 500;

	metresWidth = 400000;
	metresHeight = 500000;
	width = 400;
	height = IESvgDotMap.KM_HEIGHT;
	vcSuffix = 'H'; // 'H' for Irish vice-counties, '' for Britain
	country = 'ie';
	vcMax = 40;
	comment = 'IE dots';

	componentId = 'IESvgDotMap';

	/**
	 * to prevent GB-overlap the Irish 'rectangle' has the NE corner sliced off
	 *
	 */
	plot_container_rect() {
		this.svgString += SVG.path(
			'M0 0l0 490l294-5l96-127l-8-358z',
			{'stroke' : 'none', 'fill' : 'none', 'pointer-events' : 'all'}
		);
	}
}
