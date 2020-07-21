// BSBI database project
// (c) 2014,2020 Botanical Society of the Britain and Ireland
//
// @author Tom Humphrey <tom.humphrey@bsbi.org>
//
// Map svg rendering functions

import {SvgMapComponent} from "./SvgMapComponent";
import {SvgMapContainer} from "../svgmap/SvgMapContainer";
import {ColourScheme} from "./colourscheme_foo/ColourScheme";
import {BritishIslesSvgGrid} from "./BritishIslesSvgGrid";
import {SVG} from "./SVG";

export class BritishIslesSvgDotMap extends SvgMapComponent {

  /**
   * 'H' for Irish vice-counties, '' for Britain/Channel Islands
   *
   * @type {string}
   */
  vcSuffix;

  /**
   * @type {string}
   */
  country;

  /**
   *
   * @type {number}
   */
  vcMin = 1;

  /**
   *
   * @type {number}
   */
  vcMax;

  /**
   *
   * @type {string}
   */
  comment = '';

  /**
   * specialize type from inherited SvgContainer
   *
   * @type {SvgMapContainer}
   */
  parentSvgContainer;

  /**
   * base rendering size for symbols (map dots) in km
   * if this matches the map size then width/height attributes do not need to be repeated
   * reducing file size
   *
   * @type {number}
   */
  baseSymbolSize = 10.0;

  /**
   *
   * @type {boolean}
   */
  reversePlottingOrder = false;

  /**
   *
   * @type {boolean}
   */
  noSuperimposition = true;

  /**
   *
   * @type {boolean}
   */
  haveBackgroundLayer = false;

  /**
   *
   * @type {boolean}
   */
  alsoShowMarkersForEmptySeries = true;

  /**
   * when superimposition of markers is not allowed
   * then only the 'top' marker with data is shown
   * need to know if any layers are hidden as that would then expose the one beneath
   *
   * @type {[]}
   */
  hiddenLayerFlags = [];

  /**
   *
   * @returns {BritishIslesSvgGrid}
   */
  grid() {
    let grid = new BritishIslesSvgGrid(this.parentSvgContainer, this.xControlPoint, this.yControlPoint);
    grid.lx = this.lx;
    grid.ly = this.ly;
    grid.width = this.width;
    grid.height = this.height;

    // un-clipped dimensions of base map
    grid.metresHeight = this.metresHeight;
    grid.metresWidth = this.metresWidth;

    grid.country = this.country;

    return grid;
  }

  /**
   *
   * @returns {BritishIslesSvgBoundary}
   */
  boundary() {
    let boundary = new BritishIslesSvgBoundary(this.parentSvgContainer, this.xControlPoint, this.yControlPoint);
    boundary.lx = this.lx;
    boundary.ly = this.ly;
    boundary.width = this.width;
    boundary.height = this.height;

    //unclipped dimensions of base map
    boundary.metresHeight = this.metresHeight;
    boundary.metresWidth = this.metresWidth;
    return boundary;
  }

  /**
   *
   * @param {number} lx
   * @param {number} ly
   * @param {number} hx
   * @param {number} hy
   * @param {string} colour
   *
   * @deprecated
   * @return void
   */
  plot_grid_square(lx, ly, hx, hy, colour) {
    this.svgString += SVG.rect(lx / 1000, ly / 1000, (hx - lx) / 1000, (hy - ly) / 1000, {
      fill: colour
    });
  }

  plot_container_rect() {
    this.svgString += SVG.rect(0, 0, +(this.metresWidth / 1000), +(this.metresHeight / 1000), {
      stroke: "none",
      fill: "none",
      "pointer-events": "all"
    });
  }

