/*
 * BSBI database project
 * (c) 2011,2012,2013,2014,2020 Botanical Society of Britain and Ireland
 *
 * @author Tom Humphrey <tom.humphrey@bsbi.org>
 */

import {SVG} from "./SVG";
import {StoppedGradientColourScheme} from "./colourscheme_foo/StoppedGradientColourScheme";
import {ConstantColourScheme} from "./colourscheme_foo/ConstantColourScheme";
import {BritishIslesSvgDotMap} from "./BritishIslesSvgDotMap";
import {GridRefGB} from "british-isles-gridrefs";

export class SVGGridSquareSeries {
	/**
	 * array keyed by symbol code
	 * provides additional css for colour styling of markers
	 * or empty by default
	 *
	 * colours specified for a symbol here override the partition colour
	 * (therefore colours should *not* be specified here if a dual partition / data-set segregate scheme is used
	 * or if frequency controls colour
	 *
	 * i.e. provide colour only when single non-frequency partition
	 *
	 * @var {{}}
	 */
	dataMarkerCss = [];

	dataLayerCss = {
		0 : 'fill: #00aa00;stroke: #00aa00; stroke-width: 0.2; stroke-opacity: 0.6;fill-opacity:0.6;',
		1 : 'fill: #bb0000;stroke: #bb0000; stroke-width: 0.2; stroke-opacity: 0.6;fill-opacity:0.6;',
		2 : 'fill: #000000;stroke: #000000; stroke-width: 0.2; stroke-opacity: 0.6;fill-opacity:0.6;',
		3 : 'fill: #000080;stroke: #000080; stroke-width: 0.2; stroke-opacity: 0.6;fill-opacity:0.6;',
		4 : 'fill: #008080;stroke: #008080; stroke-width: 0.2; stroke-opacity: 0.6;fill-opacity:0.6;',
		5 : 'fill: #800080;stroke: #800080; stroke-width: 0.2; stroke-opacity: 0.6;fill-opacity:0.6;'
		//'b' : 'fill: #dddddd;stroke: #dddddd; stroke-width: 0; stroke-opacity: 0;fill-opacity:0.4;'
	};

	dataLayerMarkers = {
		0: SVG.SYMBOL_FILLEDSQUARE,
		1: SVG.SYMBOL_FILLEDSQUARE,
		2: SVG.SYMBOL_FILLEDSQUARE,
		3: SVG.SYMBOL_FILLEDSQUARE,
		4: SVG.SYMBOL_FILLEDSQUARE,
		5: SVG.SYMBOL_FILLEDSQUARE
		//'b' : SVG.SYMBOL_FILLEDSQUARE
	};

	/**
	 * 'hectad', 'tetrad' or 'monad'
	 *
	 * @var {string}
	 */
	_gridType;

	/**
	 *
	 * @var {GridsquareListController}
	 */
	controller;

	/**
	 * set by SVGGridSquareListPageView
	 * @todo needs refactoring
	 *
	 * @var {GBSvgDotMap}
	 */
	gbMap;

	/**
	 * set by SVGGridSquareListPageView
	 * @todo needs refactoring
	 *
	 * @var {IESvgDotMap}
	 */
	ieMap;

	/**
	 * set by SVGGridSquareListPageView
	 * @todo needs refactoring
	 *
	 * @var {CISvgDotMap}
	 */
	ciMap;

	/**
	 * set by SVGGridSquareListPageView
	 * @todo needs refactoring
	 *
	 * @var {NorthernIslesSvgDotMap}
	 */
	sconMap;

	/**
	 * set by SVGGridSquareListPageView
	 * @todo needs refactoring
	 *
	 * @var {SvgMapKey}
	 */
	legendBox;

	/**
	 * @var {number}
	 */
	_expectedGBRefLength;

	/**
	 * @var {number}
	 */
	_expectedIERefLength;

	/**
     * array of countrycode:array(array(lx,ly,hx,hy,freq0, freqn...))
     *
     * @var {{gb : number[], ie : number[], ci : number[]}}
	 */
	_freqGridSquares = {
		'gb' : [],
		'ie' : [],
		'ci' : []
	};

	_markedGridSquares = {
		'gb': [],
		'ie': [],
		'ci': []
	};

	_haveFrequencyData;

	_haveMarkedData;

	/**
	 * If results are partitioned (e.g. by date class) then this gives the number of expected divisions
	 *
	 * @var {number}
	 */
	_numberOfPartitions;

	/**
	 * highest frequency encountered in a grid square
	 * (may have been overridden by explicit user setting)
	 * @protected
	 * @var {number}
	 */
	_maxFreq = 1;

	/**
	 * lowest -ve frequency encountered in a grid square or 0
	 * negative frequencies may occur when subtracting combinations of frequency result sets
	 * (may have been overridden by explicit user setting)
	 * @protected
	 * @var {number}
	 */
	_minFreq = 1;

