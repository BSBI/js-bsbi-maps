import {EventHarness} from "../framework/EventHarness";
import {uniqueId} from "../utils/uniqueId";
import {
    registerBoundEventHandler,
    registerDOMEventHandler,
    removeDomEventHandler
} from "../utils/registerDOMEventHandler";
import {stop_event} from "../utils/stopEvent";
import {MapDataseriesConfiguration} from "./MapDataseriesConfiguration";
import {MapDataseriesStyle} from "./MapDataseriesStyle";
import {remove_class} from "../utils/remove_class";
import {add_class} from "../utils/add_class";
import {has_class} from "../utils/has_class";
import {IframeSize} from "../utils/IFrameSize";
import {selectOption} from "../utils/selectOption";
import {MapControl} from "./MapControl";
import {button_element} from "../utils/button_element";
import {get_input_colour, initialise_input_colour, set_input_colour} from "../utils/colour_support";
import {escapeHTML} from "../utils/escapeHTML";
import {MapConfiguration} from "./MapConfiguration";

export class MapControlPanel extends EventHarness {
    /**
     * @type {string}
     */
    panelLabel;

    /**
     * @type {{
     *  ExportLinks : ExportLinks,
     *  BoundaryStyles : BoundaryStyles,
     *  DataPartitioning : DataPartitioning,
     *  DataSeriesStyles : DataSeriesStyles,
     *  MappedArea : MappedArea,
     *  PageLayoutSettings : PageLayoutSettings
     * }}
     */
    panels;

    constructor() {
        super();

        this.errors = [];
        this.panels = {};
        this.domEventHandles = {};
    }
}

/**
 *
 * @type MapConfiguration
 */
MapControlPanel.prototype.mapConfiguration = null;

/**
 *
 * @type MapStyle
 */
MapControlPanel.prototype.mapStyle = null;

/**
 *
 * @type MapControl
 */
MapControlPanel.prototype.mapControl = null;

/**
 * the currently displayed tab type
 *
 * @type string
 */
MapControlPanel.prototype.idListKey = null;

/**
 *
 * @param {Event} event
 * @returns {boolean}
 */
MapControlPanel.prototype.form_submit_handler = function (event) {
    return stop_event(event);
};

/**
 *
 * @param {HTMLElement} container
 * @param {MapControl} mapControl
 * @returns {string} nav container id
 */
MapControlPanel.prototype.create_panels = function(container, mapControl) {
    this.navEl = container.appendChild(document.createElement('nav'));
    this.navEl.id = uniqueId('mapoptions');


    this.navEl.style.display = 'inline-block'; //IE7 ? 'inline' : 'inline-block';

    var form = this.navEl.appendChild(document.createElement('form'));

    //stop 'submission' of the form
    this.domEventHandles.formSubmitHandler = registerDOMEventHandler(form, 'submit', this, 'form_submit_handler');

    /**
     * propagates the change event
     * (catches individual panel change events and fires a new event
     * so that external listeners don't need to listen to individual panels)
     *
     * @param {Object} context
     * @param {string} eventName
     * @param {Object} panelContext
     * @this MapControlPanel
     */
    var aggregate_change_handler = function(context, eventName, panelContext) {
        if (context === this.panels.DataPartitioning) {
            // refresh the partitions style content before proceeding
            this.panels.DataSeriesStyles.apply_options(mapControl.mapStyle, mapControl.mapConfiguration);
        }

        this.fireEvent('changed', panelContext);
    };

    for(var key in MapControlPanel.options) {
        if (MapControlPanel.options.hasOwnProperty(key)) {
            this.panels[key] = new MapControlPanel.options[key];

            this.panels[key].mapConfiguration = mapControl.mapConfiguration;
            this.panels[key].mapStyle = mapControl.mapStyle;
            this.panels[key].mapControl = mapControl;

            this.panels[key].create_panel(form, mapControl.mapStyle, mapControl.mapConfiguration, mapControl);
        }

        this.panels[key].bindListener('changed', this, aggregate_change_handler);
    }

    this.collapse_fieldsets();

    return this.navEl.id;
};

MapControlPanel.prototype.read_options = function() {
    this.errors = [];
};

/**
 * sets the parent container of the map controls
 * (i.e. moves them to a different location in the DOM)
 *
 * @param {Element} newContainer
 */
MapControlPanel.prototype.set_container = function(newContainer) {
    if (this.navEl.parentNode !== newContainer) {
        newContainer.appendChild(this.navEl);
    }
};

MapControlPanel.prototype.close_option_panes = function() {
    if (this.openPaneId) {
        this.domEventHandles.linerClickCaptureHandle = removeDomEventHandler(this.domEventHandles.linerClickCaptureHandle);
        const panel = this.panels[this.openPaneId];
        const fieldSet = document.getElementById(panel.fieldsetId);

        if (fieldSet) {
            fieldSet.classList.remove('openpanel');

            const liner = fieldSet.getElementsByTagName('div')[0]; // fieldset inner liner

            if (liner) {
                liner.style.display = 'none';
            }
        }

        this.openPaneId = null;

        if (this.navEl && 'blur' in this.navEl) {
            this.navEl.blur(); // has the effect of closing any on-screen keyboard that has been left open
        }
    }
};

MapControlPanel.prototype.collapse_fieldsets = function() {
    var i;

    for (i in this.panels) {
        if (this.panels.hasOwnProperty(i)) {
            var fieldSet = document.getElementById(this.panels[i].fieldsetId);

            var liner = fieldSet.getElementsByTagName('div')[0]; // fieldset inner liner
            liner.style.display = 'none';

            var label = document.createElement('label');

            var fakeLink = label.appendChild(document.createElement('a'));
            fakeLink.href = '#';

            var captionEl = fieldSet.getElementsByTagName('legend')[0];

            fakeLink.appendChild(captionEl.firstChild); // suck the caption inside the label element
            captionEl.insertBefore(label, captionEl.firstChild); // firstChild is probably null

            this.domEventHandles['collapseClickHandles_' + i] = registerBoundEventHandler(fakeLink, 'click', this, this.fieldset_collapse_handler, i);
        }
    }

    this.domEventHandles.bodyClickHandle = registerBoundEventHandler(document.getElementsByTagName('body')[0], 'click', this, function (unused, evt) {
        //console.log('body click');
        //console.log(arguments);
        //console.log('event: ' + evt.target + ' ' + evt.srcElement);

        if (evt) {
            var target = evt.target || evt.srcElement;

            if (!has_class(target, 'bsbidbNoPanelClose')) {
                this.close_option_panes();

                // jscolor.close_picker(); // shouldn't be needed but sometimes picker gets stuck
            }
        } else {
            //console.log('map click \'evt\' not set.');
            //console.log(arguments);
        }

        return true; // allow the event to bubble in old IE
    });
};

MapControlPanel.prototype.set_options_availability = function(idListKey) {
    this.idListKey = idListKey;

    for(var key in this.panels) {
        if (this.panels.hasOwnProperty(key)) {

            var element = document.getElementById(this.panels[key].fieldsetId);

            if (element) {
                element.style.display = (this.panels[key].context[idListKey] ?
                        'inline-block'
                        :
                        'none'
                );
            } else {
                console.log('failed to find container element for ' + key);
            }
            //}
        }
    }
};

MapControlPanel.prototype.fieldset_collapse_handler = function(panelId, event) {
    var fieldSet = document.getElementById(this.panels[panelId].fieldsetId);
    var liner = fieldSet.getElementsByTagName('div')[0]; // fieldset inner liner

    if (liner.style.display === 'none') {
        this.show(panelId);
    } else {
        this.close_option_panes();
    }

    IframeSize.poll();
    return stop_event(event);
};

MapControlPanel.prototype.show = function(panelId) {
    var fieldSet = document.getElementById(this.panels[panelId].fieldsetId);
    var liner = fieldSet.getElementsByTagName('div')[0]; // fieldset inner liner

    this.close_option_panes();
    liner.style.display = 'block';

    this.openPaneId = panelId;

    fieldSet.classList.add('openpanel');

    this.domEventHandles.linerClickCaptureHandle = registerBoundEventHandler(liner, 'click', this,
        function(ignore, event){
            const target = event.target || event.srcElement;
            if (target) {
                target.classList.add('bsbidbNoPanelClose');
            }

            return true; // allow the event to bubble in old IE
        }
        , liner.id, true);
};

/**
 * top-level destructor for panel collection
 *
 * @returns {undefined}
 */
MapControlPanel.prototype.destroy = function() {
    this._generic_destroy_events();

    for(var key in this.panels) {
        if (this.panels.hasOwnProperty(key)) {
            this.panels[key].destroy_panel();
        }
    }
    this.panels = null;

    if (this.navEl) {
        if (this.navEl.parentNode) {
            this.navEl.parentNode.removeChild(this.navEl);
        }
        delete this.navEl;
    }

    this.mapControl = null;
    this.mapConfiguration = null;
    this.mapStyle = null;
};

/**
 * sub-level destructor for individual panel object
 *
 * @returns {undefined}
 */
MapControlPanel.prototype._generic_destroy_events = function() {
    this.destructor(); // clear bsbidb event model events

    // clear associated dom events
    if (this.domEventHandles) {
        for (var key in this.domEventHandles) {
            if (this.domEventHandles.hasOwnProperty(key)) {
                removeDomEventHandler(this.domEventHandles[key]);
            }
        }
    }
    this.domEventHandles = {};

    if (this.ieChangeHandles) {
        for (var n = this.ieChangeHandles.length - 1; n >= 0; n--) {
            removeDomEventHandler(this.ieChangeHandles[n]);
        }
    }
    this.ieChangeHandles = [];
};

/**
 * sub-level destructor for individual panel object
 *
 * @returns {undefined}
 */
MapControlPanel.prototype.destroy_panel = function() {
    this._generic_destroy_events();
    this.mapControl = null;
};

/**
 * @type {{string, function}}
 */
MapControlPanel.options = {};

MapControlPanel.prototype.context = { localsvg : true, gmap : false };

MapControlPanel.prototype.linerId = '';
MapControlPanel.prototype.fieldsetId = '';

/**
 *
 * @param {Element} container
 * @returns {Element}
 */
MapControlPanel.prototype.create_panel = function(container) {
    var fieldsetEl = container.appendChild(document.createElement('fieldset'));
    this.fieldsetId = fieldsetEl.id = uniqueId('panel');

    fieldsetEl.style.display = 'inline-block';

    var legend = fieldsetEl.appendChild(document.createElement('legend'));

    legend.className = 'collapsible';
    legend.appendChild(document.createTextNode(this.panelLabel));
    fieldsetEl.appendChild(legend);

    var liner = fieldsetEl.appendChild(document.createElement('div'));

    liner.className = 'mapoptionsset';

    this.linerId = liner.id = uniqueId('liner');

    if (window.addEventListener) {
        // can only do this in IE versions >= 9
        // as change event doesn't bubble in earlier versions
        this.domEventHandles.changeHandle = registerDOMEventHandler(liner, 'change', this, 'panel_change_handler');
    }
    return liner;
};

