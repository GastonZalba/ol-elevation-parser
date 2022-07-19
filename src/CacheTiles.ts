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
