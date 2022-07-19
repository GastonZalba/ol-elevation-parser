import Geometry from 'ol/geom/Geometry';
import VectorSource from 'ol/source/Vector';
import { getUid } from 'ol/util';
import TileImage from 'ol/source/TileImage';

let tiles: { [key: string]: HTMLImageElement } = {};

export const addTile = (tileKey: string, tile: HTMLImageElement) => {
    tiles[tileKey] = tile;
};

export const getTile = (key: string) => {
    return tiles[key];
};

export const getTiles = () => {
    return tiles;
};

export const cleanTiles = () => {
    tiles = {};
};

export const getTileKey = (
    source: TileImage | VectorSource<Geometry>,
    tileCoord: number[]
) => {
    const uidSource = getUid(source);
    return uidSource + '_' + tileCoord.join('-');
};