// /**
//  * onChange event doesn't bubble in Internet Explorer
//  * instead need to bind to each child input, textbox or select element
//  * @deprecated
//  * @type Function
//  */
// MapControlPanel.prototype.broken_ie_change_handler_binder = (window.addEventListener ? function() {} : function broken_ie_change_handler_binder () {
//     if (this.ieChangeHandles) {
//         for (var n = this.ieChangeHandles.length - 1; n >= 0; n--) {
//             removeDomEventHandler(this.ieChangeHandles[n]);
//         }
//     }
//
//     this.ieChangeHandles = [];
//
//     var liner = document.getElementById(this.linerId);
//
//     this.broken_ie_change_handler_binder_bind_tag(liner, 'input');
//     this.broken_ie_change_handler_binder_bind_tag(liner, 'select');
//     this.broken_ie_change_handler_binder_bind_tag(liner, 'textarea');
// });

// /**
//  * @deprecated
//  * @type {function(...[*]=)}
//  */
// MapControlPanel.prototype.broken_ie_change_handler_binder_bind_tag = window.addEventListener ? function() {} : function(liner, tagName) {
//     var els = liner.getElementsByTagName(tagName);
//
//     for(var i = 0, l = els.length; i < l; i++) {
//         if (tagName === 'input' && els[i].type === 'checkbox') {
//             this.ieChangeHandles.push(registerDOMEventHandler(els[i], 'click', this, 'panel_change_handler'));
//         } else {
//             this.ieChangeHandles.push(registerDOMEventHandler(els[i], 'change', this, 'panel_change_handler'));
//         }
//     }
// };

/**
 *
 * @param {Event} event
 * @param element
 * @param {string} optionElId id of the associated option element (which should be ticked)
 */
MapControlPanel.prototype.set_linked_checkbox_event_handler = function(event, element, optionElId) {
    var el = document.getElementById(optionElId);
    //console.log('colour change, id=' + optionElId + ' colour el value = ' + element.value);
    //console.log(el);

    if (el) {
        el.checked = true;
    }

    // if (element.value !== '' && element.color) {
    //     element.color.fromString(element.value);
    //     element.value = '';
    //     element.color.hidePicker();
    // }
};

/**
 * DOM change event listener
 * fires a BSBI 'changed' event which is caught and refired by MapControlPanel.prototype.aggregate_change_handler
 *
 * @returns {boolean}
 */
MapControlPanel.prototype.panel_change_handler = function() {
    this.read_options();

    this.fireEvent('changed', this.context);

    return true; // in old IE don't stop the event
};

/**
 *
 * @constructor
 * @extends MapControlPanel
 */
MapControlPanel.options.DataPartitioning = function () {};
MapControlPanel.options.DataPartitioning.prototype = new MapControlPanel;
MapControlPanel.options.DataPartitioning.prototype.constructor = MapControlPanel.options.DataPartitioning;
MapControlPanel.options.DataPartitioning.prototype.panelLabel = 'dataset partitioning';
MapControlPanel.options.DataPartitioning.prototype.context = { localsvg : true, gmap : true };

/**
 *
 * @param {Element} container
 * @param {MapStyle} style
 * @param {MapConfiguration} configuration
 */
MapControlPanel.options.DataPartitioning.prototype.create_panel = function(container, style, configuration) {
    this.mapStyle = style;
    this.mapConfiguration = configuration;

    if (!configuration.allowSavedSearchDataSeries) {
        // if only taxon data is allowed then use a less ambiguous name for the control
        this.panelLabel = 'taxon name';
    }

    var liner = MapControlPanel.prototype.create_panel.call(this, container);

    this.searchTypeMenuId = uniqueId('searchtypemenu');
    this.mapSavedResultsListId = uniqueId('mapsavedresults');

    var table = liner.appendChild(document.createElement('table'));

    var tBody = table.appendChild(document.createElement('tbody'));
    this.seriesTableBodyId = tBody.id = uniqueId('dataseries');

    for (var series in configuration.series) {
        if (configuration.series.hasOwnProperty(series)) {
            //var lastId = configuration.series[series].init_panel_options(tBody, this.mapConfiguration);
            configuration.series[series].init_panel_options(tBody, this.mapConfiguration);

            configuration.series[series].bindListener('changed', this, function(){
                //console.log('3512 dispatching MapControlPanel.options.DataPartitioning change event for changed data series config');
                this.fireEvent('changed');
            });

            configuration.series[series].bindListener('delete', this, MapControlPanel.options.DataPartitioning.prototype.delete_data_series);
        }
    }

    var buttonEl = document.createElement('button');
    //buttonEl.textContent = 'add another data series'; // not supported by IE8
    buttonEl.appendChild(document.createTextNode('add another data series'));
    buttonEl.title = 'Add an another saved result set or taxon to the map.';
    buttonEl.className = 'spaciousbutton';
    this.addSeriesButtonId = buttonEl.id = uniqueId('addseries');
    liner.appendChild(buttonEl);

    this.domEventHandles.addSeriesClickHandle = registerBoundEventHandler(buttonEl, 'click', this, this.add_data_series_click_handler);

    this.apply_options(style, configuration);
    // this.broken_ie_change_handler_binder();
};

/**
 * sub-level destructor for individual panel object
 *
 * @returns {undefined}
 */
MapControlPanel.options.DataPartitioning.prototype.destroy_panel = function() {

    MapControlPanel.prototype.destroy_panel.call(this);
};

/**
 *
 * @param {MapDataseriesConfiguration} series
 * @returns {undefined}
 */
MapControlPanel.options.DataPartitioning.prototype.delete_data_series = function(series) {
    var seriesNumber = series.seriesNumber;
    series.destroy();
    delete this.mapConfiguration.series[seriesNumber];

    this.mapStyle.series[seriesNumber].destroy();
    delete this.mapStyle.series[seriesNumber];

    this.fireEvent('changed');
};

MapControlPanel.options.DataPartitioning.prototype.add_data_series_click_handler = function(ignored, event) {
    var seriesConfig = new MapDataseriesConfiguration(this.mapConfiguration.series.length, this.mapConfiguration);
    seriesConfig.partitionType = this.mapConfiguration.defaultPartitionType;

    // find ref to first (primary) data series, for taxon queries cannot assume that this
    // will be at subscript 0
    // as any taxon series can be deleted
    for (var firstSeriesIndex in this.mapConfiguration.series) {
        if (this.mapConfiguration.series.hasOwnProperty(firstSeriesIndex) && this.mapConfiguration.series[firstSeriesIndex]) {
            break;
        }
    }

    if (this.mapConfiguration.series.hasOwnProperty(firstSeriesIndex) && this.mapConfiguration.series[firstSeriesIndex]) {
        seriesConfig.set_controller(this.mapConfiguration.series[firstSeriesIndex].controllerName); // by default use the same type as the primary data set

        // if the primary controller is taxon status source then should also match status list
        if (this.mapConfiguration.series[firstSeriesIndex].controllerName === MapConfiguration.CONTROLLER_TAXONSTATUS) {
            seriesConfig.statusSchemeId = this.mapConfiguration.series[firstSeriesIndex].statusSchemeId;
        }

        seriesConfig.bindListener('changed', this, function(){
            //console.log('dispatching MapControlPanel.options.DataPartitioning change event for changed data series config');
            this.fireEvent('changed');
        });

        seriesConfig.bindListener('delete', this, MapControlPanel.options.DataPartitioning.prototype.delete_data_series);

        this.mapConfiguration.series.push(seriesConfig);

        // kludgy removal of class so that series label column gets displayed
        // if not done immediately then column layout doesn't refresh until options are reapplied (after subsequent user interaction)
        document.getElementById(this.seriesTableBodyId).classList.remove('singleseriesstyle');

        this.mapStyle.add_series(new MapDataseriesStyle(this.mapStyle));

        //var lastId = seriesConfig.init_panel_options(document.getElementById(this.seriesTableBodyId), this.mapConfiguration);
        seriesConfig.init_panel_options(document.getElementById(this.seriesTableBodyId), this.mapConfiguration);

        // hide the button
        // (as last data series must now be blank)
        document.getElementById(this.addSeriesButtonId).style.display = 'none';

        seriesConfig.apply_configuration_options();
    } else {
        console.log('add series clicked when first series is apparently blank');
    }
    return stop_event(event);
};

/**
 *
 * @returns {undefined}
 */
MapControlPanel.options.DataPartitioning.prototype.read_options = function () {
    MapControlPanel.prototype.read_options.apply(this, arguments); // invoke parent

    for (var series in this.mapConfiguration.series) {
        if (this.mapConfiguration.series.hasOwnProperty(series)) {
            this.mapConfiguration.series[series].read_options();
        }
    }
};

/**
 *
 * @param {MapStyle} style
 * @param {MapConfiguration} configuration
 */
MapControlPanel.options.DataPartitioning.prototype.apply_options = function(style, configuration) {
    var currentSeries;

    for (var series in configuration.series) {
        if (configuration.series.hasOwnProperty(series)) {
            currentSeries = series;

            configuration.series[series].apply_configuration_options();
        }
    }

    var seriesTBody = document.getElementById(this.seriesTableBodyId);

    if (Object.keys(configuration.series).length > 1) {
        // need to show series label (table row should have two columns)

        seriesTBody.classList.remove('singleseriesstyle');
    } else {
        seriesTBody.classList.add('singleseriesstyle');
    }

    if (currentSeries) {
        // only allow the addition of more data series if the preceeding one has valid content
        document.getElementById(this.addSeriesButtonId).style.display = (configuration.series[currentSeries].has_content() ?
            'block' : 'none');
    }
};

/**
 *
 * @constructor
 * @extends MapControlPanel
 */
MapControlPanel.options.DataSeriesStyles = function () {};
MapControlPanel.options.DataSeriesStyles.prototype = new MapControlPanel;
MapControlPanel.options.DataSeriesStyles.prototype.constructor = MapControlPanel.options.DataSeriesStyles;
MapControlPanel.options.DataSeriesStyles.prototype.panelLabel = 'marker styles';
MapControlPanel.options.DataSeriesStyles.prototype.context = { localsvg : true, gmap : true };

/**
 *
 * @type MapConfiguration
 */
MapControlPanel.options.DataSeriesStyles.prototype.mapConfiguration = null;

/**
 *
 * @type MapStyle
 */
MapControlPanel.options.DataSeriesStyles.prototype.mapStyle = null;

/**
 *
 * @param {Element} container
 * @param {MapStyle} style
 * @param {MapConfiguration} configuration
 * @param {MapControl} mapOptionsControl
 */
