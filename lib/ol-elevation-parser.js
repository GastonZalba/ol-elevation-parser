import { __awaiter } from 'tslib';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import TileGrid from 'ol/tilegrid/TileGrid';
import { createXYZ, getForProjection } from 'ol/tilegrid';
import TileWMS from 'ol/source/TileWMS';
import XYZ from 'ol/source/XYZ';
import { getUid } from 'ol/util';
import axios from 'axios';

let tiles = {};
const addTile = (tileKey, tile) => {
    tiles[tileKey] = tile;
};
const getTile = (key) => {
    return tiles[key];
};

const AXIOS_TIMEOUT = 5000;
const getTileKey = (source, tileCoord) => {
    const uidSource = getUid(source);
    return uidSource + '_' + tileCoord.join('-');
};
class ElevationParser {
    constructor(map, options) {
        this._countConnections = 0;
        this._options = options;
        this._map = map;
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
            const source = this._options.source;
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
                            console.log('New geometry detected, previous requests aborted');
                            return;
                        }
                        let zValue;
                        if (source instanceof TileWMS &&
                            this._options.calculateZMethod === 'getFeatureInfo') {
                            zValue = yield this._getZValuesFromWMS(coord, source, this._map.getView());
                        }
                        else {
                            zValue = yield this._getZValuesFromImage(coord, source);
                        }
                        if (this._options.noDataValue !== false) {
                            zValue =
                                zValue === this._options.noDataValue ? 0 : zValue;
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
     * Get some sample coords from the geometry while preserving the vertices.
     * Each of these coords whill be used to request getFeatureInfo
     * @protected
     */
    _sampleFeatureCoords(drawFeature) {
        const geom = drawFeature.getGeometry();
        if (geom instanceof Point)
            return [geom.getCoordinates()];
        const stepPercentage = 100 / this._options.samples;
        const totalLength = geom.getLength();
        const metersSample = totalLength * (stepPercentage / 100);
        console.log('Total length', totalLength);
        console.log(`Samples every ${metersSample.toFixed(2)} meters`);
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
            //@ts-expect-error
            const tileKey = getTileKey(this._options.source, tileCoord);
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
        if (this._options.calculateZMethod &&
            typeof this._options.calculateZMethod === 'function') {
            return this._options.calculateZMethod(pixel[0], pixel[1], pixel[2]);
        }
        else if (this._options.calculateZMethod === 'Mapbox') {
            return mapboxExtractElevation(pixel[0], pixel[1], pixel[2]);
        }
        else if (this._options.calculateZMethod === 'Terrarium') {
            return terrariumExtractElevation(pixel[0], pixel[1], pixel[2]);
        }
    }
}

export { ElevationParser as default, getTileKey };
//# sourceMappingURL=ol-elevation-parser.js.map
