import {MapDataseriesConfiguration} from "./MapDataseriesConfiguration";
import {GoogleMapUtility} from "./GoogleMapUtility";
import {MapConfiguration} from "./MapConfiguration";
import {SVG} from "./SVG";

const rad2deg = 180.0 / Math.PI;

/**
 * svg google map tile
 */
export class GmapTile {

    /**
     * @type {number}
     */
    tileX;

    /**
     * @type {number}
     */
    tileY;


    /**
     *
     *
     * @constructor
     * @param {Document} document
     * @param {number} width
     * @param {number} height
     */
    constructor (document, width, height) {
        this.document = document;
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.setAttributeNS('', 'class', 'gmaptile');
        this.svg.setAttributeNS('', 'width', width + 'px');
        this.svg.setAttributeNS('', 'height', height + 'px');
        this.svg.setAttributeNS('', 'viewBox', "0 0 " + (width - 1) + " " + (height - 1));
        //this.svg.setAttributeNS('', 'overflow', 'hidden'); // now set via stylesheet
    }

    /**
     *
     * @param {number} x
     * @param {number} y
     * @param {number} zoom
     */
    set_tile(x, y, zoom) {
        this.tileX = x;
        this.tileY = y;
        this.tileZoom = zoom;
    }

    /**
     *
     * @param {GridFactory} grid
     * @param {MapDataseriesConfiguration} seriesConfig
     * @param {MapDataseriesStyle} seriesStyle
     */
    render_data(grid, seriesConfig, seriesStyle) {
        const dataSource = seriesConfig.sourceData;
        const partitionStyles = seriesStyle.partitions[seriesConfig.partitionType];

        /**
         * master opacity scale factor for this series
         * (defaults to 0.7)
         * opacity is also modified by square dimension and residue flags
         *
         * @type {number}
         */
        const seriesOpacity = seriesStyle.opacity;

        if (grid.minY < grid.GRID_MIN_Y && grid.maxY > grid.GRID_MIN_Y) {
            grid.minY = grid.GRID_MIN_Y;
        }
        if (grid.minX < grid.GRID_MIN_X && grid.maxX > grid.GRID_MIN_X) {
            grid.minX = grid.GRID_MIN_X;
        }
        if (grid.maxX < grid.GRID_MIN_X || grid.minX > grid.GRID_MAX_X || grid.maxY < grid.GRID_MIN_Y || grid.minY > grid.GRID_MAX_Y) {
            return;
        }
        if (grid.maxX > grid.GRID_MAX_X) {
            grid.maxX = grid.GRID_MAX_X;
        }
        if (grid.maxY > grid.GRID_MAX_Y) {
            grid.maxY = grid.GRID_MAX_Y;
        }

        let maxPrecision, minPrecision;

        if (seriesConfig.zoomMode === MapDataseriesConfiguration.ZOOM_MODE_ONLY_THIS) {
            let specifiedPrecision = MapDataseriesConfiguration.KEY_TO_PRECISION[seriesConfig.gridResolution];

            minPrecision = maxPrecision = specifiedPrecision + 2;

            // at least for fixed-scale distinct counts (species/taxa) max freq will already be adjusted, so trying
            // to scale by area pushes values out of range
            this.scaleValueByArea = false;
        } else {
            maxPrecision = Math.min(GmapTile.zoom_to_data_precision(this.tileZoom), (seriesConfig.maxGridsquarePrecisionLevel + 2));
            minPrecision = seriesConfig.minGridsquarePrecisionLevel;

            this.scaleValueByArea = true;
        }

        const plotResidue = (seriesConfig.zoomMode[0] === 'r');

        const plotList = [];

        dataSource.get_tile_tree(
            plotList,
            grid.CODE,
            grid.minX, grid.minY, grid.maxX, grid.maxY,
            grid.GRID_MIN_X, grid.GRID_MIN_Y,
            minPrecision,
            maxPrecision,
            plotResidue,
            1 // start precision
        );

        const l = plotList.length;
        const get_offset_pixel_coords_scaled = GoogleMapUtility.get_offset_pixel_coords_scaled;
        const zoomScale = GoogleMapUtility.get_zoom_scale_factor(this.tileZoom);

        for (let n = 0; n < l; n++) {
            let marker;
            let square = plotList[n];

            const pointSW = get_offset_pixel_coords_scaled(
                new grid.ref(square.tileX, square.tileY).to_latLng(), zoomScale, this.tileX, this.tileY);

            const pointNW = get_offset_pixel_coords_scaled(
                new grid.ref(square.tileX, square.tileY + square.tileDimension).to_latLng(), zoomScale, this.tileX, this.tileY);

            const pointNE = get_offset_pixel_coords_scaled(
                new grid.ref(square.tileX + square.tileDimension, square.tileY + square.tileDimension).to_latLng(), zoomScale, this.tileX, this.tileY);

            const pointSE = get_offset_pixel_coords_scaled(
                new grid.ref(square.tileX + square.tileDimension, square.tileY).to_latLng(), zoomScale, this.tileX, this.tileY);

            const opacity = square.precision / maxPrecision;

            if (seriesConfig.partition_filter) {
                square = seriesConfig.partition_filter(square);
            }

            if (seriesConfig.frequencyResultsFlag) {
                if (square.residualFreq && !partitionStyles[0].hidden) {

                    this.svg.appendChild(seriesStyle.colourScheme.svg_frequency_marker({
                        sw : pointSW,
                        nw : pointNW,
                        ne : pointNE,
                        se : pointSE
                    }, square.residualFreq, opacity * seriesOpacity, square.tileDimension, this.scaleValueByArea));
                }
            } else {
                let colour;
                marker = undefined;

                // flag indicates whether using markers to show status
                const statusFilteringFlag = (
                    ((
                            (seriesConfig.controllerName === MapConfiguration.CONTROLLER_SAVEDSEARCH && seriesConfig.searchType === MapConfiguration.SEARCHTYPE_PRESENCE) ||
                            seriesConfig.controllerName === MapConfiguration.CONTROLLER_TAXONMAP
                        ) && (seriesConfig.statusFilter !== '')
                    )
                    ||
                    ( seriesConfig.controllerName === MapConfiguration.CONTROLLER_TAXONSTATUS )
                );

                if (statusFilteringFlag) {
                    // using status markers

                    if (parseInt(seriesConfig.stackOrder, 10)) {
                        // recent first plotting order

                        for (let p = seriesConfig.numberOfPartitions; p--;) {
                            if (square.partitions[p].residualFreq && !partitionStyles[p].hidden) {
                                colour = '#' + partitionStyles[p].colour;

                                marker = seriesStyle.markers[square.partitions[p].status];
                                break;
                            }
                        }
                    } else {
                        // earliest partition on top

                        for (let p = 0; p < seriesConfig.numberOfPartitions; p++) {
                            if (square.partitions[p].residualFreq && !partitionStyles[p].hidden) {
                                colour = '#' + partitionStyles[p].colour;

                                marker = seriesStyle.markers[square.partitions[p].status];
                                break;
                            }
                        }
                    }
                } else {
                    if (parseInt(seriesConfig.stackOrder, 10)) {
                        // recent first plotting order

                        for (let p = seriesConfig.numberOfPartitions; p--;) {
                            if (!square.partitions.hasOwnProperty(p)) {
                                console.log('failed to read partition ' + p);
                            }

                            if (square.partitions[p].residualFreq && !partitionStyles[p].hidden) {
                                colour = '#' + partitionStyles[p].colour;

                                marker = partitionStyles[p].marker;
                                break;
                            }
                        }
                    } else {
                        // earliest partition on top

                        for (let p = 0; p < seriesConfig.numberOfPartitions; p++) {
                            if (square.partitions[p].residualFreq && !partitionStyles[p].hidden) {

                                colour = '#' + partitionStyles[p].colour;

                                marker = partitionStyles[p].marker;
                                break;
                            }
                        }
                    }
                }

                if (typeof marker !== 'undefined') {
                    // marker would be undefined if partitions have been hidden (so nothing to plot)

                    this.svg.appendChild(SVG.SYMBOL[marker].plot(
                        pointSW,
                        pointNW,
                        pointNE,
                        pointSE,
                        square.childFreq > 0 ? colour : "none",
                        colour,
                        opacity * seriesOpacity
                    ));
                }
            }
        }
    }