MapControlPanel.options.DataSeriesStyles.prototype.create_panel = function(container, style, configuration, mapOptionsControl) {
    const liner = MapControlPanel.prototype.create_panel.call(this, container);

    liner.classList.add('vestigialmapoptionscontainer');
    this.mapConfiguration = configuration;
    this.mapStyle = style;

    const innerLiner1 = liner.appendChild(document.createElement('div'));
    innerLiner1.className = 'mapoptionsset';
    innerLiner1.style.position = 'static';
    innerLiner1.style.marginLeft = '0';

    const innerLiner2 = liner.appendChild(document.createElement('div'));
    innerLiner2.className = 'mapoptionsset';
    innerLiner2.style.position = 'static';
    innerLiner2.style.marginTop = '5px';
    innerLiner2.appendChild(document.createElement('span')).appendChild(document.createTextNode('theme '));

    // this must come before template menu is initialised
    this.mapControl.saveLocalOptionsFlag = !('uid' in window && window.uid);

    mapOptionsControl.add_template_menu(innerLiner2);

    var themeSaveContainer = innerLiner2.appendChild(document.createElement('p'));
    themeSaveContainer.style.marginTop = '4px';

    if (!('uid' in window && window.uid)) {
        // hide save options if user is not logged in
        themeSaveContainer.style.display = 'none';

        if (this.mapControl.saveLocalOptionsFlag) {
            // provide alternative mechanism to remember current settings in local storage

            var themeSaveLocallyContainer = innerLiner2.appendChild(document.createElement('p'));

            var localSaveButton = document.createElement('input');
            localSaveButton.type = 'submit';
            localSaveButton.value = 'save settings';
            this.themeLocalSaveElId = localSaveButton.id = uniqueId('themelocalsavebutton');
            themeSaveLocallyContainer.appendChild(localSaveButton);

            this.domEventHandles.themeLocalSaveHandle = registerDOMEventHandler(localSaveButton, 'click', this, 'save_theme_locally_click_handler');
        }
    }

    var themeNameElement = themeSaveContainer.appendChild(document.createElement('input'));
    themeNameElement.placeholder = 'name';
    themeNameElement.autocomplete = 'off';
    this.mapControl.themeNameElId = themeNameElement.id = uniqueId('themename');
    var themeSaveButton = document.createElement('input');
    themeSaveButton.type = 'submit';
    themeSaveButton.value = 'save settings';
    this.themeSaveElId = themeSaveButton.id = uniqueId('themesavebutton');
    themeSaveContainer.appendChild(themeSaveButton);

    this.domEventHandles.themeSaveHandle = registerDOMEventHandler(themeSaveButton, 'click', this, 'save_theme_click_handler');

    var table = innerLiner1.appendChild(document.createElement('table'));
    table.className = 'mapseriestable';

    var tBody = table.appendChild(document.createElement('tbody'));
    this.seriesTableBodyId = tBody.id = uniqueId('styledataseries');

    for (var seriesNumber in style.series) {
        if (style.series.hasOwnProperty(seriesNumber)) {
            //var lastId = this._add_series(seriesNumber);
            this._add_series(seriesNumber);
        }
    }

    this.mapStyle.bindListener('addedseries', this,
        /**
         *
         * @param {string} context
         * @param {string} eventName
         * @param {number} seriesNumber
         * @this MapControlPanel.options.DataSeriesStyles
         */
        function(context, eventName, seriesNumber) {
            this._add_series(seriesNumber);
            this.apply_options(this.mapStyle, this.mapConfiguration);
            // this.broken_ie_change_handler_binder();
        });

    this.apply_options(style, configuration);
    // this.broken_ie_change_handler_binder();
};

/**
 * sub-level destructor for individual panel object
 *
 * @returns {undefined}
 */
MapControlPanel.options.DataSeriesStyles.prototype.destroy_panel = function() {
    MapControlPanel.prototype.destroy_panel.call(this);
};

/**
 *
 * @param {Event} event
 * @returns {boolean}
 */
MapControlPanel.options.DataSeriesStyles.prototype.save_theme_click_handler = function (event) {
    var nameEl = document.getElementById(this.mapControl.themeNameElId);

    var themeName = nameEl.value.trim();

    if (themeName !== '') {
        this.mapControl.save_theme_handler(themeName);
    } else {
        alert('Please specify a name for the saved theme.');
    }

    return stop_event(event);
};

/**
 *
 * @param {Event} event
 * @returns {boolean}
 */
MapControlPanel.options.DataSeriesStyles.prototype.save_theme_locally_click_handler = function (event) {
    this.mapControl.save_theme_handler('', true);

    return stop_event(event);
};

/**
 *
 * @param {number} seriesNumber
 * @returns {string} element of last id added to DOM
 */
MapControlPanel.options.DataSeriesStyles.prototype._add_series = function(seriesNumber) {
    var tBody = document.getElementById(this.seriesTableBodyId);

    var tr = tBody.appendChild(document.createElement('tr'));
    return this.mapStyle.series[seriesNumber].init_style_panel(tr, this.mapConfiguration.series);
};

/**
 *
 * @param {MapStyle} style
 * @param {MapConfiguration} configuration
 * @param {function=} callback
 */
MapControlPanel.options.DataSeriesStyles.prototype.apply_options = function(style, configuration, callback) {
    for (var n in style.series) {
        if (style.series.hasOwnProperty(n)) {
            style.series[n].build_partition_styles_content(style, configuration);

            if (configuration.series[n].frequencyResultsFlag && configuration.series[n].sourceData.data_loaded()) {
                style.series[n].initialise_frequency_colour_scheme(configuration.series[n]);
            }
        }
    }

    var seriesTBody = document.getElementById(this.seriesTableBodyId);

    if (Object.keys(style.series).length > 1) {
        // need to show series label (table row should have two columns)

        seriesTBody.classList.remove('singleseriesstyle');
    } else {
        seriesTBody.classList.add('singleseriesstyle');
    }

    //console.log('DataSeriesStyles content ready');
    //jscolor.bind(this.seriesTableBodyId);

    var templateNameEl = document.getElementById(this.mapControl.themeNameElId);
    if (style.templateNumber > 1024 && templateNameEl.value === '') {
        templateNameEl.value = MapStyleTemplates[style.templateNumber].name;
    }

    for (n in style.series) {
        if (style.series.hasOwnProperty(n)) {
            style.series[n].finalise_partition_styles_content(configuration);
        }
    }

    if (callback) {
        callback();
    }

    // this.broken_ie_change_handler_binder();
};

MapControlPanel.options.DataSeriesStyles.prototype.read_options = function() {
    MapControlPanel.prototype.read_options.apply(this, arguments);

    for (var n in this.mapStyle.series) {
        if (this.mapStyle.series.hasOwnProperty(n)) {
            this.mapStyle.series[n].read_options(this.mapConfiguration);
        }
    }
};



/**
 *
 * @constructor
 */
MapControlPanel.options.BoundaryStyles = function () {};
MapControlPanel.options.BoundaryStyles.prototype = new MapControlPanel;
MapControlPanel.options.BoundaryStyles.prototype.constructor = MapControlPanel.options.BoundaryStyles;
MapControlPanel.options.BoundaryStyles.prototype.panelLabel = 'line styles';
MapControlPanel.options.BoundaryStyles.prototype.context = { localsvg : true, gmap : false };

/**
 *
 * @param {Element} container
 * @param {MapStyle} options
 * @param {MapConfiguration} configuration
 */
MapControlPanel.options.BoundaryStyles.prototype.create_panel = function(container, options, configuration) {
    var liner = MapControlPanel.prototype.create_panel.call(this, container);

    this.panelIds = {
        weightHeading : uniqueId('weightheading'),
        coastFlag : uniqueId('coastflag'),
        coastColour : uniqueId('coastcolour'),
        coastWeight : uniqueId('coastweight'),
        seaFlag : uniqueId('seaflag'),
        seaColour : uniqueId('seacolour'),
        landColour : uniqueId('landcolour'),
        gridAuto : uniqueId('gridauto')
    };

    var id = this.panelIds;

    var table = liner.appendChild(document.createElement('table'));
    table.className = 'configsettings';
    var body = table.appendChild(document.createElement('tbody'));
    var tr = body.appendChild(document.createElement('tr'));
    var th = tr.appendChild(document.createElement('th'));
    th.colSpan = 2;
    tr.appendChild(document.createElement('th')).appendChild(document.createTextNode('colour'));
    th = tr.appendChild(document.createElement('th'));
    th.id = id.weightHeading;
    th.appendChild(document.createTextNode('weight'));
    tr.appendChild(document.createElement('th')).appendChild(document.createTextNode('style'));

    tr = body.appendChild(document.createElement('tr')); // coast
    var label = tr.appendChild(document.createElement('td')).appendChild(document.createElement('label'));
    label.htmlFor = id.coastFlag;
    label.appendChild(document.createTextNode('coastline'));

    var input = document.createElement('input'); // show coast flag
    input.type = 'checkbox';
    input.id = id.coastFlag;
    input.checked = !!options.showcoast;
    tr.appendChild(document.createElement('td')).appendChild(input);

    input = document.createElement('input'); // coast colour

    initialise_input_colour(input, options.coastcolour);

    input.id = id.coastColour;
    tr.appendChild(document.createElement('td')).appendChild(input);

    input = document.createElement('input'); // coast weight
    //if (html5InputTypeNumberAllowed) {
        input.type = 'number';
        input.min = '0';
        input.step = '0.1';
    //}
    input.id = id.coastWeight;
    input.style.width = '3.5em';
    input.value = options.coastweight;
    tr.appendChild(document.createElement('td')).appendChild(input);

    tr = body.appendChild(document.createElement('tr')); // sea
    label = tr.appendChild(document.createElement('td')).appendChild(document.createElement('label'));
    label.htmlFor = id.seaColour;
    label.appendChild(document.createTextNode('sea'));

    var td = tr.appendChild(document.createElement('td'));
    td.rowSpan = 2;
    input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id.seaFlag;
    input.checked = !!options.seaFlag;
    td.appendChild(input);

    input = document.createElement('input'); // sea colour
    //input.className = 'colour {valueElement: null, initRGB:\'' + options.seacolour + '\'}';
    initialise_input_colour(input, options.seacolour);
    input.id = id.seaColour;
    tr.appendChild(document.createElement('td')).appendChild(input);

    tr = body.appendChild(document.createElement('tr')); // land
    label = tr.appendChild(document.createElement('td')).appendChild(document.createElement('label'));
    label.htmlFor = id.landColour;
    label.appendChild(document.createTextNode('land'));

    input = document.createElement('input'); // land colour
    //input.className = 'colour {valueElement: null, initRGB:\'' + options.landcolour + '\'}';
    initialise_input_colour(input, options.landcolour);
    input.id = id.landColour;
    tr.appendChild(document.createElement('td')).appendChild(input);

    tr = body.appendChild(document.createElement('tr')); // grid
    label = tr.appendChild(document.createElement('td')).appendChild(document.createElement('label'));
    label.htmlFor = id.landColour;
    label.appendChild(document.createTextNode('grid'));

    input = document.createElement('input'); // land colour
    input.type = 'checkbox';
    input.id = id.gridAuto;
    input.checked = !!options.autoGridFlag;
    tr.appendChild(document.createElement('td')).appendChild(input);

    td = tr.appendChild(document.createElement('td'));
    td.colSpan = 3;
    label = td.appendChild(document.createElement('label'));
    label.htmlFor = id.gridAuto;
    label.appendChild(document.createTextNode('automatic'));

    for (var i = MapControl.gridIntervals.length; i--;) {
        var interval = MapControl.gridIntervals[i];

        id['gridRow' + interval] = uniqueId('gridrow' + interval);
        id['showGrid' + interval] = uniqueId('showgrid' + interval);
        id['gridColour' + interval] = uniqueId('gridcolour' + interval);
        id['gridWeight' + interval] = uniqueId('gridweight' + interval);
        id['gridStyle' + interval] = uniqueId('gridstyle' + interval);
        id['labelGrid' + interval] = uniqueId('labelgrid' + interval);

        tr = body.appendChild(document.createElement('tr')); // grid row
        tr.id = id['gridRow' + interval];
        if (options.autoGridFlag) {
            tr.style.display = 'none';
        }
        td = tr.appendChild(document.createElement('td'));
        td.style.textAlign = 'right';
        label = td.appendChild(document.createElement('label'));
        label.htmlFor = id['showGrid' + interval];
        label.appendChild(document.createTextNode(interval + 'km'));

        input = document.createElement('input');
        input.type = 'checkbox';
        input.id = id['showGrid' + interval];
        input.value = 'true'; // unsure if this is needed
        input.checked = !!options.grid[interval];
        tr.appendChild(document.createElement('td')).appendChild(input);

        input = document.createElement('input');
        //input.className = 'colour {valueElement: null, initRGB:\'' + options.gridColour[interval] + '\'}';
        initialise_input_colour(input, options.gridColour[interval]);
        input.id = id['gridColour' + interval];
        tr.appendChild(document.createElement('td')).appendChild(input);

        input = document.createElement('input');
        // if (html5InputTypeNumberAllowed) {
            input.type = 'number';
            input.min = '0.1';
            input.step = '0.1';
        // }
        input.value = options.gridWeight[interval];
        input.style.width = '3.5em';
        input.id = id['gridWeight' + interval];
        tr.appendChild(document.createElement('td')).appendChild(input);

        var gridStyle = tr.appendChild(document.createElement('td')).appendChild(document.createElement('select'));
        gridStyle.id = id['gridStyle' + interval];
        gridStyle.options[0] = new Option('solid', '', options.gridStyle[interval] === '', true);
        gridStyle.options[1] = new Option('dashed', '4,4', options.gridStyle[interval] === '4,4');
        gridStyle.options[2] = new Option('dotted', '1,1', options.gridStyle[interval] === '1,1');

        // option to label the grid-squares with the grid-reference
        var gridLabelContainer = tr.appendChild(document.createElement('td')).appendChild(document.createElement('label'));
        input = document.createElement('input');
        input.type = 'checkbox';
        input.id = id['labelGrid' + interval];
        input.value = 'true'; // unsure if this is needed
        input.checked = !!options.labelGrid[interval];
        gridLabelContainer.appendChild(input);
        gridLabelContainer.appendChild(document.createTextNode('label squares'));
    }

    //this.colourChangeEventHandles = [];

    // if (!html5ColourSupported) {
    //     jscolor.bind(liner);
    // }
    this.apply_options(options, configuration);
    // this.broken_ie_change_handler_binder();
};

