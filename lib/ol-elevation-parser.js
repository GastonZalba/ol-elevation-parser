import { __awaiter } from 'tslib';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Control from 'ol/control/Control';
import TileImage from 'ol/source/TileImage';
import TileGrid from 'ol/tilegrid/TileGrid';
import { createXYZ, getForProjection } from 'ol/tilegrid';
import TileWMS from 'ol/source/TileWMS';
import XYZ from 'ol/source/XYZ';
import axios from 'axios';
import { getUid } from 'ol/util';

let tiles = {};
const addTile = (tileKey, tile) => {
    tiles[tileKey] = tile;
};
const getTile = (key) => {
    return tiles[key];
};
const getTiles = () => {
    return tiles;
};
const cleanTiles = () => {
    tiles = {};
};
const getTileKey = (source, tileCoord) => {
    const uidSource = getUid(source);
    return uidSource + '_' + tileCoord.join('-');
};

/**
 *
 * @param target
 * @param sources
 * @returns
 */
const deepObjectAssign = (target, ...sources) => {
    sources.forEach((source) => {
        Object.keys(source).forEach((key) => {
            const s_val = source[key];
            const t_val = target[key];
            target[key] =
                t_val &&
                    s_val &&
                    typeof t_val === 'object' &&
                    typeof s_val === 'object' &&
                    !Array.isArray(t_val) // Don't merge arrays
                    ? deepObjectAssign(t_val, s_val)
                    : s_val;
        });
    });
    return target;
};

let loggerIsEnabled = false;
const setLoggerActive = (bool) => {
    loggerIsEnabled = bool;
};
function logger(...args) {
    if (loggerIsEnabled)
        console.log(...args);
}

const options = {
    source: null,
    calculateZMethod: 'getFeatureInfo',
    samples: 50,
    noDataValue: -10000,
    verbose: loggerIsEnabled
};

const AXIOS_TIMEOUT = 5000;
/**
 * @extends {ol/control/Control~Control}
 * @fires change:samples
 * @fires change:source
 * @fires change:calculateZMethod
 * @param opt_options
 */
