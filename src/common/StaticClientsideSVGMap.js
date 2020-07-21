import {EventHarness} from "../framework/EventHarness";
import {MapControl} from "./MapControl";
import {
    registerBoundEventHandler,
    removeDomEventHandler
} from "../utils/registerDOMEventHandler";
import {uniqueId} from "../utils/uniqueId";
import {MapControlPanel} from "./MapControlPanel";
import {logError} from "../utils/logError";
import {stop_event} from "../utils/stopEvent";

export class StaticClientsideSVGMap extends EventHarness {

    /**
     * @type {MapControl}
     */
    mapControl;

    /**
     * @type {MapConfiguration}
     */
    mapConfiguration;

    /**
     * @type {string}
     */
    containerId;

    /**
     *
     * @type {?string}
     */
    previousPreviewQueryParams = null;

    /**
     *
     * @param {{context : MapControl}} params
     */
    register_context(params) {
        this.mapControl = params.context;
        const container = document.createElement('div');
        this.containerId = container.id = uniqueId('staticmap');

        this.mapControl.register_context(MapControl.SVG_LOCAL_CONTEXT, {
            label: 'svg map',
            labelToolTip: 'switch to static map view',
            container: container,
            contentFinalizeCallback: this.setContent.bind(this)
        });
    };

    /**
     *
     * @param {{context: MapControl, oldContext: string, newContext: string}} params
     */
    context_change_handler(params) {
        if (params.oldContext === MapControl.SVG_LOCAL_CONTEXT && params.oldContext !== params.newContext) {
            document.getElementById(this.containerId).style.display = 'none';
        } else if (params.newContext === MapControl.SVG_LOCAL_CONTEXT) {
            this.mapControl.controls.set_container(document.getElementById(this.controlsOuterContainerId));
            document.getElementById(this.containerId).style.display = 'block';
        }
    };

    setContent() {
        const container = document.getElementById(this.containerId);

        const controlsOuterContainer = container.appendChild(document.createElement('div'));
        controlsOuterContainer.className = 'staticmapcontrolscontainer';
        this.controlsOuterContainerId = controlsOuterContainer.id = uniqueId('staticmapcontrolsouter');

        this.mapControl.controls = new MapControlPanel;
        this.mapControl.controls.create_panels(controlsOuterContainer, this.mapControl);

        this.mapControl.controls.addListener('changed', (context, eventName, panelContext) => {
            this.mapControl.apply_options(panelContext);
        });

        const previewContainerEl = container.appendChild(document.createElement('div'));
        previewContainerEl.id = uniqueId('svgpreviewcontainer');

        this.previewRefreshButtonId = uniqueId('refresh');

        const button = document.createElement('button');
        button.id = this.previewRefreshButtonId;
        button.className = 'previewbutton';
        button.appendChild(document.createTextNode('refresh map image'));
        previewContainerEl.appendChild(button);

        const svgContainerEl = previewContainerEl.appendChild(document.createElement('div'));
        this.svgContainerId = svgContainerEl.id = uniqueId('svgdiv');
        svgContainerEl.className = 'svgmap';
        svgContainerEl.style.cssFloat = 'left';

        const infoDivContainer = svgContainerEl.appendChild(document.createElement('div'));
        infoDivContainer.style.zLayer = 101;
        infoDivContainer.style.paddingLeft = '5px';
        infoDivContainer.style.display = 'inline-block';
        infoDivContainer.style.cssFloat = 'left';
        const infoDiv = infoDivContainer.appendChild(document.createElement('div'));
        infoDiv.style.display = 'none';
        infoDiv.className = 'gmapInfoContainer';
        this.infoDivId = infoDiv.id = uniqueId('staticInfoContainer');

        this.infoDivClickHandle = infoDiv.addEventListener( 'click', MapControl.prototype.info_panel_click_handler.bind(this.mapControl));

        this.mapControl.populate_context_switch_container(controlsOuterContainer, MapControl.SVG_LOCAL_CONTEXT);

        //NEED TO REINSTATE THESE HELP MESSAGES
        //Help.register_icon(document.getElementById('mappedareaheading' + this.idSuffix), "You can restrict the mapping to only the area covered by the specified bottom-left grid square. To cover more than a single square, also specify the NE corner to map up to. Leave both fields blank to include the whole area.");
        //Help.register_icon(document.getElementById('weightheading' + this.idSuffix), "Specifies the line thickness in nominal pixels. For on screen use of images, values in the range 0.1 to 2 may be useful for grid lines. When printing images, if you have problems with missing or irregular grid lines then avoid values less than 1 for grid line weight.");

        Help.refresh();

        this.mapControl.controls.set_options_availability(MapControl.SVG_LOCAL_CONTEXT);
        this.mapControl.addListener('changed', this.refresh_preview_image.bind(this));

        this.mapControl.apply_options({ localsvg : true, gmap : true });
    };

    /**
     *
     * @param {MapConfiguration} mapConfiguration
     */
    applyConfiguration(mapConfiguration) {
        this.mapConfiguration = mapConfiguration;
    }

