<?php
/**
 * Map svg rendering functions
 *
 * @author Tom Humphrey <tom.humphrey@bsbi.org>
 */



/**
 * Generic container for svg map components,
 * where a component is a map fragment or a key block
 *
 */
class SvgContainer
{
	/**
	 * [	object => SvgMapComponent,
	 * 		x => x
	 * 		y => y
	 * 		r => r
	 * ]
	 *
	 * @var [][]
	 */
	protected $components = [];

	/**
	 *
	 * @var float
	 */
	public $width;

	/**
	 *
	 * @var float
	 */
	public $height;

	/**
	 * x-origin of the viewport
	 *
	 * @var float
	 */
	public $lx = 0;

	/**
	 * y-origin of the viewport
	 *
	 * @var float
	 */
	public $ly = 0;

	/**
	 * hexadecimal colour or 'none'
	 *
	 * @var string
	 */
	public $backgroundColour = 'none';

	/**
	 * optional xml comment written to the file before output of this container
	 *
	 * @var string
	 */
	public $fileComment = '';

	/**
	 *
	 * @var array array of svg definition strings
	 */
	protected $defs = [];

	/**
	 *
	 * @var string
	 */
	public $containerId;

	/**
	 * @var bool
	 */
	public $noClip = false;

	/**
	 * this is set to true for titles and captions, but currently is never used when rendering the layout
	 *
	 * @var bool
	 */
	public $centeredHorizontally = false;


	public function get_css() {
		$styles = [];

		foreach ($this->components as &$component) {
			$styles = array_merge($styles, $component['object']->styleString);
		}

		$cssString = '';
		foreach ($styles as $dfn) {
			$cssString .= "\n{$dfn['selector']} {{$dfn['declaration']};}";
		}

		return $cssString;
	}

	public function get_defs() {
		foreach ($this->components as &$component) {
			$this->defs = array_merge($this->defs, $component['object']->definitionsString);
		}

		return implode("\n", $this->defs);
	}

	public function add_def($definitionString) {
		$this->defs[] = $definitionString;
	}

	/**
	 *
	 * @param SvgMapComponent $component
	 * @param float $x
	 * @param float $y
	 * @param float $rotation
	 */
	public function add_component(SvgMapComponent $component, $x, $y, $rotation = 0.0) {
		$this->components[$component->componentId ?: count($this->components)] = ['object' =>$component, 'x'=>$x, 'y'=>$y, 'r'=>$rotation];

		if ($this->width < $component->width) {
			$this->width = $component->width;
		}

		if ($this->height < $component->height) {
			$this->height = $component->height;
		}
	}

	/**
	 * @return string
	 */
	public function get_content() {
		if (!empty($this->fileComment)) {
			$svgScript = SVG::comment($this->fileComment);
		} else {
			$svgScript = "\n";
		}

		foreach ($this->components as ['object' => $object, 'x' => $x, 'y' => $y, 'r' => $rotation]) {
			/** @var SVGMapComponent $object */

			if (!empty($object->comment)) {
				$svgScript .= SVG::comment($object->comment);
			}

			$xTranslation = $x;
			$yTranslation = $y; //($component['object']->height) + $component['y'];

			if ($rotation != 0 ) {
				$svgScript .= SVG::g(
					$object->render_image(),
					['transform' => "translate({$xTranslation} {$yTranslation}) scale(1, 1) rotate({$rotation} {$object->xControlPoint} {$object->yControlPoint})"]
				);
			} else {
				$svgScript .= SVG::g(
					$object->render_image(),
					['transform' => "translate({$xTranslation} {$yTranslation}) scale(1, 1)"]
				);
			}
		}

		return $svgScript;
	}
}
