/**
 * Map svg rendering functions
 *
 * @author Tom Humphrey <tom.humphrey@bsbi.org>
 */



/**
 * Generic container for svg map components,
 * where a component is a map fragment or a key block
 *
 */
export class SvgContainer
{
	/**
	 * [	object => SvgMapComponent,
	 * 		x => x
	 * 		y => y
	 * 		r => r
	 * ]
	 *
	 * @var [][]
	 */
	components = [];

	/**
	 *
	 * @var float
	 */
	width;

	/**
	 *
	 * @var float
	 */
	height;

	/**
	 * x-origin of the viewport
	 *
	 * @var float
	 */
	lx = 0;

	/**
	 * y-origin of the viewport
	 *
	 * @var float
	 */
	ly = 0;

	/**
	 * hexadecimal colour or 'none'
	 *
	 * @var string
	 */
	backgroundColour = 'none';

	/**
	 * optional xml comment written to the file before output of this container
	 *
	 * @var string
	 */
	fileComment = '';

	/**
	 *
	 * @var array array of svg definition strings
	 */
	defs = [];

	/**
	 *
	 * @var string
	 */
	containerId;

	/**
	 * @var bool
	 */
	noClip = false;

	/**
	 * this is set to true for titles and captions, but currently is never used when rendering the layout
	 *
	 * @var bool
	 */
	centeredHorizontally = false;

	/**
	 *
	 * @returns {string}
	 */
	get_css() {
		let styles = [];

		for (let component of this.components) {
			Array.prototype.push.apply(styles, component.object.styleString);
		}

		let cssString = '';
		for (let dfn of styles) {
			cssString += `\n${dfn.selector} {${dfn.declaration};}`;
		}

		return cssString;
	}

	/**
	 *
	 * @returns {string}
	 */
	get_defs() {
		for (let component of this.components) {
			Array.prototype.push.apply(this.defs, component.object.definitionsString);
		}

		return this.defs.join("\n");
	}

	/**
	 *
	 * @param definitionString
	 */
	add_def(definitionString) {
		this.defs.push(definitionString);
	}

	/**
	 *
	 * @param {SvgMapComponent} component
	 * @param {number} x
	 * @param {number} y
	 * @param {number} rotation
	 */
	add_component(component, x, y, rotation = 0.0) {
		this.components[component.componentId ? component.componentId : this.components.length] = {
			object : component,
			x : x,
			y : y,
			r : rotation
		};

		if (this.width < component.width) {
			this.width = component.width;
		}

		if (this.height < component.height) {
			this.height = component.height;
		}
	}

	/**
	 * @return string
	 */
	get_content() {
		let svgScript;

		if (this.fileComment) {
			svgScript = SVG.comment(this.fileComment);
		} else {
			svgScript = "\n";
		}

		for(let component of this.components) {
			let object = component.object;
			let x = component.x;
			let y = component.y;
			let rotation = component.rotation;

			/** @var SVGMapComponent object */

			if (object.comment) {
				svgScript += SVG.comment(object.comment);
			}

			let xTranslation = x;
			let yTranslation = y;

			if (rotation !== 0 ) {
				svgScript += SVG.g(
					object.render_image(),
					{transform : `translate(${xTranslation} ${yTranslation}) scale(1, 1) rotate(${rotation} ${object.xControlPoint} ${object.yControlPoint})`}
				);
			} else {
				svgScript += SVG.g(
					object.render_image(),
					{transform : `translate(${xTranslation} ${yTranslation}) scale(1, 1)`}
				);
			}
		}

		return svgScript;
	}
}
