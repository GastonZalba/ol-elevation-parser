import { Coordinate } from 'ol/coordinate.js';
import Polygon from 'ol/geom/Polygon.js';
import LineString from 'ol/geom/LineString.js';
import Feature from 'ol/Feature.js';
import { IOptions } from './ol-elevation-parser';
/**
 *
 * @param target
 * @param sources
 * @returns
 */
export declare const deepObjectAssign: (target: any, ...sources: any[]) => any;
export declare const getLineSamples: (geom: LineString, nSamples: IOptions['samples']) => Coordinate[];
/**
 * @param polygonFeature
 * @param nSamples
 * @returns
 */
export declare const getPolygonSamples: (polygonFeature: Feature<Polygon>, projection: string, nSamples: IOptions['sampleSizeArea']) => Feature<Polygon>[];
export declare const average: (arr: any) => number;
/**
 *
 * @param src
 * @returns
 */
export declare const addSrcToImage: (img: HTMLImageElement, src: string) => Promise<any>;
//# sourceMappingURL=helpers.d.ts.map