	/**
	 *
	 * @type {{}}
	 * @protected
	 */
	_refLengths = {
		'hectad': 4, // GB lengths, IE are one less
		'tetrad': 5,
		'monad': 6,
		'100m': 8
	};

	/**
	 * @protected
	 * @var {SVGGridSquareListPageView}
	 */
	_parentPageView;

	/**
	 *
	 * @param {MapDataseriesConfiguration} seriesConfig
	 * @param {MapDataseriesStyle} seriesStyle
	 */
	constructor(seriesConfig, seriesStyle) {
		this.seriesConfig = seriesConfig;
		this.seriesStyle = seriesStyle;
	}

	/**
	 * reads from the series data source (a BinaryGridsquareListSource) and populates
	 * national arrays of grid-coords and markers
	 *
	 * @param {MapDataseriesConfiguration} seriesConfig
	 * @param {MapDataseriesStyle} seriesStyle
	 */
	foo_prepareMarkerDatasets(seriesConfig, seriesStyle) {
		var p;
		var dataSource = seriesConfig.sourceData;
		var partitionStyles = seriesStyle.partitions[seriesConfig.partitionType];

		/**
		 * master opacity scale factor for this series
		 * (defaults to 0.7)
		 * opacity is also modified by square dimension and residue flags
		 *
		 * @type {number}
		 */
		var seriesOpacity = seriesStyle.opacity;

		if (seriesConfig.frequencyResultsFlag) {
			var colourScheme = seriesStyle.colourScheme;
		}

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

		var maxPrecision, minPrecision;

		if (seriesConfig.zoomMode == MapDataseriesConfiguration.ZOOM_MODE_ONLY_THIS) {
			var specifiedPrecision = MapDataseriesConfiguration.KEY_TO_PRECISION[seriesConfig.gridResolution];

			minPrecision = maxPrecision = specifiedPrecision + 2;

			// at least for fixed-scale distinct counts (species/taxa) max freq will already be adjusted, so trying
			// to scale by area pushes values out of range
			this.scaleValueByArea = false;
		} else {
			maxPrecision = Math.min(GmapTile.zoom_to_data_precision(this.tileZoom), (seriesConfig.maxGridsquarePrecisionLevel + 2));
			minPrecision = seriesConfig.minGridsquarePrecisionLevel;

			this.scaleValueByArea = true;
		}

		var plotResidue = (seriesConfig.zoomMode[0] === 'r');

		var plotList = [];

		dataSource.get_tile_tree(
			plotList,
			grid.CODE,
			grid.minX, grid.minY, grid.maxX, grid.maxY,
			grid.GRID_MIN_X, grid.GRID_MIN_Y,
			minPrecision,
			maxPrecision,
			false,
			1 // start precision
		);

		var l = plotList.length;
		var get_offset_pixel_coords_scaled = GoogleMapUtility.get_offset_pixel_coords_scaled;
		var zoomScale = GoogleMapUtility.get_zoom_scale_factor(this.tileZoom);

		var colour, marker;

		for (var n = 0; n < l; n++) {
			var square = plotList[n];

			var pointSW = get_offset_pixel_coords_scaled(
				new grid.ref(square.tileX, square.tileY).to_latLng(), zoomScale, this.tileX, this.tileY);

			var pointNW = get_offset_pixel_coords_scaled(
				new grid.ref(square.tileX, square.tileY + square.tileDimension).to_latLng(), zoomScale, this.tileX, this.tileY);

			var pointNE = get_offset_pixel_coords_scaled(
				new grid.ref(square.tileX + square.tileDimension, square.tileY + square.tileDimension).to_latLng(), zoomScale, this.tileX, this.tileY);

			var pointSE = get_offset_pixel_coords_scaled(
				new grid.ref(square.tileX + square.tileDimension, square.tileY).to_latLng(), zoomScale, this.tileX, this.tileY);

			var opacity = square.precision / maxPrecision;

			if (seriesConfig.partition_filter) {
				square = seriesConfig.partition_filter(square);
			}

			if (seriesConfig.frequencyResultsFlag) {
				if (square.residualFreq && !partitionStyles[0].hidden) {

					this.svg.appendChild(colourScheme.svg_frequency_marker({
						sw : pointSW,
						nw : pointNW,
						ne : pointNE,
						se : pointSE
					}, square.residualFreq, opacity * seriesOpacity, square.tileDimension, this.scaleValueByArea));
				}
			} else {
				marker = undefined;

				// flag indicates whether using markers to show status
				var statusFilteringFlag = (
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

						for (p = seriesConfig.numberOfPartitions; p--;) {
							if (square.partitions[p].residualFreq && !partitionStyles[p].hidden) {
								colour = '#' + partitionStyles[p].colour;

								marker = seriesStyle.markers[square.partitions[p].status];
								break;
							}
						}
					} else {
						// earliest partition on top

						for (p = 0; p < seriesConfig.numberOfPartitions; p++) {
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

						for (p = seriesConfig.numberOfPartitions; p--;) {
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

						for (p = 0; p < seriesConfig.numberOfPartitions; p++) {
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
	};

	static RESOLUTION_TO_TILE_TREE_PRECISION = {
		'hectad' : 3,
		'tetrad' : 4,
		'monad' : 5,
		'100m' : 6,
		'10m' : 7
	};

	readFrequencyData() {
		const dataSource = this.seriesConfig.sourceData;

		const specifiedPrecision = SVGGridSquareSeries.RESOLUTION_TO_TILE_TREE_PRECISION[this.seriesConfig.gridResolution];

		if (this.gbMap) {

			/**
			 *
			 * @type {Array.<{precision: number,
                tileX: number, // LX
                tileY: number, // LY
                tileDimension: number,
                residualFreq: number,
                childFreq: number,
                partitions: {},
                children: {}}>} plotList
			 */
			let plotList = [];

			/**
			 * read data for gb into plotList
			 */
			dataSource.get_tile_tree(
				plotList,
				'gb',
				0, //grid.minX,
				0, //grid.minY,
				this.gbMap.metresWidth, // grid.maxX,
				this.gbMap.metresHeight, // grid.maxY,
				0, //grid.GRID_MIN_X,
				0, //grid.GRID_MIN_Y,
				specifiedPrecision,
				specifiedPrecision,
				false,
				1 // start precision
			);

			for (let n = 0, l = plotList.length; n < l; n++) {
				let square = plotList[n];

				if (this.seriesConfig.partition_filter) {
					square = this.seriesConfig.partition_filter(square);
				}
			}
		}
	}

	readMarkedData() {

	}

	/**
	 *
	 * @throws Exception
	 */
	plot_data() {
		this.gridType = this.seriesConfig.gridResolution;

		if (this.gridType !== 'hectad' &&
			this.gridType !== 'tetrad' &&
			this.gridType !== 'monad' &&
			this.gridType !== 'hectare'
		) {
			throw new Error(`Unrecognized grid square type '${this.gridType}'. Must be hectad, tetrad, monad or hectare.`);
		}



		this.numberOfPartitions = this.seriesConfig.numberOfPartitions; // controller.get_expected_number_of_partitions();

		// reinitialise result sets
		this.freqGridSquares = {
			'gb': [],
			'ie': [],
			'ci': []
		};

		this.markedGridSquares = {
			'gb': [],
			'ie': [],
			'ci': []
		};

		this.haveFrequencyData = null;
		this.haveMarkedData = null;



		if (this.numberOfPartitions === 0) {
			this.readFrequencyData();

			// controller.get_results(this[`result_callback_${this.gridType}`].bind(this));
			//
			// this.freqGridSquares['gb'] = this.freqGridSquares['gb'].values();
			// this.freqGridSquares['ci'] = this.freqGridSquares['ci'].values();
			// this.freqGridSquares['ie'] = this.freqGridSquares['ie'].values();

			this.haveFrequencyData = true;
		} else {
			this.readMarkedData();

			//controller.get_results(this.partitioned_result_callback.bind(this));
		}

		let useExplicitFrequencySettings = false;

		if (this.haveFrequencyData) {
			// test if can/should override calculated frequency range with user-specified limits

			let colourScheme;

			// allow user to clamp max frequency
			if (controller.maxFrequency !== null) {
				this.maxFreq = controller.maxFrequency;
				useExplicitFrequencySettings = true;
			}

			if (controller.minFrequency !== null && controller.minFrequency <= this.minFreq) {
				this.minFreq = controller.minFrequency;
				useExplicitFrequencySettings = true;
			}

			if (controller.searchType in GridsquareListController.FREQUENCY_SEARCH_TYPES) {
				// plotting frequencies

				if (this.minFreq < 0 && this.maxFreq > 0) {
					// compelled to use heat map

					colourScheme = new StoppedGradientColourScheme; // :
					colourScheme.set_min_max(this.minFreq, this.maxFreq);
					colourScheme.set_named_style('heatmap');
				} else {
					switch (controller.frequencyStyle) {
						case GridsquareListController.FREQUENCY_STYLE_SIMPLE_GRADIENT:
							//colourScheme = new LinearGreenColourScheme;
							//colourScheme.set_min_max(this.minFreq, this.maxFreq);

							colourScheme = new StoppedGradientColourScheme;
							colourScheme.set_min_max(this.minFreq, this.maxFreq);
							colourScheme.set_named_style('lineargreenblack');
							break;

						case GridsquareListController.FREQUENCY_STYLE_HEATMAP:
							colourScheme = new StoppedGradientColourScheme;
							colourScheme.set_min_max(this.minFreq, this.maxFreq);
							colourScheme.set_named_style('heatmap');
							break;

						case GridsquareListController.FREQUENCY_STYLE_CONSTANTCOLOUR:
							colourScheme = new ConstantColourScheme;
							colourScheme.set_rgb(0, 200, 0);
							colourScheme.set_min_max(this.minFreq, this.maxFreq);
							break;

						default:
							if (controller.frequencyStyle in StoppedGradientColourScheme.COLOUR_STYLES) {
								colourScheme = new StoppedGradientColourScheme;
								colourScheme.set_min_max(this.minFreq, this.maxFreq);
								colourScheme.set_named_style(controller.frequencyStyle);
							} else if (controller.frequencyStyle[0] === '_') {
								// constant colour specified as hexidecimal '_rrggbb'
								const colour = controller.frequencyStyle;

								colourScheme = new ConstantColourScheme;
								if (colour.length === 7) {
									colourScheme.set_rgb(
										parseInt(colour.substring(1,2), 16),
										parseInt(colour.substring(3,2), 16),
										parseInt(colour.substring(5,2), 16)
									);
								} else {
									throw new Error(`Unparsable colour '${colour}'.`);
								}

								colourScheme.set_min_max(this.minFreq, this.maxFreq);
							} else {
								throw new Error(`Unrecognized frequency style '${controller.frequencyStyle}'`);
							}
					}

					// if plotting percentages then need a way to distinguish zero values
					colourScheme.outlineZeroesFlag = (controller.mapPercentageFreq);
				}

				colourScheme.varyPointSizeFlag = controller.frequencyVarySizeFlag;
				colourScheme.plotKeyAsContinuousGradient = controller.plotKeyAsContinuousGradient;

				colourScheme.useExplicitFrequencySettings = useExplicitFrequencySettings;
			} else {
				console.log('reached odd non-freq plotting under frequency');

				// use default colour scheme
				colourScheme = new StoppedGradientColourScheme;
				colourScheme.set_min_max(this.minFreq, this.maxFreq);
				colourScheme.set_named_style(this.minFreq < 0 && this.maxFreq > 0 ? 'heatmap' : 'lineargreen');
			}

			if (this.legendBox) {
				// need to call initialize_automatic_freq_scale prior
				// to any plotting, as values used for min/max may be tweaked
				colourScheme = this.legendBox.initialize_freq_scale(colourScheme, this.maxFreq, this.minFreq);
			}

			colourScheme.frequencyMarkerStyle = controller.frequencyMarkerStyle;

			if (this.gbMap) {
				this.gbMap.plot_data(this.freqGridSquares['gb'], colourScheme);

				this.parentPageView.apply_area_clipping(this.gbMap, 'gb');
			}

			if (this.ieMap) {
				this.ieMap.plot_data(this.freqGridSquares['ie'], colourScheme);

				this.parentPageView.apply_area_clipping(this.ieMap, 'ie');
			}

			if (this.ciMap) {
				this.ciMap.plot_data(this.freqGridSquares['ci'], colourScheme);
			}

			if (this.sconMap) {
				this.sconMap.plot_data(this.freqGridSquares['gb'], colourScheme);
			}

			if (this.legendBox) {
				this.legendBox.add_freq_scale(
					colourScheme,
					(this.parentPageView.controller.subcontrollers && this.parentPageView.controller.subcontrollers.length > 1) ?
						this.seriesLabel
						:
						''
				);
			}
		}

		if (this.haveMarkedData) {
			// display multiple sets of partitioned results (e.g. divided by date class)

			this.initialise_marker_settings();

			if (this.gbMap) {
				this.gbMap.reversePlottingOrder = controller.mapReverseStack;
				this.gbMap.noSuperimposition = !controller.mapSuperimposeSymbols;
				this.gbMap.hiddenLayerFlags = controller.hidePartition;
				this.gbMap.haveBackgroundLayer = controller.sendBackgroundSquares;

				if (controller.segregateBySymbol) {
					this.gbMap.plot_partitioned_data_with_symbols(this.markedGridSquares.gb, this.numberOfPartitions, this.dataLayerCss, this.dataLayerMarkers, this.dataMarkerCss, this.seriesNumber);
				} else {
					this.gbMap.plot_partitioned_data(this.markedGridSquares.gb, this.numberOfPartitions, this.dataLayerCss, this.dataLayerMarkers, this.seriesNumber);
				}

				this.parentPageView.apply_area_clipping(this.gbMap, 'gb');
			}

			if (this.ieMap) {
				this.ieMap.reversePlottingOrder = controller.mapReverseStack;
				this.ieMap.noSuperimposition = !controller.mapSuperimposeSymbols;

				if (controller.segregateBySymbol) {
					this.ieMap.plot_partitioned_data_with_symbols(this.markedGridSquares.ie, this.numberOfPartitions, this.dataLayerCss, this.dataLayerMarkers, this.dataMarkerCss, this.seriesNumber);
				} else {
					this.ieMap.plot_partitioned_data(this.markedGridSquares.ie, this.numberOfPartitions, this.dataLayerCss, this.dataLayerMarkers, this.seriesNumber);
				}
				this.parentPageView.apply_area_clipping(this.ieMap, 'ie');
			}

			if (this.ciMap) {
				this.ciMap.reversePlottingOrder = controller.mapReverseStack;
				this.ciMap.noSuperimposition = !controller.mapSuperimposeSymbols;

				if (controller.segregateBySymbol) {
					this.ciMap.plot_partitioned_data_with_symbols(this.markedGridSquares.ci, this.numberOfPartitions, this.dataLayerCss, this.dataLayerMarkers, this.dataMarkerCss, this.seriesNumber);
				} else {
					this.ciMap.plot_partitioned_data(this.markedGridSquares.ci, this.numberOfPartitions, this.dataLayerCss, this.dataLayerMarkers, this.seriesNumber);
				}
				// no county clipping for CI (is single county)
			}

			if (this.sconMap) {
				this.sconMap.reversePlottingOrder = controller.mapReverseStack;
				this.sconMap.noSuperimposition = !controller.mapSuperimposeSymbols;

				if (controller.segregateBySymbol) {
					this.sconMap.plot_partitioned_data_with_symbols(this.markedGridSquares.gb, this.numberOfPartitions, this.dataLayerCss, this.dataLayerMarkers, this.dataMarkerCss, this.seriesNumber);
				} else {
					this.sconMap.plot_partitioned_data(this.markedGridSquares.gb, this.numberOfPartitions, this.dataLayerCss, this.dataLayerMarkers, this.seriesNumber);
				}
				// no county clipping for Scottish Islands
			}

			if (this.legendBox) {
				let seriesLabel = (this.parentPageView.controller instanceof CombinationGridsquareListController) ? this.seriesLabel : '';
				let partitionLabels;

				if (controller.partitionLabel) {
					partitionLabels = controller.partitionLabel;
				} else {
					// if only a single partition then this is unlabelled and so wouldn't be plotted on key
					// but if the view is a composite of multiple series
					// then each series ought to appear in the key
					// so substitute in the series name

					partitionLabels = (this.parentPageView.controller instanceof CombinationGridsquareListController) ?
						[seriesLabel] : [];
				}

				BritishIslesSvgDotMap.build_key(this.legendBox, partitionLabels, controller.hidePartition, this.numberOfPartitions, this.seriesNumber, seriesLabel, controller.mapReverseStack);

				if (controller.segregateBySymbol && controller.statusMarkerLabels.length) {
					BritishIslesSvgDotMap.add_symbol_markers_to_key(this.legendBox, controller.statusMarkerLabels);
				}
			}
		}
	}

	/**
	 *
	 * @param {{hectad : string}} freq
	 * @return void
	 */
	result_callback_hectad(freq) {
		let n, coords;
		const gr = freq.hectad;

		if (gr[1] >= 'A' && gr[1] <= 'Z') {
			// GB (ref string length 4, ie. SD56)
			if (gr[0] !== 'W') {

				if (!(gr in this.freqGridSquares.gb)) {
					let coords = GridRefGB.hectad_to_raw_coords(gr);

					coords[4] = n = (int)freq['freq'];
					this.freqGridSquares['gb'][gr] = coords;
				} else {
					this.freqGridSquares['gb'][gr][4] += (int)freq['freq'];
					n = this.freqGridSquares['gb'][gr][4];
				}
			} else {
				// channel islands
				if (!array_key_exists(gr, this.freqGridSquares['ci'])) {
					coords = GridRefCI.hectad_to_svgmap_coords(gr);

					coords[4] = n = (int)freq['freq'];
					this.freqGridSquares['ci'][gr] = coords;
				} else {
					this.freqGridSquares['ci'][gr][4] += (int)freq['freq'];
					n = this.freqGridSquares['ci'][gr][4];
				}
			}
		} else if (strlen(freq[this.gridType]) === 3) {
			// Ireland (ref string length 3, ie. S56)

			if (!array_key_exists(gr, this.freqGridSquares['ie'])) {
				coords = GridRefIE.hectad_to_raw_coords(freq[this.gridType]);

				coords[4] = n = (int)freq['freq'];
				this.freqGridSquares['ie'][gr] = coords;
			} else {
				this.freqGridSquares['ie'][gr][4] += (int)freq['freq'];
				n = this.freqGridSquares['ie'][gr][4];
			}
		} else {
			error_log("440 unexpected gridref length, ref is '{gr}'");
			n = null;
		}


		if (n > this.maxFreq) {
			this.maxFreq = n;
		}

		if (n < this.minFreq) {
			this.minFreq = n;
		}
		this.parentPageView.resultsCount++;
	}

	/**
	*
	* @param array freq
	* @return void
	*/
	result_callback_tetrad(freq) {
		gr = freq['tetrad'];

		if (strlen(gr) === 5) {
			// GB (ref string length 5, ie. SD56A)

			if (gr[0] !== 'W') {
				if (!array_key_exists(gr, this.freqGridSquares['gb'])) {
					coords = GridRefGB.tetrad_to_raw_coords(gr);

					coords[4] = n = (int)freq['freq'];
					this.freqGridSquares['gb'][gr] = coords;
				} else {
					this.freqGridSquares['gb'][gr][4] += (int)freq['freq'];
					n = this.freqGridSquares['gb'][gr][4];
				}
			} else {
				// channel islands
				if (!array_key_exists(gr, this.freqGridSquares['ci'])) {
					coords = GridRefCI.tetrad_to_svgmap_coords(gr);

					coords[4] = n = (int)freq['freq'];
					this.freqGridSquares['ci'][gr] = coords;
				} else {
					this.freqGridSquares['ci'][gr][4] += (int)freq['freq'];
					n = this.freqGridSquares['ci'][gr][4];
				}
			}
		} else if (strlen(gr) === 4) {
			// Ireland (ref string length 4, ie. S56A)
			if (!array_key_exists(gr, this.freqGridSquares['ie'])) {
				coords = GridRefIE.tetrad_to_raw_coords(gr);

				coords[4] = n = (int)freq['freq'];
				this.freqGridSquares['ie'][gr] = coords;
			} else {
				this.freqGridSquares['ie'][gr][4] += (int)freq['freq'];
				n = this.freqGridSquares['ie'][gr][4];
			}
		} else {
			error_log("487 tetrad gridref length, ref is '{gr}'");
			n = null;
			//assert('!empty(freq[this.gridType])');
			//return;
		}

		if (n > this.maxFreq) {
			this.maxFreq = n;
		}

		if (n < this.minFreq) {
			this.minFreq = n;
		}
		this.parentPageView.resultsCount++;
	}

	/**
	 *
	 * @param array freq
	 * @return void
	 */
	result_callback_monad(freq) {
		gr = freq['monad'];

		if (strlen(gr) === 6) {
			// GB (ref string length 6, ie. SD5634)
			//testCI = substr(freq[this.gridType], 0, 2);
			//if (testCI !== 'WA' && testCI !== 'WV') {
			if (gr[0] !== 'W') {
				if (!array_key_exists(gr, this.freqGridSquares['gb'])) {
					coords = GridRefGB.monad_to_raw_coords(gr);

					coords[4] = n = (int)freq['freq'];
					this.freqGridSquares['gb'][gr] = coords;
				} else {
					this.freqGridSquares['gb'][gr][4] += (int)freq['freq'];
					n = this.freqGridSquares['gb'][gr][4];
				}
			} else {
				// channel islands
				if (!array_key_exists(gr, this.freqGridSquares['ci'])) {
					coords = GridRefCI.monad_to_svgmap_coords(gr);

					coords[4] = n = (int)freq['freq'];
					this.freqGridSquares['ci'][gr] = coords;
				} else {
					this.freqGridSquares['ci'][gr][4] += (int)freq['freq'];
					n = this.freqGridSquares['ci'][gr][4];
				}
			}
		} else if (strlen(freq[this.gridType]) === 5) {
			// Ireland (ref string length 5, ie. S5634)
			if (!array_key_exists(gr, this.freqGridSquares['ie'])) {
				coords = GridRefIE.monad_to_raw_coords(gr);

				coords[4] = n = (int)freq['freq'];
				this.freqGridSquares['ie'][gr] = coords;
			} else {
				this.freqGridSquares['ie'][gr][4] += (int)freq['freq'];
				n = this.freqGridSquares['ie'][gr][4];
			}
		} else {
			error_log("547 unexpected monad gridref length, ref is '{gr}'");
			n = null;
			//assert('!empty(freq[this.gridType])');
			//return;
		}

		if (n > this.maxFreq) {
			this.maxFreq = n;
		}

		if (n < this.minFreq) {
			this.minFreq = n;
		}
		this.parentPageView.resultsCount++;
	}

	/**
	 *
	 * @param array freq
	 * @return void
	 */
	result_callback_hectare(freq) {
		if (BSBIDB_DEV_MODE) {
			error_log("result_callback_hectare : " . print_r(freq, true));
		}

		gr = freq['hectare'];

		if (strlen(gr) === 8) {
			// GB (ref string length 6, ie. SD561341)

			if (gr[0] !== 'W') {
				if (!array_key_exists(gr, this.freqGridSquares['gb'])) {
					coords = GridRefGB.hectare_to_raw_coords(gr);

					coords[4] = n = (int)freq['freq'];
					this.freqGridSquares['gb'][gr] = coords;
				} else {
					this.freqGridSquares['gb'][gr][4] += (int)freq['freq'];
					n = this.freqGridSquares['gb'][gr][4];
				}

				if (BSBIDB_DEV_MODE) {
					error_log("result_callback_hectare coords : " . print_r(this.freqGridSquares['gb'][gr], true));
				}
			} else {
				// channel islands
				if (!array_key_exists(gr, this.freqGridSquares['ci'])) {
					coords = GridRefCI.hectare_to_svgmap_coords(gr);

					coords[4] = n = (int)freq['freq'];
					this.freqGridSquares['ci'][gr] = coords;
				} else {
					this.freqGridSquares['ci'][gr][4] += (int)freq['freq'];
					n = this.freqGridSquares['ci'][gr][4];
				}
			}
		} else if (strlen(freq[this.gridType]) === 7) {
			// Ireland (ref string length 5, ie. S561341)
			if (!array_key_exists(gr, this.freqGridSquares['ie'])) {
				coords = GridRefIE.hectare_to_raw_coords(gr);

				coords[4] = n = (int)freq['freq'];
				this.freqGridSquares['ie'][gr] = coords;
			} else {
				this.freqGridSquares['ie'][gr][4] += (int)freq['freq'];
				n = this.freqGridSquares['ie'][gr][4];
			}
		} else {
			error_log("699 unexpected hectare gridref length, ref is '{gr}'");
			n = null;
		}

		if (n > this.maxFreq) {
			this.maxFreq = n;
		}

		if (n < this.minFreq) {
			this.minFreq = n;
		}
		this.parentPageView.resultsCount++;
	}

	/**
	 * result callback used when partitioned data is expected
	 *
	 * @param array row array('hectad|tetrad|monad':gr, 'freq':ignored, 'partitioncode0':freq, 'partitioncode1':freq ... )
	 * @param string _gridType 'hectad|tetrad|monad|hectare'
	 * @return void
	 */
	partitioned_result_callback(row, _gridType) {
		if (strlen(row[_gridType]) === this.refLengths[_gridType]) {
			// GB
			if (row[_gridType][0] !== 'W') {
				rawCoordsFunction = "{_gridType}_to_raw_coords";
				coords = GridRefGB.rawCoordsFunction(row[_gridType]);

				countryCode = 'gb';
			} else {
				// channel islands
				rawCoordsFunction = "{_gridType}_to_svgmap_coords";
				coords = GridRefCI.rawCoordsFunction(row[_gridType]);

				countryCode = 'ci';
			}
		} else if (strlen(row[_gridType]) === (this.refLengths[_gridType]-1)) {
			// Ireland
			rawCoordsFunction = "{_gridType}_to_raw_coords";
			coords = GridRefIE.rawCoordsFunction(row[_gridType]);

			countryCode = 'ie';
		} else {
			error_log(__LINE__ . " unexpected gridref length, ref is '{row[_gridType]}'");

			return;
		}

		if (this.controller.segregateBySymbol) {
			//error_log(print_r(row, true));
			if (this.numberOfPartitions > 1) {
				freq = 0;
				marked = [];
				symbol = [];

				for (p = 0; p < this.numberOfPartitions; p++) {
					//error_log('row here: ' . print_r(row, true));
					if (row["symbol{p}"] === GridsquareListController.FREQUENCY_SYMBOL) {
						freq = max(freq, ((int) row["partitioncode{p}"]));
						//symbol[p] = row["symbol{p}"];
					} else {
						marked[p] = ((int) row["partitioncode{p}"]) > 0 ? 1 : 0;
						symbol[p] = row["symbol{p}"];
					}
				}

				if (freq) {
					coords[4] = freq;
					//coords[5] = symbol;

					if (coords[4] > this.maxFreq) {
						this.maxFreq = coords[4];
					}

					if (coords[4] < this.minFreq) {
						this.minFreq = coords[4];
					}

					this.freqGridSquares[countryCode][] = coords;
					this.haveFrequencyData = true;
				}

				if (!empty(marked)) {
					coords[4] = marked;
					coords[5] = symbol;

					this.markedGridSquares[countryCode][] = coords;
					this.haveMarkedData = true;
				}
			} else {
				if (row["symbol0"] === GridsquareListController.FREQUENCY_SYMBOL) {
					// single-partition symbol marked frequency data
					// is an anomalous case that probably doesn't/shouldn't occur.

					coords[4] = (int) row['freq'];
					//coords[5] = array(0 : row["symbol0"]);

					if (coords[4] > this.maxFreq) {
						this.maxFreq = coords[4];
					}

					if (coords[4] < this.minFreq) {
						this.minFreq = coords[4];
					}

					//error_log('freq row = ' . print_r(coords, true));
					this.freqGridSquares[countryCode][] = coords;
					this.haveFrequencyData = true;
				} else {
					coords[4] = [0 : ((int) row['freq']) > 0 ? 1 : 0];
					coords[5] = [0 : row["symbol0"]];

					//error_log('mark row = ' . print_r(coords, true));
					this.markedGridSquares[countryCode][] = coords;
					this.haveMarkedData = true;
				}

			}

		} else {
			this.haveMarkedData = true;

			if (this.numberOfPartitions > 1) {
				marked = [];

				for (p = 0; p < this.numberOfPartitions; p++) {
					marked[p] = ((int) row["partitioncode{p}"]) > 0 ? 1 : 0;
				}

				coords[4] = marked;
			} else {
				coords[4] = [0 : ((int) row['freq']) > 0 ? 1 : 0];
			}

			this.markedGridSquares[countryCode][] = coords;
		}


		this.parentPageView.resultsCount++;
	}

	/**
	 * @throws Exception
	 */
	add_background_squares() {

		this.gridType = this.controller.gridField; // 'hectad' or 'tetrad'

		switch (this.gridType) {
			case 'hectad':
				this.expectedIERefLength = 3; //e.g S12
				this.expectedGBRefLength = 4; //e.g SD12
				break;
			case 'tetrad':
				this.expectedIERefLength = 4; //e.g S12A
				this.expectedGBRefLength = 5; //e.g SD12A
				break;
			case 'monad':
				this.expectedIERefLength = 5; //e.g S1234
				this.expectedGBRefLength = 6; //e.g SD1234
				break;

			default:
				throw new Exception("Unrecognised background square size '{this.gridType}'");
		}

		if (!empty(this.controller.backgroundSquareList)) {
			foreach (this.controller.backgroundSquareList as hectad:set) {
				if (set) {
					if (strlen(hectad) === this.expectedGBRefLength) {
						// GB
						testCI = substr(hectad, 0, 2);
						if (testCI !== 'WA' && testCI !== 'WV') {
							if ('hectad' === this.gridType) {
								coords = GridRefGB.hectad_to_raw_coords(hectad);
							} else {
								coords = GridRefGB.tetrad_to_raw_coords(hectad);
							}

							countryCode = 'gb';
						} else {
							// channel islands
							if ('hectad' === this.gridType) {
								//error_log('adding background ci hectad: ' . hectad);
								coords = GridRefCI.hectad_to_svgmap_coords(hectad);
							} else {
								coords = GridRefCI.tetrad_to_svgmap_coords(hectad);
							}

							countryCode = 'ci';
						}
					} else {
						if (strlen(hectad) === this.expectedIERefLength) {
							// Ireland
							if ('hectad' === this.gridType) {
								coords = GridRefIE.hectad_to_raw_coords(hectad);
							} else {
								coords = GridRefIE.tetrad_to_raw_coords(hectad);
							}

							countryCode = 'ie';

						} else {
							error_log("unexpected background gridref length, ref is '{hectad}'");
							//assert('!empty(row["hectad"])');
							continue;
						}
					}
					coords[4] = ['b' : 1];

					this.markedGridSquares[countryCode][] = coords;
				}
			}
		}
	}

	/**
	 * @protected
	 */
	initialise_marker_settings() {
		controller = this.controller;

		if (controller.segregateBySymbol) {
			// markers don't have colour (as markers used to show status and colour to distinguish date-class)

			foreach (array_keys(controller.partitionColours) as p) {
				colour = empty(controller.hidePartition[p]) ?
					(controller.partitionColours[p] !== '' ? "#{controller.partitionColours[p]}" : '#FFD700')
					:
					'none';

				// stroke-width must be >=1 or get rendering artifacts
				this.dataLayerCss[p] = "fill: {colour};stroke: {colour}; stroke-width: 1; stroke-opacity: {controller.layerOpacity};fill-opacity:{controller.layerOpacity};";
				//this.dataLayerCss[p] = "fill: {colour};stroke: {colour}; stroke-width: 1; stroke-opacity: {controller.partitionOpacities[p]};fill-opacity:{controller.partitionOpacities[p]};";
			}

			foreach (array_keys(controller.statusMarkerStyle) as p) {
				if (controller.statusMarkerStyle[p]) {
					this.dataLayerMarkers[p] = controller.statusMarkerStyle[p];
				}
			}

			for(i = 0; i < controller.numberOfDatasets; i++) {
				this.dataLayerMarkers[i] = controller.datasetMarkerStyle[i];
				//error_log("data layer marker: {i}:{this.dataLayerMarkers[i]}");
			}

			//error_log("dataLayerMarkers: " . print_r(this.dataLayerMarkers, true));

			this.dataMarkerCss = [];
			_numberOfPartitions = controller.get_expected_number_of_partitions();

			if (_numberOfPartitions === 1) {
				// only set this if markers not used in conjunction with partitioning

				for(i = 0; i < controller.numberOfDatasets; i++) {
					if (controller.datasetColours[i] !== '') {
						colour = "#{controller.datasetColours[i]}";
						this.dataMarkerCss[i] = "fill: {colour};stroke: {colour}; stroke-opacity: {controller.datasetOpacities[i]};fill-opacity:{controller.datasetOpacities[i]};";
					}
				}
			}
		} else {
			foreach (array_keys(controller.partitionColours) as p) {
				colour = empty(controller.hidePartition[p]) ? (controller.partitionColours[p] !== '' ? "#{controller.partitionColours[p]}" : '#FFD700') : 'none';
				this.dataLayerCss[p] = "fill: {colour};stroke: {colour}; stroke-width: 0.2; stroke-opacity: {controller.layerOpacity};fill-opacity:{controller.layerOpacity};";
				//this.dataLayerCss[p] = "fill: {colour};stroke: {colour}; stroke-width: 0.2; stroke-opacity: {controller.partitionOpacities[p]};fill-opacity:{controller.partitionOpacities[p]};";

				this.dataLayerMarkers[p] = controller.partitionMarkerStyle[p];
			}
		}
	}
}
