import LineString from 'ol/geom/LineString.js';
import Point from 'ol/geom/Point.js';
import Polygon from 'ol/geom/Polygon.js';
import Control, { Options as ControlOptions } from 'ol/control/Control.js';
import TileImage from 'ol/source/TileImage.js';
import TileWMS from 'ol/source/TileWMS.js';
import XYZ from 'ol/source/XYZ.js';
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
 * @param options
 */
export default class ElevationParser extends Control {
    protected _options: Options;
    protected _countConnections: number;
    protected _readFromImage: ReadFromImage;
    protected _initialized: boolean;
    on: OnSignature<EventTypes, BaseEvent, EventsKey> & OnSignature<ObjectEventTypes | ElevationParserEventTypes, ObjectEvent, EventsKey> & CombinedOnSignature<ElevationParserEventTypes | ObjectEventTypes | EventTypes, EventsKey>;
    once: OnSignature<EventTypes, BaseEvent, EventsKey> & OnSignature<ObjectEventTypes | ElevationParserEventTypes, ObjectEvent, EventsKey> & CombinedOnSignature<ElevationParserEventTypes | ObjectEventTypes | EventTypes, EventsKey>;
    un: OnSignature<EventTypes, BaseEvent, void> & OnSignature<ObjectEventTypes | ElevationParserEventTypes, ObjectEvent, void> & CombinedOnSignature<ElevationParserEventTypes | ObjectEventTypes | EventTypes, void>;
    constructor(options: Options);
    /**
     *
     * @param feature
     * @returns
     * @public
     */
    getElevationValues(feature: Feature<LineString | Point | Polygon>): Promise<IGetElevationValues | Error>;
    /**
     * @public
     * @param source
     */
    setSource(source: Options['source']): void;
    /**
     * @public
     * @returns
     */
    getSource(): Options['source'];
    /**
     * @public
     * @param samples
     */
    setSamples(samples: Options['samples']): void;
    /**
     * @public
     * @param sampleSizeArea
     */
    setSampleSizeArea(sampleSizeArea: Options['sampleSizeArea']): void;
    /**
     * @public
     * @param calculateZMethod
     */
    setCalculateZMethod(calculateZMethod: Options['calculateZMethod']): void;
    /**
     * @public
     * @param smooth
     */
    setSmooth(smooth: Options['smooth']): void;
    /**
     * @public
     * @param noDataValue
     */
    setNoDataValue(noDataValue: Options['noDataValue']): void;
    /**
     * @public
     * @param map
     * @TODO remove events if map is null
     */
    setMap(map: Map): void;
    /**
     *
     * @param coords
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
     * Get some sample coords from the geometry while preserving the vertices.
     *
     * @param feature
     * @returns
     * @private
     */
    private _sampleFeatureCoords;
    /**
     *
     * @param coordinate
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
export type ElevationParserEventTypes = 'change:samples' | 'change:sampleSizeArea' | 'change:source' | 'change:calculateZMethod' | 'change:noDataValue' | 'change:smooth';
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
export type CustomSourceFn = (originalFeature: Feature<LineString | Point | Polygon>, sampledCoords: ISampledGeom['sampledCoords']) => Promise<IElevationCoords>;
/**
 * **_[interface]_**
 * @public
 */
export interface Options extends Omit<ControlOptions, 'target'> {
    /**
     * Source to obtain the elevation values.
     * If not provided, the zGraph would be not displayed.
     * You can provide a custom function to call an API or other methods to obtain the data.
     */
    source: TileWMS | TileImage | XYZ | CustomSourceFn;
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
     * console.log to help debug the code
     * `false` is the default
     */
    verbose?: boolean;
}
export {};
//# sourceMappingURL=ol-elevation-parser.d.ts.map