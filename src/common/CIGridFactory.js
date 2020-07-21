import {GridFactory} from "./GridFactory";
import {GridCoordsCI, LatLngCI} from "british-isles-gridrefs";

export class CIGridFactory extends GridFactory {
}


CIGridFactory.prototype.GRID_MIN_X = 500000;
CIGridFactory.prototype.GRID_MIN_Y = 5400000;
CIGridFactory.prototype.GRID_MAX_X = 600000;
CIGridFactory.prototype.GRID_MAX_Y = 5520000; // take in a bit of WA to include Alderney

CIGridFactory.prototype.CODE = 'ci';

/**
 *
 * @param {LatLngWGS84} latLngNE
 * @param {LatLngWGS84} latLngSE
 * @param {LatLngWGS84} latLngSW
 * @param {LatLngWGS84} latLngNW
 * @returns {undefined}
 */
CIGridFactory.prototype.calculate_bounds = function(latLngNE, latLngSE, latLngSW, latLngNW) {
    const ne = LatLngCI.from_wgs84(latLngNE).to_os_coords(),
        se = LatLngCI.from_wgs84(latLngSE).to_os_coords(),
        sw = LatLngCI.from_wgs84(latLngSW).to_os_coords(),
        nw = LatLngCI.from_wgs84(latLngNW).to_os_coords();

    this.minX = Math.min(nw.x, sw.x);
    this.minY = Math.min(sw.y, se.y);
    this.maxX = Math.max(ne.x, se.x);
    this.maxY = Math.max(nw.y, ne.y);
};

/**
 *
 * @type {function (new:GridCoords, number, number)}
 */
CIGridFactory.prototype.ref = GridCoordsCI;

/**
 *
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
CIGridFactory.prototype.valid_square = function(x, y) {
    return (x >=500000 && y >5400000 && x <= 600000);
};
