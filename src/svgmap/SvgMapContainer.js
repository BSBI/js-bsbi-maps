/**
 * Map svg rendering functions
 *
 * @author Tom Humphrey <tom.humphrey@bsbi.org>
 */

import {SvgContainer} from "./SvgContainer";
import {SvgMapComponent} from "../transliterations/SvgMapComponent";
import {SVG} from "../transliterations/SVG";

/**
 * Generic container for svg map components,
 * where a component is a map fragment, grid or a key block etc.
 *
 */
export class SvgMapContainer extends SvgContainer
{

	/**
	* base rendering size for symbols (map dots) in km
	* if this matches the map size then width/height attributes do not need to be repeated
	* reducing file size
	*
	* @var float
	*/
	baseSymbolSize = 10;

	boxedInSeaColour = 'none';

	plotMapFrames = false;

	internalBottomPadding = 20; //20;

	_niBoxInsetWidth = 230;

	/**
	 *
	 * @param {SvgMapComponent} mapComponent
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation (default 0)
	 * @param {number} internalBottomPadding default 0 (extra padding to add below map)
	 */
	add_component(mapComponent, x, y, rotation = 0.0, internalBottomPadding = 0) {
		mapComponent.baseSymbolSize = this.baseSymbolSize;

		mapComponent.height += internalBottomPadding;

		this.components[mapComponent.componentId ? mapComponent.componentId : this.components.length]
			 = {object : mapComponent, x : x / 1000, y : (y / 1000), r : rotation};
	}

	expand_width(set, scaleFactor, xShift) {
		let expansionNeeded = ((xShift * 2) + (set.width * scaleFactor)) / (set.width * scaleFactor);

		let scaledShift = (this.width * expansionNeeded) - this.width;

		this.width *= expansionNeeded;

		set.width = (set.width * scaleFactor) + (xShift * 2);

		for (let component of this.components) {
			component['x'] += scaledShift / 2;
		}

		this._niBoxInsetWidth += scaledShift/2;
	}

	/**
	 *
	 * @return string svg content
	 */
	get_content() {
		let svgScript = SVG.comment("BSBI DDB mapping\n- co-ordinates (in km) use the GB or IE ordnance survey grid. The svg file origin is transformed to the SW corner (reversing the conventional svg Y-axis).");

		if (this.plotMapFrames) {
			if (NorthernIslesSvgDotMap.COMPONENT_LABEL in this.components) {
				// have inset northern isles box that needs to be framed

				let ni = this.components[NorthernIslesSvgDotMap.COMPONENT_LABEL].object;

				let niWidth = this._niBoxInsetWidth;
				let niHeight = (ni.height - ni.ly) + 30;

				let seaColour = (this.boxedInSeaColour === 'none' || this.boxedInSeaColour === '') ? 'none' : "#{this.boxedInSeaColour}";

				let frameStrokeWidth = (string)(0.25/0.0784); // was '1' (but that is two narrow for Harrap printing

				if (!SVG.svgTiny) {
					svgScript += SVG.path('M0 0H' + (this.width - niWidth) + 'V' + niHeight + 'h' +
						niWidth + 'v' + (this.height - niHeight) + 'h-' . this.width + 'Z'
						,
						{fill : seaColour, stroke : 'black', 'stroke-width' : frameStrokeWidth, id : 'gbiemapframe'});
				} else {
					svgScript += SVG.path('M0 0L' + (this.width - niWidth) + ' 0L' + (this.width - niWidth) + ' ' + niHeight + 'L' +
						this.width + ' ' + niHeight + 'L' + this.width + ' ' + this.height + 'L0' + ' ' + this.height + 'Z'
						,
						{fill : seaColour, stroke:  'black', 'stroke-width' : frameStrokeWidth, id : 'gbiemapframe'});
				}

				if (ni) {
					svgScript += SVG.rect(this.width - (niWidth - 15), 0, (niWidth - 15), (ni.height - ni.ly) + 15,
						{fill : seaColour, stroke : 'black', 'stroke-width': frameStrokeWidth, id : 'nimapframe'});
				}
			} else {
				svgScript += SVG.rect(0, 0, this.width, this.height,
					{fill : 'none', stroke : 'black', 'stroke-width' : '1', id : 'mapframe'});
			}
		}

		//foreach (this.components as ['object' => object, 'x' => x, 'y' => y, 'r' => rotation]) {
		for (let component of this.components) {
			let object = component.object;
			let x = component.x;
			let y = component.y;
			let rotation = component.rotation;
			let attributes;

			if (object.comment) {
				svgScript += SVG.comment(object.comment);
			}

			let xTranslation = x;
			let yTranslation = (object.metresHeight / 1000) + y;

			if (rotation !== 0 ) {
				attributes = {transform : `translate(${xTranslation} ${yTranslation}) scale(1, -1) rotate(${rotation} ${object.xControlPoint} ${object.yControlPoint})`};
			} else {
				// scale used to flip the y axis so that origin is at the bottom
				attributes = {transform : `translate(${xTranslation} ${yTranslation}) scale(1, -1)`};
			}

			if (object.componentId) {
				attributes.id = object.componentId;
			}

			svgScript += SVG.g(object.render_image(), attributes);
		}

		return svgScript;
	}
}