  /**
   * plot single grid square layer, using colours scaled by proportion of total frequency
   *
   * @param {Array.<[number, number, number, number, number]>} rows array(lx,ly,hx,hy,freq)
   * @param {ColourScheme} colourScheme default null
   */
  plot_data(rows, colourScheme) {
    this.plot_container_rect();
    let hx = this.lx + this.width;
    let hy = this.ly + this.height;

    if (!!this.cropMaxY && hy > this.cropMaxY) {
      hy = this.cropMaxY;
    }

    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i][0] / 1000 < hx && rows[i][1] / 1000 <= hy && rows[i][2] / 1000 >= this.lx && rows[i][3] / 1000 >= this.ly) {
        this.svgString += colourScheme.svg_frequency_marker(rows[i]) + (i % 20 === 0 ? "\n" : "");
      }
    }
  }

  /**
   *
   * @param {SvgMapKey} key
   * @param {string[]} labels
   * @param {boolean[]} hiddenLayerFlags
   * @param {number} numberOfLayers
   * @param {number} seriesNumber
   * @param {string} seriesLabel
   * @param {boolean} reverseOrder
   */
  static build_key(key, labels, hiddenLayerFlags, numberOfLayers, seriesNumber = 0, seriesLabel = "", reverseOrder = false) {
    let serId = seriesNumber > 0 ? `s${seriesNumber}` : "";
    //only add a series label if the label is non-empty and
    //is distinct from the constituent layer label

    //Avoid plotting a label for a single series that shares an identical label
    if (seriesLabel !== "" && (numberOfLayers > 1 || numberOfLayers === 1 && seriesLabel !== labels[0])) {
      key.add_series_label(seriesLabel);
    }

    if (reverseOrder) {
      for (let layer = numberOfLayers - 1; layer >= 0; layer--) {
        if (!hiddenLayerFlags[layer] && `m${layer}${serId}` in BritishIslesSvgDotMap.markerDefinedFlag && layer in labels) {
          key.add_key_item(`m${layer}${serId}`, labels[layer]);
        }
      }
    } else {
      for (let layer = 0; layer < numberOfLayers; layer++) {
        if (!hiddenLayerFlags[layer] && `m${layer}${serId}` in BritishIslesSvgDotMap.markerDefinedFlag && layer in labels) {
          key.add_key_item(`m${layer}${serId}`, labels[layer]);
        }
      }
    }
  }

  /**
   *
   * @param {SvgMapKey} key
   * @param {string[]} labels
   */
  static add_symbol_markers_to_key(key, labels) {
    for (let symbolCode in labels) {
      let label = labels[symbolCode];

      if (`${symbolCode}` in BritishIslesSvgDotMap.statusUsedHash) {
          key.add_key_item(`sk_${symbolCode}`, label);
      }
    }
  }

  /**
   *
   * @type {{string, boolean}}
   */
  static markerDefinedFlag = {};

  /**
   *
   * @param {Array.<[number, number, number, number, number[]]>} rows array(lx,ly,hx,hy,freqs[])
   * @param {number} numberOfLayers
   * @param {string[]} layerCss
   * @param {string[]} markers
   * @param {number} seriesNumber
   */
  plot_partitioned_data(rows, numberOfLayers, layerCss, markers, seriesNumber = 0) {
    //if plotting multiple data series need to keep style ids distinct
    let serId = seriesNumber > 0 ? `s${seriesNumber}` : "";
    SVG.initialise_symbols();
    this.plot_container_rect();
    let hx = this.lx + this.width;
    let hy = this.ly + this.height;

    if (!!this.cropMaxY && hy > this.cropMaxY) {
      hy = this.cropMaxY;
    }

    let svgLayers = [];
    let layerNames = [];

    for (let layer = 0; layer < numberOfLayers; layer++) {
      svgLayers[layer] = "";
      layerNames.push(layer);
    }

    if (this.reversePlottingOrder) {
      layerNames = layerNames.reverse();
    }

    // //background layer *NOT SUPPORTED FOR JS PLOTTING*
    // if (this.haveBackgroundLayer) {
    //     layerNames.push("b"); //background is always last
    //     svgLayers.b = "";
    // }

    for (let i = rows.length - 1; i >= 0; i--) {
      let row = rows[i];

      if (row[0] / 1000 < hx && row[1] / 1000 <= hy && row[2] / 1000 >= this.lx && row[3] / 1000 >= this.ly) {
          let freqs = row[4];

          //layers 0 - number of layers - 1
          for (let layer of layerNames) {
            if (freqs[layer]) {
              let width = (row[2] - row[0]) / 1000;
              let height = (row[1] - row[3]) / 1000;

              svgLayers[layer] += SVG.use_definition(
                  `m${layer}${serId}`,
                  row[0] / 1000,
                  row[3] / 1000,
                  width === this.baseSymbolSize ? "" : String(width),
                  height === this.baseSymbolSize ? "" : String(height)
              ) + (i % 20 === 0 ? "\n" : "");

              if (this.noSuperimposition && !this.hiddenLayerFlags[layer]) {
                break;
              }
            }
          }
        }
    }

    for (let layer of Object.keys(svgLayers)) {
      if (!!svgLayers[layer] || this.alsoShowMarkersForEmptySeries) {
        this.svgString += "\n" + SVG.comment(`${this.country} dot map layer ${layer}${serId}`) + SVG.g(svgLayers[layer]);
        this.styleString[`datalayer${layer}${serId}`] = {
          selector: `.datalayer${layer}${serId}`,
          declaration: layerCss[layer]
        };
        this.definitionsString[`m${layer}${serId}`] = SVG.symbol(
            SVG.symbols[markers[layer]](
                this.baseSymbolSize,
                `datalayer${layer}${serId}`,
                SVG.avoidCSSClasses ? layerCss[layer] : ""
            ),
            this.baseSymbolSize,
            this.baseSymbolSize,
            {id: `m${layer}${serId}`}
        );

        BritishIslesSvgDotMap.markerDefinedFlag[`m${layer}${serId}`] = true;
      }
    }
  }

  static statusUsedHash = {};

  /**
   * plot data layers with status shown by marker style
   *
   * @param {[]} rows
   * @param {number} numberOfLayers
   * @param {string[]} layerCss
   * @param {string[]} markers
   * @param {string[]} markerCss
   * @param seriesNumber
   */
  plot_partitioned_data_with_symbols(rows, numberOfLayers, layerCss, markers, markerCss, seriesNumber = 0) {
    let serId = seriesNumber > 0 ? `s${seriesNumber}` : "";
    SVG.initialise_symbols();
    this.plot_container_rect();
    let hx = this.lx + this.width;
    let hy = this.ly + this.height;

    if (!!this.cropMaxY && hy > this.cropMaxY) {
      hy = this.cropMaxY;
    }

    let svgLayers = [];
    let layerNames = [];

    for (let layer = 0; layer < numberOfLayers; layer++) {
      svgLayers[layer] = "";
      layerNames.push(layer);
    }

    if (this.reversePlottingOrder) {
      layerNames = layerNames.reverse();
    }

    // //background is always last *Javascript version doesn't support background layer*
    // if (this.haveBackgroundLayer) {
    //     //background layer
    //     layerNames.push("b");
    //     svgLayers.b = "";
    // }

    for (let i = rows.length - 1; i >= 0; i--) {
      let row = rows[i];

      if (row[0] / 1000 < hx && row[1] / 1000 <= hy && row[2] / 1000 >= this.lx && row[3] / 1000 >= this.ly) {
          let freqs = row[4];
          let symbols = row[5];

          //layers 0 - number of layers - 1
          for (let layer of layerNames) {
            if (freqs[layer]) {
                // note that this symbol has been used so needs to appear on the key
                let width = (row[2] - row[0]) / 1000;
                let height = (row[1] - row[3]) / 1000;

                svgLayers[layer] += SVG.use_definition(
                    `m${layer}_${symbols[layer]}${serId}`,
                    row[0] / 1000,
                    row[3] / 1000,
                    width === this.baseSymbolSize ? "" : width,
                    height === this.baseSymbolSize ? "" : height
                ) + (i % 20 === 0 ? "\n" : "");

                BritishIslesSvgDotMap.statusUsedHash[symbols[layer]] = true;

                if (this.noSuperimposition && !this.hiddenLayerFlags[layer]) {
                  break;
                }
              }
          }
        }
    }

    let layer; // used outside the loop scope
    for (layer of Object.keys(svgLayers)) {
      if (!!svgLayers[layer]) {
          //add a plain colour marker for the key
          this.svgString += "\n" + SVG.comment(`${this.country} dot map layer ${layer} ${serId}`) +
              SVG.g(svgLayers[layer]);
          this.styleString[`datalayer${layer}${serId}`] = {
            selector: `.datalayer${layer}${serId}`,
            declaration: layerCss[layer]
          };

          for (let symbolCode of Object.keys(markers)) {
            if (!this.definitionsString[`m${layer}_${symbolCode}${serId}`]) {
                this.definitionsString[`m${layer}_${symbolCode}${serId}`] = SVG.symbol(
                    SVG.symbols[markers[symbolCode]](
                        this.baseSymbolSize,
                        `datalayer${layer}${serId}`,
                        layerCss[layer] + (!markerCss[symbolCode] ? "" : markerCss[symbolCode])
                    ),
                    this.baseSymbolSize,
                    this.baseSymbolSize,
                    {id: `m${layer}_${symbolCode}${serId}`}
                );
              }
          }

          if (!this.definitionsString[`m${layer}${serId}`]) {
              this.definitionsString[`m${layer}${serId}`] = SVG.symbol(
                  SVG.symbols[SVG.SYMBOL_FILLEDSQUARE](
                      this.baseSymbolSize,
                      `datalayer${layer}${serId}`,
                      layerCss[layer]
                  ),
                  this.baseSymbolSize,
                  this.baseSymbolSize,
                  {id: `m${layer}${serId}`}
              );

              //markerDefinedFlag is used for key plotting
              //so should match the layer colour marker rather than the layer_statusCode combination
              BritishIslesSvgDotMap.markerDefinedFlag[`m${layer}${serId}`] = true;
            }
        }
    }

    //add status markers to the key
    for (let symbolCode of Object.keys(markers)) {
      if (!this.definitionsString[`sk_${symbolCode}`]) {
          let css = svgLayers.length === 1 ?
              layerCss[layer] + (!markerCss[symbolCode] ? "" : markerCss[symbolCode])
              :
              SVG.defaultMarkerCss;

          this.definitionsString[`sk_${symbolCode}`] =
              SVG.symbol(
                  SVG.symbols[markers[symbolCode]](
                      this.baseSymbolSize,
                      "",
                      css
                  ),
                  this.baseSymbolSize,
                  this.baseSymbolSize,
                  {id: `sk_${symbolCode}`}
              );
        } else {
          break;
        }
    }
  }
}