/**
 * sub-level destructor for individual panel object
 *
 * @returns {undefined}
 */
MapControlPanel.options.BoundaryStyles.prototype.destroy_panel = function() {
    MapControlPanel.prototype.destroy_panel.call(this);
};

/**
 *
 * @param {MapStyle} options
 * @param {MapConfiguration} configuration
 */
MapControlPanel.options.BoundaryStyles.prototype.apply_options = function(options, configuration) {
    var id = this.panelIds;

    if (options.showcoast === true || options.showcoast === false) {
        document.getElementById(id.coastFlag).checked = options.showcoast;

        if (options.coastweight !== null) {
            document.getElementById(id.coastWeight).value = options.coastweight;
        }

        if (options.coastcolour !== null) {
            set_input_colour(document.getElementById(id.coastColour), options.coastcolour);
        }
    }

    if (options.seaFlag === true || options.seaFlag === false) {
        document.getElementById(id.seaFlag).checked = options.seaFlag;

        if (options.seaFlag) {
            set_input_colour(document.getElementById(id.seaColour), options.seacolour);
            set_input_colour(document.getElementById(id.landColour), options.landcolour);
        }
    }

    document.getElementById(id.gridAuto).checked = options.autoGridFlag;

    for (var i = MapControl.gridIntervals.length; i--;) {
        var gridRow = document.getElementById(id['gridRow' + MapControl.gridIntervals[i]]);
        gridRow.style.display = (options.autoGridFlag ? 'none' : 'table-row');
    }

    if (options.grid) {
        for (i = MapControl.gridIntervals.length; i--;) {
            var interval = MapControl.gridIntervals[i];

            document.getElementById(id['showGrid' + interval]).checked = options.grid[interval];

            //if (options.grid[i]) {
            selectOption(document.getElementById(id['gridStyle' + interval]), options.gridStyle[interval]);
            //document.getElementById(id['gridColour' + interval]).color.fromString(options.gridColour[interval]);
            set_input_colour(document.getElementById(id['gridColour' + interval]), options.gridColour[interval]);
            document.getElementById(id['gridWeight' + interval]).value = options.gridWeight[interval];
            document.getElementById(id['labelGrid' + interval]).checked = options.labelGrid[interval];
            //}
        }
    }
};

MapControlPanel.options.BoundaryStyles.prototype.read_options = function() {
    MapControlPanel.prototype.read_options.apply(this, arguments);

    var options = this.mapStyle;
    var id = this.panelIds;

    var coastCheckboxEl = document.getElementById(id.coastFlag);

    var coastWeight = parseFloat(document.getElementById(id.coastWeight).value);

    var coastColour = get_input_colour(document.getElementById(id.coastColour));

    if (coastWeight !== options.coastweight || coastColour !== options.coastcolour.toLowerCase()) {
        coastCheckboxEl.checked = true;

        options.coastweight = coastWeight;
        options.coastcolour = coastColour;
    }

    options.showcoast = coastCheckboxEl.checked;

    var seaColour = get_input_colour(document.getElementById(id.seaColour));
    var landColour = get_input_colour(document.getElementById(id.landColour));

    if (seaColour !== options.seacolour.toLowerCase() || landColour !== options.landcolour.toLowerCase()) {
        document.getElementById(id.seaFlag).checked = true;

        options.seacolour = seaColour;
        options.landcolour = landColour;
    }

    options.seaFlag = document.getElementById(id.seaFlag).checked;

    options.autoGridFlag = document.getElementById(id.gridAuto).checked;

    for (var i = MapControl.gridIntervals.length; i--;) {
        var interval = MapControl.gridIntervals[i];

        //var gridColour = document.getElementById(id['gridColour' + interval]).color.toString();
        var gridColour = get_input_colour(document.getElementById(id['gridColour' + interval]));
        var gridWeight = parseFloat(document.getElementById(id['gridWeight' + interval]).value.trim());

        var styleEl = document.getElementById(id['gridStyle' + interval]);
        var gridStyle = styleEl.options[styleEl.selectedIndex].value;

        if (gridColour !== options.gridColour[interval] ||
            gridWeight !== parseFloat(options.gridWeight[interval]) ||
            gridStyle !== options.gridStyle[interval]) {

            document.getElementById(id['showGrid' + interval]).checked = true;
        }

        options.grid[interval] = document.getElementById(id['showGrid' + interval]).checked;

        if (options.grid[interval]) {
            options.gridColour[interval] = gridColour;
            options.gridWeight[interval] = gridWeight;
            options.gridStyle[interval] = gridStyle;
            options.labelGrid[interval] = document.getElementById(id['labelGrid' + interval]).checked;
        }
    }
};

/**
 *
 * @constructor
 */
MapControlPanel.options.MappedArea = function () {};
MapControlPanel.options.MappedArea.prototype = new MapControlPanel;
MapControlPanel.options.MappedArea.prototype.constructor = MapControlPanel.options.MappedArea;
MapControlPanel.options.MappedArea.prototype.panelLabel = 'areas and boundaries';
MapControlPanel.options.MappedArea.prototype.context = { localsvg : true, gmap : false };

/**
 *
 * @type MapConfiguration
 */
MapControlPanel.options.MappedArea.prototype.mapConfiguration = null;

/**
 *
 * @param {Element} container
 * @param {MapStyle} style
 * @param {MapConfiguration} configuration
 */
MapControlPanel.options.MappedArea.prototype.create_panel = function(container, style, configuration) {
    var liner = MapControlPanel.prototype.create_panel.call(this, container);

    this.mapConfiguration = configuration;

    this.panelIds = {
        countryMenu : uniqueId('countrymenu'),
        gbieOptions : uniqueId('gbieareaoptions'),
        boundariesTable : uniqueId('boundariestable'),
        ciMenu : uniqueId('ciMenu'),
        scIsMenu : uniqueId('scIsMenu'),
        areaOptionsContainer : uniqueId('areaoptions'),
        countyBackdrop : uniqueId('countybackdrop')
    };

    var id = this.panelIds;

    var table = liner.appendChild(document.createElement('table')).appendChild(document.createElement('tbody'));
    var tr = table.appendChild(document.createElement('tr')); // country menu row
    var label = tr.appendChild(document.createElement('td')).appendChild(document.createElement('label'));
    label.htmlFor = id.countryMenu;
    label.appendChild(document.createTextNode('region to show'));

    var menu = tr.appendChild(document.createElement('td')).appendChild(document.createElement('select'));
    menu.id = id.countryMenu;
    menu.options[0] = new Option('British Isles', 'gbie');
    menu.options[1] = new Option('Britain', 'gb');
    menu.options[2] = new Option('Ireland', 'ie');
    menu.options[3] = new Option('Channel Islands', 'ci');

    var div = liner.appendChild(document.createElement('div')); // gbie options
    div.style.marginLeft = '2em';
    div.id = id.gbieOptions;

    table = div.appendChild(document.createElement('table')).appendChild(document.createElement('tbody'));
    tr = table.appendChild(document.createElement('tr')); // CI options row
    label = tr.appendChild(document.createElement('td')).appendChild(document.createElement('label'));
    label.htmlFor = id.ciMenu;
    label.appendChild(document.createTextNode('Channel Islands'));
    menu = tr.appendChild(document.createElement('td')).appendChild(document.createElement('select'));
    menu.id = id.ciMenu;
    menu.options[0] = new Option('inset box', '1');
    menu.options[1] = new Option('not shown', '');

    tr = table.appendChild(document.createElement('tr')); // northern islands options row
    label = tr.appendChild(document.createElement('td')).appendChild(document.createElement('label'));
    label.htmlFor = id.scIsMenu;
    label.appendChild(document.createTextNode('Northern Isles'));
    menu = tr.appendChild(document.createElement('td')).appendChild(document.createElement('select'));
    menu.id = id.scIsMenu;
    menu.options[0] = new Option('show in situ', 's');
    menu.options[1] = new Option('inset box', 'b');
    menu.options[2] = new Option('Orkney only', 'o');
    menu.options[3] = new Option('not shown', 'h');

    div = liner.appendChild(document.createElement('div')); // boundary list container
    div.id = id.areaOptionsContainer;
    var p = div.appendChild(document.createElement('p'));
    p.style.fontWeight = 'bold';
    p.appendChild(document.createTextNode('marked or constrained boundaries'));

    table = div.appendChild(document.createElement('table'));
    table.id = id.boundariesTable;
    table.className = 'configsettings';
    table.appendChild(document.createElement('tbody'));

    div = liner.appendChild(document.createElement('div')); // county boundaries as background
    label = div.appendChild(document.createElement('label'));
    label.appendChild(document.createTextNode('show county boundaries as background '));
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id.countyBackdrop;
    input.value = '1';
    input.checked = !!style.countyBackdrop;
    label.appendChild(input);

    this.build_region_table(style, configuration);
    this.apply_options(style, configuration);
    // this.broken_ie_change_handler_binder();
};