    refresh_preview_image() {
        let obj;

        if (this.mapControl.errors.length === 0) {
            this.mapControl.controls.panels.ExportLinks.set_visibility(true);

            let previewButton = document.getElementById(this.previewRefreshButtonId);
            previewButton.style.display = 'none'; // preview will be up-to-date again

            if (this.staticSvgImageId) {
                obj = document.getElementById(this.staticSvgImageId);
            }

            if (obj && this.previousPreviewQueryParams === this.mapControl.queryParams && document.body.contains(obj)) {
                // nothing to do map image is already displayed and is current

                //console.log('skipping preview image redisplay');
            } else {
                const svgContainerEl = document.getElementById(this.svgContainerId);

                if (this.mapDetectClickHandle) {
                    this.mapDetectClickHandle = removeDomEventHandler(this.mapDetectClickHandle);
                }

                const pageYOffset = window.pageYOffset; // save window scroll position prior to redrawing map

                this.previousPreviewQueryParams = this.mapControl.queryParams;

                // throw away any previous image
                if (obj && obj.parentNode) {
                    obj.parentNode.removeChild(obj);
                }

                this.staticSvgImageId = uniqueId('mapimage');

                const url = MapControl.renderScriptUrls.svg + this.mapControl.queryParams.replace(/^&/, '') + '&scripted=true&standalone=0';

                obj = document.createElement('object');
                obj.id = this.staticSvgImageId;

                obj.style.display = 'block';
                obj.className = 'svgmapobj';

                obj.addEventListener('load', this.svgLoaded.bind(this))

                obj.style.float = 'left';
                obj.style.maxWidth = '80vw';
                obj.style.height = '92vh';
                obj.type = 'image/svg+xml';
                obj.data = url;

                svgContainerEl.insertBefore(obj, svgContainerEl.firstChild);

                window.scrollTo(0, pageYOffset); // restore previous scroll position after refresh
            }
        }
    }

    /**
     *
     * @param {Event} event
     * @returns {boolean}
     */
    svgLoaded(event) {
        /**
         *
         * @type {HTMLObjectElement}
         */
        const element = event.currentTarget;
        const controlName = uniqueId('bsbiMapControl');

        window[controlName] = this;

        try {
            // IE9 sometimes seems to have problems calling set_map_control_name
            // I assume that onload fires prematurely before the script embedded in the object has loaded
            // so need to test if function exists and if not wait and retry
            if (element && element.contentDocument && element.contentDocument.set_map_control_name) {
                element.contentDocument.set_map_control_name(controlName, this); // pass both an indirect and direct reference to cope with recent IE that doesn't allow break out from the svg object via window.parent

                this.svg_content_ready_callback();
            } else {
                let errorEls;
                if (element && element.contentDocument && (errorEls = element.contentDocument.getElementsByTagName('error')).length) {
                    console.log('Have error in SVG response');
                    console.log(element);
                    console.log(errorEls[0]);
                } else {
                    console.log('set_map_control_name still not set, delaying 2s');

                    let objContext = element;

                    setTimeout(() => {
                        if (objContext && objContext.contentDocument && objContext.contentDocument.set_map_control_name) {
                            objContext.contentDocument.set_map_control_name(controlName, this);

                            this.svg_content_ready_callback();
                        } else {
                            // this can happen if svg load has failed
                            // e.g. if result set has expired
                            console.log('Have svg problem after delay');
                            console.log(objContext);
                        }
                    }, 2000);
                }
            }
        } catch (e) {
            // IE 10 sometimes throws 'Access is denied.'
            logError('Failed initial svg bind, will try again after delay.', '', 8514);
            console.log('Failed initial svg bind, will try again after delay. (got exception)');

            let objContext = element;

            setTimeout(() => {
                if (objContext && objContext.contentDocument && objContext.contentDocument.set_map_control_name) {
                    objContext.contentDocument.set_map_control_name(controlName, this);

                    this.svg_content_ready_callback();
                } else {
                    // this can happen if svg load has failed
                    // e.g. if result set has expired
                    console.log('Have svg problem after delay, in ie catch handler');
                    console.log(objContext);
                }
            }, 2000);
        }

        return stop_event(event);
    }

    staticSvgImageId = '';

    svg_content_ready_callback() {
        //console.log('mapimage content ready');
        //console.log(this);

        if (!this.loadingComplete) {
            this.loadingComplete = true;
            this.fireEvent('svgmaploaded');
        }

        if (this.mapDetectClickHandle) {
            // do this again in case the event handler had already been reregistered during a race-condition.
            this.mapDetectClickHandle = removeDomEventHandler(this.mapDetectClickHandle);
        }
        let mapDocument = document.getElementById(this.staticSvgImageId);
        if (mapDocument && mapDocument.contentDocument && mapDocument.contentDocument.getElementsByTagName('svg')) {
            mapDocument = mapDocument.contentDocument && mapDocument.contentDocument.getElementsByTagName('svg')[0];

            if (mapDocument) {
                //console.log('bound to svg');

                //this.mapDetectClickHandle = registerBoundEventHandler(mapDocument, 'click', this.controls, this.controls.close_option_panes, null, false);

                this.mapDetectClickHandle = registerBoundEventHandler(mapDocument, 'click', this.mapControl.controls, function() {
                    // N.B. called in the context of 'this.controls'
                    this.close_option_panes();
                    //jscolor.close_picker(); // shouldn't be needed but sometimes picker gets stuck
                }, null, false);

                //console.log('registered');
            } else {
                console.log('failed at final hurdle to bind click handler to svg');
            }
        } else {
            console.log('failed to bind to svg');
        }
    }
}


