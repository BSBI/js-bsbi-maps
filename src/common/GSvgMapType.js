import {GmapTile} from "./GMapTile";
import {GoogleMapUtility} from "./GoogleMapUtility";
import {GBGridFactory} from "./GBGridFactory";
import {IEGridFactory} from "./IEGridFactory";
import {CIGridFactory} from "./CIGridFactory";

export class GSvgMapType {

    /**
     *
     * @param {google.maps.Size} tileSize
     * @constructor
     */
    constructor(tileSize) {
        this.tileSize = tileSize;
    };
}

GSvgMapType.prototype.maxZoom = 19;

/**
 *
 * @type {GMap}
 */
GSvgMapType.prototype.parentGmap = null;

/**
 *
 * @param {GMap} bsbiGmap
 * @returns {undefined}
 */
GSvgMapType.prototype.bind_bsbi_gmap = function(bsbiGmap) {
    this.parentGmap = bsbiGmap;
};

/**
 *
 * @see https://developers.google.com/maps/documentation/javascript/maptypes
 *
 * @param {google.maps.Point} coord
 * @param {number} zoom
 * @param {Document} ownerDocument
 * @returns {Element}
 */
GSvgMapType.prototype.getTile = function (coord, zoom, ownerDocument) {
    const tile = new GmapTile(ownerDocument, this.tileSize.width, this.tileSize.height);
    tile.mapConfiguration = this.parentGmap.mapConfiguration;
    tile.mapStyle = this.parentGmap.mapStyle;

    const tileBoundary = GoogleMapUtility.get_tile_rect_latLng(coord.x, coord.y, zoom);
    tile.set_tile(coord.x, coord.y, zoom);

    const gbNationalGrid = new GBGridFactory();
    gbNationalGrid.calculate_bounds(tileBoundary.ne, tileBoundary.se, tileBoundary.sw, tileBoundary.nw);
    tile.render_grid(gbNationalGrid);

    const ieNationalGrid = new IEGridFactory();
    ieNationalGrid.calculate_bounds(tileBoundary.ne, tileBoundary.se, tileBoundary.sw, tileBoundary.nw);
    tile.render_grid(ieNationalGrid);

    const ciNationalGrid = new CIGridFactory();
    ciNationalGrid.calculate_bounds(tileBoundary.ne, tileBoundary.se, tileBoundary.sw, tileBoundary.nw);
    tile.render_grid(ciNationalGrid);

    for (let seriesNumber in tile.mapConfiguration.series) {
        if (tile.mapConfiguration.series.hasOwnProperty(seriesNumber) && tile.mapConfiguration.series[seriesNumber].has_content() && tile.mapConfiguration.series[seriesNumber].sourceData.data_loaded()) {
            const seriesConfig = tile.mapConfiguration.series[seriesNumber];
            const seriesStyle = tile.mapStyle.series[seriesNumber];

            tile.render_data(gbNationalGrid, seriesConfig, seriesStyle);
            tile.render_data(ieNationalGrid, seriesConfig, seriesStyle);
            tile.render_data(ciNationalGrid, seriesConfig, seriesStyle);
        }
    }

    return (tile.svg.hasChildNodes()) ?
        tile.svg
        :
        ownerDocument.createElement('div');
};

GSvgMapType.prototype.name = "SVG";
GSvgMapType.prototype.alt = "SVG Map Type";
