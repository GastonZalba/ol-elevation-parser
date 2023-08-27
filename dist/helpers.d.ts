import Polygon from 'ol/geom/Polygon.js';
import LineString from 'ol/geom/LineString.js';
import Feature from 'ol/Feature.js';
import { CoordinatesXY, CoordinatesXYZ, Options } from './ol-elevation-parser';
/**
 *
 * @param target
 * @param sources
 * @returns
 */
export declare const deepObjectAssign: (target: any, ...sources: any[]) => any;
export declare const getLineSamples: (geom: LineString, nSamples: Options['samples']) => CoordinatesXY[];
/**
 * @param polygonFeature
 * @param nSamples
 * @returns
 */
export declare const getPolygonSamples: (polygonFeature: Feature<Polygon>, projection: string, nSamples: Options['sampleSizeArea']) => Feature<Polygon>[];
/**
 *
 * @param coordsWithZ
 * @param smoothValue
 * @returns
 */
export declare const getSmoothedCoords: (coordsWithZ: CoordinatesXYZ[], smoothValue?: number) => CoordinatesXYZ[];
/**
 *
 * @param src
 * @returns
 */
export declare const addSrcToImage: (img: HTMLImageElement, src: string) => Promise<any>;
//# sourceMappingURL=helpers.d.ts.map