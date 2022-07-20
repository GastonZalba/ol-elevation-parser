import { PluggableMap } from 'ol';
import View from 'ol/View';
import { Coordinate } from 'ol/coordinate';
import TileGrid from 'ol/tilegrid/TileGrid';
import XYZ from 'ol/source/XYZ';
import TileImage from 'ol/source/TileImage';
import { Projection } from 'ol/proj';
import { IOptions } from './ol-elevation-parser';
export default class ReadFromImage {
    protected _tileGrid: TileGrid;
    protected _projection: Projection;
    protected _source: TileImage | XYZ;
    protected _view: View;
    protected _calculateZMethod: IOptions['calculateZMethod'];
    protected _canvas: HTMLCanvasElement;
    protected _ctx: CanvasRenderingContext2D;
    protected _img: HTMLImageElement;
    protected _urlFn: any;
    protected _draws: {};
    constructor(source: TileImage | XYZ, calculateZMethod: IOptions['calculateZMethod'], map: PluggableMap);
    read(coordinate: Coordinate): Promise<number>;
    /**
     *
     * @param source
     * @returns
     */
    _getTileGrid(source: any): any;
    /**
     * @protected
     * @param pixel
     * @returns
     */
    _extractValuesFromPixelDEM(pixel: number[]): number;
}
//# sourceMappingURL=readFromImage.d.ts.map