MapControlPanel.options.MappedArea.prototype.destroy_panel = function() {
    if (this.regionTableRowIds) {
        for (var rowId in this.regionTableRowIds) {
            if (this.regionTableRowIds.hasOwnProperty(rowId) && rowId !== 'length') {
                var row = this.regionTableRowIds[rowId];

                if (row.eventHandles) {
                    for (var eventHandleItem in row.eventHandles) {
                        if (row.eventHandles.hasOwnProperty(eventHandleItem)) {
                            removeDomEventHandler(row.eventHandles[eventHandleItem]);
                        }
                    }
                }
            }
        }
        // @todo should also destroy drop boxes etc.
        this.regionTableRowIds = {length: 0};
    }

    MapControlPanel.prototype.destroy_panel.call(this);
};


/**
 *
 * @param {MapStyle} style
 * @param {MapConfiguration} configuration
 */
MapControlPanel.options.MappedArea.prototype.apply_options = function(style, configuration) {
    // if country is not blank then update country-related settings
    if (configuration.country) {
        selectOption(document.getElementById(this.panelIds.countryMenu), configuration.country);

        if (configuration.country === 'gbie') {
            document.getElementById(this.panelIds.gbieOptions).style.display = 'block';

            // set this only if explicitly true or false (so null leaves unchanged)
            if (style.mapci === true || style.mapci === false) {
                selectOption(document.getElementById(this.panelIds.ciMenu), style.mapci ? '1' : '');
            }

            // should change so that all valid formats are non-empty
            if (style.northernIslesFormat) {
                selectOption(document.getElementById(this.panelIds.scIsMenu), style.northernIslesFormat);
            }
        } else {
            document.getElementById(this.panelIds.gbieOptions).style.display = 'none';
        }
    }

    document.getElementById(this.panelIds.countyBackdrop).checked = style.countyBackdrop;
};

/**
 *
 * @param {MapStyle} style
 * @param {{defaultVCList: Array<string>}} configuration untyped configuration object (*not* a MapDataseriesConfiguration)
 * @returns {undefined}
 */
MapControlPanel.options.MappedArea.prototype.build_region_table = function(style, configuration) {
    /**
     *
     * @type {{length: number}}
     */
    this.regionTableRowIds = {length: 0};

    if (configuration.defaultVCList) {
        var rowId, vcNameEl;

        // if lots of VC's then keep in a single row
        var vcList = configuration.defaultVCList.split(',');

        if (vcList.length > 5) {
            // all in single row
            rowId = this.region_table_add_row(MapConfiguration.AREA_TYPE_VC);
            vcNameEl = document.getElementById(this.regionTableRowIds[rowId].vcName);
            vcNameEl.value = configuration.defaultVCList;
        } else {
            // add a row for each vc

            for (var n = vcList.length, i = 0; i < n; i++) {
                rowId = this.region_table_add_row(MapConfiguration.AREA_TYPE_VC);
                vcNameEl = document.getElementById(this.regionTableRowIds[rowId].vcName);
                vcNameEl.value = vcList[i];
            }
        }

        //this.read_region_table_query_options();
    } else {
        // no default counties

        this.region_table_add_row();
    }
};

/**
 *
 * @param {?string} areaType
 */
MapControlPanel.options.MappedArea.prototype.region_table_add_row = function(areaType) {
    if (!areaType) {
        areaType = MapConfiguration.AREA_TYPE_VC;
    }

    var table = document.getElementById(this.panelIds.boundariesTable);
    var body = table.getElementsByTagName('tbody')[0];
    var row;

    row = body.lastChild; // get the current last row of the table
    if (row && row.id && this.regionTableRowIds.hasOwnProperty(row.id)) {
        // hide the + button
        document.getElementById(this.regionTableRowIds[row.id].plusButton).style.display = 'none';
    }

    var ids = {eventHandles: []};

    row = body.appendChild(document.createElement('tr'));
    ids.row = row.id = uniqueId('arearow');
    row.className = 'styleseriescontainerrow';

    var cell = row.appendChild(document.createElement('td'));

    var areaTypeMenu = this.area_type_menu(ids, areaType);
    ids.areaType = areaTypeMenu.id = uniqueId('areatype');

    var clip = document.createElement('input');
    clip.type = 'checkbox';
    clip.checked = true;
    ids.clip = clip.id = uniqueId('clip');

    ids.nameHeading = uniqueId('nameheading');

    var innerTable = cell.appendChild(document.createElement('table')).appendChild(document.createElement('tbody'));
    var headings = innerTable.appendChild(document.createElement('tr'));

    var th = headings.appendChild(document.createElement('th'));
    var thLabel = th.appendChild(document.createElement('label'));
    thLabel.htmlFor = areaTypeMenu.id;
    thLabel.appendChild(document.createTextNode('type'));
    th = headings.appendChild(document.createElement('th'));
    thLabel = th.appendChild(document.createElement('label'));
    thLabel.htmlFor = clip.id;
    thLabel.appendChild(document.createTextNode('clip'));
    th = headings.appendChild(document.createElement('th'));
    th.id = ids.nameHeading;
    th.appendChild(document.createTextNode('name'));

    var typeAndContentRow = innerTable.appendChild(document.createElement('tr'));
    var areaTypeCell = typeAndContentRow.appendChild(document.createElement('td'));
    areaTypeCell.appendChild(areaTypeMenu);

    ids.eventHandles.push(registerDOMEventHandler(areaTypeMenu, 'change', this, 'area_type_change_event_handler', row.id));

    var clipCell = typeAndContentRow.appendChild(document.createElement('td'));

    clipCell.appendChild(clip);

    var contentCell = typeAndContentRow.appendChild(document.createElement('td'));

    var vcContent = contentCell.appendChild(document.createElement('div'));
    ids.vcContent = vcContent.id = uniqueId('vccontent');

    //ids.vcDropboxDiv = contentCell.appendChild(document.createElement('div'));
    ids.vcDropboxDiv = cell.appendChild(document.createElement('div'));
    ids.vcDropboxDiv.id = uniqueId('vcdropboxdiv');

    var vcDropboxContainer = vcContent.appendChild(document.createElement('div'));
    vcDropboxContainer.className = 'dropboxcontainer';
    vcDropboxContainer.style.position = 'relative';

    var vcInputEl = vcDropboxContainer.appendChild(document.createElement('input'));
    vcInputEl.style.width = '12em';

    ids.vcName = vcInputEl.id = uniqueId('vc');

    ids.vcDropbox = new ViceCountyNumberDropBox();
    ids.vcDropbox.set_params();
    ids.vcDropbox.build(ids.vcName, ids.vcDropboxDiv.id);
    ids.vcDropbox.register_select_event_handler(this, this.vc_dropbox_select_handler);


    var gisContent = contentCell.appendChild(document.createElement('div'));
    ids.gisContent = gisContent.id = uniqueId('giscontent');

    //ids.gisDropboxDiv = contentCell.appendChild(document.createElement('div'));
    ids.gisDropboxDiv = cell.appendChild(document.createElement('div'));
    ids.gisDropboxDiv.id = uniqueId('gisdropboxdiv');

    var gisDropboxContainer = gisContent.appendChild(document.createElement('div'));
    gisDropboxContainer.className = 'dropboxcontainer';
    gisDropboxContainer.style.position = 'relative';

    var gisInputEl = gisDropboxContainer.appendChild(document.createElement('input'));
    gisInputEl.style.width = '12em';

    ids.gisName = gisInputEl.id = uniqueId('gis');

    ids.gisDropbox = new GisAreaDropBox();
    //ids.gisDropbox.set_params();
    ids.gisDropbox.build(ids.gisName, ids.gisDropboxDiv.id);

    ids.gisDropbox.register_select_event_handler(this, (function(dropbox) {
        return function(sType, aArgs) {
            var oData = aArgs[2]; // object literal of data for the result

            dropbox.entityId = oData.entityId;
            dropbox.name = oData.name;

            // @todo if country-inconsistent area choice has been made then should adjust country to match
            this.read_options();
            this.fireEvent('changed');
        };
    })(ids.gisDropbox));

    ids.gisDropbox.register_failed_select_event_handler(this, (function(dropbox) {
        return function() {
            dropbox.entityId = null;
            dropbox.name = '';

            this.fireEvent('changed');
        };
    })(ids.gisDropbox));

    var rowControlsCell = typeAndContentRow.appendChild(document.createElement('td'));

    var plusButton = button_element('add row', MapControl.imgPath + '/img/icons/plusbutton.png', 'add');
    var deleteButton = button_element('clear row', MapControl.imgPath + '/img/icons/Xbutton.png', 'remove');
    ids.deleteButton = deleteButton.id = uniqueId('x');
    ids.plusButton = plusButton.id = uniqueId('add');

    rowControlsCell.appendChild(plusButton);
    rowControlsCell.appendChild(deleteButton);

    var fillFlag = document.createElement('input');
    fillFlag.type = 'checkbox';
    ids.filledFlag = fillFlag.id = uniqueId('filled');
    fillFlag.checked = false;

    var outlineFlag = document.createElement('input');
    outlineFlag.type = 'checkbox';
    ids.outlinedFlag = outlineFlag.id = uniqueId('outlined');
    outlineFlag.checked = true;

    var gridsquareOptionsContainer = cell.appendChild(document.createElement('div'));
    ids.gridsquareOptions = gridsquareOptionsContainer.id = uniqueId('gridsquareoptionscontainer');
    innerTable = gridsquareOptionsContainer.appendChild(document.createElement('table')).appendChild(document.createElement('tbody'));

    ids.swRef = uniqueId('sw');
    ids.swPickerButton = uniqueId('swbutton');
    ids.neRef = uniqueId('ne');
    ids.nePickerButton = uniqueId('nebutton');

    headings = innerTable.appendChild(document.createElement('tr'));
    //headings.innerHTML = '<th><label for="' + ids.swRef + '">S.W.</label></th><th><label for="' + ids.neRef + '">N.E. (optional)</label></th>';
    th = headings.appendChild(document.createElement('th'));
    thLabel = th.appendChild(document.createElement('label'));
    thLabel.htmlFor = ids.swRef;
    thLabel.appendChild(document.createTextNode('S.W.'));

    th = headings.appendChild(document.createElement('th'));
    thLabel = th.appendChild(document.createElement('label'));
    thLabel.htmlFor = ids.neRef;
    thLabel.appendChild(document.createTextNode('N.E. (optional)'));

    var refRow = innerTable.appendChild(document.createElement('tr'));

    var refCell = refRow.appendChild(document.createElement('td'));
    var refEl = refCell.appendChild(document.createElement('input'));
    refEl.placeholder = 'OS ref';
    refEl.id = ids.swRef;
    var refButton = refCell.appendChild(document.createElement('button'));
    refButton.id = ids.swPickerButton;
    ids.swGridRefPicker = new GridRefPicker;
    ids.swGridRefPicker.register(document.getElementById(ids.swPickerButton), document.getElementById(ids.swRef));

    refCell = refRow.appendChild(document.createElement('td'));
    refEl = refCell.appendChild(document.createElement('input'));
    refEl.placeholder = 'OS ref';
    refEl.id = ids.neRef;
    refButton = refCell.appendChild(document.createElement('button'));
    refButton.id = ids.nePickerButton;
    ids.neGridRefPicker = new GridRefPicker;
    ids.neGridRefPicker.register(document.getElementById(ids.nePickerButton), document.getElementById(ids.neRef));

    innerTable = cell.appendChild(document.createElement('table')).appendChild(document.createElement('tbody'));
    headings = innerTable.appendChild(document.createElement('tr'));
    //headings.innerHTML = '<th><label for="' + fillFlag.id + '">background colour</label></th><th><label for="' + outlineFlag.id + '">outline style</label></th>';
    th = headings.appendChild(document.createElement('th'));
    thLabel = th.appendChild(document.createElement('label'));
    thLabel.htmlFor = fillFlag.id;
    thLabel.appendChild(document.createTextNode('background colour'));
    th = headings.appendChild(document.createElement('th'));
    thLabel = th.appendChild(document.createElement('label'));
    thLabel.htmlFor = outlineFlag.id;
    thLabel.appendChild(document.createTextNode('outline style'));

    var styleRow = innerTable.appendChild(document.createElement('tr'));

    var fillCell = styleRow.appendChild(document.createElement('td'));
    fillCell.appendChild(fillFlag);

    var fillColour = fillCell.appendChild(document.createElement('input'));
    initialise_input_colour(fillColour, 'ffffff');

    ids.fillColour = fillColour.id = uniqueId('fillcol');
    // @todo may need to ensure that the picker is initialised explicitly if HTML 5 colour not supported
    fillColour.style.display = 'none';

    ids.eventHandles.push(registerDOMEventHandler(fillFlag, 'change', this, 'fill_checkbox_click_event_handler', row.id));
    ids.eventHandles.push(registerDOMEventHandler(outlineFlag, 'change', this, 'outline_checkbox_click_event_handler', row.id));

    var outlineCell = styleRow.appendChild(document.createElement('td'));

    var lineColour = document.createElement('input');
    initialise_input_colour(lineColour, '000000');
    //lineColour.className = 'colour';
    //ids.lineColourPicker = lineColour.color = new jscolor.color(lineColour, {valueElement: null});
    //ids.lineColourPicker.fromString('000000');
    ids.lineColour = lineColour.id = uniqueId('linecol');
    // @todo may need to ensure that the picker is initialised explicitly if HTML 5 colour not supported

    var lineWeight = document.createElement('input');
    lineWeight.style.width = '3.5em';
    ids.lineWeight = lineWeight.id = uniqueId('lineweight');

    // if (html5InputTypeNumberAllowed) {
        lineWeight.type = 'number';
        lineWeight.min = '0';
        lineWeight.step = '0.25';
    // }
    lineWeight.value = '0.25'; // for Opera, must come after element type has been set

    outlineCell.appendChild(outlineFlag);
    outlineCell.appendChild(lineColour);
    outlineCell.appendChild(lineWeight);

    ids.eventHandles.push(registerBoundEventHandler(plusButton, 'click', this, this.add_area_row_click_handler, row.id));
    ids.eventHandles.push(registerBoundEventHandler(deleteButton, 'click', this, this.delete_region_row, row.id));

    this.regionTableRowIds[row.id] = ids;
    this.regionTableRowIds.length++;

    this.refresh_area_type(ids, areaType);

    return row.id;
};

