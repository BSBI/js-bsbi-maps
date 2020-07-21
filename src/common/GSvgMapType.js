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

GSvgMapType.prototype.getTile = function (coord, zoom, ownerDocument) {
    var tile = new GmapTile(ownerDocument, this.tileSize.width, this.tileSize.height);
    tile.mapConfiguration = this.parentGmap.mapConfiguration;
    tile.mapStyle = this.parentGmap.mapStyle;

    var tileBoundary = GoogleMapUtility.get_tile_rect_latLng(coord.x, coord.y, zoom);
    tile.set_tile(coord.x, coord.y, zoom);

    var gbNationalGrid = new GBGridFactory();
    gbNationalGrid.calculate_bounds(tileBoundary.ne, tileBoundary.se, tileBoundary.sw, tileBoundary.nw);
    tile.render_grid(gbNationalGrid);

    var ieNationalGrid = new IEGridFactory();
    ieNationalGrid.calculate_bounds(tileBoundary.ne, tileBoundary.se, tileBoundary.sw, tileBoundary.nw);
    tile.render_grid(ieNationalGrid);

    var ciNationalGrid = new CIGridFactory();
    ciNationalGrid.calculate_bounds(tileBoundary.ne, tileBoundary.se, tileBoundary.sw, tileBoundary.nw);
    tile.render_grid(ciNationalGrid);

    for (var seriesNumber in tile.mapConfiguration.series) {
        if (tile.mapConfiguration.series.hasOwnProperty(seriesNumber) && tile.mapConfiguration.series[seriesNumber].has_content() && tile.mapConfiguration.series[seriesNumber].sourceData.data_loaded()) {
            var seriesConfig = tile.mapConfiguration.series[seriesNumber];
            var seriesStyle = tile.mapStyle.series[seriesNumber];

            tile.render_data(gbNationalGrid, seriesConfig, seriesStyle);
            tile.render_data(ieNationalGrid, seriesConfig, seriesStyle);
            tile.render_data(ciNationalGrid, seriesConfig, seriesStyle);
        }
    }

    if (tile.svg.hasChildNodes()) {
        return tile.svg;
    } else {
        return ownerDocument.createElement('div');
    }
};

GSvgMapType.prototype.name = "SVG";
GSvgMapType.prototype.alt = "SVG Map Type";
