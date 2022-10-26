import axios from 'axios';

import Map from 'ol/Map';
import View from 'ol/View';
import { Coordinate } from 'ol/coordinate';
import {
    getForProjection as getTileGridForProjection,
    createXYZ
} from 'ol/tilegrid';
import TileGrid from 'ol/tilegrid/TileGrid';
import XYZ from 'ol/source/XYZ';
import TileImage from 'ol/source/TileImage';
import { Projection } from 'ol/proj';

import { addSrcToImage } from './helpers';

import { addTile, getTile, getTileKey } from './tiles';
import { IOptions } from './ol-elevation-parser';

const AXIOS_TIMEOUT = 5000;

const mapboxExtractElevation = (r: number, g: number, b: number): number => {
    return (r * 256 * 256 + g * 256 + b) * 0.1 - 10000;
};

const terrariumExtractElevation = (r: number, g: number, b: number): number => {
    return r * 256 + g + b / 256 - 32768;
};

export default class ReadFromImage {
    protected _tileGrid: TileGrid;
    protected _projection: Projection;
    protected _source: TileImage | XYZ;
    protected _view: View;
    protected _calculateZMethod: IOptions['calculateZMethod'];
    protected _canvas: HTMLCanvasElement;
    protected _ctx: CanvasRenderingContext2D;
    protected _img: HTMLImageElement;
    protected _urlFn;
    protected _draws = {};

    constructor(
        source: TileImage | XYZ,
        calculateZMethod: IOptions['calculateZMethod'],
        map: Map
    ) {
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

    async read(coordinate: Coordinate) {
        // clear canvas
        this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

        const tileCoord = this._tileGrid.getTileCoordForCoordAndResolution(
            coordinate,
            this._view.getResolution()
        );

        const url = this._urlFn(tileCoord, 1, this._projection);

        const tileKey = getTileKey(this._source, tileCoord);
        let img;

        if (!this._draws[tileKey]) {
            let imageTile = getTile(tileKey);

            // Check if the image was already downloaded
            if (!getTile(tileKey)) {
                const { data } = await axios.get(url, {
                    timeout: AXIOS_TIMEOUT,
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

            img = this._ctx.getImageData(
                0,
                0,
                this._canvas.width,
                this._canvas.height
            );
            this._draws[tileKey] = img;
        }

        img = this._draws[tileKey];

        const zoom = tileCoord[0];
        const origin = this._tileGrid.getOrigin(zoom);
        const res = this._tileGrid.getResolution(zoom);
        const tileSize = this._tileGrid.getTileSize(zoom);

        const w = Math.floor(
            ((coordinate[0] - origin[0]) / res) %
                (tileSize[0] | (tileSize as number))
        );
        const h = Math.floor(
            ((origin[1] - coordinate[1]) / res) %
                (tileSize[1] | (tileSize as number))
        );

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
            } else {
                tilegrid = getTileGridForProjection(this._projection);
            }
        }

        return tilegrid;
    }

    /**
     * @protected
     * @param pixel
     * @returns
     */
    _extractValuesFromPixelDEM(pixel: number[]): number {
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
