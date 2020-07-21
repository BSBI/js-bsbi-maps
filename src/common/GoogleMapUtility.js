import {LatLngWGS84} from "british-isles-gridrefs";

export class GoogleMapUtility {

}

GoogleMapUtility.TILE_SIZE = 256;

const rad2deg = 180.0 / Math.PI;
const deg2rad = Math.PI / 180.0;

GoogleMapUtility.get_tile_rect_latLng = function(x, y, zoom) {
    var tilesAtThisZoom = 1 << zoom;
    var lngWidth = 360.0 / tilesAtThisZoom;
    var lng = -180 + (x * lngWidth);
    var latHeightMerc = 1.0 / tilesAtThisZoom;
    var topLatMerc = y * latHeightMerc;
    var bottomLatMerc = topLatMerc + latHeightMerc;
    var bottomLat = rad2deg * ((2 * Math.atan(Math.exp(Math.PI * (1 - (2 * bottomLatMerc))))) - (Math.PI / 2));
    var topLat = rad2deg * ((2 * Math.atan(Math.exp(Math.PI * (1 - (2 * topLatMerc))))) - (Math.PI / 2));
    var latHeight = topLat - bottomLat;

    return {
        se : new LatLngWGS84(bottomLat, lng + lngWidth),
        sw : new LatLngWGS84(bottomLat, lng),
        ne : new LatLngWGS84(bottomLat + latHeight, lng + lngWidth),
        nw : new LatLngWGS84(bottomLat + latHeight, lng)
    };
};

/**
 *
 * @param {LatLng} latLng
 * @param {number} zoom (int)
 * @param {number} x (int)
 * @param {number} y (int)
 * @returns {Object} x,y
 */
GoogleMapUtility.get_offset_pixel_coords = function(latLng, zoom, x, y) {
    var normalised = GoogleMapUtility.to_normalised_mercator_coords(latLng);

    var scale = (1 << zoom) * GoogleMapUtility.TILE_SIZE;
    normalised.x = Math.trunc(normalised.x * scale) - x * GoogleMapUtility.TILE_SIZE;
    normalised.y = Math.trunc(normalised.y * scale) - y * GoogleMapUtility.TILE_SIZE;

    return normalised;
};

/**
 *
 * @param {number} zoom
 * @returns {number}
 */
GoogleMapUtility.get_zoom_scale_factor = function(zoom) {
    return (1 << zoom) * GoogleMapUtility.TILE_SIZE;
};

/**
 *
 * @param {LatLng} latLng
 * @param {number} scale (int)
 * @param {number} x (int)
 * @param {number} y (int)
 * @returns {Object} x,y
 */
GoogleMapUtility.get_offset_pixel_coords_scaled = function(latLng, scale, x, y) {
    return {
        x : Math.trunc(
            (
                (latLng.lng > 180) ?
                    ((latLng.lng - 360)/360) + 0.5
                    :
                    (latLng.lng/360) + 0.5
            )
            * scale)
            - x * GoogleMapUtility.TILE_SIZE,
        y : Math.trunc(Math.abs((Math.asinh(Math.tan(deg2rad * latLng.lat)) / Math.PI / 2) - 0.5) * scale) - y * GoogleMapUtility.TILE_SIZE
    };
};

/**
 *
 * @param {LatLng} latLng
 * @returns {Object}
 */
GoogleMapUtility.to_normalised_mercator_coords = function(latLng) {
    return ((latLng.lng > 180) ?
            { x : ((latLng.lng - 360)/360) + 0.5,
                y : Math.abs((Math.asinh(Math.tan(deg2rad * latLng.lat)) / Math.PI / 2) - 0.5)}
            :
            { x : (latLng.lng/360) + 0.5,
                y : Math.abs((Math.asinh(Math.tan(deg2rad * latLng.lat)) / Math.PI / 2) - 0.5)}
    );
};
