<?php
/*
 * BSBI database project
 * (c) 2014 Botanical Society of the Britain and Ireland
 *
 * @author Tom Humphrey <tom.humphrey@bsbi.org>
 *
 * Map svg rendering functions
 */

//declare(strict_types = 1);

//namespace BSBI\Database\utils\mapping;

//use BSBI\Database\utils\JD;
//use function array_key_exists, array_keys, array_reverse, count;

//use BSBI\Database\utils\SVG;
//use Exception;
//use function array_pad;

/**
 *
 */
abstract class BritishIslesSvgDotMap extends SvgMapComponent
{
	/**
	 * 'H' for Irish vice-counties, '' for Britain/Channel
	 *
	 * @var string
	 */
	protected $vcSuffix;

	protected $country;

	protected $vcMin = 1;
	protected $vcMax;

	public $comment = '';

	public $reversePlottingOrder = false;
	public $noSuperimposition = true;
	public $haveBackgroundLayer = false;

	public $alsoShowMarkersForEmptySeries = true;

	/**
	 *
	 * specialize type from inherited SvgContainer
	 * @var SvgMapContainer
	 */
	protected $parentSvgContainer;

	/**
	 * when superimposition of markers is not allowed
	 * then only the 'top' marker with data is shown
	 * need to know if any layers are hidden as that would then expose the one beneath
	 *
	 * @var array
	 */
	public $hiddenLayerFlags = [];

	/**
	 * base rendering size for symbols (map dots) in km
	 * if this matches the map size then width/height attributes do not need to be repeated
	 * reducing file size
	 *
	 * @var float
	 */
	public $baseSymbolSize = 10;



	/**
	 *
	 * @return BritishIslesSvgGrid
	 */
	public function grid() {
		$grid = new BritishIslesSvgGrid($this->parentSvgContainer, $this->xControlPoint, $this->yControlPoint);

		$grid->lx = $this->lx;
		$grid->ly = $this->ly;
		$grid->width = $this->width;
		$grid->height = $this->height;

		// unclipped dimensions of base map
		$grid->metresHeight = $this->metresHeight;
		$grid->metresWidth = $this->metresWidth;

		$grid->country = $this->country;

		return $grid;
	}

	/**
	 *
	 * @return BritishIslesSvgBoundary
	 */
	public function boundary() {
		$boundary = new BritishIslesSvgBoundary($this->parentSvgContainer, $this->xControlPoint, $this->yControlPoint);

		$boundary->lx = $this->lx;
		$boundary->ly = $this->ly;
		$boundary->width = $this->width;
		$boundary->height = $this->height;

		// unclipped dimensions of base map
		$boundary->metresHeight = $this->metresHeight;
		$boundary->metresWidth = $this->metresWidth;

		return $boundary;
	}


	/**
	 *
	 * @param int $lx
	 * @param int $ly
	 * @param int $hx
	 * @param int $hy
	 * @param string $colour
	 * @deprecated
	 * @return void
	 */
	public function plot_grid_square($lx, $ly, $hx, $hy, $colour) {
		//error_log("hectad lx={$lx} ly={$ly} hx={$hx} hy={$hy}");

		$this->svgString .= SVG::rect(
		    $lx/1000, $ly/1000,
            ($hx-$lx)/1000, ($hy-$ly)/1000,
            ['fill' => $colour]
        );
		//imagefilledrectangle($this->image, $lx/$this->imageScale,($this->metresHeight-$ly)/$this->imageScale,$hx/$this->imageScale, ($this->metresHeight-$hy)/$this->imageScale, $colour);
	}

	public function plot_container_rect() {
		$this->svgString .= SVG::rect(0, 0, (int)($this->metresWidth/1000), (int)($this->metresHeight/1000), ['stroke' => 'none', 'fill' => 'none', 'pointer-events' => 'all']); // was 'all'
	}

	/**
	 * plot single grid square layer, using colours scaled by proportion of total frequency
	 *
	 * @param array $rows array(lx,ly,hx,hy,freq)
	 * @param ColourScheme $colourScheme default null
	 * @throws Exception
	 */
	public function plot_data(array $rows, ColourScheme $colourScheme) {
		$this->plot_container_rect();

		$hx = $this->lx + $this->width;
		$hy = $this->ly + $this->height;

		if (!empty($this->cropMaxY) && $hy > $this->cropMaxY) {
			$hy = $this->cropMaxY;
		}

		for($i = count($rows)-1; $i >= 0; $i--) {

			if (
				($rows[$i][0] / 1000 < $hx) &&
				($rows[$i][1] / 1000 <= $hy) &&
				($rows[$i][2] / 1000 >= $this->lx) &&
				($rows[$i][3] / 1000 >= $this->ly)
			) {

				$this->svgString .= $colourScheme->svg_frequency_marker($rows[$i])
					. ($i%20 === 0 ? "\n":'');
			}
		}
	}

