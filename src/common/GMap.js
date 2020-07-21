import {EventHarness} from "../framework/EventHarness";
import {BSBIDB_URL, MapControl} from "./MapControl";
import {uniqueId} from "../utils/uniqueId";
import {MapControlPanel} from "./MapControlPanel";
import {registerDOMEventHandler, removeDomEventHandler} from "../utils/registerDOMEventHandler";
import {callback} from "../utils/callback";
import {logError} from "../utils/logError";
import {GmapTile} from "./GMapTile";
import {GSvgMapType} from "./GSvgMapType";
import {stop_event} from "../utils/stopEvent";
import {callback_external_param} from "../utils/callback_external_param";
import {MappingUtils} from "./MappingUtils";
import {escapeHTML} from "../utils/escapeHTML";
import {GridCoords} from "british-isles-gridrefs";
import {GoogleMapUtility} from "./GoogleMapUtility";
import {MapConfiguration} from "./MapConfiguration";

const GOOGLE_MAPS_URL = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyAIEUc8tJD6KJAjc6YbXo77mTE2OHm-8FQ&v=3&sensor=false&libraries=geometry';

export class GMap extends EventHarness {


    /**
     * @type {Array.<{gridref : GridRefGB|GridRefIE|GridRefCI}>}
     */
    markers;

    /**
     *
     * @constructor
     */
    constructor() {
        super();

        if ('workspaceVersion' in window) {
            this.branchId = window.workspaceVersion.branch_id();
            this.branchView = window.workspaceVersion.branch_view();
        }

        if ('matchMedia' in window && !(window.matchMedia("(min-device-width: 400px)").matches)) {
            console.log('Map legend hidden by default for narrow device');
            this.legendShown = false;
        }
    }

    /**
     *
     * @param {{context : MapControl}} params
     */
    register_context(params) {
        this.mapControl = params.context;
        let container = document.createElement('div');
        this.containerId = container.id = uniqueId('gmapcontainer');

        this.mapControl.register_context(MapControl.GMAP_CONTEXT, {
            label: 'zoomable map',
            labelToolTip: 'switch to zoomable map view',
            container: container,
            contentFinalizeCallback: GMap.prototype.finalise_gmap.bind(this)
        });
    }

    finalise_gmap() {
        this.addListener(GMap.MAPS_INITIALISED_EVENT, () => {
            // pass event upstream
            // grid-ref picker uses this to know that it is safe to initialise the google geocoder
            // which requires 'google' to have loaded
            this.mapControl.fireEvent(GMap.MAPS_INITIALISED_EVENT);
        });

        this.register();

        if (this.mapControl.mapConfiguration.allowMapControls) {
            if (this.mapControl.mapConfiguration.defaultTab === MapControl.GMAP_CONTEXT) {
                if (!this.mapControl.controls) {
                    // controls will not be set if static map has not been initialised, i.e. this a gmap only view

                    console.log('Warning, map controls not yet set.');
                    this.mapControl.controls = new MapControlPanel;
                    this.mapControl.controls.create_panels(document.getElementById(this.gmapControlsOuterContainerId), this.mapControl);
                } else {

                    // by default menus are set up for static maps,
                    // need to switch them google map layout if that is the initial view
                    this.mapControl.controls.set_options_availability(MapControl.GMAP_CONTEXT);
                    this.mapControl.controls.set_container(document.getElementById(this.gmapControlsOuterContainerId));
                }
            }

            this.mapControl.test_for_series_prompt_on_no_content();
        }
    }

    /**
     *
     * @param {MapConfiguration} mapConfiguration
     */
    apply_configuration(mapConfiguration) {
        if (mapConfiguration.centroid) {
            const latLng = mapConfiguration.centroid.split(',');

            this.lat = parseFloat(latLng[0]);
            this.lng = parseFloat(latLng[1]);
            this.zoom = 8; // 8 if have centre point then zoom in on it a bit
        }

        if (mapConfiguration.markers) {
            this.set_markers(mapConfiguration.markers);
        }

        if (mapConfiguration.zoom) {
            this.zoom = mapConfiguration.zoom;
        }

        if (mapConfiguration.allowMapDataInfoPanel) {
            this.addListener(GMap.EVENT_GRIDDED_MAP_CLICK, GMap.prototype.gridded_click_callback.bind(this));
        }
    }

