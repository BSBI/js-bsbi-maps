<?php
/**
 * Map svg rendering functions
 *
 * @author Tom Humphrey <tom.humphrey@bsbi.org>
 */

/**
 * Generic container for svg map components,
 * where a component is a map fragment, grid or a key block etc.
 *
 */
class SvgMapContainer extends SvgContainer
{

	/**
	* base rendering size for symbols (map dots) in km
	* if this matches the map size then width/height attributes do not need to be repeated
	* reducing file size
	*
	* @var float
	*/
	public $baseSymbolSize = 10;

	public $boxedInSeaColour = 'none';

	public $plotMapFrames = false;

	public $internalBottomPadding = 20; //20;

	private $niBoxInsetWidth = 230;

	/**
	 *
	 * @param SvgMapComponent $mapComponent
	 * @param float $x
	 * @param float $y
	 * @param float $rotation (default 0)
	 * @param int $internalBottomPadding default 0 (extra padding to add below map)
	 */
	public function add_component(SvgMapComponent $mapComponent, $x, $y, $rotation = 0.0, $internalBottomPadding = 0) {
		$mapComponent->baseSymbolSize = $this->baseSymbolSize;

		$mapComponent->height += $internalBottomPadding;

		$this->components[$mapComponent->componentId ?: count($this->components)] = ['object' =>$mapComponent, 'x'=>$x / 1000, 'y'=>($y / 1000), 'r'=>$rotation];
	}

	public function expand_width(&$set, $scaleFactor, $xShift) {
		$expansionNeeded = (($xShift * 2) + ($set['width'] * $scaleFactor)) / ($set['width'] * $scaleFactor);

		$scaledShift = ($this->width * $expansionNeeded) - $this->width;

		$this->width *= $expansionNeeded;

		$set['width'] = ($set['width'] * $scaleFactor) + ($xShift * 2);

		foreach($this->components as &$component) {
			$component['x'] += $scaledShift/2;
		}

		$this->niBoxInsetWidth += $scaledShift/2;
	}

	/**
	 *
	 * @return string svg content
	 */
	public function get_content() {
		$svgScript = SVG::comment("BSBI DDB mapping\n- co-ordinates (in km) use the GB or IE ordnance survey grid. The svg file origin is transformed to the SW corner (reversing the conventional svg Y-axis).");

		if ($this->plotMapFrames) {
			if (array_key_exists(NorthernIslesSvgDotMap::COMPONENT_LABEL, $this->components)) {
				// have inset northern isles box that needs to be framed

				$ni = $this->components[NorthernIslesSvgDotMap::COMPONENT_LABEL]['object'];

				$niWidth = $this->niBoxInsetWidth;
				$niHeight = ($ni->height - $ni->ly) + 30;

				$seaColour = ($this->boxedInSeaColour === 'none' || $this->boxedInSeaColour === '') ? 'none' : "#{$this->boxedInSeaColour}";

				$frameStrokeWidth = (string)(0.25/0.0784); // was '1' (but that is two narrow for Harrap printing

				if (!SVG::$svgTiny) {
					$svgScript .= SVG::path('M0 0H' . ($this->width - $niWidth) . 'V' . $niHeight . 'h' .
						$niWidth . 'v' . ($this->height - $niHeight) . 'h-' . $this->width . 'Z'
						,
						['fill' => $seaColour, 'stroke' => 'black', 'stroke-width' => $frameStrokeWidth, 'id' => 'gbiemapframe']);
				} else {
					$svgScript .= SVG::path('M0 0L' . ($this->width - $niWidth) . ' 0L' . ($this->width - $niWidth) . ' ' . $niHeight . 'L' .
						$this->width . ' ' . $niHeight . 'L' . $this->width . ' ' . $this->height . 'L0' . ' ' . $this->height . 'Z'
						,
						['fill' => $seaColour, 'stroke' => 'black', 'stroke-width' => $frameStrokeWidth, 'id' => 'gbiemapframe']);
				}

				if ($ni) {
					$svgScript .= SVG::rect($this->width - ($niWidth - 15), 0, ($niWidth - 15), ($ni->height - $ni->ly) + 15,
						['fill' => $seaColour, 'stroke' => 'black', 'stroke-width' => $frameStrokeWidth, 'id' => 'nimapframe']);
				}
			} else {
				$svgScript .= SVG::rect(0, 0, $this->width, $this->height,
					['fill' => 'none', 'stroke' => 'black', 'stroke-width' => '1', 'id' => 'mapframe']);
			}
		}

		foreach ($this->components as ['object' => $object, 'x' => $x, 'y' => $y, 'r' => $rotation]) {
			/** @var SVGMapComponent $object */

			if (!empty($object->comment)) {
				$svgScript .= SVG::comment($object->comment);
			}

			$xTranslation = $x;
			$yTranslation = ($object->metresHeight / 1000) + $y;

			if ($rotation != 0 ) {
				$attributes = ['transform' => "translate({$xTranslation} {$yTranslation}) scale(1, -1) rotate({$rotation} {$object->xControlPoint} {$object->yControlPoint})"];
			} else {
				// scale used to flip the y axis so that origin is at the bottom
				$attributes = ['transform' => "translate({$xTranslation} {$yTranslation}) scale(1, -1)"];
			}

			if (!empty($object->componentId)) {
				$attributes['id'] = $object->componentId;
			}

			$svgScript .= SVG::g($object->render_image(), $attributes);
		}

		return $svgScript;
	}
}
