import Geometry from 'ol/geom/Geometry.js';
import VectorSource from 'ol/source/Vector.js';
import TileImage from 'ol/source/TileImage.js';
export declare const addTile: (tileKey: string, tile: HTMLImageElement) => void;
export declare const getTile: (key: string) => HTMLImageElement;
export declare const getTiles: () => {
    [key: string]: HTMLImageElement;
};
export declare const cleanTiles: () => void;
export declare const getTileKey: (source: TileImage | VectorSource<Geometry>, tileCoord: number[]) => string;
//# sourceMappingURL=tiles.d.ts.map