/**
 * BSBI database project
 * (c) 2011, 2020 Botanical Society of Britain and Ireland
 *
 * @author Tom Humphrey <tom.humphrey@bsbi.org>
 */
import {escapeHTML} from "../utils/escapeHTML";
import {SvgMapComponent} from "./SvgMapComponent";

const deg2rad = Math.PI / 180;
//const rad2deg = 180.0 / Math.PI;

/**
 *
 */
export class SVG extends XML {

	static SYMBOL_FILLEDSQUARE = 'filledsquare';
	static SYMBOL_FILLEDCIRCLE = 'filledcircle';
	static SYMBOL_FILLEDDIAMOND = 'filleddiamond';
	static SYMBOL_FILLEDUPTRIANGLE = 'filleduptriangle';
	static SYMBOL_FILLEDDOWNTRIANGLE = 'filleddowntriangle';
	static SYMBOL_OPENSQUARE = 'opensquare';
	static SYMBOL_OPENCIRCLE = 'opencircle';
	static SYMBOL_OPENDIAMOND = 'opendiamond';
	static SYMBOL_OPENUPTRIANGLE = 'openuptriangle';
	static SYMBOL_OPENDOWNTRIANGLE = 'opendowntriangle';
	static SYMBOL_PLUS = 'plus';
	static SYMBOL_EX = 'ex';
	static SYMBOL_NONE = 'none';

	/**
	 * @var callable[]
	 */
	static symbols;

	/**
	 * xlink namespace for SVG 1.1 but deprecated in SVG
	 * for browser use don't include this, but exported files should include it for compatibility with Inkscape
	 *
	 * @var bool
	 */
	static useXrefHref = true;

	static SYMBOL_NAMES = {
		filledsquare : 'filled square',
		filledcircle : 'filled circle',
		filleddiamond : 'filled diamond',
		filleduptriangle : 'filled triangle (up)',
		filleddowntriangle : 'filled triangle (down)',
		opensquare : 'open square',
		opencircle : 'open circle',
		opendiamond : 'open diamond',
		openuptriangle : 'open triangle (up)',
		opendowntriangle : 'open triangle (down)',
		plus : '(+)',
		ex : '(x)',
		none : 'none'
	};

	/**
	 *
	 * @type {boolean}
	 * @private
	 */
	static _symbolsInitialised = false;

	/**
	 * css to use for the uncolour-coded status symbol markers used in the key
	 *
	 * @type {string}
	 */
	static defaultMarkerCss = 'stroke-width: 0.2; stroke: black; fill: black';

	/**
	 * UniConvertor (needed for Adobe Illustrator export)
	 * can't cope with class based stylesheets on used objects
	 * so need to merge in the inherited style
	 *
	 * default false
	 *
	 * @type {boolean}
	 */
	static avoidCSSClasses = false;

	/**
	 * if set then assume that output may be later treated as SVG tiny
	 * - so croppping may not work properly
	 * - applies to exports to AI files via uniconvertor
	 *
	 * default false
	 *
	 * @type {boolean}
	 */
	static svgTiny = false;

	/**
	 * Scribus (and possibly also Illustrator) can't cope with nested SVG elements
	 * scripting of the maps currently requires these so for the
	 * web viewer must be TRUE (default)
	 *
	 * @type {boolean}
	 */
	static allowNestedSvgElements = true;

	/**
	 * styles in string 1 taken precedence
	 *
	 * @param {string} styleString1
	 * @param {string} styleString2
	 * @returns {string}
	 */
	static styleMerge(styleString1, styleString2) {
		if (styleString2) {
			const styleStringSet1 = styleString1.replace(/^;+|;+$/g, '').split(';');
			const styleStringSet2 = styleString2.replace(/^;+|;+$/g, '').split(';');

			const styles = {};

			// parse string 2 first then override with string 1
			for (let styleClause of styleStringSet2) {
				let name,value;
				[name, value] = styleClause.split(':',2);
				styles[name.trim()] = value.trim();
			}

			for (let styleClause of styleStringSet1) {
				let name,value;
				[name, value] = styleClause.split(':',2);
				styles[name.trim()] = value.trim();
			}

			styleString1 = '';
			for(let name of styles.keys()) {
				styleString1 += `${name}:${styles[name]};`;
			}
		}

		return styleString1;
	}

