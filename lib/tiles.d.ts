import Geometry from 'ol/geom/Geometry';
import VectorSource from 'ol/source/Vector';
import TileImage from 'ol/source/TileImage';
export declare const addTile: (tileKey: string, tile: HTMLImageElement) => void;
export declare const getTile: (key: string) => HTMLImageElement;
export declare const getTiles: () => {
    [key: string]: HTMLImageElement;
};
export declare const cleanTiles: () => void;
export declare const getTileKey: (source: TileImage | VectorSource<Geometry>, tileCoord: number[]) => string;
//# sourceMappingURL=tiles.d.ts.map