MapControlPanel.options.MappedArea.prototype.add_area_row_click_handler = function(rowId, event) {
    // add another row of the same type as the previous one (the focus of the add button)

    var idSet = this.regionTableRowIds[rowId];
    var typeEl = document.getElementById(idSet.areaType);
    var previousAreaType = typeEl.options[typeEl.selectedIndex].value;

    this.region_table_add_row(previousAreaType);
    return stop_event(event);
};

MapControlPanel.options.MappedArea.prototype.fill_checkbox_click_event_handler = function(element, event, rowId) {
    var ids = this.regionTableRowIds[rowId];

    var fillColourEl = document.getElementById(ids.fillColour);

    fillColourEl.style.display = (fillColourEl.style.display === 'none') ? 'inline-block' : 'none';
};

MapControlPanel.options.MappedArea.prototype.outline_checkbox_click_event_handler = function(element, event, rowId) {
    var ids = this.regionTableRowIds[rowId];

    var colourEl = document.getElementById(ids.lineColour);
    colourEl.style.display = (colourEl.style.display === 'none') ? 'inline' : 'none';

    var weightEl = document.getElementById(ids.lineWeight);
    weightEl.style.display = (weightEl.style.display === 'none') ? 'inline' : 'none';
};

MapControlPanel.options.MappedArea.prototype.area_type_change_event_handler = function(element, event, rowId) {
    var ids = this.regionTableRowIds[rowId];

    var typeMenu = document.getElementById(ids.areaType);
    var type = typeMenu.options[typeMenu.selectedIndex].value;

    this.refresh_area_type(ids, type);
};

MapControlPanel.options.MappedArea.prototype.refresh_area_type = function(ids, type) {
    if (type === MapConfiguration.AREA_TYPE_GRIDSQUARE) {
        // display grid-square options table
        document.getElementById(ids.gridsquareOptions).style.display = 'block';

        // hide contents and title of name (dropbox) cell
        document.getElementById(ids.nameHeading).style.visibility = 'hidden';
        document.getElementById(ids.vcContent).style.display = 'none';
        document.getElementById(ids.gisContent).style.display = 'none';
    } else {
        // hide grid-square options table
        document.getElementById(ids.gridsquareOptions).style.display = 'none';

        // display title of dropbox cell
        document.getElementById(ids.nameHeading).style.visibility = 'visible';

        // display appropriate dropbox
        if (type === MapConfiguration.AREA_TYPE_VC) {
            document.getElementById(ids.vcContent).style.display = 'block';
            document.getElementById(ids.gisContent).style.display = 'none';
        } else {
            // other gis area type
            if (type !== ids.gisDropbox.areaType) {
                // type has changed so blank out old selection
                ids.gisDropbox.entityId = null;
                ids.gisDropbox.name = '';
                var inputEl = document.getElementById(ids.gisName);
                inputEl.value = '';
            }

            ids.gisDropbox.areaType = type;
            ids.gisDropbox.refresh_query_params();

            document.getElementById(ids.vcContent).style.display = 'none';
            document.getElementById(ids.gisContent).style.display = 'block';
        }
    }
};

/**
 *
 * @param {object} ids id storeage object
 * @param {string=} areaType
 * @returns {HTMLSelectElement}
 */
MapControlPanel.options.MappedArea.prototype.area_type_menu = function(ids, areaType) {
    var menu = document.createElement('select');
    menu.options[0] = new Option('county', MapConfiguration.AREA_TYPE_VC, true, areaType === MapConfiguration.AREA_TYPE_VC, true);
    menu.options[1] = new Option('grid-square', MapConfiguration.AREA_TYPE_GRIDSQUARE, false, areaType === MapConfiguration.AREA_TYPE_GRIDSQUARE);

    var n = 2;
    for (var gisType in GisAreaTypes) {
        if (GisAreaTypes.hasOwnProperty(gisType) && gisType !== 's' && gisType !== 'v') {
            // (exclude states (s) and vicecounties (v))

            menu.options[n++] = new Option(GisAreaTypes[gisType], gisType, false, areaType === gisType);
        }
    }

    return menu;
};

MapControlPanel.options.MappedArea.prototype.vc_dropbox_select_handler = function() {
    // @todo if country-inconsistent vc choice has been made then should adjust country to match
    //console.log('vc dropbox select handler');

    this.read_options();
    this.fireEvent('changed'); // will be handled by the aggregate handler (rather than MapControlPanel.options.MappedArea)
};

MapControlPanel.options.MappedArea.prototype.gis_dropbox_failed_select_handler = function() {
    this.entityId = null;
    this.name = '';

    this.fireEvent('changed');
};

/**
 *
 */