	static initialise_symbols() {
		if (!SVG._symbolsInitialised) {
			SVG._symbolsInitialised = true;

			SVG.symbols = {}
			SVG.symbols[SVG.SYMBOL_FILLEDSQUARE] = (length, className, styleString = '') =>
				SVG.rect(0, 0, length, length, {class : className, style : SVG.styleMerge("stroke: none;stroke-width: 0;", styleString)});

			SVG.symbols[SVG.SYMBOL_FILLEDCIRCLE] = (length, className, styleString = '') =>
				SVG.circle(length/2, length/2, length/2, {class : className, style : SVG.styleMerge("stroke: none;stroke-width: 0;", styleString)});

			SVG.symbols[SVG.SYMBOL_FILLEDDIAMOND] = (length, className, styleString = '') => {
				let m = length/2;
				return SVG.path(`M0 ${m} L${m} ${length} L${length} ${m} L${m} 0 z`, {class : className, style : SVG.styleMerge("stroke: none;stroke-width: 0;", styleString)});
			};

			SVG.symbols[SVG.SYMBOL_FILLEDDOWNTRIANGLE] = (length, className, styleString = '') => {
				let o = Math.tan(deg2rad * 15) * length;
				return SVG.path(`M0 0 L${o} ${length} L${length} ${o} z`, {class : className, style : SVG.styleMerge("stroke: none;stroke-width: 0;", styleString)});
			};

			SVG.symbols[SVG.SYMBOL_FILLEDUPTRIANGLE] = (length, className, styleString = '') => {
				let o = Math.tan(deg2rad *15) * length;
				return SVG.path(`M0 ${length} L${length} ${length-o} L${o} 0 z`, {class : className, style : SVG.styleMerge("stroke: none;stroke-width: 0;", styleString)});
			};

			SVG.symbols[SVG.SYMBOL_OPENSQUARE] = (length, className, styleString = '') => {
				// inset the the border by 1 so that adjacent squares are distinct
				return SVG.rect(1, 1, length-2, length-2, {class : className, style : SVG.styleMerge("fill: none;shape-rendering: geometricPrecision;", styleString)});
			};

			SVG.symbols[SVG.SYMBOL_OPENCIRCLE] = (length, className, styleString = '') => {
				return SVG.circle(length/2, length/2, length/2, {class : className, style : SVG.styleMerge("fill: none;", styleString)});
			};

			SVG.symbols[SVG.SYMBOL_OPENDIAMOND] = (length, className, styleString = '') => {
				let m = length/2;
				return SVG.path(`M0 ${m} L${m} ${length} L${length} ${m} L${m} 0 z`, {class : className, style : SVG.styleMerge("fill: none;", styleString)});
			};

			SVG.symbols[SVG.SYMBOL_OPENDOWNTRIANGLE] = (length, className, styleString = '') => {
				let o = Math.tan(deg2rad * 15) * length;
				return SVG.path(`M0 0 L${o} ${length} L${length} ${o} z`, {class : className, style : SVG.styleMerge("fill: none;", styleString)});
			};

			SVG.symbols[SVG.SYMBOL_OPENUPTRIANGLE] = (length, className, styleString = '') => {
				let o = Math.tan(deg2rad * 15) * length;
				return SVG.path(`M0 ${length} L${length} ${length-o} L${o} 0 z`, {class : className, style : SVG.styleMerge("fill: none;", styleString)});
			};

			SVG.symbols[SVG.SYMBOL_PLUS] = (length, className, styleString = '') => {
				let m = length/2;
				return SVG.path(`M0 ${m} L${length} ${m} M${m} 0 L${m} ${length}`, {class : className, style : SVG.styleMerge("fill: none;", styleString)});
			};

			SVG.symbols[SVG.SYMBOL_EX] = (length, className, styleString = '') => {
				return SVG.path(`M0 0 L${length} ${length} M${length} 0 L0 ${length}`, {class : className, style : SVG.styleMerge("fill: none;", styleString)});
			};

			SVG.symbols[SVG.SYMBOL_NONE] = (length, className, styleString = '') => {
				return SVG.path("", {class : className, style : SVG.styleMerge("fill: none;", styleString)});
			};

		}
	}

	/**
	 *
	 * @param {number} x
	 * @param {number} y
	 * @param {number} width
	 * @param {number} height
	 * @param {{}} attributes
     * @returns {string}
	 */
	static rect(x, y, width, height, attributes = {}) {
		let atts = '';
		for (let key of attributes.keys()) {
			atts += ` ${key}='${escapeHTML(attributes[key])}'`;
		}

		return `<rect x='${x}' y='${y}' width='${width}' height='${height}'${atts} />`;
	}

	/**
	 *
	 * @param {string} textString
	 * @param {number} x
	 * @param {number} y
	 * @param {{}} attributes [optional]
     * @returns {string}
	 */
	static text(textString, x, y, attributes = {}) {
		let atts = '';

		for (let key of attributes.keys()) {
			atts += ` ${key}='${escapeHTML(attributes[key])}'`;
		}

		return `<text x='${x}' y='${y}'${atts}>${escapeHTML(textString)}</text>`;
	}

