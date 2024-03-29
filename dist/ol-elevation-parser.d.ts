import LineString from 'ol/geom/LineString.js';
import Point from 'ol/geom/Point.js';
import Polygon from 'ol/geom/Polygon.js';
import Control, { Options as ControlOptions } from 'ol/control/Control.js';
import TileImage from 'ol/source/TileImage.js';
import TileWMS from 'ol/source/TileWMS.js';
import XYZ from 'ol/source/XYZ.js';
import GeoTIFF from 'ol/source/GeoTIFF';
import Feature from 'ol/Feature.js';
import Map from 'ol/Map.js';
import { EventsKey } from 'ol/events.js';
import BaseEvent from 'ol/events/Event.js';
import { CombinedOnSignature, EventTypes, OnSignature } from 'ol/Observable.js';
import { ObjectEvent } from 'ol/Object.js';
import { Types as ObjectEventTypes } from 'ol/ObjectEventType.js';
import ReadFromImage from './readFromImage';
/**
 * @extends {ol/control/Control~Control}
 * @fires change:samples
 * @fires change:sampleSizeArea
 * @fires change:source
 * @fires change:calculateZMethod
 * @fires change:noDataValue
 * @fires change:smooth
 * @fires change:tilesResolution
 * @fires change:bands
 * @param options
 */
export default class ElevationParser extends Control {
    protected _options: Options;
    protected _countConnections: number;
    protected _readFromImage: ReadFromImage;
    protected _rasterSourceIsLoaded: boolean;
    protected _initialized: boolean;
    on: OnSignature<EventTypes | `${GeneralEventTypes}`, BaseEvent, EventsKey> & OnSignature<ObjectEventTypes | ElevationParserEventTypes, ObjectEvent, EventsKey> & CombinedOnSignature<ElevationParserEventTypes | ObjectEventTypes | EventTypes, EventsKey>;
    once: OnSignature<EventTypes | `${GeneralEventTypes}`, BaseEvent, EventsKey> & OnSignature<ObjectEventTypes | ElevationParserEventTypes, ObjectEvent, EventsKey> & CombinedOnSignature<ElevationParserEventTypes | ObjectEventTypes | EventTypes, EventsKey>;
    un: OnSignature<EventTypes, BaseEvent, void> & OnSignature<ObjectEventTypes | ElevationParserEventTypes, ObjectEvent, void> & CombinedOnSignature<ElevationParserEventTypes | ObjectEventTypes | EventTypes | `${GeneralEventTypes}`, void>;
    constructor(options: Options);
    /**
     * Get Feature's elevation values.
     * Use custom options to overwrite the general ones for specific cases
     *
     * @param feature
     * @param customOptions
     * @returns
     * @public
     */
    getElevationValues(feature: Feature<LineString | Point | Polygon>, customOptions?: ElevationValuesIndividualOptions): Promise<IGetElevationValues | Error>;
    /**
     * @public
     * @returns
     */
    getSource(): Options['source'];
    /**
     * @public
     * @param source
     */
    setSource(source: Options['source'], silent?: boolean): void;
    /**
     * @public
     * @returns
     */
    getSamples(): Options['samples'];
    /**
     * @public
     * @param samples
     */
    setSamples(samples: Options['samples'], silent?: boolean): void;
    /**
     * @public
     * @returns
     */
    getSampleSizeArea(): Options['sampleSizeArea'];
    /**
     * @public
     * @param sampleSizeArea
     */
    setSampleSizeArea(sampleSizeArea: Options['sampleSizeArea'], silent: boolean): void;
    /**
     * @public
     * @returns
     */
    getCalculateZMethod(): Options['calculateZMethod'];
    /**
     * @public
     * @param calculateZMethod
     */
    setCalculateZMethod(calculateZMethod: Options['calculateZMethod'], silent?: boolean): void;
    /**
     * @public
     * @returns
     */
    getSmooth(): Options['smooth'];
    /**
     * @public
     * @param smooth
     */
    setSmooth(smooth: Options['smooth'], silent?: boolean): void;
    /**
     * @public
     * @returns
     */
    getNoDataValue(): Options['noDataValue'];
    /**
     * @public
     * @param noDataValue
     */
    setNoDataValue(noDataValue: Options['noDataValue'], silent?: boolean): void;
    /**
     * @public
     * @returns
     */
    getTilesResolution(): Options['tilesResolution'];
    /**
     * @public
     * @param tilesResolution
     */
    setTilesResolution(tilesResolution: Options['tilesResolution'], silent?: boolean): void;
    /**
     * @public
     * @returns
     */
    getBands(): Options['bands'];
    /**
     * @public
     * @param bands
     */
    setBands(bands: Options['bands'], silent?: boolean): void;
    /**
     * @public
     * @returns
     */
    getTimeout(): Options['timeout'];
    /**
     * @public
     * @param timeout
     */
    setTimeout(timeout: Options['timeout'], silent?: boolean): void;
    /**
     * Maximum tile resolution of the image source
     * Only if the source is a raster
     *
     * @public
     * @returns
     */
    getMaxTilesResolution(): number;
    /**
     * Current view resolution
     * Unsupported if the view of a GeoTIFF is used in the map
     *
     * @public
     * @returns
     */
    getCurrentViewResolution(): number;
    /**
     * @public
     * @param map
     * @TODO remove events if map is null
     */
    setMap(map: Map): void;
    /**
     *
     * @param coords
     * @param optOptions To overwrite the general ones
     * @returns
     * @private
     */
    private _getZFromSampledCoords;
    /**
     * This is trigged once
     * @private
     */
    private _init;
    /**
     * @private
     */
    private _addPropertyEvents;
    /**
     * Run on init or every time the source is modified
     * @private
     */
    private _onInitModifySource;
    /**
     * Get some sample coords from the geometry while preserving the vertices.
     *
     * @param feature
     * @param params
     * @returns
     * @private
     */
    private _sampleFeatureCoords;
    /**
     *
     * @param coordinate
     * @param tilesResolution
     * @returns
     * @private
     */
    private _getZValuesFromImage;
    /**
     *
     * @param coordinate
     * @param source
     * @param view
     * @returns
     * @private
     */
    private _getZValuesFromWMS;
}
export declare enum GeneralEventTypes {
    LOAD = "load"
}
/**
 * **_[interface]_**
 * @private
 */
