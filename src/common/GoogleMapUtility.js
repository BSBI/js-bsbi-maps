import {LatLngWGS84} from "british-isles-gridrefs";

const rad2deg = 180.0 / Math.PI;
const deg2rad = Math.PI / 180.0;

export class GoogleMapUtility {
    static TILE_SIZE = 256;

    /**
     *
     * @param {number} x
     * @param {number} y
     * @param {number} zoom
     * @returns {{se: N, sw: N, ne: N, nw: N}}
     */
    static get_tile_rect_latLng(x, y, zoom) {
        const tilesAtThisZoom = 1 << zoom;
        const lngWidth = 360.0 / tilesAtThisZoom;
        const lng = -180 + (x * lngWidth);
        const latHeightMerc = 1.0 / tilesAtThisZoom;
        const topLatMerc = y * latHeightMerc;
        const bottomLatMerc = topLatMerc + latHeightMerc;
        const bottomLat = rad2deg * ((2 * Math.atan(Math.exp(Math.PI * (1 - (2 * bottomLatMerc))))) - (Math.PI / 2));
        const topLat = rad2deg * ((2 * Math.atan(Math.exp(Math.PI * (1 - (2 * topLatMerc))))) - (Math.PI / 2));
        const latHeight = topLat - bottomLat;

        return {
            se : new LatLngWGS84(bottomLat, lng + lngWidth),
            sw : new LatLngWGS84(bottomLat, lng),
            ne : new LatLngWGS84(bottomLat + latHeight, lng + lngWidth),
            nw : new LatLngWGS84(bottomLat + latHeight, lng)
        };
    }

    /**
     *
     * @param {LatLng} latLng
     * @param {number} zoom (int)
     * @param {number} x (int)
     * @param {number} y (int)
     * @returns {{x : number, y : number}}
     */
    static get_offset_pixel_coords(latLng, zoom, x, y) {
        const normalised = GoogleMapUtility.to_normalised_mercator_coords(latLng);

        const scale = (1 << zoom) * GoogleMapUtility.TILE_SIZE;
        normalised.x = Math.trunc(normalised.x * scale) - x * GoogleMapUtility.TILE_SIZE;
        normalised.y = Math.trunc(normalised.y * scale) - y * GoogleMapUtility.TILE_SIZE;

        return normalised;
    }

    /**
     *
     * @param {number} zoom
     * @returns {number}
     */
    static get_zoom_scale_factor(zoom) {
        return (1 << zoom) * GoogleMapUtility.TILE_SIZE;
    }

    /**
     *
     * @param {LatLng} latLng
     * @param {number} scale (int)
     * @param {number} x (int)
     * @param {number} y (int)
     * @returns {{x : number, y : number}}
     */
    static get_offset_pixel_coords_scaled(latLng, scale, x, y) {
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
    }

    /**
     *
     * @param {LatLng} latLng
     * @returns {{x : number, y : number}}
     */
    static to_normalised_mercator_coords(latLng) {
        return ((latLng.lng > 180) ?
                { x : ((latLng.lng - 360)/360) + 0.5,
                    y : Math.abs((Math.asinh(Math.tan(deg2rad * latLng.lat)) / Math.PI / 2) - 0.5)}
                :
                { x : (latLng.lng/360) + 0.5,
                    y : Math.abs((Math.asinh(Math.tan(deg2rad * latLng.lat)) / Math.PI / 2) - 0.5)}
        );
    }
}