    /**
     *
     * @param {Function=} postLoadCallback
     */
    register(postLoadCallback) {
        this.mapConfiguration = this.mapControl.mapConfiguration;
        this.mapStyle = this.mapControl.mapStyle;

        const container = document.getElementById(this.containerId);

        container.style.position = 'relative';

        const controlsOuterContainerId = container.appendChild(document.createElement('div'));
        this.gmapControlsOuterContainerId = controlsOuterContainerId.id = uniqueId('gmapcontrolsouter');
        controlsOuterContainerId.className = 'gmapcontrolscontainer';

        const infoPanelContainer = container.appendChild(document.createElement('div'));
        infoPanelContainer.className = 'gmapInfoPanel';
        infoPanelContainer.index = 1;

        const legendDiv = infoPanelContainer.appendChild(document.createElement('div'));
        legendDiv.className = 'gmapLegendContainer';
        this.legendDivId = legendDiv.id = uniqueId('gmapLegendContainer');
        legendDiv.style.display = 'none'; // initially hidden
        this.legendDivClickHandle = registerDOMEventHandler(legendDiv, 'click', this.mapControl, 'legend_panel_click_handler');


        const infoDiv = infoPanelContainer.appendChild(document.createElement('div'));
        infoDiv.className = 'gmapInfoContainer';
        this.infoDivId = infoDiv.id = uniqueId('gmapInfoContainer');
        this.infoDivClickHandle = registerDOMEventHandler(infoDiv, 'click', this.mapControl, 'info_panel_click_handler');
        infoDiv.style.display = 'none'; // initially hidden

        // register key up handler to listen for short-cuts
        //this.containerKeyUpHandle = registerDOMEventHandler(container, 'keyup', this, 'key_up_handler');
        this.containerKeyUpHandle = registerDOMEventHandler(document, 'keydown', this, 'key_up_handler');

        const image = document.createElement('div');
        image.id = this.imageId = uniqueId('gmapcanvas');
        image.style.width = this.mapConfiguration.gmapCanvasWidth;

        try {
            image.style.height = this.mapConfiguration.gmapCanvasHeight; // this sometimes fails in IE 9
        } catch (e) {
            logError('failed to set map height ' + this.mapConfiguration.gmapCanvasHeight, '', 9588);
            image.style.height = '800px';
        }

        image.className = 'gmapcanvas';
        container.appendChild(image);

        this.postLoadCallback = postLoadCallback;

        if (GMap.asyncLoadMaps && !('google' in window && google.maps)) {
            this.load_maps_async();
        } else {
            if ('google' in window && typeof google.maps === 'object' && 'Size' in google.maps) {
                // all present and correct
                this.initialize();
            } else {
                // loading may be incomplete so delay
                logError('Delayed google map load', '', 9500);

                this.gmapLoopIteration = 0;

                const delayed_loader = () => {
                    if ('google' in window && google.maps && typeof google.maps === 'object' && 'Size' in google.maps) {
                        // all present and correct
                        logError('Success after delayed google map load, iteration ' + this.gmapLoopIteration, '', 9500);
                        this.initialize();
                    } else {
                        logError('Failure after delayed google map load, iteration ' + this.gmapLoopIteration, '', 9513);

                        if ('google' in window && google.maps) {
                            logError('map keys: ' + JSON.stringify(Object.keys(google.maps)), '', 9510);
                        }

                        this.gmapLoopIteration++;

                        if (this.gmapLoopIteration < 10) {
                            setTimeout(delayed_loader, 1000);
                        } else {
                            this.initialize();
                        }
                    }
                };
                setTimeout(delayed_loader, 1000);
            }
        }
    }

    /**
     * if old context is GMAP_CONTEXT then hide
     * if new context id GMAP_CONTEXT then unhide content
     *
     * @param {{context: MapControl, oldContext: string, newContext: string}} params
     * @returns {undefined}
     */
    context_change_handler(params) {
        const mapControl = params.context;

        if (params.oldContext === MapControl.GMAP_CONTEXT && params.oldContext !== params.newContext) {
            document.getElementById(this.containerId).style.display = 'none';
        } else if (params.newContext === MapControl.GMAP_CONTEXT) {
            mapControl.controls.set_container(document.getElementById(this.gmapControlsOuterContainerId));
            document.getElementById(this.containerId).style.display = 'block';

            if (mapControl.useTabs) {
                //set a slight delay so that the tabs have time to change
                this.refreshTimeoutId = window.setTimeout(callback(this, 'force_refresh'), 500);
            } else {
                this.force_refresh();
            }
        }
    }

    /**
     *
     * @param {KeyboardEvent} event
     * @returns {boolean}
     */
    key_up_handler(event) {
        if (event.keyCode === 77 && event.ctrlKey) {
            // ctrl-M

            GmapTile.labelGrid = !GmapTile.labelGrid;
            return stop_event(event);
        }
    }

    load_maps_async() {
        // lazy load google map
        //if ('google' in window) { logError('google keys: ' + JSON.stringify(Object.keys(google)), '', 9529);}
        const callbackWrapperName = uniqueId('initialize_callback');

        window[callbackWrapperName] = (function(that) {
            return function() {
                console.log('called back after lazy loading google map scripts');
                that.initialize();
                //GMap[callbackWrapperName] = null;
                window[callbackWrapperName] = null;
            };
        })(this);

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = GOOGLE_MAPS_URL + '&callback=' + callbackWrapperName;

        document.body.appendChild(script);
    }

    clear_events() {
        if (this.gmap) {
            // remove google map event listeners first to possibly avoid IE11 'Unspecified error.'
            google.maps.event.clearInstanceListeners(this.gmap);
        }

        // clear any pending refresh callback
        if (this.refreshTimeoutId) {
            window.clearTimeout(this.refreshTimeoutId);
            this.refreshTimeoutId = null;
        }

        if (this.refreshTimeout2Id) {
            window.clearTimeout(this.refreshTimeout2Id);
            this.refreshTimeout2Id = null;
        }
    }

    get_position() {
        const position = {};
        const centre = this.gmap.getCenter();

        if (centre) {
            position.lat = centre.lat();
            position.lng = centre.lng();
        } else {
            position.lat = GMap.prototype.lat;
            position.lng = GMap.prototype.lng;
        }

        position.zoom = this.gmap.getZoom();

        return position;
    }

    /**
     * sets the position (lat,lng,zoom) parameters *without actually updating the google maps*
     * usually call prior to map reinitialization (e.g. after history change to restore previous map settings)
     *
     * @param {object} position
     */
    set_initial_position(position) {
        this.lat = position.lat;
        this.lng = position.lng;
        this.zoom = position.zoom;
    }

