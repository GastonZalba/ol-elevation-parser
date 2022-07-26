import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import Control, { Options as ControlOptions } from 'ol/control/Control';
import { PluggableMap } from 'ol';
import TileImage from 'ol/source/TileImage';
import TileWMS from 'ol/source/TileWMS';
import XYZ from 'ol/source/XYZ';
import View from 'ol/View';
import { Coordinate } from 'ol/coordinate';
import Feature from 'ol/Feature';
import ReadFromImage from './readFromImage';
/**
 * @extends {ol/control/Control~Control}
 * @fires change:samples
 * @fires change:source
 * @fires change:calculateZMethod
 * @param opt_options
 */
export default class ElevationParser extends Control {
    protected _options: IOptions;
    protected _map: PluggableMap;
    protected _countConnections: number;
    protected _readFromImage: ReadFromImage;
    protected _initialized: boolean;
    constructor(options: IOptions);
    /**
     * @public
     * @param source
     */
    setSource(source: IOptions['source']): void;
    /**
     * @public
     * @param samples
     */
    setSamples(samples: IOptions['samples']): void;
    /**
     * @public
     * @param sampleSizeArea
     */
    setSampleSizeArea(sampleSizeArea: IOptions['sampleSizeArea']): void;
    /**
     * @public
     * @param calculateZMethod
     */
    setCalculateZMethod(calculateZMethod: IOptions['calculateZMethod']): void;
    /**
     * @public
     * @param noDataValue
     */
    setNoDataValue(noDataValue: IOptions['noDataValue']): void;
    /**
     *
     * @param originalFeature
     * @returns
     * @public
     */
    requestZValues(originalFeature: Feature<LineString | Point | Polygon>): Promise<IRequestZValues>;
    /**
     *
     * @param coords
     * @returns
     * @private
     */
    _getZFromSampledCoords: (coords: Coordinate[]) => Promise<Coordinate[]>;
    /**
     * This is trigged once
     * @protected
     */
    _init(): void;
    /**
     * @protected
     */
    _addPropertyEvents(): void;
    /**
     * Get some sample coords from the geometry while preserving the vertices.
     *
     * @param feature
     * @returns
     * @protected
     */
    _sampleFeatureCoords(feature: Feature<LineString | Point | Polygon>): ISampledCoords;
    /**
     *
     * @param coordinate
     * @returns
     */
    _getZValuesFromImage(coordinate: Coordinate): Promise<number>;
    /**
     *
     * @param coordinate
     * @param source
     * @param view
     * @returns
     */
    _getZValuesFromWMS(coordinate: Coordinate, source: TileWMS, view: View): Promise<number>;
}
/**
 * @private
 */
interface ISampledCoords {
    sampledCoords: IElevationCoords;
    gridPolygons?: Feature<Polygon>[];
}
/**
 * @public
 */
export interface IRequestZValues extends IElevationCoords {
    /**
     * Sampled Polygons
     */
    gridPolygons: Feature<Polygon>[];
}
/**
 * @public
 */
export interface IElevationCoords {
    /**
     * Sampled coordinates from LineStrings, Point coordinates,
     * or sampled coordinates from Polygons, obtained by subdividing the area in multiples squares and getting each center point.
     */
    mainCoords: Coordinate[];
    /**
     * Contour coordinates from Polygons features.
     */
    contourCoords?: Coordinate[];
}
/**
 * @public
 */
export interface IOptions extends Omit<ControlOptions, 'target'> {
    /**
     * Source to obtain the elevation values.
     * If not provided, the zGraph would be not displayed.
     * You can provide a custom function to call an API or other methods to obtain the data.
     */
    source?: TileWMS | TileImage | XYZ | ((originalFeature: Feature<LineString | Point | Polygon>, sampledCoords: IElevationCoords) => Promise<IElevationCoords>);
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
     * To obtain the elevation values on each volume measurement, multiples samples are taken across the polygon.
     * Value in meters
     * The bigger the number, the greater the quality of the measurement, but slower response times and
     * bigger overhead (principally on `getFeatureInfo` method).
     * `'auto'` is the default. This use 0.5 on small measurements, and 10 in biggers ones
     */
    sampleSizeArea?: number | 'auto';
    /**
     * When calculating the zGraph statistics from the raster dataset, you can choose to ignore specific values with the NoDataValue parameter.
     * These values are considerated as transparency, so probably you want these replaced by 0.
     *
     * `-10000` is the default
     * `false` to disable
     */
    noDataValue?: number | false;
    /**
     * console.log to help debug the code
     * `false` is the default
     */
    verbose?: boolean;
}
export {};
//# sourceMappingURL=ol-elevation-parser.d.ts.map