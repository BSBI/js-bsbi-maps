/**
 * @property {number} minX
 * @property {number} minY
 * @property {number} maxX
 * @property {number} maxY
 *
 * @property {number} GRID_MIN_X
 * @property {number} GRID_MIN_Y
 * @property {number} GRID_MAX_X
 * @property {number} GRID_MAX_Y
 * @property {string} CODE
 *
 * @property {function (new:NationalGridCoords, number, number)} ref
 * @constructor
 */
export class GridFactory {

}

/**
 *
 * @param {GmapTile} tile
 * @returns {undefined}
 */
GridFactory.prototype.bind_svg_tile = function(tile) {
    this.tile = tile;
};

/**
 *
 * @param {number} x
 * @param {number} y
 * @param {NationalGridCoords} loRef
 * @param {NationalGridCoords} hiRef
 * @param {number} tileZoom
 * @abstract
 * @returns {boolean}
 */
GridFactory.prototype.valid_square = function(x, y, loRef, hiRef, tileZoom) {
    throw new Error('call to abstract method GridFactory.prototype.valid_square');
};
