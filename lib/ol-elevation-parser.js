/*!
 * ol-elevation-parser - v1.3.0
 * https://github.com/GastonZalba/ol-elevation-parser#readme
 * Built: Sat Apr 29 2023 19:02:13 GMT-0300 (Argentina Standard Time)
*/
import LineString from 'ol/geom/LineString.js';
import Point from 'ol/geom/Point.js';
import Polygon from 'ol/geom/Polygon.js';
import Control from 'ol/control/Control.js';
import TileImage from 'ol/source/TileImage.js';
import TileWMS from 'ol/source/TileWMS.js';
import { unByKey } from 'ol/Observable.js';
import axios from 'axios';
import { getUid } from 'ol/util.js';
import bbox from '@turf/bbox';
import area from '@turf/area';
import intersect from '@turf/intersect';
import { featureCollection } from '@turf/helpers';
import squareGrid from '@turf/square-grid';
import smooth from 'array-smooth';
import GeoJSON from 'ol/format/GeoJSON.js';
import { createXYZ, getForProjection } from 'ol/tilegrid.js';
import TileGrid from 'ol/tilegrid/TileGrid.js';
import XYZ from 'ol/source/XYZ.js';

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

// @turf
const geojson = new GeoJSON();
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
const getLineSamples = (geom, nSamples) => {
    const totalLength = geom.getLength();
    if (typeof nSamples === 'function') {
        nSamples = nSamples(totalLength);
    }
    const stepPercentage = 100 / nSamples;
    const metersSample = totalLength * (stepPercentage / 100);
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
    return sampledCoords;
};
/**
 * @param polygonFeature
 * @param nSamples
 * @returns
 */
const getPolygonSamples = (polygonFeature, projection, nSamples) => {
    const polygon = geojson.writeFeatureObject(polygonFeature, {
        dataProjection: 'EPSG:4326',
        featureProjection: projection
    });
    const areaPol = area(polygon.geometry);
    let sampleMeters;
    if (nSamples !== 'auto') {
        if (typeof nSamples === 'number') {
            sampleMeters = nSamples;
        }
        else if (typeof nSamples === 'function') {
            sampleMeters = nSamples(areaPol);
        }
    }
    else {
        if (areaPol <= 1000)
            sampleMeters = 0.5;
        else if (areaPol < 10000)
            sampleMeters = 1;
        else if (areaPol < 100000)
            sampleMeters = 10;
        else if (areaPol < 1000000)
            sampleMeters = 50;
        else
            sampleMeters = 100;
    }
    const polygonBbox = bbox(polygon);
    const grid = squareGrid(polygonBbox, sampleMeters / 1000, {
        units: 'kilometers',
        mask: polygon.geometry
    });
    let clippedGrid = grid.features.map((feature) => intersect(feature.geometry, polygon));
    // Remove some random null values
    clippedGrid = clippedGrid.filter((feature) => feature);
    const clippedGridF = featureCollection(clippedGrid);
    return geojson.readFeatures(clippedGridF, {
        dataProjection: 'EPSG:4326',
        featureProjection: projection
    });
};
/**
 *
 * @param arr
 * @returns
 */
const average = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
/**
 *
 * @param coordsWithZ
 * @param smoothValue
 * @returns
 */
const getSmoothedCoords = (coordsWithZ, smoothValue = 0) => {
    if (coordsWithZ.length !== 3)
        return coordsWithZ;
    coordsWithZ = [...coordsWithZ];
    const zCoords = coordsWithZ.map((coord) => coord[2]);
    const zSmooth = smooth(zCoords, smoothValue);
    return coordsWithZ.map((coord, i) => {
        coord[2] = zSmooth[i];
        return coord;
    });
};
/**
 *
 * @param src
 * @returns
 */
const addSrcToImage = (img, src) => {
    return new Promise((resolve, reject) => {
        img.onload = () => resolve(img.height);
        img.onerror = reject;
        img.src = src;
    });
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
    smooth: 0,
    sampleSizeArea: 'auto',
    noDataValue: -10000,
    verbose: loggerIsEnabled
};