    /**
     *
     * @param {GridFactory} grid
     * @param {number} spacing grid spacing unit (metres)
     * @param {number} fontSize
     * @returns {undefined}
     */
    render_backdrop_labels_for_grid(grid, spacing, fontSize) {
        // round OS grid bounds
        let minX = Math.floor(grid.minX / spacing) * spacing;
        let maxX = Math.ceil((grid.maxX + spacing - 1) / spacing) * spacing;

        let minY = Math.floor(grid.minY / spacing) * spacing;
        let maxY = Math.ceil((grid.maxY + spacing - 1) / spacing) * spacing;

        if (minY < 0 && maxY > 0) {
            minY = 0;
        }
        if (minX < 0 && maxX > 0) {
            minX = 0;
        }

        if (minX < 0 || minX > grid.GRID_MAX_X || minY < 0 || minY > grid.GRID_MAX_Y) {
            return;
        }

        if (maxY > grid.GRID_MAX_Y) {
            maxY = grid.GRID_MAX_Y;
        }
        if (maxX > grid.GRID_MAX_X) {
            maxX = grid.GRID_MAX_X;
        }

        const get_offset_pixel_coords_scaled = GoogleMapUtility.get_offset_pixel_coords_scaled;
        const zoomScale = GoogleMapUtility.get_zoom_scale_factor(this.tileZoom);

        // vertical grid lines
        for (let x = minX; x <= maxX; x += spacing) {
            let loRef = new grid.ref(x, minY);

            let loPoint = get_offset_pixel_coords_scaled(loRef.to_latLng(), zoomScale, this.tileX, this.tileY);

            for (let y = minY+spacing; y <= maxY; y+=spacing) {
                const ref = new grid.ref(x, y); // eg new OSRef if gb grid

                const hiPoint = get_offset_pixel_coords_scaled(ref.to_latLng(), zoomScale, this.tileX, this.tileY);

                // text the validity of the square for vertice drawing
                if (grid.valid_square(x, y, loRef, ref, this.tileZoom)) {
                    const lx = loPoint.x;
                    const ly = loPoint.y;
                    const hx = hiPoint.x;
                    const hy = hiPoint.y;

                    // need to test far corner of square as don't want labels on ragged edges
                    const neRef = new grid.ref(x + spacing, y + spacing);

                    if (grid.valid_square(x + spacing, y, loRef, neRef, this.tileZoom)) {
                        const hiHectadGrid = new grid.ref(x + spacing, y - spacing);

                        if (grid.valid_square(x + spacing, y, loRef, hiHectadGrid, this.tileZoom)) {
                            const angle = Math.atan((hx - lx) / (hy-ly)) * rad2deg;
                            const hectadHiPoint = get_offset_pixel_coords_scaled(hiHectadGrid.to_latLng(), zoomScale, this.tileX, this.tileY);

                            const hectadLabelEl = this.document.createElementNS("http://www.w3.org/2000/svg", "text");
                            hectadLabelEl.setAttributeNS('', "font-size", fontSize);
                            hectadLabelEl.textContent = loRef.to_gridref(spacing);
                            hectadLabelEl.setAttributeNS('', "x", (lx + hectadHiPoint.x) /2);
                            hectadLabelEl.setAttributeNS('', "y", (hy + hectadHiPoint.y) /2);
                            hectadLabelEl.setAttributeNS('', "transform", "rotate(" + (-angle) + " " + ((lx + hectadHiPoint.x) /2) + " " + ((hy + hectadHiPoint.y) /2) + ")");
                            hectadLabelEl.setAttributeNS('', "text-anchor", "middle");
                            hectadLabelEl.setAttributeNS('', "dominant-baseline", "central");
                            hectadLabelEl.setAttributeNS('', "stroke", this.gridColourCSS);
                            hectadLabelEl.setAttributeNS('', "fill", 'none');
                            hectadLabelEl.setAttributeNS('', "stroke-opacity", "0.3");
                            hectadLabelEl.setAttributeNS('', "stroke-width", "1px");
                            this.svg.appendChild(hectadLabelEl);
                        }

                    }
                }
                loPoint = hiPoint;
                loRef = ref;
            }
        }
    }