interface ISampledGeom {
    sampledCoords: {
        /**
         * Sampled coordinates from LineStrings, Point coordinates,
         * or sampled coordinates from Polygons, obtained by subdividing the area in multiples squares and getting each center point.
         */
        mainCoords: CoordinatesXY[];
        /**
         * Contour coordinates from Polygons features.
         */
        contourCoords?: CoordinatesXY[];
    };
    gridPolygons?: Feature<Polygon>[];
}
/**
 * **_[type]_**
 * @public
 */
export type ElevationParserEventTypes = 'change:samples' | 'change:sampleSizeArea' | 'change:source' | 'change:calculateZMethod' | 'change:noDataValue' | 'change:smooth' | 'change:bands' | 'change:tilesResolution' | 'change:timeout';
/**
 * **_[interface]_**
 * @public
 */
export interface IGetElevationValues extends IElevationCoords {
    /**
     * Sampled Polygons
     * Useful to to calculate fill and cut values on ovolume measurements
     */
    gridPolygons: Feature<Polygon>[];
}
/**
 * **_[type]_**
 * @public
 */
export type CoordinatesXYZ = [number, number, number];
/**
 * **_[type]_**
 * @public
 */
export type CoordinatesXY = [number, number];
/**
 * **_[interface]_**
 * @public
 */
export interface IElevationCoords {
    /**
     * Sampled coordinates from LineStrings, Point coordinates,
     * or sampled coordinates from Polygons, obtained by subdividing the area in multiples squares and getting each center point.
     */
    mainCoords: CoordinatesXYZ[];
    /**
     * Contour coordinates from Polygons features.
     */
    contourCoords?: CoordinatesXYZ[];
}
/**
 * **_[type]_**
 * @public
 */