	/**
	 *
	 * @param SvgMapKey $key
	 * @param array $labels
	 * @param array $hiddenLayerFlags
	 * @param int $numberOfLayers
	 * @param int $seriesNumber
	 * @param string $seriesLabel
	 * @param boolean $reverseOrder
	 */
	public static function build_key(SvgMapKey $key, array $labels, array $hiddenLayerFlags, $numberOfLayers, $seriesNumber = 0, $seriesLabel = '', $reverseOrder = false) {
		$serId = $seriesNumber > 0 ? "s{$seriesNumber}" : '';

		// only add a series label if the label is non-empty and
		// is distinct from the consituent layer label
		//
		// Avoid plotting a label for a single series that shares an identical label
		if ($seriesLabel !== '' &&
			(($numberOfLayers > 1) ||
			($numberOfLayers === 1 && $seriesLabel !== $labels[0])
			)
		) {
			$key->add_series_label($seriesLabel);
		}

		//error_log("number of layers {$numberOfLayers}, labels: " . print_r($labels, true));
		//error_log("marker defined: " . print_r(BritishIslesSvgDotMap::$markerDefinedFlag, true));


		if ($reverseOrder) {
			for ($layer = $numberOfLayers - 1; $layer >= 0; $layer--) {
				if (empty($hiddenLayerFlags[$layer]) && array_key_exists("m{$layer}{$serId}", BritishIslesSvgDotMap::$markerDefinedFlag) && array_key_exists($layer, $labels)) {
					$key->add_key_item("m{$layer}{$serId}", $labels[$layer]);
				}
			}
		} else {
			for ($layer = 0; $layer < $numberOfLayers; $layer++) {
				if (empty($hiddenLayerFlags[$layer]) && array_key_exists("m{$layer}{$serId}", BritishIslesSvgDotMap::$markerDefinedFlag) && array_key_exists($layer, $labels)) {
					$key->add_key_item("m{$layer}{$serId}", $labels[$layer]);
				}
			}
		}
	}

	/**
	 *
	 * @param SvgMapKey $key
	 * @param array $labels
	 */
	public static function add_symbol_markers_to_key(SvgMapKey $key, array $labels) {
		//error_log('adding symbol markers to key');

		//error_log('statusUsedHash: ' . print_r(BritishIslesSvgDotMap::$statusUsedHash, true));

		foreach($labels as $symbolCode => $label) {
			//error_log("key testing {$symbolCode}=>{$label}");

			if (array_key_exists("{$symbolCode}", BritishIslesSvgDotMap::$statusUsedHash)) {
				//error_log('yes');
				$key->add_key_item("sk_{$symbolCode}", $label);
			}
		}
	}

	/**
	 *
	 * @var string[]
	 */
	private static $markerDefinedFlag = [];

