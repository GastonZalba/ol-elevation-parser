import LineString from 'ol/geom/LineString.js';
import Point from 'ol/geom/Point.js';
import Polygon from 'ol/geom/Polygon.js';
import Control, { Options as ControlOptions } from 'ol/control/Control.js';
import TileImage from 'ol/source/TileImage.js';
import TileWMS from 'ol/source/TileWMS.js';
import XYZ from 'ol/source/XYZ.js';
import View from 'ol/View.js';
import { Coordinate } from 'ol/coordinate.js';
import Feature from 'ol/Feature.js';
import Map from 'ol/Map.js';

import { EventsKey } from 'ol/events.js';
import BaseEvent from 'ol/events/Event.js';
import {
    CombinedOnSignature,
    EventTypes,
    OnSignature,
    unByKey
} from 'ol/Observable.js';
import { ObjectEvent } from 'ol/Object.js';
import { Types as ObjectEventTypes } from 'ol/ObjectEventType.js';
import ImageTile from 'ol/ImageTile.js';

import axios from 'axios';

import { addTile, cleanTiles, getTileKey } from './tiles';
import {
    deepObjectAssign,
    getLineSamples,
    getPolygonSamples,
    getSmoothedCoords
} from './helpers';
import defaultOptions from './defaults';
import logger, { setLoggerActive } from './logger';
import ReadFromImage from './readFromImage';