    set_markers(markers) {
        this.markers = markers;
        if (this.gmap) {
            this.refresh_markers();
        }
    }

    /**
     * private function called by GMap.prototype.register() (or by the async maps loaded) after google api has loaded
     * @private
     * @returns {undefined}
     */
    initialize() {
        if (this.domEventHandles) {
            this.clear_dom_event_handles();
        } else {
            this.domEventHandles = {};
        }

        if (this.mapControlListenerHandle !== undefined) {
            console.log('removing previous gmap mapControl listener for "changed"');
            this.mapControl.removeListener('changed', this.mapControlListenerHandle);
        }

        this.mapControlListenerHandle = this.mapControl.addListener('changed',
            /** @param {Object} panelContext */
            (panelContext) => {
                if (!panelContext || !panelContext.hasOwnProperty(MapControl.GMAP_CONTEXT) || panelContext[MapControl.GMAP_CONTEXT]) {
                    // refresh map either if change target is generic (no gmap flag at all - e.g. if data source has changed)
                    // or if specifically relevant to gmap
                    this.refresh_svg_layer();
                    this.refresh_legend();
                    this.clear_info_panel();
                }
            });

        if (this.toolTip) {
            this.toolTip.destroy();
        }
        this.toolTip = new YAHOO.widget.Tooltip("gmapTooltip", {
            context: this.imageId,
            text: "",
            showDelay: 0,
            hideDelay: 0,
            autodismissdelay: 99999999} );

        try {
            this.tileSize = new google.maps.Size(this.mapConfiguration.gmapTileSize, this.mapConfiguration.gmapTileSize);
            const latlng = new google.maps.LatLng(this.lat, this.lng);

            this.gmapType = google.maps.MapTypeId.TERRAIN;

            this.mapConfiguration.allowHistoricMaps = this.mapConfiguration.allowHistoricMaps && ('NLSTileUrlOS' in window);

            const mapTypes =  [
                google.maps.MapTypeId.ROADMAP,
                google.maps.MapTypeId.SATELLITE
            ];

            if (this.mapConfiguration.allowHistoricMaps) {
                mapTypes[mapTypes.length] = 'Historic';
            }



            const options = {
                scaleControl: true,
                panControl: false,
                zoom: this.zoom,
                gestureHandling: 'greedy', // disable "ctrl + scroll" prompt
                minZoom: 5, // seems to be ignored
                center: latlng,
                restriction: { // lat lng bounds
                    latLngBounds: {
                        north: 61.07,
                        south: 48.56,
                        west: -11.6,
                        east: 4.2,
                    },
                    strictBounds: false,
                },
                streetViewControl: false,
                mapTypeId: this.gmapType,
                styles: [ { featureType: "poi", elementType: "labels", stylers: [ { visibility: "off" } ] } ],
                mapTypeControlOptions: {
                    mapTypeIds: mapTypes
                }
            };

            const image = document.getElementById(this.imageId);

            this.set_contain_map_type_class(image);

            if (!image) {
                throw new Error('Google map image div not found.');
            }

            this.gmap = new google.maps.Map(image, options);

            if (this.mapConfiguration.allowHistoricMaps) {
                const historicMapType = new google.maps.ImageMapType({
                    tileSize : new google.maps.Size(256,256),
                    minZoom : 8,
                    maxZoom : 14,

                    getTileUrl : function (coord, zoom) {
                        return NLSTileUrlOS(coord.x,coord.y,zoom);
                    },
                    name : "Historic",
                    alt : "Historical Map Type",
                    isPng : false
                });

                this.gmap.mapTypes.set('Historic', historicMapType);
            }
        } catch (e) {
            throw new Error('Error constructing google map: ' + e.toString());
        }

        this.minZoomLevel = 5;

        // Bounds for GB/IE
        this.bounds = {
            maxX : 2.6,
            maxY : 61,
            minX : -10,
            minY : 49.2
        };

        this.mapBounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(this.bounds.minY,this.bounds.minX), // SW
            new google.maps.LatLng(this.bounds.maxY,this.bounds.maxX) // NE
        );

        const kmlLayers = [];

        if (this.mapConfiguration.gisAreaIds) {
            // if the map centre point has been specified explicitly then use that
            // otherwise zoom/position the map to fit the kml area
            const preserveViewport = this.mapConfiguration.hasOwnProperty('centroid');

            for (let i = this.mapConfiguration.gisAreaIds.length; i--;) {
                kmlLayers[i] = new google.maps.KmlLayer(
                    {url: BSBIDB_URL + 'kmlarea.php?entityid=' + this.mapConfiguration.gisAreaIds[i], preserveViewport: preserveViewport, map: this.gmap});
            }
        }

        if (this.markers) {
            this.refresh_markers();
        }

        //if (!this.mapControl.useTabs && this.mapConfiguration.showStaticMap) {
        //	this.tabSwitchButton = document.createElement('div');
        //	this.tabSwitchButton.innerHTML = '<a href="#" title="switch to map view that can printed or saved">printable map</a>';
        //	this.tabSwitchButton.className = 'gmapheaderbutton';
        //	this.gmap.controls[google.maps.ControlPosition.TOP_RIGHT].push(this.tabSwitchButton);
        //
        //	this.domEventHandles.staticMapButtonClickHandle = registerDOMEventHandler(this.tabSwitchButton, 'click', this.mapControl, 'maptype_switch_click_handler', MapControl.SVG_CONTEXT);
        //}

