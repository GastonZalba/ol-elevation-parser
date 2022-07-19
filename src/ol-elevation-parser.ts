import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import { PluggableMap } from 'ol';
import TileImage from 'ol/source/TileImage';
import TileGrid from 'ol/tilegrid/TileGrid';
import {
    createXYZ,
    getForProjection as getTileGridForProjection
} from 'ol/tilegrid';
import TileWMS from 'ol/source/TileWMS';
import XYZ from 'ol/source/XYZ';
import View from 'ol/View';
import { Coordinate } from 'ol/coordinate';
import Feature from 'ol/Feature';

import axios from 'axios';

import { addTile, getTile } from './tiles';

const AXIOS_TIMEOUT = 5000;

export * from './tiles';

export default class ElevationParser {
    protected _elevationSamples: IOptions['samples'];
    protected _calcualateZMethod: IOptions['calculateZMethod'];
    protected _elevationSource: IOptions['source'];

    public _options: IOptions;
    protected _map: PluggableMap;
    protected _countConnections = 0;

    constructor(map: PluggableMap, options: IOptions) {
        this._options = options;
        this._map = map;
    }

    /**
     *
     * @param coords
     * @returns
     * @public
     */
    async requestZValues(
        originalFeature: Feature<LineString | Point>
    ): Promise<{ coordsWithZ: number[]; zValues: number[] }> {
        const coords = this._sampleFeatureCoords(originalFeature);

        let coordsWithZ = [];
        const zValues: number[] = [];

        const source = this._options.source;

        if (typeof source === 'function') {
            // Use a custom function
            coordsWithZ = await source(originalFeature, coords);
        } else {
            this._countConnections++;
            const countConnections = this._countConnections;
            let errorCount = 0;

            for (const coord of coords) {
                try {
                    // If there is a new connection (onChange event), abort this
                    if (this._countConnections !== countConnections) {
                        console.log(
                            'New geometry detected, previous requests aborted'
                        );
                        return;
                    }

                    let zValue: number;

                    if (
                        source instanceof TileWMS &&
                        this._options.calculateZMethod === 'getFeatureInfo'
                    ) {
                        zValue = await this._getZValuesFromWMS(
                            coord,
                            source,
                            this._map.getView()
                        );
                    } else {
                        zValue = await this._getZValuesFromImage(coord, source);
                    }

                    if (this._options.noDataValue !== false) {
                        zValue =
                            zValue === this._options.noDataValue ? 0 : zValue;
                    }

                    // If null or undefined value is returned, transform to 0
                    const zValueRound =
                        typeof zValue !== 'undefined'
                            ? Number(zValue.toFixed(3))
                            : 0;

                    coordsWithZ.push([...coord, zValueRound]);
                    zValues.push(zValueRound);
                } catch (err) {
                    errorCount++;
                    console.error(err);
                    if (errorCount >= 5) {
                        throw err;
                    }
                }
            }
        }
        return { coordsWithZ, zValues };
    }

    /**
     * Get some sample coords from the geometry while preserving the vertices.
     * Each of these coords whill be used to request getFeatureInfo
     * @protected
     */
    _sampleFeatureCoords(
        drawFeature: Feature<LineString | Point>
    ): Coordinate[] {
        const geom = drawFeature.getGeometry();

        if (geom instanceof Point) return [geom.getCoordinates()];

        const stepPercentage = 100 / this._options.samples;

        const totalLength = geom.getLength();

        const metersSample = totalLength * (stepPercentage / 100);

        console.log('Total length', totalLength);
        console.log(`Samples every ${metersSample.toFixed(2)} meters`);

        const sampledCoords: Coordinate[] = [];
        let segmentCount = 0;

        // Get samples every percentage step while conserving all the vertex
        geom.forEachSegment((start, end) => {
            // Only get the first start segment
            if (!segmentCount) {
                sampledCoords.push(start);
            }

            segmentCount++;

            const segmentGeom = new LineString([start, end]);
            const segmentLength = segmentGeom.getLength();

            /**
             * segmentLength -> 100
             * metersSample -> x
             */
            const newPercentage = (100 * metersSample) / segmentLength;

            // skip 0 and 100
            let segmentStepPercent = newPercentage;
            while (segmentStepPercent < 100) {
                const coordAt = segmentGeom.getCoordinateAt(
                    segmentStepPercent / 100
                );
                sampledCoords.push(coordAt);
                segmentStepPercent = segmentStepPercent + newPercentage;
            }

            sampledCoords.push(end);
        });

        console.log('Vertices', sampledCoords.length);
        console.log('Segments', segmentCount);

        return sampledCoords;
    }