MapControlPanel.options.MappedArea.prototype.read_region_table_query_options = function() {
    var el, n = 0;

    var options = this.mapStyle;

    options.areaListTypes = [];
    options.vcLists = [];
    options.gisAreaIds = [];
    options.gisAreaNames = [];
    options.swRefs = [];
    options.neRefs = [];
    options.areaListClipFlags = [];
    options.areaListBackgrounds = [];
    options.areaListLineWeights = [];
    options.areaListLineColours = [];

    for (var rowId in this.regionTableRowIds) {
        if (rowId !== 'length' && this.regionTableRowIds.hasOwnProperty(rowId)) {

            var idSet = this.regionTableRowIds[rowId];
            var emptyFlag = true;

            var typeEl = document.getElementById(idSet.areaType);
            var areaType = typeEl.options[typeEl.selectedIndex].value;

            switch (areaType) {
                case MapConfiguration.AREA_TYPE_VC:
                    var vcString = document.getElementById(idSet.vcName).value.trim().replace(/,+$/, ''); // strip trailing commas

                    if (vcString !== '') {
                        emptyFlag = false;
                        options.vcLists[n] = vcString;
                    }
                    break;

                case MapConfiguration.AREA_TYPE_GRIDSQUARE:
                    var swRef = document.getElementById(idSet.swRef).value.trim();

                    if (swRef !== '') {
                        emptyFlag = false;
                        options.swRefs[n] = swRef;
                        options.neRefs[n] = document.getElementById(idSet.neRef).value.trim();
                    }
                    break;

                default:
                    var areaId = idSet.gisDropbox.entityId;

                    if (areaId) {
                        emptyFlag = false;
                        options.gisAreaIds[n] = areaId;
                        options.gisAreaNames[n] = idSet.gisDropbox.name;
                    }
            }


            if (!emptyFlag) {
                options.areaListTypes[n] = areaType;

                el = document.getElementById(idSet.clip);
                if (el.checked) {
                    options.areaListClipFlags[n] = 1;
                }

                el = document.getElementById(idSet.filledFlag);
                //var colour = idSet.fillColourPicker.toString();
                var colour = get_input_colour(document.getElementById(idSet.fillColour));

                if (el.checked && colour !== '') {
                    options.areaListBackgrounds[n] = colour;
                }

                el = document.getElementById(idSet.outlinedFlag);
                //colour = idSet.lineColourPicker.toString();
                colour = get_input_colour(document.getElementById(idSet.lineColour));
                var weight = parseFloat(document.getElementById(idSet.lineWeight).value);

                if (el.checked && colour !== '' && weight > 0) {
                    options.areaListLineWeights[n] = weight;
                    options.areaListLineColours[n] = colour;
                } else {
                    options.areaListLineWeights[n] = 0;
                }

                n++;
            }
        }
    }
};

MapControlPanel.options.MappedArea.prototype.delete_region_row = function(rowId) {
    var ids = this.regionTableRowIds[rowId];

    for(var i = ids.eventHandles.length; i--;) {
        removeDomEventHandler(ids.eventHandles[i]);
    }

    var row = document.getElementById(rowId);
    row.parentNode.removeChild(row);

    delete this.regionTableRowIds[rowId];
    this.regionTableRowIds.length--;

    if (this.regionTableRowIds.length === 0) {
        this.region_table_add_row();
    } else {
        // show the + button for the new last table row

        row = document.getElementById(this.panelIds.boundariesTable).getElementsByTagName('tbody')[0].lastChild; // get the current last row of the table
        document.getElementById(this.regionTableRowIds[row.id].plusButton).style.display = 'inline';
    }

    this.read_options();
    this.fireEvent('changed');
};

MapControlPanel.options.MappedArea.prototype.read_options = function() {
    MapControlPanel.prototype.read_options.apply(this, arguments);
    var mapStyle = this.mapStyle;

    var countryEl = document.getElementById(this.panelIds.countryMenu);
    this.mapConfiguration.country = countryEl.options[countryEl.selectedIndex].value;

    mapStyle.countyBackdrop = document.getElementById(this.panelIds.countyBackdrop).checked;

    if (this.mapConfiguration.country === 'gbie') {
        var ciEl = document.getElementById(this.panelIds.ciMenu);
        mapStyle.mapci = ciEl.options[ciEl.selectedIndex].value;

        var northernIsEl = document.getElementById(this.panelIds.scIsMenu);
        mapStyle.northernIslesFormat = northernIsEl.options[northernIsEl.selectedIndex].value;
    }

    this.read_region_table_query_options();
};

/**
 *
 * @constructor
 */
MapControlPanel.options.PageLayoutSettings = function () {};
MapControlPanel.options.PageLayoutSettings.prototype = new MapControlPanel;
MapControlPanel.options.PageLayoutSettings.prototype.constructor = MapControlPanel.options.DataSeriesStyles;
MapControlPanel.options.PageLayoutSettings.prototype.panelLabel = 'page layout';
MapControlPanel.options.PageLayoutSettings.prototype.context = { localsvg : true, gmap : false };

/**
 *
 * @param {Element} container
 * @param {MapStyle} options
 * @param {MapConfiguration} configuration
 */
MapControlPanel.options.PageLayoutSettings.prototype.create_panel = function(container, options, configuration) {
    var liner = MapControlPanel.prototype.create_panel.call(this, container);

    var id = this.panelIds = {
        keyPosition : uniqueId('keyposition'),
        title : uniqueId('title'),
        titleFlag : uniqueId('titleflag'),
        caption : uniqueId('caption'),
        captionFlag : uniqueId('captionflag'),
        copyrightFlag : uniqueId('cpyrtflag'),
        pageSizeMenu : uniqueId('pagesizemenu'),
        pageWidth : uniqueId('pgw'),
        pageHeight : uniqueId('pgh'),
        pageUnitsMenu : uniqueId('pgunits'),
        gisUnit : uniqueId('gisunit'),
        pageBackgroundMenu : uniqueId('pgbg'),
        dpi : uniqueId('dpi'),
        pageFrameFlag : uniqueId('pgframe'),
        mapFrameFlag : uniqueId('mapframe'),
        padN : uniqueId('padn'),
        padE : uniqueId('pade'),
        padS : uniqueId('pads'),
        padW : uniqueId('padw')
    };

    var html = '<table class="configsettings">' +
        '<tr><td><label for="' + id.keyPosition + '">legend box</label></td><td><select id="' + id.keyPosition + '">' +
        '<option value="tr">top-right</option>' +
        '<option value="tl">top-left</option>' +
        '<option value="tri">top-right (inside)</option>' +
        '<option value="tli">top-left (inside)</option>' +
        '<option value="br">bottom-right</option>' +
        '<option value="bl">bottom-left</option>' +
        '<option value="">not shown</option>' +
        '</select></td></tr>' +
        '<tr><td><label for="' + id.title + '">title</label></td><td>' +
        '<input id="' + id.titleFlag + '" type="checkbox"> ' +
        '<input id="' + id.title + '" type="text" style="width: 16em" value="' + escapeHTML(configuration.titleValue) + '"></td></tr>' +
        '<tr><td><label for="' + id.caption + '">caption</label></td><td>' +
        '<input id="' + id.captionFlag + '" type="checkbox"> ' +
        '<textarea id="' + id.caption + '" cols="48">' + escapeHTML(configuration.captionValue) + '</textarea></td></tr>' +
        '<tr><td colspan="2"><label for="' + id.copyrightFlag + '"' + (configuration.showCopyrightOption ? '' : ' style="display: none;"') + '><input type="checkbox" id="' + id.copyrightFlag + '" name="cpyrtflag" ' + (options.showCopyright ? 'checked ' : '') + '/> show copyright message</label></td></tr>' +
        '</table>';

    html += '<table class="configsettings">' +
        '<tr><td rowspan="2">page size</td>' +
        '<td><select id="' + id.pageSizeMenu + '">';

    for (var sizeId in MapControl.pageSizes) {
        if (MapControl.pageSizes.hasOwnProperty(sizeId)) {
            html += '<option value="' + sizeId + '">' + escapeHTML(MapControl.pageSizes[sizeId].label) + '</option>';
        }
    }

    html += '</select></td></tr>' +
        '<tr><td><label>width <input id="' + id.pageWidth + '" value="" style="width: 4em;"></label> <label>height <input id="' + id.pageHeight + '" value="" style="width: 4em;"></label>' +
        '<label> units <select id="' + id.pageUnitsMenu + '">' +
        '<option value="mm">mm</option>' +
        '<option value="cm">cm</option>' +
        '<option value="px">pixels</option>' +
        '<option value="in">inches</option>' +
        '</select>' +
        '</label>' +
        '</td></tr>' +
        '<tr><td><label for="' + id.gisUnit + '">boundary resolution</label></td><td><select id="' + id.gisUnit + '">' +
        '<option value="0">automatic</option>' +
        '<option value="100">maximum (100m)</option>' +
        '<option value="1000">1km</option>' +
        '<option value="2000">2km</option>' +
        '<option value="5000">5km</option>' +
        '<option value="10000">10km</option>' +
        '</select></td></tr>' +
        '<tr><td><label for="' + id.dpi + '">pixel density</label></td><td><select id="' + id.dpi + '">' +
        '<option value="">default</option>' +
        '<option value="72">72 dpi (web)</option>' +
        '<option value="90">90 dpi</option>' +
        '<option value="200">200 dpi</option>' +
        '<option value="300">300 dpi</option>' +
        '</select></td></tr>' +
        '<tr><td><label for="' + id.pageBackgroundMenu + '">page background colour</label></td><td><select id="' + id.pageBackgroundMenu + '">' +
        '<option value="sea">use sea colour</option>' +
        '<option value="white">white</option>' +
        '<option value="">transparent</option>' +
        '</select></td></tr>' +
        '<tr><td>frame</td><td><label>page <input type="checkbox" id="' + id.pageFrameFlag + '" /></label> <label>map <input type="checkbox" id="' + id.mapFrameFlag + '" /></label></td></tr>' +
        '<tr><td>padding</td><td>' +
        '<label>top <input style="width: 3.5em;" type="number" id="' + id.padN + '" value=""/></label>' +
        '<label>right <input style="width: 3.5em;" type="number" id="' + id.padE + '" value=""/></label>' +
        '<label>bottom <input style="width: 3.5em;" type="number" id="' + id.padS + '" value=""/></label>' +
        '<label>left <input style="width: 3.5em;" type="number" id="' + id.padW + '" value=""/></label> mm' +
        '</td></tr>' +
        '</table>';

    liner.innerHTML = html;
    //YAHOO.util.Event.onContentReady(liner, function () {
        this.apply_options(options, configuration);
    //}, this, true);
};

/**
 *
 * @param {MapStyle} options
 * @param {MapConfiguration} configuration
 */
MapControlPanel.options.PageLayoutSettings.prototype.apply_options = function(options, configuration) {
    var id = this.panelIds;

    document.getElementById(id.title).value = configuration.titleValue.trim();
    document.getElementById(id.caption).value = configuration.captionValue.trim();

    if (options.titleFlag === true || options.titleFlag === false) {
        document.getElementById(id.titleFlag).checked = options.titleFlag;
    }

    if (options.captionFlag === true || options.captionFlag === false) {
        document.getElementById(id.captionFlag).checked = options.captionFlag;
    }

    if (options.showCopyright === true || options.showCopyright === false) {
        document.getElementById(id.copyrightFlag).checked = options.showCopyright;
    }

    if (!MapControl.pageSizes.hasOwnProperty(options.pageSize)) {
        // unrecognized page size option
        options.pageSize = 'user';
    }

    selectOption(document.getElementById(id.pageSizeMenu), options.pageSize);

    if (options.pageSize === 'uc') {
        options.pageWidth = '';
        options.pageHeight = '';
    } else {
        if (options.pageSize !== 'user') {
            options.pageSizeUnits = MapControl.pageSizes[options.pageSize].units;
            options.pageWidth = MapControl.pageSizes[options.pageSize].width;
            options.pageHeight = MapControl.pageSizes[options.pageSize].height;
        }
        selectOption(document.getElementById(id.pageUnitsMenu), options.pageSizeUnits);
    }

    document.getElementById(id.pageWidth).value = options.pageWidth;
    document.getElementById(id.pageHeight).value = options.pageHeight;


    if (options.gisSimplicity) {
        selectOption(document.getElementById(id.gisUnit), options.gisSimplicity);
    }

    if (options.pageDpi) {
        selectOption(document.getElementById(id.dpi), options.pageDpi);
    }

    if (options.pageBackground) {
        selectOption(document.getElementById(id.pageBackgroundMenu), options.pageBackground);
    }

    if (options.pageFrame === true || options.pageFrame === false) {
        document.getElementById(id.pageFrameFlag).checked = options.pageFrame;
    }

    if (options.mapFrame === true || options.mapFrame === false) {
        document.getElementById(id.mapFrameFlag).checked = options.mapFrame;
    }

    if ('paddingN' in options && options.paddingN !== null) {
        document.getElementById(id.padN).value = options.paddingN;
        document.getElementById(id.padE).value = options.paddingE;
        document.getElementById(id.padS).value = options.paddingS;
        document.getElementById(id.padW).value = options.paddingW;
    }
};

