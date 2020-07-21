/**
 *
 * @extends GridFactory
 * @constructor
 */
import {GridFactory} from "./GridFactory";
import {GridCoordsGB, LatLngGB} from "british-isles-gridrefs";

export class GBGridFactory extends GridFactory {

}

GBGridFactory.prototype.GRID_MIN_X = 0;
GBGridFactory.prototype.GRID_MIN_Y = 0;
GBGridFactory.prototype.GRID_MAX_X = 700000;
GBGridFactory.prototype.GRID_MAX_Y = 1300000;
GBGridFactory.prototype.CODE = 'gb';

/**
 *
 * @param {LatLngWGS84} latLngNE
 * @param {LatLngWGS84} latLngSE
 * @param {LatLngWGS84} latLngSW
 * @param {LatLngWGS84} latLngNW
 */
GBGridFactory.prototype.calculate_bounds = function(latLngNE, latLngSE, latLngSW, latLngNW) {
    var ne = LatLngGB.from_wgs84(latLngNE).to_os_coords(),
        se = LatLngGB.from_wgs84(latLngSE).to_os_coords(),
        sw = LatLngGB.from_wgs84(latLngSW).to_os_coords(),
        nw = LatLngGB.from_wgs84(latLngNW).to_os_coords();

    this.minX = Math.min(nw.x, sw.x);
    this.minY = Math.min(sw.y, se.y);
    this.maxX = Math.max(ne.x, se.x);
    this.maxY = Math.max(nw.y, ne.y);
};

/**
 *
 * @type {function (new:GridCoords, number, number)}
 */
GBGridFactory.prototype.ref = GridCoordsGB;

/**
 *
 * @param {number} x
 * @param {number} y
 * @param {GridCoordsGB} loRef
 * @param {GridCoordsGB} hiRef
 * @param {number} tileZoom
 * @returns {boolean}
 */
GBGridFactory.prototype.valid_square = function(x, y, loRef, hiRef, tileZoom) {
    return (tileZoom <= 7) ?
        (x <= 700000 && ((y <= 100000) || (y > 100000 && x >=100000 && y <= 300000) || (y > 300000 && y <= 600000 && x >=200000) || (y > 600000 && y <= 700000 && x >= 100000) || (y > 700000)))
        :
        (x <= 700000 && ((x >= 200000) || (x >=150000 && y < 400000) || (y > 700000) || (y <= 100000) || loRef.is_gb_hectad() || hiRef.is_gb_hectad() ))
        ;
};
