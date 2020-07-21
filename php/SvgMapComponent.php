<?php
/**
 * Map svg rendering functions
 *
 * @author Tom Humphrey <tom.humphrey@bsbi.org>
 */

//declare(strict_types = 1);

//namespace BSBI\Database\utils\mapping;

//use function cos, sin;

//use const BSBI\Database\DEG2RAD;
//use BSBI\Database\utils\SVG;

/**
 * A map component is a part of a map (e.g. a map, legend, grid etc.)
 *
 */
class SvgMapComponent
{
	public $xControlPoint = 0; // the points in the image used to locate the image when plotted (typically 0,0=top-left; but e.g. for Ireland use width,0 (top-right) as this point is common with British OS grid

	public $yControlPoint = 0;

	/**
	 * base width (unclipped)
	 *
	 * @var float
	 */
	public $metresWidth;

	/**
	* base height (unclipped)
	*
	* @var float
	*/
	public $metresHeight;

	/**
	 * clip width
	 *
	 * @var float
	 */
	public $width;

	/**
	 * clip height
	 *
	 * @var float
	 */
	public $height;

	/**
	* low x clip area
	*
	* @var float
	*/
	public $lx = 0;

	/**
	 * low y clip area
	 *
	 * @var float
	 */
	public $ly = 0;

	/**
	 *
	 * @var string
	 */
	public $svgString;

	/**
	 *
	 * @var string[]
	 */
	public $styleString = [];

	/**
	 *
	 * @var string[]
	 */
	public $definitionsString = [];

	/**
	 *
	 * @var string
	 */
	public $componentId = '';

	/**
	 *
	 * @var SvgContainer
	 */
	protected $parentSvgContainer;

	public function __construct(SvgContainer $parentSvgContainer, $xControlPoint=0, $yControlPoint=0) {
		$this->xControlPoint = $xControlPoint;
		$this->yControlPoint = $yControlPoint;
		$this->parentSvgContainer = $parentSvgContainer;
	}

	/**
	 * @return string
	 */
	public function render_image() {
		// for more sophisticated components, rendering should be on demand
		// simple components (e.g. Keys may pre-render then just return $image
		return $this->svgString;
	}

	/**
	 * @param $clipId
	 */
	public function clip_by_path($clipId) {
		$this->svgString = "<clipPath id='{$clipId}clippath'>" . SVG::use_definition($clipId, 0, 0) . "</clipPath>" . SVG::g($this->svgString, ['clip-path'=>"url(#{$clipId}clippath)"]);
	}

	/**
	 * @param $clipPathId
	 */
	public function clip_by_preexisting_clippath($clipPathId) {
		$this->svgString = SVG::g($this->svgString, ['clip-path'=>"url(#{$clipPathId})"]);
	}

	/**
	 * @var string[]
	 */
	private static $idToURIMappings = [];

	public static function register_definition_id_mapping($idString, $uriString) {
		SvgMapComponent::$idToURIMappings[$idString] = $uriString;
	}

	public static function seek_uri_for_definition_id(string $idString) {
		return empty(SvgMapComponent::$idToURIMappings[$idString]) ? "#{$idString}" : SvgMapComponent::$idToURIMappings[$idString];
	}

	/**
	 *
	 */
	function destroy() {
	}

	/**
	 *
	 * @param float $degrees
	 * @return float $width
	 */
	public function width_post_rotation($degrees) {
		// only works with clockwise rotation (for anti would need bottom right corner)

		$xtr = ($this->metresWidth/2);

		$ytr = -($this->metresHeight/2);
		$xbl = -($this->metresWidth/2);

		$ybl = ($this->metresHeight/2);

		$radians = -$degrees * DEG2RAD;
		$xtrRot = $xtr*cos($radians) + $ytr*sin($radians);


		$xblRot = $xbl*cos($radians) + $ybl*sin($radians);


		return $xtrRot-$xblRot;
	}
}
