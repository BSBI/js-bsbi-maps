/*
 * BSBI database project
 * (c) 2014, 2020 Botanical Society of the Britain and Ireland
 *
 * @author Tom Humphrey <tom.humphrey@bsbi.org>
 *
 */

import {BritishIslesSvgDotMap} from "./BritishIslesSvgDotMap";

class CISvgDotMap extends BritishIslesSvgDotMap
{
	KM_HEIGHT = 100;

	metresWidth = 100000;
	metresHeight = 100000;
	width = 100;
	height = CISvgDotMap.KM_HEIGHT;
	vcSuffix = ''; // 'H' for Irish vice-counties, '' for Britain
	country = 'ci';
	vcMax = 113;
	comment = 'Channel Island dots';

	componentId = 'CISvgDotMap';

	// constructor(parentSvgContainer, xControlPoint = 0, yControlPoint = 0) {
	// 	super(parentSvgContainer, xControlPoint, yControlPoint);
	// }
}