const AXIOS_TIMEOUT$1 = 5000;
const mapboxExtractElevation = (r, g, b) => {
    return (r * 256 * 256 + g * 256 + b) * 0.1 - 10000;
};
const terrariumExtractElevation = (r, g, b) => {
    return r * 256 + g + b / 256 - 32768;
};
class ReadFromImage {
    constructor(source, calculateZMethod, map) {
        this._draws = {};
        this._projection =
            source.getProjection() || map.getView().getProjection();
        this._view = map.getView();
        this._urlFn = source.getTileUrlFunction();
        this._tileGrid = this._getTileGrid(source);
        this._source = source;
        this._calculateZMethod = calculateZMethod;
        this._canvas = document.createElement('canvas');
        this._ctx = this._canvas.getContext('2d');
    }
    async read(coordinate) {
        // clear canvas
        this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        const tileCoord = this._tileGrid.getTileCoordForCoordAndResolution(coordinate, this._view.getResolution());
        const url = this._urlFn(tileCoord, 1, this._projection);
        const tileKey = getTileKey(this._source, tileCoord);
        let img;
        if (!this._draws[tileKey]) {
            let imageTile = getTile(tileKey);
            // Check if the image was already downloaded
            if (!getTile(tileKey)) {
                const { data } = await axios.get(url, {
                    timeout: AXIOS_TIMEOUT$1,
                    responseType: 'blob'
                });
                const imageElement = new Image(256, 256);
                const urlCreator = window.URL || window.webkitURL;
                const imageSrc = urlCreator.createObjectURL(data);
                await addSrcToImage(imageElement, imageSrc);
                addTile(tileKey, imageElement);
                imageTile = imageElement;
            }
            this._canvas.width = imageTile.width;
            this._canvas.height = imageTile.height;
            //@ts-expect-error
            this._ctx.mozImageSmoothingEnabled = false;
            //@ts-expect-error
            this._ctx.oImageSmoothingEnabled = false;
            //@ts-expect-error
            this._ctx.webkitImageSmoothingEnabled = false;
            //@ts-expect-error
            this._ctx.msImageSmoothingEnabled = false;
            this._ctx.imageSmoothingEnabled = false;
            // Add image to a canvas
            this._ctx.drawImage(imageTile, 0, 0);
            img = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
            this._draws[tileKey] = img;
        }
        img = this._draws[tileKey];
        const zoom = tileCoord[0];
        const origin = this._tileGrid.getOrigin(zoom);
        const res = this._tileGrid.getResolution(zoom);
        const tileSize = this._tileGrid.getTileSize(zoom);
        const w = Math.floor(((coordinate[0] - origin[0]) / res) %
            (tileSize[0] | tileSize));
        const h = Math.floor(((origin[1] - coordinate[1]) / res) %
            (tileSize[1] | tileSize));
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
     * @param source
     * @returns
     */
    _getTileGrid(source) {
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
                tilegrid = getForProjection(this._projection);
            }
        }
        return tilegrid;
    }
    /**
     * @protected
     * @param pixel
     * @returns
     */
    _extractValuesFromPixelDEM(pixel) {
        if (this._calculateZMethod &&
            typeof this._calculateZMethod === 'function') {
            return this._calculateZMethod(pixel[0], pixel[1], pixel[2]);
        }
        else if (this._calculateZMethod === 'Mapbox') {
            return mapboxExtractElevation(pixel[0], pixel[1], pixel[2]);
        }
        else if (this._calculateZMethod === 'Terrarium') {
            return terrariumExtractElevation(pixel[0], pixel[1], pixel[2]);
        }
    }
}

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
class ElevationParser extends Control {
    constructor(options$1) {
        super({
            element: document.createElement('div')
        });
        this._countConnections = 0;
        this._initialized = false;
        /**
         *
         * @param coords
         * @returns
         * @private
         */
        this._getZFromSampledCoords = async (coords) => {
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
                    let zValue;
                    if (source instanceof TileWMS &&
                        this.get('calculateZMethod') === 'getFeatureInfo') {
                        zValue = await this._getZValuesFromWMS(coord, source, this.getMap().getView());
                    }
                    else {
                        zValue = await this._getZValuesFromImage(coord);
                    }
                    if (this.get('noDataValue') !== false) {
                        zValue = zValue === this.get('noDataValue') ? 0 : zValue;
                    }
                    // If null or undefined value is returned, transform to 0
                    const zValueRound = typeof zValue !== 'undefined'
                        ? Number(zValue.toFixed(3))
                        : 0;
                    coordsWithZ.push([...coord, zValueRound]);
                }
                catch (err) {
                    errorCount++;
                    console.error(err);
                    if (errorCount >= countErrorsLimit) {
                        throw err;
                    }
                }
            }
            return coordsWithZ;
        };
        this._options = deepObjectAssign(options, options$1);
        // Change the default 'getFeatureInfo' method if the source is not TileWMS
        if (!(this._options.source instanceof TileWMS) &&
            this._options.calculateZMethod === 'getFeatureInfo') {
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
    async getElevationValues(feature) {
        try {
            const { sampledCoords, gridPolygons } = this._sampleFeatureCoords(feature);
            let contourCoords, mainCoords;
            const source = this.get('source');
            if (typeof source === 'function') {
                // Use a custom function. Useful for using apis to retrieve the zvalues
                ({ mainCoords, contourCoords } = await source(feature, sampledCoords));
            }
            else {
                mainCoords = await this._getZFromSampledCoords(sampledCoords.mainCoords);
                // Only Polygons
                if (sampledCoords.contourCoords) {
                    contourCoords = await this._getZFromSampledCoords(sampledCoords.contourCoords);
                }
            }
            if (this.get('smooth')) {
                mainCoords = getSmoothedCoords(mainCoords, this.get('smooth'));
            }
            return Object.assign(Object.assign({ mainCoords }, (contourCoords && {
                contourCoords
            })), (gridPolygons && {
                gridPolygons
            }));
        }
        catch (err) {
            this.dispatchEvent('error');
            return err;
        }
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
     * @returns
     */
    getSource() {
        return this.get('source');
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
     * @param sampleSizeArea
     */
    setSampleSizeArea(sampleSizeArea) {
        this.set('sampleSizeArea', sampleSizeArea);
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
     * @param smooth
     */
    setSmooth(smooth) {
        this.set('smooth', smooth);
    }
    /**
     * @public
     * @param noDataValue
     */
    setNoDataValue(noDataValue) {
        this.set('noDataValue', noDataValue);
    }
    /**
     * @public
     * @param map
     * @TODO remove events if map is null
     */
    setMap(map) {
        super.setMap(map);
        if (map) {
            // Run once
            if (!this._initialized)
                this._init();
        }
    }
    /**
     * This is trigged once
     * @private
     */
    _init() {
        this._initialized = true;
        this._addPropertyEvents();
        this.set('samples', this._options.samples, /* silent = */ true);
        this.set('sampleSizeArea', this._options.sampleSizeArea, 
        /* silent = */ true);
        this.set('calculateZMethod', this._options.calculateZMethod, 
        /* silent = */ true);
        this.set('noDataValue', this._options.noDataValue, /* silent = */ true);
        this.set('smooth', this._options.smooth, /* silent = */ true);
        // Need to be the latest, fires the change event
        this.set('source', this._options.source, /* silent = */ false);
    }
    /**
     * @private
     */
    _addPropertyEvents() {
        let tileLoadKey;
        const prepare = () => {
            const source = this.getSource();
            if (!(source instanceof Function) &&
                this.get('calculateZMethod') !== 'getFeatureInfo') {
                this._readFromImage = new ReadFromImage(source, this.get('calculateZMethod'), this.getMap());
            }
            else {
                this._readFromImage = null;
            }
            unByKey(tileLoadKey);
            if (source instanceof TileImage) {
                // This is useful if the source is aready visible on the map,
                // and some tiles are already downloaded outside this module
                tileLoadKey = source.on('tileloadend', ({ tile }) => {
                    const tileCoord = tile.getTileCoord();
                    const tileKey = getTileKey(source, tileCoord);
                    addTile(tileKey, tile.getImage());
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
    _sampleFeatureCoords(feature) {
        const geom = feature.getGeometry();
        let gridPolygons, contourCoords, mainCoords; // For polygons
        if (geom instanceof Point) {
            mainCoords = [geom.getCoordinates()];
        }
        else if (geom instanceof Polygon) {
            const polygonFeature = feature;
            const sub_coords = polygonFeature.getGeometry().getCoordinates()[0];
            const contourGeom = new LineString(sub_coords);
            contourCoords = getLineSamples(contourGeom, this.get('samples'));
            gridPolygons = getPolygonSamples(polygonFeature, this.getMap().getView().getProjection().getCode(), this.get('sampleSizeArea'));
            mainCoords = gridPolygons.map((g) => g.getGeometry().getInteriorPoint().getCoordinates());
        }
        else if (geom instanceof LineString) {
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
    async _getZValuesFromImage(coordinate) {
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
    async _getZValuesFromWMS(coordinate, source, view) {
        const url = source.getFeatureInfoUrl(coordinate, view.getResolution(), view.getProjection(), {
            INFO_FORMAT: 'application/json',
            BUFFER: 0,
            FEATURE_COUNT: 1
        });
        const { data } = await axios.get(url, {
            timeout: AXIOS_TIMEOUT
        });
        return data.features[0].properties.GRAY_INDEX;
    }
}

export { ElevationParser as default };
//# sourceMappingURL=ol-elevation-parser.js.map
