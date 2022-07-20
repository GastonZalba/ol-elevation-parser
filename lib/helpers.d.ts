import { Coordinate } from 'ol/coordinate';
import Polygon from 'ol/geom/Polygon';
import LineString from 'ol/geom/LineString';
import Feature from 'ol/Feature';
/**
 *
 * @param target
 * @param sources
 * @returns
 */
export declare const deepObjectAssign: (target: any, ...sources: any[]) => any;
export declare const getLineSamples: (geom: LineString, samples: number) => Coordinate[];
/**
 * @param polygonFeature
 * @param nSamples
 * @returns
 */
export declare const getPolygonSamples: (polygonFeature: Feature<Polygon>, projection: string, nSamples: number | 'auto') => Feature<Polygon>[];
export declare const average: (arr: any) => number;
/**
 *
 * @param src
 * @returns
 */
export declare const addSrcToImage: (img: HTMLImageElement, src: string) => Promise<any>;
//# sourceMappingURL=helpers.d.ts.map