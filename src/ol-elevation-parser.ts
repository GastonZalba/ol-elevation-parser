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

import axios from 'axios';

import { addTile, cleanTiles, getTileKey } from './tiles';
import { deepObjectAssign, getLineSamples, getPolygonSamples } from './helpers';
import defaultOptions from './defaults';
import logger, { setLoggerActive } from './logger';
import ReadFromImage from './readFromImage';

const AXIOS_TIMEOUT = 5000;

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
    protected _countConnections = 0;
    protected _readFromImage: ReadFromImage;

    protected _initialized = false;

    constructor(options: IOptions) {
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
        this._addPropertyEvents();
    }

    /**
     * @public
     * @param source
     */
    setSource(source: IOptions['source']): void {
        this.set('source', source);
    }

    /**
     * @public
     * @param samples
     */
    setSamples(samples: IOptions['samples']): void {
        this.set('samples', samples);
    }

    /**
     * @public
     * @param sampleSizeArea
     */
    setSampleSizeArea(sampleSizeArea: IOptions['sampleSizeArea']): void {
        this.set('sampleSizeArea', sampleSizeArea);
    }

    /**
     * @public
     * @param calculateZMethod
     */
    setCalculateZMethod(calculateZMethod: IOptions['calculateZMethod']): void {
        this.set('calculateZMethod', calculateZMethod);
    }

    /**
     * @public
     * @param noDataValue
     */
    setNoDataValue(noDataValue: IOptions['noDataValue']): void {
        this.set('noDataValue', noDataValue);
    }

    /**
     *
     * @param originalFeature
     * @returns
     * @public
     */
    async requestZValues(
        originalFeature: Feature<LineString | Point | Polygon>
    ): Promise<IRequestZValues> {
        // Run once
        if (!this._initialized) this._init();

        const { sampledCoords: sampleCoords, gridPolygons } =
            this._sampleFeatureCoords(originalFeature);

        let contourCoords: Coordinate[], mainCoords: Coordinate[];

        const source = this.get('source');

        if (typeof source === 'function') {
            // Use a custom function. Useful for using apis to retrieve the zvalues
            ({ mainCoords, contourCoords } = await source(
                originalFeature,
                sampleCoords
            ));
        } else {
            mainCoords = await this._getZFromSampledCoords(
                sampleCoords.mainCoords
            );

            // Only Polygons
            if (sampleCoords.contourCoords) {
                contourCoords = await this._getZFromSampledCoords(
                    sampleCoords.contourCoords
                );
            }
        }
        return {
            mainCoords,
            ...(contourCoords && {
                contourCoords: contourCoords
            }),
            ...(gridPolygons && {
                gridPolygons
            })
        };
    }

    /**
     *
     * @param coords
     * @returns
     * @private
     */
    _getZFromSampledCoords = async (
        coords: Coordinate[]
    ): Promise<Coordinate[]> => {
        this._countConnections++;
        const countConnections = this._countConnections;
        let errorCount = 0;

        const coordsWithZ = [];

        const source = this.get('source');

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
                if (errorCount >= 5) {
                    throw err;
                }
            }
        }

        return coordsWithZ;
    };

    /**
     * This is trigged once
     * @protected
     */
    _init(): void {
        this._initialized = true;

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

        // Need to be the latest
        this.set('source', this._options.source, /* silent = */ false);
    }

    /**
     * @protected
     */
    _addPropertyEvents(): void {
        // @ts-expect-error
        this.on('change:source', (evt: ObjectEvent) => {
            const source = evt.target.get(evt.key);
            cleanTiles();

            if (
                !(source instanceof Function) &&
                this.get('calculateZMethod') !== 'getFeatureInfo'
            ) {
                this._readFromImage = new ReadFromImage(
                    this.get('source'),
                    this.get('calculateZMethod'),
                    this.getMap()
                );
            } else {
                this._readFromImage = null;
            }

            if (source instanceof TileImage) {
                // This is useful if the source is aready visible on the map,
                // and some tiles are already downloaded outside this module
                source.on('tileloadend', ({ tile }) => {
                    const tileCoord = tile.tileCoord;
                    const tileKey = getTileKey(source, tileCoord);
                    addTile(
                        tileKey,
                        // @ts-expect-error
                        tile.getImage()
                    );
                });
            }
        });
    }

    /**
     * Get some sample coords from the geometry while preserving the vertices.
     *
     * @param feature
     * @returns
     * @protected
     */
    _sampleFeatureCoords(
        feature: Feature<LineString | Point | Polygon>
    ): ISampledCoords {
        const geom = feature.getGeometry();

        let gridPolygons: Feature<Polygon>[],
            contourCoords: Coordinate[],
            mainCoords: Coordinate[]; // For polygons

        if (geom instanceof Point) {
            mainCoords = [geom.getCoordinates()];
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
            );
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
     */
    async _getZValuesFromImage(coordinate: Coordinate): Promise<number> {
        return await this._readFromImage.read(coordinate);
    }

    /**
     *
     * @param coordinate
     * @param source
     * @param view
     * @returns
     */
    async _getZValuesFromWMS(
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
    source?:
        | TileWMS
        | TileImage
        | XYZ
        | ((
              originalFeature: Feature<LineString | Point | Polygon>,
              sampledCoords: IElevationCoords
          ) => Promise<IElevationCoords>);

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
