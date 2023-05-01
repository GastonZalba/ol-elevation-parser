import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { Coordinate } from 'ol/coordinate.js';
import Projection from 'ol/proj/Projection.js';
import { Options, RasterSources } from './ol-elevation-parser.js';
export default class ReadFromImage {
    protected _projection: Projection;
    protected _source: RasterSources;
    protected _view: View;
    protected _calculateZMethod: Options['calculateZMethod'];
    protected _resolution: Options['tilesResolution'];
    protected _bands: Options['bands'];
    protected _canvas: HTMLCanvasElement;
    protected _ctx: CanvasRenderingContext2D;
    constructor(source: RasterSources, calculateZMethod: Options['calculateZMethod'], resolution: Options['tilesResolution'], bands: Options['bands'], map: Map);
    read(coordinate: Coordinate): Promise<number>;
    /**
     * Check if this is now necesary
     * @returns
     */
    private _getTileGrid;
    /**
     * @param pixel
     * @returns
     */
    private _extractValuesFromPixelDEM;
}
//# sourceMappingURL=readFromImage.d.ts.map