MapControlPanel.options.PageLayoutSettings.prototype.read_options = function() {
    MapControlPanel.prototype.read_options.apply(this, arguments);
    var options = this.mapStyle;
    var id = this.panelIds;

    var legendPositionEl = document.getElementById(id.keyPosition);
    options.keypos = legendPositionEl.options[legendPositionEl.selectedIndex].value;
    this.mapConfiguration.titleValue = document.getElementById(id.title).value.trim();
    this.mapConfiguration.captionValue = document.getElementById(id.caption).value.trim();

    options.titleFlag = document.getElementById(id.titleFlag).checked;
    options.captionFlag = document.getElementById(id.captionFlag).checked;

    // need to constrain caption length as otherwise can generate urls that are too long and are blocked by the server
    if (this.mapConfiguration.captionValue.length > 100) {
        this.mapConfiguration.captionValue = this.mapConfiguration.captionValue.substr(0, 100) + '...';
    }

    options.showCopyright = document.getElementById(id.copyrightFlag).checked;

    var pageSizeEl = document.getElementById(id.pageSizeMenu);
    var size = pageSizeEl.options[pageSizeEl.selectedIndex].value;

    // test if pageSize has changed
    if (options.pageSize !== size) {
        options.pageSize = size;

        if (size !== 'user') {
            options.pageWidth = MapControl.pageSizes[size].width;
            options.pageHeight = MapControl.pageSizes[size].height;

            document.getElementById(id.pageWidth).value = options.pageWidth ? options.pageWidth : '';
            document.getElementById(id.pageHeight).value = options.pageHeight ? options.pageHeight : '';

            document.getElementById(id.pageUnitsMenu).selectedIndex = MapControl.pageSizes[size].unitIndex;

            options.pageSizeUnits = MapControl.pageSizes[size].units;
        }
    } else {
        // test if user has modified dimensions
        var unitsEl = document.getElementById(id.pageUnitsMenu);

        var width = parseFloat(document.getElementById(id.pageWidth).value.trim());
        var height = parseFloat(document.getElementById(id.pageHeight).value.trim());
        var units = unitsEl.options[unitsEl.selectedIndex].value;

        if (options.pageWidth != width || options.pageHeight != height || options.pageSizeUnits != units) {

            if (width == 0 && height == 0) {
                selectOption(pageSizeEl, 'uc'); //unconstrained size
            } else {
                selectOption(pageSizeEl, 'user'); //user-defined size
            }

            options.pageSize = 'user';

            options.pageWidth = width ? width : '';
            options.pageHeight = height ? height : '';
            options.pageSizeUnits = units;
        }
    }

    /*
        if (size !== 'uc') {


            options.pageWidth = parseFloat(document.getElementById(id.pageWidth).value.trim());
            options.pageHeight = parseFloat(document.getElementById(id.pageHeight).value.trim());
            options.pageSizeUnits = unitsEl.options[unitsEl.selectedIndex].value;
        } else {

        }
    */

    var gisSimplicityEl = document.getElementById(id.gisUnit);

    options.gisSimplicity = gisSimplicityEl.options[gisSimplicityEl.selectedIndex].value;

    var dpiEl = document.getElementById(id.dpi);

    options.pageDpi = dpiEl.options[dpiEl.selectedIndex].value;

    var pageBackgroundEl = document.getElementById(id.pageBackgroundMenu);

    options.pageBackground = pageBackgroundEl.options[pageBackgroundEl.selectedIndex].value;

    options.pageFrame = document.getElementById(id.pageFrameFlag).checked;

    options.mapFrame = document.getElementById(id.mapFrameFlag).checked;

    options.paddingN = parseFloat(document.getElementById(id.padN).value.trim());
    options.paddingE = parseFloat(document.getElementById(id.padE).value.trim());
    options.paddingS = parseFloat(document.getElementById(id.padS).value.trim());
    options.paddingW = parseFloat(document.getElementById(id.padW).value.trim());
};

/**
 *
 * @constructor
 */
MapControlPanel.options.ExportLinks = function () {};
MapControlPanel.options.ExportLinks.prototype = new MapControlPanel();
MapControlPanel.options.ExportLinks.prototype.constructor = MapControlPanel.options.ExportLinks;
MapControlPanel.options.ExportLinks.prototype.panelLabel = 'save or print';
MapControlPanel.options.ExportLinks.prototype.context = { localsvg : true, gmap : false };

/**
 *
 * @param {Element} container
 * @param {MapStyle} style
 * @param {MapConfiguration} configuration
 * @param {MapControl} mapOptionsControl
 */
MapControlPanel.options.ExportLinks.prototype.create_panel = function(container, style, configuration, mapOptionsControl) {
    var liner = MapControlPanel.prototype.create_panel.call(this, container);

    this.links = {
        pdf : {id: uniqueId('svgpdflink'), title: 'save as pdf', alt: 'save pdf', icon: 'pdf.png', type: 'application/pdf',
            description: "Standard format for distributing stand-alone documents and for printing."},
        png : {id: uniqueId('svgpnglink'), title: 'save as png image', alt: 'save png', icon: 'png.png', type: 'image/png',
            description: "Bit-map image (.png format), suitable for web or low-resolution print use."},
        svg : {id: uniqueId('svglink'), title: 'save as svg image', alt: 'save svg', icon: 'svg.png', type: 'image/svg+xml',
            description: "Scaleable vector graphics format image, can be loaded by specialist design software. Retains the full original detail."},
        docx : {id: uniqueId('svgdocxlink'), title: 'save as MS Word document', alt: 'save docx', icon: 'docx-icon.png', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            description: "Bit-map (.png) image inside a MS Word document."},
        print : {id: uniqueId('svgprintpdflink'), title: 'print', alt: 'print', icon: 'print.png', type: 'application/pdf',
            description: "pdf output for immediate printing."}
    };

    var warningEl = liner.appendChild(document.createElement('p'));
    warningEl.className = 'warning'; // @todo set map exports warning to a more sensible value
    warningEl.appendChild(document.createTextNode('Cannot export map image, some of the options are not valid.'));
    this.warningMessageId = warningEl.id = uniqueId('mapwarning');

    var list = liner.appendChild(document.createElement('ul'));
    this.exportLinksListId = list.id = uniqueId('mapexportlinks');

    for (var i in this.links) {
        if (this.links.hasOwnProperty(i)) {
            var item = list.appendChild(document.createElement('li')).appendChild(document.createElement('label'));
            item.style.verticalAlign = 'middle';

            var link = item.appendChild(document.createElement('a'));
            link.id = this.links[i].id;
            link.target = '_blank';
            link.type = this.links[i].type;
            link.title = this.links[i].title;

            var img = link.appendChild(document.createElement('img'));
            img.width = 32;
            img.height = 32;
            img.src = MapControl.imgPath + '/img/icons/' + this.links[i].icon;
            img.alt = this.links[i].alt;
            img.style.paddingRight = '1em';

            if (this.links[i].description) {
                item.appendChild(document.createElement('span')).innerHTML = this.links[i].description;
            }
        }
    }

    var moreExportsDiv = list.appendChild(document.createElement('li')).appendChild(document.createElement('div'));

    this.exportsMenuButton = new YAHOO.widget.Button(moreExportsDiv, {
            type: "menu",
            menu: [
                { text: "Illustrator (.ai)", value: "ai", onclick: { fn: MapControl.prototype.exports_click_handler, scope: mapOptionsControl} },
                { text: "EPS", value: "eps", onclick: { fn: MapControl.prototype.exports_click_handler, scope: mapOptionsControl} },
                { text: "de-optimized SVG", value: "flatsvg", onclick: { fn: MapControl.prototype.exports_click_handler, scope: mapOptionsControl} }
            ]
        }
    );

    this.exportsMenuButton.getMenu().subscribe("render", function () {
        // 'clicktohide' is cleared again during the first render (regardless
        // of it previously having been explicitly set
        // so need to reset it here
        this.cfg.setProperty('clicktohide', true);
    });
};

/**
 *
 * @param {MapStyle} options
 * @param {MapConfiguration} configuration
 */
MapControlPanel.options.ExportLinks.prototype.apply_options = function(options, configuration) {

};

/**
 *
 * @param {string} paramsString
 */
MapControlPanel.options.ExportLinks.prototype.set_urls = function(paramsString) {
    document.getElementById(this.links.svg.id).href = MapControl.renderScriptUrls.svg + paramsString.replace(/^&/, '');
    document.getElementById(this.links.png.id).href = MapControl.renderScriptUrls.svgPng + paramsString.replace(/^&/, '');
    document.getElementById(this.links.pdf.id).href = MapControl.renderScriptUrls.svgPdf + paramsString.replace(/^&/, '');
    document.getElementById(this.links.docx.id).href = MapControl.renderScriptUrls.svgDocx + paramsString.replace(/^&/, '');
    document.getElementById(this.links.print.id).href = MapControl.renderScriptUrls.svgPdf + paramsString.replace(/^&/, '');
};

MapControlPanel.options.ExportLinks.prototype.set_visibility = function(visibleFlag) {
    if (visibleFlag) {
        document.getElementById(this.warningMessageId).style.display = 'none';
        document.getElementById(this.exportLinksListId).style.display = 'block';
    } else {
        document.getElementById(this.warningMessageId).style.display = 'block';
        document.getElementById(this.exportLinksListId).style.display = 'none';
    }
};

/**
 * sub-level destructor for individual panel object
 *
 * @returns {undefined}
 */
MapControlPanel.options.ExportLinks.prototype.destroy_panel = function() {
    if (this.exportsMenuButton) {
        this.exportsMenuButton.destroy();
        this.exportsMenuButton = null;
    }
    MapControlPanel.prototype.destroy_panel.call(this);
};
