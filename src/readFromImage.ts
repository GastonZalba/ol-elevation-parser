import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { Coordinate } from 'ol/coordinate.js';
import {
    getForProjection as getTileGridForProjection,
    createXYZ
} from 'ol/tilegrid.js';
import TileGrid from 'ol/tilegrid/TileGrid.js';
import XYZ from 'ol/source/XYZ.js';
import DataTile, { Data } from 'ol/DataTile.js';
import ImageTile from 'ol/ImageTile.js';
import Projection from 'ol/proj/Projection.js';

import { Options, RasterSources } from './ol-elevation-parser.js';

const mapboxExtractElevation = (r: number, g: number, b: number): number => {
    return (r * 256 * 256 + g * 256 + b) * 0.1 - 10000;
};

const terrariumExtractElevation = (r: number, g: number, b: number): number => {
    return r * 256 + g + b / 256 - 32768;
};

export default class ReadFromImage {
    protected _projection: Projection;
    protected _source: RasterSources;
    protected _view: View;
    protected _calculateZMethod: Options['calculateZMethod'];
    protected _bands: Options['bands'];
    protected _canvas: HTMLCanvasElement;
    protected _ctx: CanvasRenderingContext2D;

    constructor(
        source: RasterSources,
        calculateZMethod: Options['calculateZMethod'],
        bands: Options['bands'],
        map: Map
    ) {
        this._projection =
            source.getProjection() || map.getView().getProjection();
        this._view = map.getView();

        this._source = source;
        this._bands = bands;

        this._calculateZMethod = calculateZMethod;

        this._canvas = document.createElement('canvas');
        this._ctx = this._canvas.getContext('2d');
    }

    async read(coordinate: Coordinate, resolution: number) {
        // clear canvas
        this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

        const tileGrid = this._getTileGrid();

        const tileCoord = tileGrid.getTileCoordForCoordAndResolution(
            coordinate,
            resolution
        );
        const zoom = tileCoord[0];
        const tileSize = tileGrid.getTileSize(zoom);

        const tile = this._source.getTile(
            tileCoord[0],
            tileCoord[1],
            tileCoord[2],
            1,
            this._projection
        );

        if (tile.getState() !== 2) {
            await new Promise((resolve) => {
                const changeListener = () => {
                    if (tile.getState() === 2) {
                        // loaded
                        tile.removeEventListener('change', changeListener);
                        resolve(null);
                    } else if (tile.getState() === 3) {
                        // error
                        resolve(null);
                    }
                };

                tile.addEventListener('change', changeListener);
                tile.load();
            });
        }

        let tileData: Data | HTMLImageElement;

        if (tile instanceof DataTile) {
            tileData = tile.getData();
        } else if (tile instanceof ImageTile) {
            tileData = tile.getImage();
        }

        if (!tileData) return;

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

        let imageData: ImageData;

        if (tileData instanceof HTMLImageElement) {
            // Add image to a canvas
            this._ctx.drawImage(tileData, 0, 0);

            imageData = this._ctx.getImageData(0, 0, width, height);
        } else {
            // GeoTIFF
            imageData = this._ctx.createImageData(width, height);
            //@ts-expect-error
            imageData.data.set(tileData as Data);
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
    getMaxResolution(): number {
        const zoom = this._getTileGrid().getMaxZoom();
        if (zoom) return this._getTileGrid().getResolution(zoom);
        return null;
    }

    /**
     * Check if this is now necesary
     * @returns
     */
    private _getTileGrid(): TileGrid {
        let tilegrid = this._source.getTileGrid();
        // If not tileGrid is provided, set a default for XYZ sources
        if (!tilegrid) {
            if (this._source instanceof XYZ) {
                const defaultTileGrid = createXYZ();
                tilegrid = new TileGrid({
                    origin: defaultTileGrid.getOrigin(0),
                    resolutions: defaultTileGrid.getResolutions()
                });
            } else {
                tilegrid = getTileGridForProjection(this._projection);
            }
        }

        return tilegrid;
    }

    /**
     * @param pixel
     * @returns
     */
    private _extractValuesFromPixelDEM(pixel: number[]): number {
        if (
            this._calculateZMethod &&
            typeof this._calculateZMethod === 'function'
        ) {
            return this._calculateZMethod(pixel[0], pixel[1], pixel[2]);
        } else if (this._calculateZMethod === 'Mapbox') {
            return mapboxExtractElevation(pixel[0], pixel[1], pixel[2]);
        } else if (this._calculateZMethod === 'Terrarium') {
            return terrariumExtractElevation(pixel[0], pixel[1], pixel[2]);
        }
    }
}
