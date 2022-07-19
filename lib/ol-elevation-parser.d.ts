import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import { PluggableMap } from 'ol';
import TileImage from 'ol/source/TileImage';
import TileWMS from 'ol/source/TileWMS';
import XYZ from 'ol/source/XYZ';
import View from 'ol/View';
import { Coordinate } from 'ol/coordinate';
import Feature from 'ol/Feature';
export * from './tiles';
export default class ElevationParser {
    protected _elevationSamples: IOptions['samples'];
    protected _calcualateZMethod: IOptions['calculateZMethod'];
    protected _elevationSource: IOptions['source'];
    _options: IOptions;
    protected _map: PluggableMap;
    protected _countConnections: number;
    constructor(map: PluggableMap, options: IOptions);
    /**
     *
     * @param coords
     * @returns
     * @public
     */
    requestZValues(originalFeature: Feature<LineString | Point>): Promise<{
        coordsWithZ: number[];
        zValues: number[];
    }>;
    /**
     * Get some sample coords from the geometry while preserving the vertices.
     * Each of these coords whill be used to request getFeatureInfo
     * @protected
     */
    _sampleFeatureCoords(drawFeature: Feature<LineString | Point>): Coordinate[];
    /**
     *
     * @param coordinate
     * @param source
     * @returns
     */
    _getZValuesFromImage(coordinate: Coordinate, source: TileImage | XYZ): Promise<number>;
    /**
     *
     * @param coordinate
     * @param source
     * @param view
     * @returns
     */
    _getZValuesFromWMS(coordinate: Coordinate, source: TileWMS, view: View): Promise<number>;
    /**
     * @protected
     * @param pixel
     * @returns
     */
    _extractValuesFromPixelDEM(pixel: number[]): number;
}
export interface IOptions {
    /**
     * Source to obtain the elevation values.
     * If not provided, the zGraph would be not displayed.
     * You can provide a custom function to call an API or other methods to obtain the data.
     */
    source?: TileWMS | TileImage | XYZ | ((originalFeature: Feature<LineString | Point>, sampledCoords: Coordinate[]) => Promise<Coordinate[]>);
    /**
     * To obtain the elevation values from the diferrents sources, you can:
     * - Calculate the zValues from the rgb pixel data (`TileImage` and `XYZ` source formats need this):
     *     - `Mapbox` preset: (r * 256 * 256 + g * 256 + b) * 0.1 - 10000
     *     - `Terrarium` preset: (r * 256 + g + b / 256) - 32768
     *     - Provided your custom function to calculate elevation from the rgb pixel data
     *
     * - Making requests to the geoserver (`TileWMS` source)
     *      `getFeatureInfo`: make requests to the source url using service [getFeatureInfo](https://docs.geoserver.org/stable/en/user/services/wms/reference.html#getfeatureinfo)
     *
     * By default:
     *  - `TileWMS` format use `'getFeatureInfo'` requests to the source_url to obtain the values.
     *  - `TileImage` and `XYZ` formats are calculated from the pixel data using `'Mapbox'` preset.
     */
    calculateZMethod?: 'getFeatureInfo' | 'Mapbox' | 'Terrarium' | ((r: number, g: number, b: number) => number);
    /**
     * To obtain the elevation values on each distance measurement, multiples samples are taken across the line.
     * This number is used as equally percentage steps across the geom, plus all the vertices positions.
     * - `getFeatureInfo` on TileWMS sources will make one request per sample
     * - `TileImage`and `XYZ` are calculated across each pixel after downloading the required tiles.
     * The bigger the number, the greater the quality of the elevation data, but slower response times and
     * bigger overhead (principally on `getFeatureInfo` method).
     * `50` is the default
     *
     */
    samples?: number;
    /**
     * When calculating the zGraph statistics from the raster dataset, you can choose to ignore specific values with the NoDataValue parameter.
     * These values are considerated as transparency, so probably you want these replaced by 0.
     *
     * `-10000` is the default
     * `false` to disable
     */
    noDataValue?: number | false;
}
//# sourceMappingURL=ol-elevation-parser.d.ts.map