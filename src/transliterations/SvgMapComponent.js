//
//Map svg rendering functions
//
//@author Tom Humphrey <tom.humphrey@bsbi.org>
//
//
//declare(strict_types = 1);
//namespace BSBI\Database\utils\mapping;
//use function cos, sin;
//use const BSBI\Database\DEG2RAD;
//use BSBI\Database\utils\SVG;
//
//
//
//
//

import {SVG} from "./SVG";

const DEG2RAD = Math.PI / 180;

/**
 * A map component is a part of a map (e.g. a map, legend, grid etc.)
 */
export class SvgMapComponent {

  /**
   * the points in the image used to locate the image when plotted (typically 0,0=top-left; but e.g. for Ireland use width,0 (top-right) as this point is common with British OS grid
   *
   * @type {number}
   */
  xControlPoint = 0;

  /**
   *
   * @type {number}
   */
  yControlPoint = 0;

  /**
   * base width (unclipped)
   *
   * @type {number}
   */
  metresWidth;

  /**
   * base height (unclipped)
   *
   * @type {number}
   */
  metresHeight;

  /**
   * clip width
   *
   * @type {number}
   */
  width;

  /**
   * clip height
   *
   * @type {number}
   */
  height;

  /**
   * low x clip area
   *
   * @type {number}
   */
  lx = 0;

  /**
   * low y clip area
   *
   * @type {number}
   */
  ly = 0;

  /**
   * @type {string}
   */
  svgString;

  /**
   *
   * @type {Object.<string, {selector : string, declaration : string}>}
   */
  styleString = {};

  /**
   *
   * @type {string[]}
   */
  definitionsString = [];

  /**
   *
   * @type {string}
   */
  componentId = "";

  /**
   * @type {SvgContainer}
   */
  parentSvgContainer;

  /**
   *
   * @param {SvgContainer} parentSvgContainer
   * @param {number} xControlPoint
   * @param {number} yControlPoint
   */
  constructor(parentSvgContainer, xControlPoint = 0, yControlPoint = 0) {

    this.xControlPoint = xControlPoint;
    this.yControlPoint = yControlPoint;
    this.parentSvgContainer = parentSvgContainer;
  }

  /**
   *
   * @returns {string}
   */
  render_image()
  {
    // for more sophisticated components, rendering should be on demand
    // simple components (e.g. Keys) may pre-render then just return image
    return this.svgString;
  }

  /**
   *
   * @param {string} clipId
   */
  clip_by_path(clipId) {
    this.svgString = `<clipPath id='${clipId}clippath'>` + SVG.use_definition(clipId, 0, 0) + "</clipPath>" + SVG.g(this.svgString, {
      "clip-path": `url(#${clipId}clippath)`
    });
  }

  /**
   *
   * @param {string} clipPathId
   */
  clip_by_preexisting_clippath(clipPathId) {
    this.svgString = SVG.g(this.svgString, {
      "clip-path": `url(#${clipPathId})`
    });
  }

  /**
   *
   *
   * @type {{}}
   */
  static idToURIMappings = [];

  /**
   *
   * @param {string} idString
   * @param {string} uriString
   */
  static register_definition_id_mapping(idString, uriString) {
    SvgMapComponent[SvgMapComponent.idToURIMappings[idString]] = uriString;
  }

  /**
   *
   * @param {string} idString
   * @returns {string}
   */
  static seek_uri_for_definition_id(idString) {
    return !SvgMapComponent[SvgMapComponent.idToURIMappings[idString]] ?
        `#${idString}`
        :
        SvgMapComponent[SvgMapComponent.idToURIMappings[idString]];
  }

  /**
   *
   */
  destroy() {

  }

  /**
   * only works with clockwise rotation (for anti would need bottom right corner)
   *
   * @param {number} degrees
   * @returns {number} width
   */
  width_post_rotation(degrees) {
    const xtr = this.metresWidth / 2;
    const ytr = -(this.metresHeight / 2);
    const xbl = -(this.metresWidth / 2);
    const ybl = this.metresHeight / 2;
    const radians = -degrees * DEG2RAD;
    const xtrRot = xtr * Math.cos(radians) + ytr * Math.sin(radians);
    const xblRot = xbl * Math.cos(radians) + ybl * Math.sin(radians);
    return xtrRot - xblRot;
  }
};