        //this.mapControl.fireEvent(MapControl.EVENT_REGISTER_TABS_HOOK, MapControl.GMAP_CONTEXT);
        this.assemble_context_switch_buttons();

        if (this.mapConfiguration.allowLegendButon) {
            const legendButton = document.createElement('div');
            legendButton.innerHTML = '<a href="#" title="show/hide map legend">legend</a>';
            legendButton.className = 'gmapheaderbutton';
            this.legendButtonId = legendButton.id = uniqueId('gmaplegendbutton');
            this.gmap.controls[google.maps.ControlPosition.TOP_RIGHT].push(legendButton);

            this.domEventHandles.legendButtonClickHandle = registerDOMEventHandler(legendButton, 'click', this, 'legend_button_click_handler');
        }

        if (this.mapConfiguration.bsbiWatermark) {
            this.bsbiLogo = document.createElement('div');
            this.bsbiLogo.innerHTML = '<img src="' + MapControl.staticUrl + 'img/icons/BSBIlong.png" width="189" height="64" style="opacity: 0.6; width: 50%; height: 50%;" alt="">';
            this.bsbiLogo.className = '';
            this.gmap.controls[google.maps.ControlPosition.BOTTOM_LEFT].push(this.bsbiLogo);
        }

        if (navigator.geolocation) {
            // provide button to zoom to current location
            // if HTML5 support available


        }

        if (this.mapConfiguration.bsbiGmapCopyright) {
            this.copyrightDiv = document.createElement('div');
            this.copyrightDiv.style.opacity = '0.7';
            this.copyrightDiv.style.background = 'white';
            this.copyrightDiv.style.fontSize = '10px';
            this.copyrightDiv.style.padding = ''; // was '0 2px 0 2px';
            this.copyrightDiv.style.lineHeight = '14px'; // was 'normal';
            this.copyrightDiv.style.height = '14px'; // wasn't set previously
            this.copyrightDiv.style.verticalAlign = 'middle'; // wasn't set previously
            this.copyrightDiv.innerHTML = this.copyrightMessage;
            this.gmap.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push(this.copyrightDiv);
        }

        google.maps.event.addListener(this.gmap, 'mousemove', callback_external_param(this, 'gmouse_move_handler'));
        google.maps.event.addListener(this.gmap, 'click', callback_external_param(this, 'gmouse_click_handler'));
        google.maps.event.addListener(this.gmap, 'zoom_changed', callback_external_param(this, 'zoom_change_handler'));
        google.maps.event.addListener(this.gmap, 'dragend', callback_external_param(this, 'drag_end_handler'));
        google.maps.event.addListener(this.gmap, 'maptypeid_changed', callback_external_param(this, 'map_type_change_handler'));

        google.maps.event.trigger(this.gmap, 'resize'); // ensures this maps specified as 100% wide are filled
        IframeSize.poll();

        GMap.map_load_callback = null; // no longer need handle to this callback function

        this.register_svg_layer();
        this.refresh_legend();

        if (this.postLoadCallback) {
            this.postLoadCallback();
        }