const AXIOS_TIMEOUT = 5000;

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
    protected _countConnections = 0;
    protected _readFromImage: ReadFromImage;

    protected _initialized = false;

    declare on: OnSignature<EventTypes, BaseEvent, EventsKey> &
        OnSignature<
            ObjectEventTypes | ElevationParserEventTypes,
            ObjectEvent,
            EventsKey
        > &
        CombinedOnSignature<
            ElevationParserEventTypes | ObjectEventTypes | EventTypes,
            EventsKey
        >;

    declare once: OnSignature<EventTypes, BaseEvent, EventsKey> &
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
            ElevationParserEventTypes | ObjectEventTypes | EventTypes,
            void
        >;

    constructor(options: Options) {
        super({
            element: document.createElement('div')
        });

        this._options = deepObjectAssign(defaultOptions, options);

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
     *
     * @param feature
     * @returns
     * @public
     */
    async getElevationValues(
        feature: Feature<LineString | Point | Polygon>
    ): Promise<IGetElevationValues | Error> {
        try {
            const { sampledCoords, gridPolygons } =
                this._sampleFeatureCoords(feature);

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
                    sampledCoords.mainCoords
                );

                // Only Polygons
                if (sampledCoords.contourCoords) {
                    contourCoords = await this._getZFromSampledCoords(
                        sampledCoords.contourCoords
                    );
                }
            }

            if (this.get('smooth')) {
                mainCoords = getSmoothedCoords(mainCoords, this.get('smooth'));
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
     * @param source
     */
    setSource(source: Options['source']): void {
        this.set('source', source);
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
     * @param samples
     */
    setSamples(samples: Options['samples']): void {
        this.set('samples', samples);
    }

    /**
     * @public
     * @param sampleSizeArea
     */
    setSampleSizeArea(sampleSizeArea: Options['sampleSizeArea']): void {
        this.set('sampleSizeArea', sampleSizeArea);
    }

    /**
     * @public
     * @param calculateZMethod
     */
    setCalculateZMethod(calculateZMethod: Options['calculateZMethod']): void {
        this.set('calculateZMethod', calculateZMethod);
    }

    /**
     * @public
     * @param smooth
     */
    setSmooth(smooth: Options['smooth']): void {
        this.set('smooth', smooth);
    }

    /**
     * @public
     * @param noDataValue
     */
    setNoDataValue(noDataValue: Options['noDataValue']): void {
        this.set('noDataValue', noDataValue);
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
     * @returns
     * @private
     */
    private _getZFromSampledCoords = async (
        coords: Coordinate[]
    ): Promise<CoordinatesXYZ[]> => {
        this._countConnections++;
        const countConnections = this._countConnections;
        let errorCount = 0;

        const coordsWithZ = [];

        const source = this.get('source');

        // Flexible error trigger if multiples coords must be requested.
        // If only one coord is needed, the error is strict and raised inmediatly
        // This is useful if multipels coords are needed, and maybe one or two return error
        const countErrorsLimit = coords.length >= 5 ? 1 : 5;

        for (const coord of coords) {
            try {
                // If there is a new connection (onChange event), abort this
                if (this._countConnections !== countConnections) {
                    logger('New geometry detected, previous requests aborted');
                    return;
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
                    zValue = await this._getZValuesFromImage(coord);
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
        this._initialized = true;

        this._addPropertyEvents();

        this.set('samples', this._options.samples, /* silent = */ true);

        this.set(
            'sampleSizeArea',
            this._options.sampleSizeArea,
            /* silent = */ true
        );
        this.set(
            'calculateZMethod',
            this._options.calculateZMethod,
            /* silent = */ true
        );
        this.set('noDataValue', this._options.noDataValue, /* silent = */ true);

        this.set('smooth', this._options.smooth, /* silent = */ true);

        // Need to be the latest, fires the change event
        this.set('source', this._options.source, /* silent = */ false);
    }

    /**
     * @private
     */
    private _addPropertyEvents(): void {
        let tileLoadKey: EventsKey;

        const prepare = () => {
            const source = this.getSource();
            if (
                !(source instanceof Function) &&
                this.get('calculateZMethod') !== 'getFeatureInfo'
            ) {
                this._readFromImage = new ReadFromImage(
                    source,
                    this.get('calculateZMethod'),
                    this.getMap()
                );
            } else {
                this._readFromImage = null;
            }

            unByKey(tileLoadKey);

            if (source instanceof TileImage) {
                // This is useful if the source is aready visible on the map,
                // and some tiles are already downloaded outside this module
                tileLoadKey = source.on('tileloadend', ({ tile }) => {
                    const tileCoord = tile.getTileCoord();
                    const tileKey = getTileKey(source, tileCoord);
                    addTile(
                        tileKey,
                        (tile as ImageTile).getImage() as HTMLImageElement
                    );
                });
            }
        };

        this.on('change:calculateZMethod', () => {
            prepare();
        });

        this.on('change:source', () => {
            cleanTiles();
            prepare();
        });
    }

    /**
     * Get some sample coords from the geometry while preserving the vertices.
     *
     * @param feature
     * @returns
     * @private
     */
    private _sampleFeatureCoords(
        feature: Feature<LineString | Point | Polygon>
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
            contourCoords = getLineSamples(contourGeom, this.get('samples'));

            gridPolygons = getPolygonSamples(
                polygonFeature,
                this.getMap().getView().getProjection().getCode(),
                this.get('sampleSizeArea')
            );
            mainCoords = gridPolygons.map((g) =>
                g.getGeometry().getInteriorPoint().getCoordinates()
            ) as CoordinatesXY[];
        } else if (geom instanceof LineString) {
            mainCoords = getLineSamples(geom, this.get('samples'));
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
     * @returns
     * @private
     */
    private async _getZValuesFromImage(
        coordinate: Coordinate
    ): Promise<number> {
        return await this._readFromImage.read(coordinate);
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

        const { data } = await axios.get(url, {
            timeout: AXIOS_TIMEOUT
        });

        return data.features[0].properties.GRAY_INDEX;
    }
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
    | 'change:smooth';

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
export type CustomSourceFn = (
    originalFeature: Feature<LineString | Point | Polygon>,
    sampledCoords: ISampledGeom['sampledCoords']
) => Promise<IElevationCoords>;

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
    calculateZMethod?:
        | 'getFeatureInfo'
        | 'Mapbox'
        | 'Terrarium'
        | ((r: number, g: number, b: number) => number);

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
