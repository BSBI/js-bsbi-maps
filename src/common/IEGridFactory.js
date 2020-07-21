/**
 *
 * @extends GridFactory
 * @constructor
 */
import {GridFactory} from "./GridFactory";
import {GridCoordsIE, LatLngIE} from "british-isles-gridrefs";

export class IEGridFactory extends GridFactory {
}

IEGridFactory.prototype.GRID_MIN_X = 0;
IEGridFactory.prototype.GRID_MIN_Y = 0;
IEGridFactory.prototype.GRID_MAX_X = 400000;
IEGridFactory.prototype.GRID_MAX_Y = 500000;

IEGridFactory.prototype.CODE = 'ie';

/**
 *
 * @param {LatLngWGS84} latLngNE
 * @param {LatLngWGS84} latLngSE
 * @param {LatLngWGS84} latLngSW
 * @param {LatLngWGS84} latLngNW
 * @returns {undefined}
 */
IEGridFactory.prototype.calculate_bounds = function(latLngNE, latLngSE, latLngSW, latLngNW) {
    var ne = LatLngIE.from_wgs84(latLngNE).to_os_coords(),
        se = LatLngIE.from_wgs84(latLngSE).to_os_coords(),
        sw = LatLngIE.from_wgs84(latLngSW).to_os_coords(),
        nw = LatLngIE.from_wgs84(latLngNW).to_os_coords();

    this.minX = Math.min(nw.x, sw.x);
    this.minY = Math.min(sw.y, se.y);
    this.maxX = Math.max(ne.x, se.x);
    this.maxY = Math.max(nw.y, ne.y);
};

/**
 *
 * @type {function (new:GridCoords, number, number)}
 */
IEGridFactory.prototype.ref = GridCoordsIE;

/**
 *
 * @param {number} x
 * @param {number} y
 * @param {GridCoordsIE} loRef (unused)
 * @param {GridCoordsIE} hiRef (unused)
 * @param {number} tileZoom
 * @returns {boolean}
 */
IEGridFactory.prototype.valid_square = function(x, y, loRef, hiRef, tileZoom) {
    return (tileZoom <= 7) ?
        (y > 100000) || (y <= 100000 && x < 400000)
        :
        (x <= 340000 && y < 430000) || (x <= 320000 && y >= 450000 && y <= 470000) || (y >= 300000 && y <= 430000 && x <= 370000) || (y >= 430000 && y <= 450000 && x <= 330000 )
        ;
};