	/**
	 * plot data layers
	 *
	 * @param array $rows array(lx,ly,hx,hy,freqs[])
	 * @param int $numberOfLayers
	 * @param string[] $layerCss
	 * @param string[] $markers
	 * @param int $seriesNumber
	 */
	public function plot_partitioned_data(array $rows, $numberOfLayers, array $layerCss, array $markers, $seriesNumber = 0) {

		// following revision to number of dateclasses cope with malformed old style map links that have incomplete marker lists
		// by padding the marker style array
		$markers = array_pad($markers, JD::NUMBER_OF_DATECLASSES, SVG::SYMBOL_FILLEDSQUARE);

		// if plotting multiple data series need to keep style ids distinct
		$serId = $seriesNumber > 0 ? "s{$seriesNumber}" : '';

		SVG::initialise_symbols();
		$this->plot_container_rect();

		$hx = $this->lx + $this->width;
		$hy = $this->ly + $this->height;

		if (!empty($this->cropMaxY) && $hy > $this->cropMaxY) {
			$hy = $this->cropMaxY;
		}

		$svgLayers = [];
		$layerNames = [];

		//error_log('numberOfLayers=' . $numberOfLayers);

		for ($layer = 0; $layer < $numberOfLayers; $layer++) {
			$svgLayers[$layer] = '';
			$layerNames[] = $layer;
		}

		if ($this->reversePlottingOrder) {
			$layerNames = array_reverse($layerNames);
		}

		if ($this->haveBackgroundLayer) {
			$layerNames[] = 'b'; // background is always last
			$svgLayers['b'] = ''; // background layer
		}

		//error_log('row count=' . count($rows));

		for($i = count($rows)-1; $i >= 0; $i--) {
			$row = $rows[$i];

			if (
			($row[0] / 1000 < $hx) &&
			($row[1] / 1000 <= $hy) &&
			($row[2] / 1000 >= $this->lx) &&
			($row[3] / 1000 >= $this->ly)
			) {
				$freqs = $row[4];

				// layers 0 - number of layers - 1 and 'b' for background
				foreach ($layerNames as $layer) {
					if ($freqs[$layer]) {

						$width = ($row[2] - $row[0]) / 1000;
						$height = ($row[1] - $row[3]) / 1000;

						$svgLayers[$layer] .= SVG::use_definition(
							"m{$layer}{$serId}",
							$row[0] / 1000,
							$row[3] / 1000,
							$width == $this->baseSymbolSize ? '' : (string)$width,
							$height == $this->baseSymbolSize ? '' : (string)$height
						) . ($i%20 === 0 ? "\n":'');

						if ($this->noSuperimposition && empty($this->hiddenLayerFlags[$layer])) {
							break;
						}
					}
				}
			}
		}

		//for ($layer = 0; $layer < $numberOfLayers; $layer++) {
		foreach (array_keys($svgLayers) as $layer) {
			if (!empty($svgLayers[$layer]) || $this->alsoShowMarkersForEmptySeries) {
				$this->svgString .= "\n" . SVG::comment("{$this->country} dot map layer {$layer}{$serId}") . SVG::g($svgLayers[$layer]);

				$this->styleString["datalayer{$layer}{$serId}"] = ['selector' => ".datalayer{$layer}{$serId}", 'declaration' => $layerCss[$layer]];

				$this->definitionsString["m{$layer}{$serId}"] = SVG::symbol(
					(SVG::$symbols[$markers[$layer]])(
						$this->baseSymbolSize,
						"datalayer{$layer}{$serId}",
						SVG::$avoidCSSClasses ? $layerCss[$layer] : ''
					),
					$this->baseSymbolSize,
					$this->baseSymbolSize,
					['id' => "m{$layer}{$serId}"]
				);

				BritishIslesSvgDotMap::$markerDefinedFlag["m{$layer}{$serId}"] = true;
			}
		}
	}

	private static $statusUsedHash = [];