	/**
	 *
	 * @param {number} x
	 * @param {number} y
	 * @param {number} r
	 * @param {{}} attributes
     * @returns {string}
	 */
	static circle(x, y, r, attributes = {}) {
		let atts = '';

		for (let key of attributes.keys()) {
			atts += ` ${key}='${escapeHTML(attributes[key])}'`;
		}

		return `<circle cx='${x}' cy='${y}' r='${r}'${atts} />`;
	}

	/**
	 *
     * @param {string} refId
	 * @param {number} x
	 * @param {number} y
	 * @param {string} width [optional] default '' width of container rectangle (*does not* cause scaling of the used object)
	 * @param {string} height [optional] default '' height of container rectangle (*does not* cause scaling of the used object)
	 * @param {{}} attributes [optional]
     * @return string
	 */
	static use_definition(refId, x, y, width = '', height = '', attributes = {}) {
		let atts = '';

		for (let key of attributes.keys()) {
			atts += ` ${key}='${escapeHTML(attributes[key])}'`;
		}

		// was xlink:href (now deprecated)
		return `<use ${SVG.useXrefHref ? 'xlink:href' : 'href'}='${escapeHTML(SvgMapComponent.seek_uri_for_definition_id(refId))}' x='${x}' y='${y}'${width ? ` width='${width}'` : ''}` +
            `${height ? ` height='${height}'` : ''}${atts}/>`;
	}

	/**
	 *
	 * @param {string} url
	 * @param {string} refId
	 * @param {number} x
	 * @param {number} y
	 * @param {string} width [optional] default '' width of container rectangle (*does not* cause scaling of the used object)
	 * @param {string} height [optional] default '' height of container rectangle (*does not* cause scaling of the used object)
	 * @param {{}} attributes [optional]
	 * @returns {string}
	 */
	static use_url(url, refId, x, y, width = '', height = '', attributes = {}) {
		let atts = '';

		for (let key of attributes.keys()) {
			atts += ` ${key}='${escapeHTML(attributes[key])}'`;
		}

		return `<use ${SVG.useXrefHref ? 'xlink:href' : 'href'}='${escapeHTML(`${url}#${refId}`)}' x='${x}' y='${y}'${width ? ` width='${width}'` : ''}` +
			`${height ? ` height='${height}'` : ''}${atts}/>`;
	}

	/**
	 * @param {string} content
	 * @param {number} width
	 * @param {number} height
	 * @param {{}} attributes
	 * @returns {string}
	 */
	static symbol(content, width, height, attributes = {}) {
		let atts = '';

		for (let key of attributes.keys()) {
			atts += ` ${key}='${escapeHTML(attributes[key])}'`;
		}

		return `<symbol viewbox='0 0 ${width} ${height}'${atts}>${content}</symbol>`;
	}

	/**
	 *
	 * @param {string} pathString
	 * @param {{}} attributes
     * @return string
	 */
	static path(pathString, attributes = {}) {
		let atts = '';

		for (let key of attributes.keys()) {
			atts += ` ${key}='${escapeHTML(attributes[key])}'`;
		}

		return `<path d='${pathString}'${atts}/>`;
	}

    /**
     *
     * @param {string} data
     * @returns {string}
     */
	static compress_path_data_string(data) {
		return data.replace(/\s*([-mlz]+)\s*/i, '$1');
	}

	/**
	 *
	 * @param {string} svgContent
	 * @param {{}} attributes
     * @return string
	 */
	static g(svgContent, attributes = []) {
		let atts = '';

		for (let key of attributes.keys()) {
			atts += ` ${key}='${escapeHTML(attributes[key])}'`;
		}

		return `<g${atts}>${svgContent}</g>`;
	}

	/**
	 * use as an inner svg container
	 * (e.g. to establish a new viewport)
	 *
	 * @param {string} svgContent
	 * @param {{}} attributes
     * @return {string}
	 */
	static svgElement(svgContent, attributes = []) {
		let atts = '';

		for (let key of attributes.keys()) {
			atts += ` ${key}='${escapeHTML(attributes[key])}'`;
		}

		return `<svg${atts}>${svgContent}</svg>`;
	}

	/**
	 *
	 * @param {{}} styles
     * @return {string}
	 */
	static style(styles) {
		let css = '';
		for (let key of styles.keys()) {
			let dfn = styles[key];

			css += `\n${dfn.selector} {${dfn.declaration};}`;
		}

		return `\n<style type='text/css'><![CDATA[${css}\n]]></style>`;
	}
}
