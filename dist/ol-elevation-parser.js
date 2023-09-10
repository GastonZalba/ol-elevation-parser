/*!
 * ol-elevation-parser - v1.3.17
 * https://github.com/GastonZalba/ol-elevation-parser#readme
 * Built: Sun Sep 10 2023 19:54:24 GMT-0300 (Argentina Standard Time)
*/
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('ol/geom/LineString.js'), require('ol/geom/Point.js'), require('ol/geom/Polygon.js'), require('ol/control/Control.js'), require('ol/source/TileWMS.js'), require('@turf/bbox'), require('@turf/area'), require('@turf/intersect'), require('@turf/helpers'), require('@turf/square-grid'), require('ol/format/GeoJSON.js'), require('ol/tilegrid.js'), require('ol/tilegrid/TileGrid.js'), require('ol/source/XYZ.js'), require('ol/DataTile.js'), require('ol/ImageTile.js')) :
	typeof define === 'function' && define.amd ? define(['ol/geom/LineString.js', 'ol/geom/Point.js', 'ol/geom/Polygon.js', 'ol/control/Control.js', 'ol/source/TileWMS.js', '@turf/bbox', '@turf/area', '@turf/intersect', '@turf/helpers', '@turf/square-grid', 'ol/format/GeoJSON.js', 'ol/tilegrid.js', 'ol/tilegrid/TileGrid.js', 'ol/source/XYZ.js', 'ol/DataTile.js', 'ol/ImageTile.js'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.ElevationParser = factory(global.ol.geom.LineString, global.ol.geom.Point, global.ol.geom.Polygon, global.ol.control.Control, global.ol.source.TileWMS, global["@turf/bbox"], global["@turf/area"], global["@turf/intersect"], global["@turf/helpers"], global["@turf/square-grid"], global.ol.format.GeoJSON, global.ol.tilegrid, global.ol.tilegrid.TileGrid, global.ol.source.XYZ, global.ol.DataTile, global.ol.ImageTile));
})(this, (function (LineString, Point, Polygon, Control, TileWMS, bbox, area, intersect, helpers, squareGrid, GeoJSON, tilegrid_js, TileGrid, XYZ, DataTile, ImageTile) { 'use strict';

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	function smooth(arr, windowSize, getter = (value) => value, setter) {
	  const get = getter;
	  const result = [];

	  for (let i = 0; i < arr.length; i += 1) {
	    const leftOffeset = i - windowSize;
	    const from = leftOffeset >= 0 ? leftOffeset : 0;
	    const to = i + windowSize + 1;

	    let count = 0;
	    let sum = 0;
	    for (let j = from; j < to && j < arr.length; j += 1) {
	      sum += get(arr[j]);
	      count += 1;
	    }

	    result[i] = setter ? setter(arr[i], sum / count) : sum / count;
	  }

	  return result
	}

	var lib = smooth;

	var smooth$1 = /*@__PURE__*/getDefaultExportFromCjs(lib);

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
	    const clippedGridF = helpers.featureCollection(clippedGrid);
	    return geojson.readFeatures(clippedGridF, {
	        dataProjection: 'EPSG:4326',
	        featureProjection: projection
	    });
	};
	/**
	 *
	 * @param coordsWithZ
	 * @param smoothValue
	 * @returns
	 */
	const getSmoothedCoords = (coordsWithZ, smoothValue = 0) => {
	    coordsWithZ = [...coordsWithZ];
	    const zCoords = coordsWithZ.map((coord) => coord[2]);
	    const zSmooth = smooth$1(zCoords, smoothValue);
	    return coordsWithZ.map((coord, i) => {
	        coord[2] = zSmooth[i];
	        return coord;
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
	    tilesResolution: 'current',
	    bands: 4,
	    samples: 50,
	    smooth: 0,
	    sampleSizeArea: 'auto',
	    noDataValue: -10000,
	    timeout: 5000,
	    verbose: loggerIsEnabled
	};

	const mapboxExtractElevation = (r, g, b) => {
	    return (r * 256 * 256 + g * 256 + b) * 0.1 - 10000;
	};
	const terrariumExtractElevation = (r, g, b) => {
	    return r * 256 + g + b / 256 - 32768;
	};
	class ReadFromImage {
	    constructor(source, calculateZMethod, bands, map) {
	        this._projection =
	            source.getProjection() || map.getView().getProjection();
	        this._view = map.getView();
	        this._source = source;
	        this._bands = bands;
	        this._calculateZMethod = calculateZMethod;
	        this._canvas = document.createElement('canvas');
	        this._ctx = this._canvas.getContext('2d');
	    }
	    async read(coordinate, resolution) {
	        // clear canvas
	        this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
	        const tileGrid = this._getTileGrid();
	        const tileCoord = tileGrid.getTileCoordForCoordAndResolution(coordinate, resolution);
	        const zoom = tileCoord[0];
	        const tileSize = tileGrid.getTileSize(zoom);
	        const tile = this._source.getTile(tileCoord[0], tileCoord[1], tileCoord[2], 1, this._projection);
	        if (tile.getState() !== 2) {
	            await new Promise((resolve) => {
	                const changeListener = () => {
	                    if (tile.getState() === 2) {
	                        // loaded
	                        tile.removeEventListener('change', changeListener);
	                        resolve(null);
	                    }
	                    else if (tile.getState() === 3) {
	                        // error
	                        resolve(null);
	                    }
	                };
	                tile.addEventListener('change', changeListener);
	                tile.load();
	            });
	        }
	        let tileData;
	        if (tile instanceof DataTile) {
	            tileData = tile.getData();
	        }
	        else if (tile instanceof ImageTile) {
	            tileData = tile.getImage();
	        }
	        if (!tileData)
	            return;
	        //@ts-ignore
	        // sometimes tilesize is wrong, so use tileData if exists
	        const width = tileData.width || tileSize[0] || tileSize;
	        //@ts-ignore
	        const height = tileData.height || tileSize[1] || tileSize;
	        this._canvas.width = width;
	        this._canvas.height = height;
	        //@ts-expect-error
	        this._ctx.mozImageSmoothingEnabled = false;
	        //@ts-expect-error
	        this._ctx.oImageSmoothingEnabled = false;
	        //@ts-expect-error
	        this._ctx.webkitImageSmoothingEnabled = false;
	        //@ts-expect-error
	        this._ctx.msImageSmoothingEnabled = false;
	        this._ctx.imageSmoothingEnabled = false;
	        let imageData;
	        if (tileData instanceof HTMLImageElement) {
	            // Add image to a canvas
	            this._ctx.drawImage(tileData, 0, 0);
	            imageData = this._ctx.getImageData(0, 0, width, height);
	        }
	        else {
	            // GeoTIFF
	            imageData = this._ctx.createImageData(width, height);
	            //@ts-expect-error
	            imageData.data.set(tileData);
	        }
	        const origin = tileGrid.getOrigin(zoom);
	        const res = tileGrid.getResolution(zoom);
	        const w = Math.floor(((coordinate[0] - origin[0]) / res) % width);
	        const h = Math.floor(((origin[1] - coordinate[1]) / res) % height);
	        const imgData = imageData.data;
	        const index = (w + h * width) * this._bands;
	        const pixel = [
	            imgData[index + 0],
	            imgData[index + 1],
	            imgData[index + 2],
	            imgData[index + 3]
	        ];
	        return this._extractValuesFromPixelDEM(pixel);
	    }
	    /**
	     * Get the Max Resolution of the source
	     * @returns
	     */
	    getMaxResolution() {
	        const resolutions = this._getTileGrid().getResolutions();
	        if (resolutions)
	            return resolutions[resolutions.length - 1];
	        return null;
	    }
	    /**
	     * Check if this is now necesary
	     * @returns
	     */
	    _getTileGrid() {
	        let tilegrid = this._source.getTileGrid();
	        // If not tileGrid is provided, set a default for XYZ sources
	        if (!tilegrid) {
	            if (this._source instanceof XYZ) {
	                const defaultTileGrid = tilegrid_js.createXYZ();
	                tilegrid = new TileGrid({
	                    origin: defaultTileGrid.getOrigin(0),
	                    resolutions: defaultTileGrid.getResolutions()
	                });
	            }
	            else {
	                tilegrid = tilegrid_js.getForProjection(this._projection);
	            }
	        }
	        return tilegrid;
	    }
	    /**
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
	class ElevationParser extends Control {
	    constructor(options$1) {
	        super({
	            element: document.createElement('div')
	        });
	        this._countConnections = 0;
	        this._rasterSourceIsLoaded = false;
	        this._initialized = false;
	        /**
	         *
	         * @param coords
	         * @param optOptions To overwrite the general ones
	         * @returns
	         * @private
	         */
	        this._getZFromSampledCoords = async (coords, optOptions = null) => {
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
	            let resolutionNumber;
	            const _resolution = (optOptions === null || optOptions === void 0 ? void 0 : optOptions.tilesResolution) || this.getTilesResolution();
	            if (_resolution === 'current') {
	                resolutionNumber = this.getMap().getView().getResolution();
	                // if the view of a GeoTIFF is used in the map
	                if (!resolutionNumber) {
	                    console.warn('Cannot calculate current view resolution');
	                }
	            }
	            else if (_resolution === 'max') {
	                const maxRes = this.getMaxTilesResolution();
	                if (maxRes)
	                    resolutionNumber = maxRes;
	                else
	                    console.warn("Cannot calculate source's max resolution");
	            }
	            else {
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
	                    let zValue;
	                    if (source instanceof TileWMS &&
	                        this.get('calculateZMethod') === 'getFeatureInfo') {
	                        zValue = await this._getZValuesFromWMS(coord, source, this.getMap().getView());
	                    }
	                    else {
	                        zValue = await this._getZValuesFromImage(coord, resolutionNumber);
	                    }
	                    if (this.get('noDataValue') !== false) {
	                        zValue =
	                            zValue === this.get('noDataValue') ? undefined : zValue;
	                    }
	                    // If null or undefined value is returned, transform to 0
	                    const zValueRound = typeof zValue !== 'undefined'
	                        ? Number(zValue.toFixed(3))
	                        : undefined;
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
	        this._options = deepObjectAssign({}, options, options$1);
	        // Change the default 'getFeatureInfo' method if the source is not TileWMS
	        if (!(this._options.source instanceof TileWMS) &&
	            this._options.calculateZMethod === 'getFeatureInfo') {
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
	    async getElevationValues(feature, customOptions = null) {
	        try {
	            const waitUntilRasterSourceIsLoaded = () => new Promise((resolve, reject) => {
	                const isSourceReady = (retryNum = 0, maxRetries = 5, waitMilliseconds = 500) => {
	                    if (source.getState() !== 'ready') {
	                        retryNum++;
	                        if (retryNum > maxRetries) {
	                            reject();
	                        }
	                        else {
	                            setTimeout(() => isSourceReady(retryNum++), waitMilliseconds);
	                        }
	                    }
	                    else {
	                        resolve(null);
	                    }
	                };
	                isSourceReady();
	            });
	            const { sampledCoords, gridPolygons } = this._sampleFeatureCoords(feature, customOptions);
	            let contourCoords, mainCoords;
	            const source = this.get('source');
	            if (typeof source === 'function') {
	                // Use a custom function. Useful for using apis to retrieve the zvalues
	                ({ mainCoords, contourCoords } = await source(feature, sampledCoords));
	            }
	            else {
	                if (!this._rasterSourceIsLoaded) {
	                    await waitUntilRasterSourceIsLoaded();
	                    this._rasterSourceIsLoaded = true;
	                }
	                mainCoords = await this._getZFromSampledCoords(sampledCoords.mainCoords, customOptions);
	                // Only Polygons
	                if (mainCoords && sampledCoords.contourCoords) {
	                    contourCoords = await this._getZFromSampledCoords(sampledCoords.contourCoords, customOptions);
	                }
	            }
	            if (mainCoords === null) {
	                return null;
	            }
	            const smooth = (customOptions === null || customOptions === void 0 ? void 0 : customOptions.smooth) || this.get('smooth');
	            if (smooth) {
	                mainCoords = getSmoothedCoords(mainCoords, smooth);
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
	     * @returns
	     */
	    getSource() {
	        return this.get('source');
	    }
	    /**
	     * @public
	     * @param source
	     */
	    setSource(source, silent = false) {
	        this.set('source', source, silent);
	    }
	    /**
	     * @public
	     * @returns
	     */
	    getSamples() {
	        return this.get('samples');
	    }
	    /**
	     * @public
	     * @param samples
	     */
	    setSamples(samples, silent = false) {
	        this.set('samples', samples, silent);
	    }
	    /**
	     * @public
	     * @returns
	     */
	    getSampleSizeArea() {
	        return this.get('sampleSizeArea');
	    }
	    /**
	     * @public
	     * @param sampleSizeArea
	     */
	    setSampleSizeArea(sampleSizeArea, silent) {
	        this.set('sampleSizeArea', sampleSizeArea, silent);
	    }
	    /**
	     * @public
	     * @returns
	     */
	    getCalculateZMethod() {
	        return this.get('calculateZMethod');
	    }
	    /**
	     * @public
	     * @param calculateZMethod
	     */
	    setCalculateZMethod(calculateZMethod, silent = false) {
	        this.set('calculateZMethod', calculateZMethod, silent);
	    }
	    /**
	     * @public
	     * @returns
	     */
	    getSmooth() {
	        return this.get('smooth');
	    }
	    /**
	     * @public
	     * @param smooth
	     */
	    setSmooth(smooth, silent = false) {
	        this.set('smooth', smooth, silent);
	    }
	    /**
	     * @public
	     * @returns
	     */
	    getNoDataValue() {
	        return this.get('noDataValue');
	    }
	    /**
	     * @public
	     * @param noDataValue
	     */
	    setNoDataValue(noDataValue, silent = false) {
	        this.set('noDataValue', noDataValue, silent);
	    }
	    /**
	     * @public
	     * @returns
	     */
	    getTilesResolution() {
	        return this.get('tilesResolution');
	    }
	    /**
	     * @public
	     * @param tilesResolution
	     */
	    setTilesResolution(tilesResolution, silent = false) {
	        this.set('tilesResolution', tilesResolution, silent);
	    }
	    /**
	     * @public
	     * @returns
	     */
	    getBands() {
	        return this.get('bands');
	    }
	    /**
	     * @public
	     * @param bands
	     */
	    setBands(bands, silent = false) {
	        this.set('bands', bands, silent);
	    }
	    /**
	     * @public
	     * @returns
	     */
	    getTimeout() {
	        return this.get('timeout');
	    }
	    /**
	     * @public
	     * @param timeout
	     */
	    setTimeout(timeout, silent = false) {
	        this.set('timeout', timeout, silent);
	    }
	    /**
	     * Maximum tile resolution of the image source
	     * Only if the source is a raster
	     *
	     * @public
	     * @returns
	     */
	    getMaxTilesResolution() {
	        if (this._readFromImage)
	            return this._readFromImage.getMaxResolution();
	        return null;
	    }
	    /**
	     * Current view resolution
	     * Unsupported if the view of a GeoTIFF is used in the map
	     *
	     * @public
	     * @returns
	     */
	    getCurrentViewResolution() {
	        return this.getMap().getView().getResolution();
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
	        this.setSamples(this._options.samples, /* silent = */ true);
	        this.setSampleSizeArea(this._options.sampleSizeArea, 
	        /* silent = */ true);
	        this.setCalculateZMethod(this._options.calculateZMethod, 
	        /* silent = */ true);
	        this.setNoDataValue(this._options.noDataValue, /* silent = */ true);
	        this.setSmooth(this._options.smooth, /* silent = */ true);
	        this.setTilesResolution(this._options.tilesResolution, 
	        /* silent = */ true);
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
	    _addPropertyEvents() {
	        this.on(['change:source', 'change:bands', 'change:calculateZMethod'], () => {
	            this._onInitModifySource();
	        });
	    }
	    /**
	     * Run on init or every time the source is modified
	     * @private
	     */
	    _onInitModifySource() {
	        const source = this.getSource();
	        if (!(source instanceof Function) &&
	            this.get('calculateZMethod') !== 'getFeatureInfo') {
	            this._readFromImage = new ReadFromImage(source, this.get('calculateZMethod'), this.get('bands'), this.getMap());
	        }
	        else {
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
	    _sampleFeatureCoords(feature, params) {
	        const geom = feature.getGeometry();
	        let gridPolygons, contourCoords, mainCoords; // For polygons
	        const mergedParams = {
	            samples: (params === null || params === void 0 ? void 0 : params.samples) || this.getSamples(),
	            sampleSizeArea: (params === null || params === void 0 ? void 0 : params.sampleSizeArea) || this.getSampleSizeArea()
	        };
	        if (geom instanceof Point) {
	            mainCoords = [geom.getCoordinates()];
	        }
	        else if (geom instanceof Polygon) {
	            const polygonFeature = feature;
	            const sub_coords = polygonFeature.getGeometry().getCoordinates()[0];
	            const contourGeom = new LineString(sub_coords);
	            contourCoords = getLineSamples(contourGeom, mergedParams.samples);
	            gridPolygons = getPolygonSamples(polygonFeature, this.getMap().getView().getProjection().getCode(), mergedParams.sampleSizeArea);
	            mainCoords = gridPolygons.map((g) => {
	                const coords = g
	                    .getGeometry()
	                    .getInteriorPoint()
	                    .getCoordinates();
	                return [coords[0], coords[1]];
	            });
	        }
	        else if (geom instanceof LineString) {
	            mainCoords = getLineSamples(geom, mergedParams.samples);
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
	    async _getZValuesFromImage(coordinate, tilesResolution) {
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
	    async _getZValuesFromWMS(coordinate, source, view) {
	        const url = source.getFeatureInfoUrl(coordinate, view.getResolution(), view.getProjection(), {
	            INFO_FORMAT: 'application/json',
	            BUFFER: 0,
	            FEATURE_COUNT: 1
	        });
	        const response = await fetch(url, {
	            signal: AbortSignal.timeout(this.getTimeout())
	        });
	        const data = await response.json();
	        return data.features[0].properties.GRAY_INDEX;
	    }
	}
	var GeneralEventTypes;
	(function (GeneralEventTypes) {
	    GeneralEventTypes["LOAD"] = "load";
	})(GeneralEventTypes || (GeneralEventTypes = {}));

	var utils = /*#__PURE__*/Object.freeze({
		__proto__: null,
		get GeneralEventTypes () { return GeneralEventTypes; },
		default: ElevationParser
	});

	Object.assign(ElevationParser, utils);

	return ElevationParser;

}));
//# sourceMappingURL=ol-elevation-parser.js.map