        this.fireEvent(GMap.MAPS_INITIALISED_EVENT);
    }

    assemble_context_switch_buttons() {
        if (!this.mapControl.useTabs) {

            this.contextSwitchButtons = [];
            this.contextSwitchButtonEventHandles = [];

            for (let contextName in this.mapControl.contexts) {
                if (contextName !== MapControl.GMAP_CONTEXT && this.mapControl.contexts.hasOwnProperty(contextName)) {
                    const context = this.mapControl.contexts[contextName];

                    /*
                    * context = {
                    *   label: label
                    *   labelToolTip: text
                    *   container: element - container element, not yet attached to DOM // can be null if context provider prefers delayed loading during finalize callback
                    *   contentFinalizeCallback: callable - called after container is attached
                    * }
                    */

                    const tabSwitchButton = this.contextSwitchButtons[this.contextSwitchButtons.length] = document.createElement('div');
                    tabSwitchButton.innerHTML = '<a href="#" title="' + context.labelToolTip + '">' + context.label + '</a>';
                    tabSwitchButton.className = 'gmapheaderbutton';
                    this.gmap.controls[google.maps.ControlPosition.TOP_RIGHT].push(tabSwitchButton);

                    this.contextSwitchButtonEventHandles[this.contextSwitchButtonEventHandles.length] =
                        registerDOMEventHandler(tabSwitchButton, 'click', this.mapControl, 'maptype_switch_click_handler', contextName);
                }
            }
        }
        //	this.tabSwitchButton = document.createElement('div');
        //	this.tabSwitchButton.innerHTML = '<a href="#" title="switch to map view that can printed or saved">printable map</a>';
        //	this.tabSwitchButton.className = 'gmapheaderbutton';
        //	this.gmap.controls[google.maps.ControlPosition.TOP_RIGHT].push(this.tabSwitchButton);
        //
        //	this.domEventHandles.staticMapButtonClickHandle = registerDOMEventHandler(this.tabSwitchButton, 'click', this.mapControl, 'maptype_switch_click_handler', MapControl.SVG_CONTEXT);
        //}
    }

    refresh_markers() {
        if (this.markerPolygons) {
            for (let p = this.markerPolygons.length-1; p >= 0; p--) {
                this.markerPolygons[p].setMap(null);
            }
        }
        this.markerPolygons = [];

        const bounds = new google.maps.LatLngBounds();

        for (let i = this.markers.length - 1; i >= 0; i--) {
            let marker = this.markers[i];

            if (marker.type === GMap.MARKER_SQUARE) {
                const sw = marker.gridref.gridCoords.to_latLng();
                const nw = (new marker.gridref.gridCoords.constructor(marker.gridref.gridCoords.x, marker.gridref.gridCoords.y + marker.gridref.length)).to_latLng();
                const ne = (new marker.gridref.gridCoords.constructor(marker.gridref.gridCoords.x + marker.gridref.length, marker.gridref.gridCoords.y + marker.gridref.length)).to_latLng();
                const se = (new marker.gridref.gridCoords.constructor(marker.gridref.gridCoords.x + marker.gridref.length, marker.gridref.gridCoords.y)).to_latLng();

                bounds.extend(sw);
                bounds.extend(nw);
                bounds.extend(ne);
                bounds.extend(se);

                this.markerPolygons[i] = new google.maps.Polygon({
                    paths: [sw, nw, ne, se],
                    strokeColor: "#009900",
                    strokeOpacity: 0.8,
                    strokeWeight: 1,
                    fillColor: "#009900",
                    fillOpacity: 0.35,
                    geodesic: true,
                    clickable: false
                });
            } else if (marker.type === GMap.MARKER_CENTROID) {
                let centre;

                if (marker.gridref.length > 1) {
                    centre = (new marker.gridref.gridCoords.constructor(marker.gridref.gridCoords.x + marker.gridref.length / 2, marker.gridref.gridCoords.y + marker.gridref.length / 2)).to_latLng();
                } else {
                    centre = marker.gridref.gridCoords.to_latLng();
                }

                this.markerPolygons[i] = new google.maps.Circle({
                    strokeColor: '#009900',
                    strokeOpacity: 0.8,
                    strokeWeight: 1,
                    fillColor: '#009900',
                    fillOpacity: 0.35,
                    center: centre,
                    radius: marker.radius
                });

                bounds.extend(centre);
            }

            this.markerPolygons[i].setMap(this.gmap);
        }

        if (!bounds.isEmpty()) {
            this.gmap.fitBounds(bounds);
        }
    }

    geolocate_click_handler() {
        // see https://developers.google.com/maps/documentation/javascript/examples/map-geolocation
        // and https://developer.mozilla.org/en-US/docs/Web/API/Geolocation.getCurrentPosition

        navigator.geolocation.getCurrentPosition((position) => {
            const pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

            this.gmap.setCenter(pos);
        }, () => {
            //handleNoGeolocation(true);
        });
    }

    register_svg_layer() {
        this.svgMapOverlay = new GSvgMapType(new google.maps.Size(GoogleMapUtility.TILE_SIZE, GoogleMapUtility.TILE_SIZE));

        this.svgMapOverlay.bind_bsbi_gmap(this);
        this.gmap.overlayMapTypes.insertAt(0, this.svgMapOverlay);
    }

    /**
     *
     * @returns {undefined}
     */
    refresh_svg_layer() {
        if (this.svgMapOverlay) {
            this.gmap.overlayMapTypes.removeAt(0);
            this.gmap.overlayMapTypes.insertAt(0, this.svgMapOverlay);
        }
    }

    /**
     * reads lat/lng centroid and zoom setting from google map object
     * returning an object {lat: lat, lng: lng, zoom: zoom}
     *
     * @return {Object}
     */
    get_current_map_position() {
        if (!this.gmap) {
            throw new Error('gmap not set in get_current_map_position');
        }

        const latLng = this.gmap.getCenter();
        return {
            lat: latLng.lat(),
            lng: latLng.lng(),
            zoom: this.gmap.getZoom()
        };
    }

    force_refresh() {
        if (this.refreshTimeoutId) {
            // try to break any race condition
            window.clearTimeout(this.refreshTimeoutId);
            this.refreshTimeoutId = null;
        }

        if (this.gmap) {
            const center = this.gmap.getCenter();

            // resize and zoom manipulations are nasty fixes to work aroung google tile refresh bug
            // see https://code.google.com/p/gmaps-api-issues/issues/detail?id=1448
            // and http://stackoverflow.com/questions/22403890/google-maps-does-not-update-tiles-while-dragging

            google.maps.event.trigger(this.gmap, 'resize');

            if (!this.noMoreSillyness) {
                this.gmap.setZoom(this.gmap.getZoom() - 1);
            }

            this.gmap.setCenter(center);

            if (!this.noMoreSillyness) {
                this.refreshTimeout2Id = window.setTimeout(callback(this, 'force_refresh2'), 300);
            }
        }
    }

    force_refresh2() {
        if (this.refreshTimeout2Id) {
            // try to break any race condition
            window.clearTimeout(this.refreshTimeout2Id);
            this.refreshTimeout2Id = null;
        }

        this.gmap.setZoom(this.gmap.getZoom() + 1);
        this.noMoreSillyness = true;
    }

    clear_dom_event_handles() {
        if (this.domEventHandles) {
            for (let key in this.domEventHandles) {
                if (this.domEventHandles.hasOwnProperty(key)) {
                    removeDomEventHandler(this.domEventHandles[key]);
                }
            }
        }
        this.domEventHandles = {};
    }

    /**
     * @deprecated GMap.prototype.destroy is never called
     * @returns {undefined}
     */
    destroy() {
        // if (this.partitionOverlays && this.partitionOverlays.layerClickHandles) {
        // 	for (var n in this.partitionOverlays.layerClickHandles) {
        // 		if (n !== 'length' && this.partitionOverlays.layerClickHandles.hasOwnProperty(n)) {
        // 			removeDomEventHandler(this.partitionOverlays.layerClickHandles[n]);
        // 			this.partitionOverlays.layers[n].unbindAll();
        // 			this.partitionOverlays.layers[n] = null;
        // 		}
        // 	}
        // }

        // if (this.bsbidbUnpartitionedDataLayer) {
        // 	this.bsbidbUnpartitionedDataLayer.unbindAll();
        // 	this.bsbidbUnpartitionedDataLayer = null;
        // }

        google.maps.event.clearInstanceListeners(this.gmap);
        this.gmap.overlayMapTypes.clear();

        if (this.toolTip) {
            this.toolTip.destroy();
            this.toolTip = null;
        }

        if (this.imageId) {
            const image = document.getElementById(this.imageId);
            if (image && image.parentNode) {
                image.parentNode.removeChild(image); // this is important for Internet Explorer
            }
            this.imageId = '';
        }

        //this.tabSwitchButton = null;

        //this.controlsPane = null;
        // this.partitionOverlays = null;
        //this.bsbidbMapOptions = null;
        this.mapBounds = null;
        this.bounds = null;

        this.gmap = null;
    }

    /**
     *
     * @returns {undefined}
     */
    drag_end_handler() {
        const c = this.gmap.getCenter();

        if (!this.mapBounds.contains(c)) {
            // move the map back within the bounds
            let x = c.lng(),
                y = c.lat();

            if (x < this.bounds.minX) {
                x = this.bounds.minX;
            } else if (x > this.bounds.maxX) {
                x = this.bounds.maxX;
            }

            if (y < this.bounds.minY) {
                y = this.bounds.minY;
            } else if (y > this.bounds.maxY) {
                y = this.bounds.maxY;
            }

            this.gmap.setCenter(new google.maps.LatLng(y, x));
        }
    }

    zoom_change_handler() {
        if (this.gmap.getZoom() < this.minZoomLevel) {
            this.gmap.setZoom(this.minZoomLevel);
        }
    }

    set_contain_map_type_class(imageEl) {
        if (this.gmapType === 'satellite' || this.gmapType === 'hybrid') {
            imageEl.classList.remove('gmap-plain');
            imageEl.classList.add('gmap-satellite');
        } else {
            imageEl.classList.remove('gmap-satellite');
            imageEl.classList.add('gmap-plain');
        }
    }

    map_type_change_handler() {
        this.gmapType = this.gmap.getMapTypeId();

        const image = document.getElementById(this.imageId);
        if (image) {
            this.set_contain_map_type_class(image);
        }
    }

    /**
     *
     * @param {google.maps.MouseEvent} event
     */
    gmouse_move_handler(event) {
        const lat = event.latLng.lat(), lng = event.latLng.lng();
        const ref = GridCoords.from_latlng(lat, lng);

        const image = document.getElementById(this.imageId);

        if (image) {
            const rect = image.getBoundingClientRect();
            const scrollTop = (document.documentElement && document.documentElement.scrollTop) || document.body.scrollTop;

            this.toolTip.cfg.setProperty('xy', [event.pixel.x + rect.left, event.pixel.y + rect.top + scrollTop + 16]);

            if (ref) {
                const details = MappingUtils.lookup_gridref_details(
                    ref,
                    this.mapConfiguration,
                    GMap.precisionLevelMetres[GmapTile.zoom_to_data_precision(this.gmap.getZoom()) - 1],
                    '<br>');

                this.toolTip.setBody(details.message);
            } else {
                this.toolTip.setBody(`WGS84 lat/lng: ${lat.toFixed(3)},${lng.toFixed(3)}`);
            }
        }
    }

    /**
     *
     * @param {object} details
     * @param {number} zoomPrecisionLevel
     * @returns {undefined}
     */
   refresh_info_panel(details, zoomPrecisionLevel) {
        this.closeButtonId = uniqueId('close');

        let html = '';
        let partitionString;

        // get total number of series (whether loaded or not)
        // if > 1 then need to label the series in the info box
        const totalSeries = Object.keys(this.mapConfiguration.series).length;

        const precisionMapping = {
            2 : 'hectads',
            3 : 'tetrads',
            4 : 'monads',
            5 : '100m squares'
        };

        for (let seriesNumber in details.series) {
            if (details.series.hasOwnProperty(seriesNumber)) {
                const data = details.series[seriesNumber].data;
                const seriesConfig = this.mapConfiguration.series[seriesNumber];

                const nonCumulativeFreq = seriesConfig.searchType === MapConfiguration.SEARCHTYPE_TAXON_FREQ ||
                    seriesConfig.searchType === MapConfiguration.SEARCHTYPE_SPECIES_FREQ;

                const l = data.length;
                if (l > 0) {

                    if (seriesConfig.partition_filter) {
                        for (let precisionLevel = l - 1; precisionLevel >= 0; precisionLevel--) {
                            data[precisionLevel] = seriesConfig.partition_filter(data[precisionLevel]);
                        }
                    }

                    html += '<table class="gmapresultsinfo"><thead>';

                    const label = seriesConfig.get_series_label();

                    if (totalSeries > 1 && label !== '') {
                        // show series name
                        html += '<tr><th colspan="' + (zoomPrecisionLevel - 2) + '">' + escapeHTML(label) + '</th></tr>';
                    }

                    html += '<tr><th></th>'; // first column is partition label

                    const grStrings = [];

                    for (let precisionLevel = l - 1; precisionLevel >= 2; precisionLevel--) {
                        grStrings[precisionLevel] = details.nationalRef.to_gridref(GMap.precisionLevelMetres[precisionLevel]);
                        html += '<td>' + grStrings[precisionLevel] + '</td>';
                    }

                    const distinctGridSquareUnit = precisionMapping[seriesConfig.sourceData.descriptor.freqMonitoringPrecisionLevel];

                    html += '<th style="vertical-align: top;">' + details.nationalRef.country + '</th><th>' + details.nationalRef.country + '<p style="font-size: 0.8em;">(' + distinctGridSquareUnit + ')<p></th></thead><tbody>';

                    let distinctHectadsPartLabel;
                    if (seriesConfig.partitionType) {
                        distinctHectadsPartLabel = seriesConfig.partitionType;
                    } else {
                        // nasty kludge because object labelling is inconsistent

                        distinctHectadsPartLabel = (seriesConfig.sourceData.descriptor.distinctHectads.hasOwnProperty(MapConfiguration.PARTITION_TYPE.DATECLASS)) ?
                            MapConfiguration.PARTITION_TYPE.DATECLASS : MapConfiguration.PARTITION_TYPE.OTHER;
                    }
                    const hectadCount = seriesConfig.sourceData.descriptor.distinctHectads[distinctHectadsPartLabel][details.nationalRef.country.toLowerCase()];

                    if (seriesConfig.numberOfPartitions > 1) {
                        const partitionDates = MapConfiguration.PARTITION_DATES[seriesConfig.partitionType];

                        for (let p = 0; p < seriesConfig.numberOfPartitions; p++) {
                            html += '<tr><td>' + escapeHTML(seriesConfig.partitionLabels[seriesConfig.partitionType][p]) + '</td>';

                            for (let precisionLevel = l - 1; precisionLevel >= 2; precisionLevel--) {
                                const partitionTotal = data[precisionLevel].partitions[p].childFreq + data[precisionLevel].partitions[p].residualFreq;
                                if (partitionTotal > 0) {
                                    if (partitionDates) {
                                        partitionString = ' data-date-type="' + partitionDates[p].type + '" ';

                                        if (partitionDates[p].from) {
                                            partitionString += ' data-date-from="' + partitionDates[p].from + '" ';
                                        }

                                        if (partitionDates[p].to) {
                                            partitionString += ' data-date-to="' + partitionDates[p].to + '"';
                                        }
                                    } else {
                                        partitionString = '';
                                    }

                                    html += '<td><a href="#" data-gr="' + grStrings[precisionLevel] + '" data-partition="' + p + '" data-seriesNumber="' + seriesNumber + '"' +
                                        partitionString +
                                        '>' + partitionTotal + '</a></td>';
                                } else {
                                    html += '<td>' + partitionTotal + '</td>';
                                }
                            }

                            // country-level total number of records
                            html += '<td>' + (data[0].partitions[p].childFreq + data[0].partitions[p].residualFreq) + '</td>';

                            // country-level total number of hectads
                            html += '<td>' + hectadCount[p] + '</td>';
                        }

                        // total (across all partitions)
                        html += '<tr><td>total</td>';
                    } else {
                        // single partition, so use total value (unlabelled)
                        html += '<tr><td></td>';
                    }

                    if (nonCumulativeFreq) {
                        // counting distinct species or taxa (values which are not cumulative over precision levels)
                        // so show only the count for the relevant precision (which will be the most precise

                        let total = data[l-1].residualTotal;

                        if (total > 0) {
                            //html += '<td><a href="#" data-gr="' + grStrings[precisionLevel] + '" data-seriesNumber="' + seriesNumber + '">' + total + '</a></td>';
                            html += '<td><a href="#" data-gr="' + grStrings[grStrings.length - 1] + '" data-seriesNumber="' + seriesNumber + '">' + total + '</a></td>';
                        } else {
                            html += '<td>' + total + '</td>';
                        }

                        for (let precisionLevel = l - 2; precisionLevel >= 2; precisionLevel--) {
                            html += '<td></td>';
                        }

                        html += '<th></th>';
                    } else {
                        for (let precisionLevel = l - 1; precisionLevel >= 2; precisionLevel--) {
                            let total = data[precisionLevel].childTotal + data[precisionLevel].residualTotal;

                            if (total > 0) {
                                html += '<td><a href="#" data-gr="' + grStrings[precisionLevel] + '" data-seriesNumber="' + seriesNumber + '">' + total + '</a></td>';
                            } else {
                                html += '<td>' + total + '</td>';
                            }
                        }

                        // country-level total records
                        html += '<th>' + (data[0].childTotal + data[0].residualTotal) + '</th>';
                    }

                    // country-level total hectads
                    // @todo fix hectad count

                    html += '<th>' + seriesConfig.sourceData.descriptor.distinctHectads['total'][details.nationalRef.country.toLowerCase()] + '</th>';

                    html += '</tr></tbody></table><br />';
                }
            }
        }

        const infoDiv = document.getElementById(this.infoDivId);

        if (infoDiv) {

            if (html) {
                infoDiv.innerHTML = '<div style="position: relative;"><a style="position: absolute; top: 5px; right: 1px" href="#" title="hide panel"><img src="' + MapControl.imgPath + '/img/icons/close-button-24.png" alt="x" id="' + this.closeButtonId + '"></a>' +
                    html +
                    '</div>';

                infoDiv.style.display = 'block';
            } else {
                infoDiv.style.display = 'none';
            }
        }
    }

    refresh_legend() {
        const legendContainerEl = document.getElementById(this.legendDivId);

        if (legendContainerEl) {
            while (legendContainerEl.lastChild) {
                legendContainerEl.removeChild(legendContainerEl.lastChild);
            }

            const seriesListEl = legendContainerEl.appendChild(document.createElement('ul'));
            this.legendSeriesListElementId = seriesListEl.id = uniqueId('legendseries');

            const multipleSeriesFlag = Object.keys(this.mapConfiguration.series).length > 1;

            for (let seriesNumber in this.mapConfiguration.series) {
                if (this.mapConfiguration.series.hasOwnProperty(seriesNumber) &&
                    this.mapConfiguration.series[seriesNumber].has_content() &&
                    this.mapConfiguration.series[seriesNumber].sourceData.data_loaded()
                ) {

                    const legend = this.mapStyle.series[seriesNumber].create_html_legend(this.mapConfiguration.series[seriesNumber], multipleSeriesFlag);
                    if (legend) {
                        seriesListEl.appendChild(legend);
                    }
                }
            }

            this.legendValid = !!(seriesListEl.firstChild);
            this.legend_refresh_visibility();
        }
    }

    legend_button_click_handler(event) {
        this.legendShown = !this.legendShown;
        this.clear_info_panel();
        this.legend_refresh_visibility();
        stop_event(event);
    }

    legend_refresh_visibility() {
        const legendButton = document.getElementById(this.legendButtonId);

        if (legendButton) {
            const legendDiv = document.getElementById(this.legendDivId);

            if (legendDiv) {
                if (this.legendValid) {
                    legendButton.style.display = 'block';
                    legendDiv.style.display = this.legendShown ? 'block' : 'none';
                } else {
                    legendDiv.style.display = 'none';
                    legendButton.style.display = 'none';
                }
            }
        }
    }

    /**
     * clear (hide) the info panel
     * typically called after a map change (so that the displayed details (which relate to a specific clicked gr) may nolonger be valid.
     *
     */
    clear_info_panel() {
        const infoDiv = document.getElementById(this.infoDivId);

        if (infoDiv) {
            infoDiv.style.display = 'none';
        }
    }

    /**
     * handler for GMap.EVENT_GRIDDED_MAP_CLICK
     * @param {{nationalGridRef : GridCoordsGB | GridCoordsIE | GridCoordsCI}} params
     */
    gridded_click_callback(params) {
        const zoomedPrecisionLevel = GmapTile.zoom_to_data_precision(this.gmap.getZoom()) - 1;
        this.refresh_info_panel(
            MappingUtils.lookup_gridref_details(params.nationalGridRef, this.mapConfiguration, GMap.precisionLevelMetres[zoomedPrecisionLevel], '<br>'),
            zoomedPrecisionLevel
        );
    }

    /**
     *
     * @param {google.maps.MouseEvent} event
     */
    gmouse_click_handler(event) {
        const nationalGridRef = GridCoords.from_latlng(event.latLng.lat(), event.latLng.lng());

        if (nationalGridRef) {
            this.fireEvent(GMap.EVENT_GRIDDED_MAP_CLICK, {nationalGridRef});
        } else {
            let infoDiv = document.getElementById(this.infoDivId);
            if (infoDiv) {
                infoDiv.style.display = 'none';
            }
        }
    }
}

