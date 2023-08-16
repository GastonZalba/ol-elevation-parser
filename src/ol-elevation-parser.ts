import LineString from 'ol/geom/LineString.js';
import Point from 'ol/geom/Point.js';
import Polygon from 'ol/geom/Polygon.js';
import Control, { Options as ControlOptions } from 'ol/control/Control.js';
import TileImage from 'ol/source/TileImage.js';
import TileWMS from 'ol/source/TileWMS.js';
import XYZ from 'ol/source/XYZ.js';
import GeoTIFF from 'ol/source/GeoTIFF';
import View from 'ol/View.js';
import { Coordinate } from 'ol/coordinate.js';
import Feature from 'ol/Feature.js';
import Map from 'ol/Map.js';
import { EventsKey } from 'ol/events.js';
import BaseEvent from 'ol/events/Event.js';
import { CombinedOnSignature, EventTypes, OnSignature } from 'ol/Observable.js';
import { ObjectEvent } from 'ol/Object.js';
import { Types as ObjectEventTypes } from 'ol/ObjectEventType.js';

import {
    deepObjectAssign,
    getLineSamples,
    getPolygonSamples,
    getSmoothedCoords
} from './helpers';
import defaultOptions from './defaults';
import logger, { setLoggerActive } from './logger';
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
    protected _countConnections = 0;
    protected _readFromImage: ReadFromImage;

    protected _initialized = false;

    declare on: OnSignature<
        EventTypes | `${GeneralEventTypes}`,
        BaseEvent,
        EventsKey
    > &
        OnSignature<
            ObjectEventTypes | ElevationParserEventTypes,
            ObjectEvent,
            EventsKey
        > &
        CombinedOnSignature<
            ElevationParserEventTypes | ObjectEventTypes | EventTypes,
            EventsKey
        >;

    declare once: OnSignature<
        EventTypes | `${GeneralEventTypes}`,
        BaseEvent,
        EventsKey
    > &
        OnSignature<
            ObjectEventTypes | ElevationParserEventTypes,
            ObjectEvent,
            EventsKey
        > &
        CombinedOnSignature<
            ElevationParserEventTypes | ObjectEventTypes | EventTypes,
            EventsKey
        >;

    declare un: OnSignature<EventTypes, BaseEvent, void> &
        OnSignature<
            ObjectEventTypes | ElevationParserEventTypes,
            ObjectEvent,
            void
        > &
        CombinedOnSignature<
            | ElevationParserEventTypes
            | ObjectEventTypes
            | EventTypes
            | `${GeneralEventTypes}`,
            void
        >;

    constructor(options: Options) {
        super({
            element: document.createElement('div')
        });

        this._options = deepObjectAssign({}, defaultOptions, options);

        // Change the default 'getFeatureInfo' method if the source is not TileWMS
        if (
            !(this._options.source instanceof TileWMS) &&
            this._options.calculateZMethod === 'getFeatureInfo'
        ) {
            this._options.calculateZMethod = 'Mapbox';
        }

        setLoggerActive(this._options.verbose);
    }

    /**
     * Get Feature's elevation values.
     * Use custom options to overwrite the general ones for specific cases
     *
     * @param feature
     * @param customOptions
     * @returns
     * @public
     */
    async getElevationValues(
        feature: Feature<LineString | Point | Polygon>,
        customOptions: ElevationValuesIndividualOptions = null
    ): Promise<IGetElevationValues | Error> {
        try {
            const { sampledCoords, gridPolygons } = this._sampleFeatureCoords(
                feature,
                {
                    samples: customOptions?.samples || this.getSamples(),
                    sampleSizeArea:
                        customOptions?.sampleSizeArea ||
                        this.getSampleSizeArea()
                }
            );

            let contourCoords: CoordinatesXYZ[], mainCoords: CoordinatesXYZ[];

            const source = this.get('source') as Options['source'];

            if (typeof source === 'function') {
                // Use a custom function. Useful for using apis to retrieve the zvalues
                ({ mainCoords, contourCoords } = await source(
                    feature,
                    sampledCoords
                ));
            } else {
                mainCoords = await this._getZFromSampledCoords(
                    sampledCoords.mainCoords,
                    customOptions
                );

                // Only Polygons
                if (mainCoords && sampledCoords.contourCoords) {
                    contourCoords = await this._getZFromSampledCoords(
                        sampledCoords.contourCoords,
                        customOptions
                    );
                }
            }

            if (mainCoords === null) {
                return null;
            }

            const smooth = customOptions?.smooth || this.get('smooth');

            if (smooth) {
                mainCoords = getSmoothedCoords(mainCoords, smooth);
            }

            return {
                mainCoords,
                ...(contourCoords && {
                    contourCoords
                }),
                ...(gridPolygons && {
                    gridPolygons
                })
            };
        } catch (err) {
            this.dispatchEvent('error');
            return err;
        }
    }

    /**
     * @public
     * @returns
     */
    getSource(): Options['source'] {
        return this.get('source');
    }

    /**
     * @public
     * @param source
     */
    setSource(source: Options['source'], silent = false): void {
        this.set('source', source, silent);
    }

    /**
     * @public
     * @returns
     */
    getSamples(): Options['samples'] {
        return this.get('samples');
    }

    /**
     * @public
     * @param samples
     */
    setSamples(samples: Options['samples'], silent = false): void {
        this.set('samples', samples, silent);
    }

    /**
     * @public
     * @returns
     */
    getSampleSizeArea(): Options['sampleSizeArea'] {
        return this.get('sampleSizeArea');
    }

    /**
     * @public
     * @param sampleSizeArea
     */
    setSampleSizeArea(
        sampleSizeArea: Options['sampleSizeArea'],
        silent: boolean
    ): void {
        this.set('sampleSizeArea', sampleSizeArea, silent);
    }

    /**
     * @public
     * @returns
     */
    getCalculateZMethod(): Options['calculateZMethod'] {
        return this.get('calculateZMethod');
    }

    /**
     * @public
     * @param calculateZMethod
     */
    setCalculateZMethod(
        calculateZMethod: Options['calculateZMethod'],
        silent = false
    ): void {
        this.set('calculateZMethod', calculateZMethod, silent);
    }

    /**
     * @public
     * @returns
     */
    getSmooth(): Options['smooth'] {
        return this.get('smooth');
    }

    /**
     * @public
     * @param smooth
     */
    setSmooth(smooth: Options['smooth'], silent = false): void {
        this.set('smooth', smooth, silent);
    }

    /**
     * @public
     * @returns
     */
    getNoDataValue(): Options['noDataValue'] {
        return this.get('noDataValue');
    }

    /**
     * @public
     * @param noDataValue
     */
    setNoDataValue(noDataValue: Options['noDataValue'], silent = false): void {
        this.set('noDataValue', noDataValue, silent);
    }

    /**
     * @public
     * @returns
     */
    getTilesResolution(): Options['tilesResolution'] {
        return this.get('tilesResolution');
    }

    /**
     * @public
     * @param tilesResolution
     */
    setTilesResolution(
        tilesResolution: Options['tilesResolution'],
        silent = false
    ): void {
        this.set('tilesResolution', tilesResolution, silent);
    }

    /**
     * @public
     * @returns
     */
    getBands(): Options['bands'] {
        return this.get('bands');
    }

    /**
     * @public
     * @param bands
     */
    setBands(bands: Options['bands'], silent = false): void {
        this.set('bands', bands, silent);
    }

    /**
     * @public
     * @returns
     */
    getTimeout(): Options['timeout'] {
        return this.get('timeout');
    }

    /**
     * @public
     * @param timeout
     */
    setTimeout(timeout: Options['timeout'], silent = false): void {
        this.set('timeout', timeout, silent);
    }

    /**
     * Maximum tile resolution of the image source
     * Only if the source is a raster
     *
     * @public
     * @returns
     */
    getMaxTilesResolution(): number {
        if (this._readFromImage) return this._readFromImage.getMaxResolution();
        return null;
    }

    /**
     * Current view resolution
     * Unsupported if the view of a GeoTIFF is used in the map
     *
     * @public
     * @returns
     */
    getCurrentViewResolution(): number {
        return this.getMap().getView().getResolution();
    }

    /**
     * @public
     * @param map
     * @TODO remove events if map is null
     */
    setMap(map: Map): void {
        super.setMap(map);

        if (map) {
            // Run once
            if (!this._initialized) this._init();
        }
    }

    /**
     *
     * @param coords
     * @param optOptions To overwrite the general ones
     * @returns
     * @private
     */
    private _getZFromSampledCoords = async (
        coords: Coordinate[],
        optOptions: ElevationValuesIndividualOptions = null
    ): Promise<CoordinatesXYZ[]> => {
        const RESOLUTION_NUMBER_FALLBACK = 0.01;

        this._countConnections++;
        const countConnections = this._countConnections;
        let errorCount = 0;

        const coordsWithZ = [];

        const source = this.get('source');

        // Flexible error trigger if multiples coords must be requested.
        // If only one coord is needed, the error is strict and raised inmediatly
        // This is useful if multipels coords are needed, and maybe one or two return error
        const countErrorsLimit = coords.length >= 5 ? 1 : 5;

        let resolutionNumber: number;

        const _resolution =
            optOptions?.tilesResolution || this.getTilesResolution();

        if (_resolution === 'current') {
            resolutionNumber = this.getMap().getView().getResolution();
            // if the view of a GeoTIFF is used in the map
            if (!resolutionNumber) {
                console.warn('Cannot calculate current view resolution');
            }
        } else if (_resolution === 'max') {
            const maxRes = this.getMaxTilesResolution();
            if (maxRes) resolutionNumber = maxRes;
            else console.warn("Cannot calculate source's max resolution");
        } else {
            // resolution is a explicit number provided in the config
            resolutionNumber = _resolution;
        }

        if (!resolutionNumber) {
            resolutionNumber =
                this.getMap().getView().getMinResolution() ||
                RESOLUTION_NUMBER_FALLBACK;
            console.warn('Using fallback resolution:', resolutionNumber);
        }

        for (const coord of coords) {
            try {
                // If there is a new connection (onChange event), abort this
                if (this._countConnections !== countConnections) {
                    logger('New geometry detected, previous requests aborted');
                    return null;
                }

                let zValue: number;

                if (
                    source instanceof TileWMS &&
                    this.get('calculateZMethod') === 'getFeatureInfo'
                ) {
                    zValue = await this._getZValuesFromWMS(
                        coord,
                        source,
                        this.getMap().getView()
                    );
                } else {
                    zValue = await this._getZValuesFromImage(
                        coord,
                        resolutionNumber
                    );
                }

                if (this.get('noDataValue') !== false) {
                    zValue = zValue === this.get('noDataValue') ? 0 : zValue;
                }

                // If null or undefined value is returned, transform to 0
                const zValueRound =
                    typeof zValue !== 'undefined'
                        ? Number(zValue.toFixed(3))
                        : 0;

                coordsWithZ.push([...coord, zValueRound]);
            } catch (err) {
                errorCount++;
                console.error(err);
                if (errorCount >= countErrorsLimit) {
                    throw err;
                }
            }
        }

        return coordsWithZ;
    };

    /**
     * This is trigged once
     * @private
     */
    private _init(): void {
        this.setSamples(this._options.samples, /* silent = */ true);

        this.setSampleSizeArea(
            this._options.sampleSizeArea,
            /* silent = */ true
        );

        this.setCalculateZMethod(
            this._options.calculateZMethod,
            /* silent = */ true
        );

        this.setNoDataValue(this._options.noDataValue, /* silent = */ true);

        this.setSmooth(this._options.smooth, /* silent = */ true);

        this.setTilesResolution(
            this._options.tilesResolution,
            /* silent = */ true
        );

        this.setBands(this._options.bands, /* silent = */ true);

        this.setTimeout(this._options.timeout, /* silent = */ true);

        // Need to be the latest, fires the change event
        this.setSource(this._options.source, /* silent = */ true);

        this._addPropertyEvents();

        this._onInitModifySource();

        this._initialized = true;

        this.dispatchEvent(GeneralEventTypes.LOAD);
    }

    /**
     * @private
     */
    private _addPropertyEvents(): void {
        this.on(
            ['change:source', 'change:bands', 'change:calculateZMethod'],
            () => {
                this._onInitModifySource();
            }
        );
    }

    /**
     * Run on init or every time the source is modified
     * @private
     */
    private _onInitModifySource(): void {
        const source = this.getSource();
        if (
            !(source instanceof Function) &&
            this.get('calculateZMethod') !== 'getFeatureInfo'
        ) {
            this._readFromImage = new ReadFromImage(
                source,
                this.get('calculateZMethod'),
                this.get('bands'),
                this.getMap()
            );
        } else {
            this._readFromImage = null;
        }
    }

    /**
     * Get some sample coords from the geometry while preserving the vertices.
     *
     * @param feature
     * @param params
     * @returns
     * @private
     */
    private _sampleFeatureCoords(
        feature: Feature<LineString | Point | Polygon>,
        params: {
            samples: Options['samples'];
            sampleSizeArea: Options['sampleSizeArea'];
        }
    ): ISampledGeom {
        const geom = feature.getGeometry();

        let gridPolygons: Feature<Polygon>[],
            contourCoords: CoordinatesXY[],
            mainCoords: CoordinatesXY[]; // For polygons

        if (geom instanceof Point) {
            mainCoords = [geom.getCoordinates() as CoordinatesXY];
        } else if (geom instanceof Polygon) {
            const polygonFeature = feature as Feature<Polygon>;

            const sub_coords = polygonFeature.getGeometry().getCoordinates()[0];
            const contourGeom = new LineString(sub_coords);
            contourCoords = getLineSamples(contourGeom, params.samples);

            gridPolygons = getPolygonSamples(
                polygonFeature,
                this.getMap().getView().getProjection().getCode(),
                params.sampleSizeArea
            );
            mainCoords = gridPolygons.map((g) => {
                const coords = g
                    .getGeometry()
                    .getInteriorPoint()
                    .getCoordinates();
                return [coords[0], coords[1]];
            });
        } else if (geom instanceof LineString) {
            mainCoords = getLineSamples(geom, params.samples);
        }

        return {
            sampledCoords: {
                mainCoords,
                contourCoords
            },
            gridPolygons
        };
    }

    /**
     *
     * @param coordinate
     * @param tilesResolution
     * @returns
     * @private
     */
    private async _getZValuesFromImage(
        coordinate: Coordinate,
        tilesResolution: number
    ): Promise<number> {
        return await this._readFromImage.read(coordinate, tilesResolution);
    }

    /**
     *
     * @param coordinate
     * @param source
     * @param view
     * @returns
     * @private
     */
    private async _getZValuesFromWMS(
        coordinate: Coordinate,
        source: TileWMS,
        view: View
    ): Promise<number> {
        const url = source.getFeatureInfoUrl(
            coordinate,
            view.getResolution(),
            view.getProjection(),
            {
                INFO_FORMAT: 'application/json',
                BUFFER: 0,
                FEATURE_COUNT: 1
            }
        );

        const response = await fetch(url, {
            signal: AbortSignal.timeout(this.getTimeout())
        });

        const data = await response.json();

        return data.features[0].properties.GRAY_INDEX;
    }
}

export enum GeneralEventTypes {
    LOAD = 'load'
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
export type ElevationParserEventTypes =
    | 'change:samples'
    | 'change:sampleSizeArea'
    | 'change:source'
    | 'change:calculateZMethod'
    | 'change:noDataValue'
    | 'change:smooth'
    | 'change:bands'
    | 'change:tilesResolution'
    | 'change:timeout';

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
export type CustomSourceFn = (
    originalFeature: Feature<LineString | Point | Polygon>,
    sampledCoords: ISampledGeom['sampledCoords']
) => Promise<IElevationCoords>;

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
    calculateZMethod?:
        | 'getFeatureInfo'
        | 'Mapbox'
        | 'Terrarium'
        | ((r: number, g: number, b: number) => number);

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
