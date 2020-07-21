/*
 * BSBI database project
 * (c) 2014, 2020 Botanical Society of the Britain and Ireland
 *
 * @author Tom Humphrey <tom.humphrey@bsbi.org>
 *
 */

import {SvgMapComponent} from "./SvgMapComponent";
import {GridCoordsCI, GridCoordsGB, GridCoordsIE} from "british-isles-gridrefs";

/**
 *
 */
export class BritishIslesSvgGrid extends SvgMapComponent
{
	/**
	 * x origin (km)
	 *
	 * @var float
	 */
	lx = 0;

	/**
	 * y origin (km)
	 *
	 * @var float
	 */
	ly = 0;

	/**
	 * lower-case country code (e.g. 'gb','ie','ci')
	 *
	 * @var string
	 */
	country;

	/**
	 * Comment added to svg file source (not visible to end user)
	 *
	 * @var string
	 */
	comment = 'grid lines';

	/**
	 *
	 * @param {SvgMapContainer} parentSvgContainer
	 * @param {number} xControlPoint
	 * @param {number} yControlPoint
	 */
	constructor(parentSvgContainer, xControlPoint = 0.0, yControlPoint = 0.0) {
		super(parentSvgContainer, xControlPoint, yControlPoint);

		this.height = (this.metresHeight / 1000);
		this.width = (this.metresWidth / 1000);
	}

	/**
	 *
	 * @param {Object.<string, {interval : number, css : string}>} grids gridname=>array(interval=>kms) - must be arranged by order of interval size, largest first
	 */
	plot_grids(grids) {
		let lx = this.lx;
		let ly = this.ly;
		let hx = lx + this.width;
		let hy = ly + this.height;

		let paths = {};

		for(let key in grids) {
			if (grids.hasOwnProperty(key)) {
				paths[key] = '';
			}
		}

		for (let x = lx; x <= hx; x++) {
			for(let key in grids) {
				if (grids.hasOwnProperty(key)) {
					let gridDefn = grids[key];

					if (x % gridDefn.interval === 0) {
						paths[key] += `M${x} ${ly}v${this.height}`;
						break;
					}
				}
			}
		}

		for (let y = ly; y <= hy; y++) {
			for(let key in grids) {
				if (grids.hasOwnProperty(key)) {
					let gridDefn = grids[key];

					if (y % gridDefn.interval === 0) {
						paths[key] += `M${lx} ${y}h${this.width}`;
						break;
					}
				}
			}
		}

		for (let key in paths) {
			if (paths.hasOwnProperty(key)) {
				let path = paths[key];
				if (path) {
					this.svgString += SVG.path(paths[key], {'class': key}) + "\n";
					this.styleString[`gridline${key}`] = {selector: `path.${key}`, declaration: grids[key].css};
				}
			}
		}
	}

	/**
	 *
	 * @param {Object.<string, {interval : number, css : string, showLabel : boolean}>} grids gridname=>array(interval=>kms, css=>string) - must be arranged by order of interval size, largest first
	 * @throws Exception
	 */
	plot_grid_cell_labels(grids) {
		let haveLabels, ref;

		for (let grid of grids) {
			if (grid.showLabel) {
				haveLabels = true;
				break;
			}
		}

		if (haveLabels) {
			//  at least  one grid has labels shown

			let lx = this.lx;
			let ly = this.ly;
			let hx = lx + this.width;
			let hy = ly + this.height;

			/**
			 * @type {GridCoords} ref
			 */

			switch (this.country) {
				case 'gb':
				ref = new GridCoordsGB;
				break;

				case 'ie':
				ref = new GridCoordsIE;
				break;

				case 'ci':
				ref = new GridCoordsCI;
				break;

				default:
				throw new Error(`Unrecognized country '${this.country}' when labelling grid squares.`);
			}

			for (let x = lx; x <= hx; x++) {
				for(let gridDefn of grids) {
					let y;

					if ((x % gridDefn.interval === 0) &&
						gridDefn.showLabel) {

						if (ly % gridDefn.interval) {
							y = ly + (gridDefn.interval - (ly % gridDefn.interval)); // round up to next unit of interval
						} else {
							y = ly;
						}

						for (; y <= hy; y+= gridDefn.interval) {
							//ref.set_e_n(x * 1000, y * 1000);
							ref.x = x * 1000;
							ref.y = y * 1000;
							let label = ref.to_gridref(gridDefn.interval * 1000);

							let useY = y + (gridDefn.interval / 2); // mid-square
							let size = gridDefn.interval * 0.3;
							let strokeWidth = gridDefn.interval / 100;

							// scale/translate combination require to avoid plotting text with y-flip
							// as overall co-ordinate scheme is reversed
							this.svgString += SVG.text(
								label,
								x + (gridDefn.interval / 2),
								useY,
								{	'font-size' : `${size}px`,
									'transform' : `scale(1, -1) translate(0,${useY * -2})`,
									'text-anchor' : 'middle',
									'dominant-baseline' : 'central',
									'fill' : 'none',
									'stroke' : 'black',
									'stroke-width' : `${strokeWidth}px`
								});
						}
					}
				}
			}
		}
	}
}