    /**
     *
     * @param {GridFactory} grid
     * @returns {undefined}
     */
    render_grid(grid) {
        let spacing;

        if (this.tileZoom <= 7) {
            spacing = 100000;
        } else if (this.tileZoom <= 9) {
            spacing = 10000;
        } else if (this.tileZoom <= 12) {
            spacing = 2000;
        } else if (this.tileZoom <= 15) {
            spacing = 1000;
        } else {
            spacing = 100;
        }

        const rendered = {};

        // round OS grid bounds
        let minX = Math.floor(grid.minX / spacing) * spacing;
        let maxX = Math.ceil((grid.maxX + spacing - 1) / spacing) * spacing;

        let minY = Math.floor(grid.minY / spacing) * spacing;
        let maxY = Math.ceil((grid.maxY + spacing - 1) / spacing) * spacing;

        if (minY < 0 && maxY > 0) {
            minY = 0;
        }
        if (minX < 0 && maxX > 0) {
            minX = 0;
        }

        if (minX < 0 || minX > grid.GRID_MAX_X || minY < 0 || minY > grid.GRID_MAX_Y) {
            return;
        }

        if (maxY > grid.GRID_MAX_Y) {
            maxY = grid.GRID_MAX_Y;
        }
        if (maxX > grid.GRID_MAX_X) {
            maxX = grid.GRID_MAX_X;
        }

        const round = Math.round;
        const get_offset_pixel_coords_scaled = GoogleMapUtility.get_offset_pixel_coords_scaled;
        const TILE_SIZE = GoogleMapUtility.TILE_SIZE;
        const zoomScale = GoogleMapUtility.get_zoom_scale_factor(this.tileZoom);

        let pathString = '';
        let heavyPathString = ''; // major gridlines

        if (GmapTile.labelGrid) {
            if (this.tileZoom === 10) {
                this.render_backdrop_labels_for_grid(grid, 10000, 36);
            } else if (this.tileZoom === 8) {
                this.render_backdrop_labels_for_grid(grid, 100000, 96);
            }
        }

        // vertical grid lines
        for (let x = minX; x <= maxX; x += spacing) {
            let loRef = new grid.ref(x, minY);

            let loPoint = get_offset_pixel_coords_scaled(loRef.to_latLng(), zoomScale, this.tileX, this.tileY);

            for (let y = minY+spacing; y <= maxY; y+=spacing) {
                const ref = new grid.ref(x, y); // eg new OSRef if gb grid

                const hiPoint = get_offset_pixel_coords_scaled(ref.to_latLng(), zoomScale, this.tileX, this.tileY);

                // text the validity of the square for vertice drawing
                if (grid.valid_square(x, y, loRef, ref, this.tileZoom)) {
                    let lx = loPoint.x;
                    let ly = loPoint.y;
                    let hx = hiPoint.x;
                    let hy = hiPoint.y;

                    if (GmapTile.labelGrid) {
                        // need to test far corner of square as don't want labels on ragged edges
                        const neRef = new grid.ref(x + spacing, y + spacing);

                        if (grid.valid_square(x + spacing, y, loRef, neRef, this.tileZoom)) {
                            const angle = Math.atan((hx - lx) / (hy-ly)) * rad2deg;
                            const gridLabelEl = this.document.createElementNS("http://www.w3.org/2000/svg", "text");
                            let gr = loRef.to_gridref(spacing);

                            if (this.tileZoom === 10) {
                                gr = gr.substr(-1); // tetrad letter only
                            } else if (this.tileZoom === 8) {
                                gr = gr.substr(-2); // hectad number only
                            } else if (this.tileZoom <= 7) {
                                // if showing only the 100km square label then plot as outline text
                                gridLabelEl.setAttributeNS('', "fill", 'none');
                                gridLabelEl.setAttributeNS('', "stroke-width", "1px");
                            }

                            // to centre the labels also need the NE square corner (to get grid mid-point)
                            const hiHectadGrid = new grid.ref(x + spacing, y - spacing);
                            const hectadHiPoint = get_offset_pixel_coords_scaled(hiHectadGrid.to_latLng(), zoomScale, this.tileX, this.tileY);

                            const labelX = (hectadHiPoint.x + lx) / 2;
                            const labelY = (hectadHiPoint.y + hy) / 2;

                            gridLabelEl.setAttributeNS('', "font-size", GmapTile.gridlabelZoomSizeMapping[this.tileZoom]);
                            gridLabelEl.textContent = gr;
                            gridLabelEl.setAttributeNS('', "x", labelX.toString());
                            gridLabelEl.setAttributeNS('', "y", labelY.toString());
                            gridLabelEl.setAttributeNS('', "transform", "rotate(" + (-angle) + " " + labelX + " " + labelY + ")");
                            gridLabelEl.setAttributeNS('', "stroke", this.gridColourCSS);
                            gridLabelEl.setAttributeNS('', "stroke-opacity", "0.5");
                            gridLabelEl.setAttributeNS('', "text-anchor", "middle");
                            gridLabelEl.setAttributeNS('', "dominant-baseline", "central");

                            this.svg.appendChild(gridLabelEl);
                        }
                    }

                    // NB ly is numerically greater than hy
                    // lx and hx may be either way around in terms of magnitude

                    if (ly >= TILE_SIZE && hy < TILE_SIZE) {
                        lx += ((hx-lx) / (ly - hy)) * (ly-(TILE_SIZE-1));
                        ly = TILE_SIZE - 1;
                    }

                    if (hy < 0 && ly >= 0) {
                        hx += ((lx - hx) / (ly - hy)) * (0 - hy);
                        hy = 0;
                    }

                    rendered[loRef.toString()] = true;
                    rendered[ref.toString()] = true;

                    lx = round(lx);
                    ly = round(ly);
                    hx = round(hx);
                    hy = round(hy);

                    if ((ly !== hy)
                        && (lx >= 0 || hx >= 0)
                        && (lx < TILE_SIZE || hx < TILE_SIZE)
                        && (ly >= 0 || hy >= 0)
                        && (ly < TILE_SIZE || hy < TILE_SIZE)
                    ) {

                        if (
                            (this.tileZoom >= 10 && (x % 10000 === 0)) ||
                            (this.tileZoom > 15 && (x % 1000 === 0)) ||
                            ((this.tileZoom === 8 || this.tileZoom === 9) && (x % 100000 === 0))
                        ) {
                            heavyPathString += 'M' + lx + ' ' + ly + 'L' + hx + ' ' + hy;
                        } else {
                            pathString += 'M' + lx + ' ' + ly + 'L' + hx + ' ' + hy;
                        }
                    }
                }
                loPoint = hiPoint;
                loRef = ref;
            }
        }

        // horizontal grid lines
        for (let y = minY; y <= maxY; y += spacing) {
            let loRef = new grid.ref(minX, y);
            let loPoint = get_offset_pixel_coords_scaled(loRef.to_latLng(), zoomScale, this.tileX, this.tileY);

            for (let x = minX+spacing; x <= maxX; x += spacing) {
                const ref = new grid.ref(x, y);
                const hiPoint = get_offset_pixel_coords_scaled(ref.to_latLng(), zoomScale, this.tileX, this.tileY);

                if (rendered.hasOwnProperty(ref.toString()) && rendered.hasOwnProperty(loRef.toString())) {

                    let lx = loPoint.x;
                    let ly = loPoint.y;
                    let hx = hiPoint.x;
                    let hy = hiPoint.y;

                    // lx is always lower than hx
                    // ly and hy may be reversed

                    if (lx < 0 && hx >= 0) {
                        ly += (((hy - ly) / (lx - hx)) * lx); // reverse lx and hx to make difference -ve so that can avoid Math.abs(lx)
                        lx = 0;
                    }

                    if (hx >= TILE_SIZE && lx < TILE_SIZE) {
                        hy -= (((hy - ly) / (hx - lx)) * (hx - (TILE_SIZE-1)));
                        hx = TILE_SIZE - 1;
                    }

                    lx = round(lx);
                    ly = round(ly);
                    hx = round(hx);
                    hy = round(hy);

                    if ((lx != hx)
                        && (hx >= 0)
                        && (lx < TILE_SIZE)
                        && (ly >= 0 || hy >= 0)
                        && (ly < TILE_SIZE || hy < TILE_SIZE)
                    ) {
                        if (
                            (this.tileZoom >= 10 && (y % 10000 === 0)) ||
                            (this.tileZoom > 15 && (y % 1000 === 0)) ||
                            ((this.tileZoom === 8 || this.tileZoom === 9) && (y % 100000 === 0))
                        ) {
                            heavyPathString += 'M' + lx + ' ' + ly + 'L' + hx + ' ' + hy;
                        } else {
                            pathString += 'M' + lx + ' ' + ly + 'L' + hx + ' ' + hy;
                        }
                    }
                }

                loRef = ref;
                loPoint = hiPoint;
            }
        }

        if (pathString !== '') {
            const line = this.document.createElementNS("http://www.w3.org/2000/svg", "path");
            line.setAttributeNS('', 'class', 'gmaplightgrid');
            line.setAttributeNS('', 'd', pathString);

            this.svg.appendChild(line);
        }

        if (heavyPathString !== '') {
            const line = this.document.createElementNS("http://www.w3.org/2000/svg", "path");
            line.setAttributeNS('', 'class', 'gmapheavygrid');
            line.setAttributeNS('', 'd', heavyPathString);

            this.svg.appendChild(line);
        }
    }
}