export type RasterSources = TileWMS | TileImage | XYZ | GeoTIFF;
/**
 * **_[type]_**
 * @public
 */
export type CustomSourceFn = (originalFeature: Feature<LineString | Point | Polygon>, sampledCoords: ISampledGeom['sampledCoords']) => Promise<IElevationCoords>;
/**
 * **_[interface]_**
 * @public
 */
export interface ElevationValuesIndividualOptions {
    samples?: Options['samples'];
    sampleSizeArea?: Options['sampleSizeArea'];
    tilesResolution?: Options['tilesResolution'];
    smooth?: Options['smooth'];
}
/**
 * **_[interface]_**
 * @public
 */
export interface Options extends Omit<ControlOptions, 'target'> {
    /**
     *
     * Source from which it is obtained the elevation values. If not provided, the zGraph would be not displayed.
     *
     * If a Raster source is used and the option `resolution` is set to `max`, provide the `maxZoom` attribute
     * to allow download the data in the higher resolution available.
     *
     * Also, you can provide a custom function to call an API or other methods to obtain the data.
     *
     */
    source: RasterSources | CustomSourceFn;
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
     * Only used if `calculateZMethod` is not `getFeatureInfo`.
     *
     * This sets the resolution in wich the tiles are downloaded to calculate the z values.
     *
     * If `max`, the tiles will be downloaded using the maximum quality possible, but you
     * have to configure the `maxZoom` attribute of the source to prevent requesting inexisting tiles.
     * Using `max` provides the maximum quality, but the requests are gonna be in higher number and would be slower.
     * Use the method `getMaxTilesResolution` to get the max resolution in a number number.
     *
     * ´current´ uses the current view resolution of the map. If the source is visible in the map,
     * the already downloaded tiles would be used to the calculations so is it's the faster method.
     * Use the method `getCurrentViewResolution` to get the curent view resolution number.
     * Doesn't work if the source is GeoTIFF and the map use its `view`
     *
     * ´current´ is the default
     */
    tilesResolution?: number | 'max' | 'current';
    /**
     * Only used if `calculateZMethod` is not `getFeatureInfo`.
     *
     * Default is 4
     */
    bands?: number;
    /**
     * To obtain the elevation values on each distance measurement, multiples samples are taken across the line.
     * This number is used as equally percentage steps across the geom, plus all the vertices positions.
     * - `getFeatureInfo` on TileWMS sources will make one request per sample
     * - `TileImage`and `XYZ` are calculated across each pixel after downloading the required tiles.
     * The bigger the number, the greater the quality of the elevation data, but slower response times and
     * bigger overhead (principally on `getFeatureInfo` method).
     * This value is used to sample LinesStrings and Polygons contour
     * `50` is the default
     *
     */
    samples?: number | ((length: number) => number);
    /**
     * To obtain the elevation values on a volume measurement, multiples samples are taken across the polygon.
     * The value provided must be in meters. The bigger the number, the greater the quality of the measurement,
     * but slower response times and bigger overhead (principally on `getFeatureInfo` method).
     * `'auto'` is the default
     */
    sampleSizeArea?: number | 'auto' | ((area: number) => number);
    /**
     * Smooth result values on LineStrings measurements
     * `0` is the default (no smoothing)
     */
    smooth?: number;
    /**
     * When calculating the zGraph statistics from the raster dataset, you can choose to ignore specific values with the NoDataValue parameter.
     * These values are considerated as transparency, so probably you want these replaced by 0.
     *
     * `-10000` is the default
     * `false` to disable
     */
    noDataValue?: number | false;
    /**
     * Timeout in ms to wait before close the requests
     *
     * `5000` ms is the default
     */
    timeout?: number;
    /**
     * console.log to help debug the code
     * `false` is the default
     */
    verbose?: boolean;
}
export {};
//# sourceMappingURL=ol-elevation-parser.d.ts.map