    /**
     *
     * @param coordinate
     * @param source
     * @returns
     */
    async _getZValuesFromImage(
        coordinate: Coordinate,
        source: TileImage | XYZ
    ): Promise<number> {
        const addSrcToImage = (
            img: HTMLImageElement,
            src: string
        ): Promise<any> => {
            return new Promise((resolve, reject) => {
                img.onload = () => resolve(img.height);
                img.onerror = reject;
                img.src = src;
            });
        };

        let tilegrid = source.getTileGrid();

        // If not tileGrid is provided, set a default for XYZ sources
        if (!tilegrid) {
            if (source instanceof XYZ) {
                const defaultTileGrid = createXYZ();
                tilegrid = new TileGrid({
                    origin: defaultTileGrid.getOrigin(0),
                    resolutions: defaultTileGrid.getResolutions()
                });
            } else {
                tilegrid = getTileGridForProjection(
                    this._map.getView().getProjection()
                );
            }
        }

        const tileCoord = tilegrid.getTileCoordForCoordAndResolution(
            coordinate,
            this._map.getView().getResolution()
        );

        const urlFn = source.getTileUrlFunction();

        const projection =
            source.getProjection() || this._map.getView().getProjection();

        const url = urlFn(tileCoord, 1, projection);

        //@ts-expect-error
        const tileKey = getTileKey(this._options.source, tileCoord);

        let imageTile = getTile(tileKey);

        // Check if the image was already downloaded
        if (!getTile(tileKey)) {
            const { data } = await axios.get(url, {
                timeout: AXIOS_TIMEOUT,
                responseType: 'blob'
            });
            const urlCreator = window.URL || window.webkitURL;
            const imageSrc = urlCreator.createObjectURL(data);
            const imageElement = new Image();
            await addSrcToImage(imageElement, imageSrc);
            addTile(tileKey, imageElement);
            imageTile = imageElement;
        }

        const origin = tilegrid.getOrigin(tileCoord[0]);
        const res = tilegrid.getResolution(tileCoord[0]);
        const tileSize = tilegrid.getTileSize(tileCoord[0]);
        const w = Math.floor(
            ((coordinate[0] - origin[0]) / res) %
                (tileSize[0] | (tileSize as number))
        );
        const h = Math.floor(
            ((origin[1] - coordinate[1]) / res) %
                (tileSize[1] | (tileSize as number))
        );

        const canvas = document.createElement('canvas');
        canvas.width = imageTile.width;
        canvas.height = imageTile.height;

        // Add image to a canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imageTile, 0, 0);

        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const imgData = img.data;
        const index = (w + h * 256) * 4;
        const pixel = [
            imgData[index + 0],
            imgData[index + 1],
            imgData[index + 2],
            imgData[index + 3]
        ];

        return this._extractValuesFromPixelDEM(pixel);
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

    /**
     * @protected
     * @param pixel
     * @returns
     */
    _extractValuesFromPixelDEM(pixel: number[]): number {
        const mapboxExtractElevation = (
            r: number,
            g: number,
            b: number
        ): number => {
            return (r * 256 * 256 + g * 256 + b) * 0.1 - 10000;
        };

        const terrariumExtractElevation = (
            r: number,
            g: number,
            b: number
        ): number => {
            return r * 256 + g + b / 256 - 32768;
        };

        if (
            this._options.calculateZMethod &&
            typeof this._options.calculateZMethod === 'function'
        ) {
            return this._options.calculateZMethod(pixel[0], pixel[1], pixel[2]);
        } else if (this._options.calculateZMethod === 'Mapbox') {
            return mapboxExtractElevation(pixel[0], pixel[1], pixel[2]);
        } else if (this._options.calculateZMethod === 'Terrarium') {
            return terrariumExtractElevation(pixel[0], pixel[1], pixel[2]);
        }
    }
}

export interface IOptions {
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
              originalFeature: Feature<LineString | Point>,
              sampledCoords: Coordinate[]
          ) => Promise<Coordinate[]>);

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
     * When calculating the zGraph statistics from the raster dataset, you can choose to ignore specific values with the NoDataValue parameter.
     * These values are considerated as transparency, so probably you want these replaced by 0.
     *
     * `-10000` is the default
     * `false` to disable
     */
    noDataValue?: number | false;
}