class ElevationParser extends Control {
    constructor(options$1) {
        super({});
        this._countConnections = 0;
        const _options = deepObjectAssign(options, options$1);
        setLoggerActive(_options.verbose);
        this._addPropertyEvents();
        this.set('source', _options.source, /* silent = */ false);
        this.set('samples', _options.samples, /* silent = */ true);
        this.set('calculateZMethod', _options.calculateZMethod, 
        /* silent = */ true);
        this.set('noDataValue', _options.noDataValue, /* silent = */ true);
    }
    /**
     * @public
     * @param source
     */
    setSource(source) {
        this.set('source', source);
    }
    /**
     * @public
     * @param samples
     */
    setSamples(samples) {
        this.set('samples', samples);
    }
    /**
     * @public
     * @param calculateZMethod
     */
    setCalculateZMethod(calculateZMethod) {
        this.set('calculateZMethod', calculateZMethod);
    }
    /**
     * @public
     * @param noDataValue
     */
    setNoDataValue(noDataValue) {
        this.set('noDataValue', noDataValue);
    }
    /**
     *
     * @param coords
     * @returns
     * @public
     */
    requestZValues(originalFeature) {
        return __awaiter(this, void 0, void 0, function* () {
            const coords = this._sampleFeatureCoords(originalFeature);
            let coordsWithZ = [];
            const zValues = [];
            const source = this.get('source');
            if (typeof source === 'function') {
                // Use a custom function
                coordsWithZ = yield source(originalFeature, coords);
            }
            else {
                this._countConnections++;
                const countConnections = this._countConnections;
                let errorCount = 0;
                for (const coord of coords) {
                    try {
                        // If there is a new connection (onChange event), abort this
                        if (this._countConnections !== countConnections) {
                            logger('New geometry detected, previous requests aborted');
                            return;
                        }
                        let zValue;
                        if (source instanceof TileWMS &&
                            this.get('calculateZMethod') === 'getFeatureInfo') {
                            zValue = yield this._getZValuesFromWMS(coord, source, this._map.getView());
                        }
                        else {
                            zValue = yield this._getZValuesFromImage(coord, source);
                        }
                        if (this.get('noDataValue') !== false) {
                            zValue =
                                zValue === this.get('noDataValue') ? 0 : zValue;
                        }
                        // If null or undefined value is returned, transform to 0
                        const zValueRound = typeof zValue !== 'undefined'
                            ? Number(zValue.toFixed(3))
                            : 0;
                        coordsWithZ.push([...coord, zValueRound]);
                        zValues.push(zValueRound);
                    }
                    catch (err) {
                        errorCount++;
                        console.error(err);
                        if (errorCount >= 5) {
                            throw err;
                        }
                    }
                }
            }
            return { coordsWithZ, zValues };
        });
    }
    /**
     * @protected
     */
    _addPropertyEvents() {
        // @ts-expect-error
        this.on('change:source', (evt) => {
            const source = evt.target.get(evt.key);
            cleanTiles();
            if (source instanceof TileImage) {
                // This is useful if the source is aready visible on the map,
                // and some tiles are already downloaded outside this module
                source.on('tileloadend', ({ tile }) => {
                    const tileCoord = tile.tileCoord;
                    const tileKey = getTileKey(source, tileCoord);
                    addTile(tileKey, 
                    // @ts-expect-error
                    tile.getImage());
                });
            }
        });
    }
    /**
     * Get some sample coords from the geometry while preserving the vertices.
     * Each of these coords whill be used to request getFeatureInfo
     * @protected
     */
    _sampleFeatureCoords(drawFeature) {
        const geom = drawFeature.getGeometry();
        if (geom instanceof Point)
            return [geom.getCoordinates()];
        const stepPercentage = 100 / this.get('samples');
        const totalLength = geom.getLength();
        const metersSample = totalLength * (stepPercentage / 100);
        logger('Total length', totalLength);
        logger(`Samples every ${metersSample.toFixed(2)} meters`);
        const sampledCoords = [];
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
                const coordAt = segmentGeom.getCoordinateAt(segmentStepPercent / 100);
                sampledCoords.push(coordAt);
                segmentStepPercent = segmentStepPercent + newPercentage;
            }
            sampledCoords.push(end);
        });
        logger('Vertices', sampledCoords.length);
        logger('Segments', segmentCount);
        return sampledCoords;
    }
    /**
     *
     * @param coordinate
     * @param source
     * @returns
     */
    _getZValuesFromImage(coordinate, source) {
        return __awaiter(this, void 0, void 0, function* () {
            const addSrcToImage = (img, src) => {
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
                }
                else {
                    tilegrid = getForProjection(this._map.getView().getProjection());
                }
            }
            const tileCoord = tilegrid.getTileCoordForCoordAndResolution(coordinate, this._map.getView().getResolution());
            const urlFn = source.getTileUrlFunction();
            const projection = source.getProjection() || this._map.getView().getProjection();
            const url = urlFn(tileCoord, 1, projection);
            const tileKey = getTileKey(this.get('source'), tileCoord);
            let imageTile = getTile(tileKey);
            // Check if the image was already downloaded
            if (!getTile(tileKey)) {
                const { data } = yield axios.get(url, {
                    timeout: AXIOS_TIMEOUT,
                    responseType: 'blob'
                });
                const urlCreator = window.URL || window.webkitURL;
                const imageSrc = urlCreator.createObjectURL(data);
                const imageElement = new Image();
                yield addSrcToImage(imageElement, imageSrc);
                addTile(tileKey, imageElement);
                imageTile = imageElement;
            }
            const origin = tilegrid.getOrigin(tileCoord[0]);
            const res = tilegrid.getResolution(tileCoord[0]);
            const tileSize = tilegrid.getTileSize(tileCoord[0]);
            const w = Math.floor(((coordinate[0] - origin[0]) / res) %
                (tileSize[0] | tileSize));
            const h = Math.floor(((origin[1] - coordinate[1]) / res) %
                (tileSize[1] | tileSize));
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
        });
    }
    /**
     *
     * @param coordinate
     * @param source
     * @param view
     * @returns
     */
    _getZValuesFromWMS(coordinate, source, view) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = source.getFeatureInfoUrl(coordinate, view.getResolution(), view.getProjection(), {
                INFO_FORMAT: 'application/json',
                BUFFER: 0,
                FEATURE_COUNT: 1
            });
            const { data } = yield axios.get(url, {
                timeout: AXIOS_TIMEOUT
            });
            return data.features[0].properties.GRAY_INDEX;
        });
    }
    /**
     * @protected
     * @param pixel
     * @returns
     */
    _extractValuesFromPixelDEM(pixel) {
        const mapboxExtractElevation = (r, g, b) => {
            return (r * 256 * 256 + g * 256 + b) * 0.1 - 10000;
        };
        const terrariumExtractElevation = (r, g, b) => {
            return r * 256 + g + b / 256 - 32768;
        };
        const calculateZMethod = this.get('calculateZMethod');
        if (calculateZMethod && typeof calculateZMethod === 'function') {
            return calculateZMethod(pixel[0], pixel[1], pixel[2]);
        }
        else if (calculateZMethod === 'Mapbox') {
            return mapboxExtractElevation(pixel[0], pixel[1], pixel[2]);
        }
        else if (calculateZMethod === 'Terrarium') {
            return terrariumExtractElevation(pixel[0], pixel[1], pixel[2]);
        }
    }
}

export { addTile, cleanTiles, ElevationParser as default, getTile, getTileKey, getTiles };
//# sourceMappingURL=ol-elevation-parser.js.map