	/**
	 * plot data layers with status shown by marker style
	 *
	 * @param array $rows array(lx,ly,hx,hy,freqs[])
	 * @param int $numberOfLayers
	 * @param string[] $layerCss provides the colour for the layer
	 * @param string[] $markers provides the symbol markers (key (symbol code)=>symbol name)
	 * @param string[] $markerCss applies if marker css overrides layer css (depends on whether the symbol has an independent colour etc)
	 * @param int $seriesNumber
	 */
	public function plot_partitioned_data_with_symbols(array $rows, $numberOfLayers, array $layerCss, array $markers, array $markerCss = [], $seriesNumber = 0) {
		$serId = $seriesNumber > 0 ? "s{$seriesNumber}" : '';

		SVG::initialise_symbols();
		$this->plot_container_rect();

		$hx = $this->lx + $this->width;
		$hy = $this->ly + $this->height;

		if (!empty($this->cropMaxY) && $hy > $this->cropMaxY) {
			$hy = $this->cropMaxY;
		}

		$svgLayers = [];
		$layerNames = [];

		for ($layer = 0; $layer < $numberOfLayers; $layer++) {
			$svgLayers[$layer] = '';
			$layerNames[] = $layer;
		}

		if ($this->reversePlottingOrder) {
			$layerNames = array_reverse($layerNames);
		}

		if ($this->haveBackgroundLayer) {
			$layerNames[] = 'b'; // background is always last
			$svgLayers['b'] = ''; // background layer
		}

		for($i = count($rows)-1; $i >= 0; $i--) {
			$row = $rows[$i];

			//error_log(__LINE__ . 'brit is maps row (plot_partitioned_data_with_symbols) ' . print_r($row, true));

			if (
				($row[0] / 1000 < $hx) &&
				($row[1] / 1000 <= $hy) &&
				($row[2] / 1000 >= $this->lx) &&
				($row[3] / 1000 >= $this->ly)
			) {
				$freqs = $row[4];
				$symbols = $row[5];

				// layers 0 - number of layers - 1 and 'b' for background
				foreach ($layerNames as $layer) {
					if ($freqs[$layer]) {

						$width = ($row[2] - $row[0]) / 1000;
						$height = ($row[1] - $row[3]) / 1000;

						$svgLayers[$layer] .= SVG::use_definition(
							"m{$layer}_{$symbols[$layer]}{$serId}",
							$row[0] / 1000,
							$row[3] / 1000,
							$width == $this->baseSymbolSize ? '' : $width,
							$height == $this->baseSymbolSize ? '' : $height
						) . ($i%20 === 0 ? "\n":'');

						BritishIslesSvgDotMap::$statusUsedHash[$symbols[$layer]] = true; // note that this symbol has been used so needs to appear on the key

						if ($this->noSuperimposition && empty($this->hiddenLayerFlags[$layer])) {
							break;
						}
					}
				}
			}
		}

		foreach (array_keys($svgLayers) as $layer) {
			if (!empty($svgLayers[$layer])) {
				$this->svgString .= "\n" . SVG::comment("{$this->country} dot map layer {$layer} {$serId}") . SVG::g($svgLayers[$layer]);

				$this->styleString["datalayer{$layer}{$serId}"] = ['selector' => ".datalayer{$layer}{$serId}", 'declaration' => $layerCss[$layer]];

				foreach(array_keys($markers) as $symbolCode) {
					if (empty($this->definitionsString["m{$layer}_{$symbolCode}{$serId}"])) {
						$this->definitionsString["m{$layer}_{$symbolCode}{$serId}"] =
							SVG::symbol(
								(SVG::$symbols[$markers[$symbolCode]])(
									$this->baseSymbolSize,
									"datalayer{$layer}{$serId}",
									$layerCss[$layer] . (empty($markerCss[$symbolCode]) ? '' : $markerCss[$symbolCode])
								),
								$this->baseSymbolSize,
								$this->baseSymbolSize,
								['id' => "m{$layer}_{$symbolCode}{$serId}"]
							);
						//error_log("css {$symbolCode} => {$markerCss[$symbolCode]}");
						//error_log("def string: 'm{$layer}_{$symbolCode}{$serId}' => {$this->definitionsString["m{$layer}_{$symbolCode}{$serId}"]}");
					}
				}

				// add a plain colour marker for the key
				if (empty($this->definitionsString["m{$layer}{$serId}"])) {
					$this->definitionsString["m{$layer}{$serId}"] =
						SVG::symbol(
							(SVG::$symbols[SVG::SYMBOL_FILLEDSQUARE])(
								$this->baseSymbolSize,
								"datalayer{$layer}{$serId}",
								$layerCss[$layer]
							),
							$this->baseSymbolSize,
							$this->baseSymbolSize,
							['id' => "m{$layer}{$serId}"]
						);

					// markerDefinedFlag is used for key plotting
					// so should match the layer colour marker rather than the layer_statusCode combination
					BritishIslesSvgDotMap::$markerDefinedFlag["m{$layer}{$serId}"] = true;
				}
			}
		}

		// add status markers to the key
		foreach(array_keys($markers) as $symbolCode) {
			if (empty($this->definitionsString["sk_{$symbolCode}"])) {
				$css = (count($svgLayers) === 1) ? ($layerCss[$layer]  . (empty($markerCss[$symbolCode]) ? '' : $markerCss[$symbolCode])) : SVG::$defaultMarkerCss;

				//error_log("css = {$css}");

				$this->definitionsString["sk_{$symbolCode}"] =
					SVG::symbol(
						(SVG::$symbols[$markers[$symbolCode]])(
							$this->baseSymbolSize,
							"",
							$css
						),
						$this->baseSymbolSize,
						$this->baseSymbolSize,
						['id' => "sk_{$symbolCode}"]
					);
				//BritishIslesSvgDotMap::$markerDefinedFlag["sk_{$symbolCode}"] = true;
			} else {
				break;
			}
		}
	}
}