/**
 *
 * @type MapConfiguration
 */
GmapTile.prototype.mapConfiguration = null;

/**
 *
 * @type MapStyle
 */
GmapTile.prototype.mapStyle = null;

/**
 *
 * @type {boolean}
 */
GmapTile.labelGrid = false;

/**
 * limited maximum range, (only to 100m)
 *
 * @param {number} zoom
 * @returns {number}
 */
GmapTile.zoom_to_data_precision = function(zoom) {
    if (zoom <= 3) {
        return 2;
    } else if (zoom <= 6) {
        return 3;
    } else if (zoom <= 9) {
        return 4;
    } else if (zoom <= 11) {
        return 5;
    } else {
        return 6;
    }
};

/**
 *
 * @param {number} zoom
 * @returns {{max: number, recommended: number}}
 */
GmapTile.zoom_to_picker_precision = function(zoom) {
    if (zoom <= 3) {
        return {max: 2, recommended: 2};
    } else if (zoom <= 6) {
        return {max: 3, recommended: zoom < 4 ? 2 : 3};
    } else if (zoom <= 9) {
        return {max: 4, recommended: zoom < 8 ? 2 : 3};
    } else if (zoom <= 11) {
        return {max: 5, recommended: zoom < 11 ? 4 : 4};
    } else if (zoom <= 13) {
        return {max: 6, recommended: zoom < 13 ? 4 : 5};
    } else if (zoom <= 15) {
        return {max: 7, recommended: 6};
    } else {
        return {max: 7, recommended: zoom <= 17 ? 6 : 7};
    }
};

GmapTile.prototype.scaleValueByArea = true;

GmapTile.prototype.gridColourCSS = '#4444FF';

GmapTile.gridlabelZoomSizeMapping = [
    12, // zoom 0
    16, 17, 18, 19, 20, 20, 20, // 100km squares up to zoom 7
    10, 14, // 10km squares up to zoom 9
    10, 12, 16, // 2km squares up to zoom 12
    12, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16 // 1km squares above that
];