/**
 * Event fired with a gridref object after a click on a google map
 * @type String
 */
GMap.EVENT_GRIDDED_MAP_CLICK = 'gmapgriddedclickevent';

// default GBIE mid-point
GMap.prototype.lat = 55.15793;
GMap.prototype.lng = -4.68;

/**
 * default google map zoom level
 *
 * @type {number}
 */
GMap.defaultZoom = 6;

GMap.prototype.zoom = GMap.defaultZoom; // default zoom for whole of GB & IE

GMap.prototype.copyrightMessage = '<span title="Botanical Society of Britain and Ireland">Distribution data &copy; BSBI ' + new Date().getFullYear() + '</span>';

/**
 *
 * @type MapControl
 */
GMap.prototype.mapControl = null;

/**
 * if set then legend hasn't been hidden by user (so should be shown, if valid)
 *
 * @type {boolean}
 */
GMap.prototype.legendShown = true;

/**
 * set if legend DIV contains valid content
 *
 * @type {boolean}
 */
GMap.prototype.legendValid = false;

/**
 *
 * @type MapStyle
 */
GMap.prototype.mapStyle = null;

/**
 *
 * @type MapConfiguration
 */
GMap.prototype.mapConfiguration = null;

/**
 * if set then load maps asyncronously on first use rather than in page header
 *
 * @type boolean
 */
GMap.asyncLoadMaps = false;

/**
 * element id of gmap container image
 *
 * @type String
 */
GMap.prototype.imageId = '';

/**
 *
 * @type {YAHOO.widget.Tooltip}
 */
GMap.prototype.toolTip = null;

GMap.MARKER_SQUARE = 'square';
GMap.MARKER_CENTROID = 'centroid';

GMap.MAPS_INITIALISED_EVENT = 'maps_initialised_event';

GMap.precisionLevelMetres = [
    null,
    100000,
    10000,
    2000,
    1000,
    100,
    10,
    1
];

const queryPath = '/search.php#applyquery=';
const jsonQueryPath = '/searchJSON.php?query=';


