// @turf
import bbox from '@turf/bbox';
import area from '@turf/area';
import intersect from '@turf/intersect';
import { featureCollection } from '@turf/helpers';
import squareGrid from '@turf/square-grid';

import smooth from 'array-smooth';

import { Coordinate } from 'ol/coordinate.js';
import Polygon from 'ol/geom/Polygon.js';
import LineString from 'ol/geom/LineString.js';
import Feature from 'ol/Feature.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import { IOptions } from './ol-elevation-parser';

const geojson = new GeoJSON();

/**
 *
 * @param target
 * @param sources
 * @returns
 */
export const deepObjectAssign = (target, ...sources) => {
    sources.forEach((source) => {
        Object.keys(source).forEach((key) => {
            const s_val = source[key];
            const t_val = target[key];
            target[key] =
                t_val &&
                s_val &&
                typeof t_val === 'object' &&
                typeof s_val === 'object' &&
                !Array.isArray(t_val) // Don't merge arrays
                    ? deepObjectAssign(t_val, s_val)
                    : s_val;
        });
    });
    return target;
};

export const getLineSamples = (
    geom: LineString,
    nSamples: IOptions['samples']
): Coordinate[] => {
    const totalLength = geom.getLength();

    if (typeof nSamples === 'function') {
        nSamples = nSamples(totalLength);
    }

    const stepPercentage = 100 / nSamples;

    const metersSample = totalLength * (stepPercentage / 100);

    const sampledCoords: Coordinate[] = [];
    let segmentCount = 0;

    // Get samples every percentage step while conserving all the vertex
    geom.forEachSegment((start, end) => {
        // Only get the first start segment
        if (!segmentCount) {
            sampledCoords.push(start);
        }

        segmentCount++;

        const segmentGeom = new LineString([start, end]);
        const segmentLength = segmentGeom.getLength();

        /**
         * segmentLength -> 100
         * metersSample -> x
         */
        const newPercentage = (100 * metersSample) / segmentLength;

        // skip 0 and 100
        let segmentStepPercent = newPercentage;
        while (segmentStepPercent < 100) {
            const coordAt = segmentGeom.getCoordinateAt(
                segmentStepPercent / 100
            );
            sampledCoords.push(coordAt);
            segmentStepPercent = segmentStepPercent + newPercentage;
        }

        sampledCoords.push(end);
    });

    return sampledCoords;
};

/**
 * @param polygonFeature
 * @param nSamples
 * @returns
 */
export const getPolygonSamples = (
    polygonFeature: Feature<Polygon>,
    projection: string,
    nSamples: IOptions['sampleSizeArea']
): Feature<Polygon>[] => {
    const polygon = geojson.writeFeatureObject(polygonFeature, {
        dataProjection: 'EPSG:4326',
        featureProjection: projection
    }) as any;

    const areaPol = area(polygon.geometry);

    let sampleMeters: number;

    if (nSamples !== 'auto') {
        if (typeof nSamples === 'number') {
            sampleMeters = nSamples;
        } else if (typeof nSamples === 'function') {
            sampleMeters = nSamples(areaPol);
        }
    } else {
        if (areaPol <= 1000) sampleMeters = 0.5;
        else if (areaPol < 10000) sampleMeters = 1;
        else if (areaPol < 100000) sampleMeters = 10;
        else if (areaPol < 1000000) sampleMeters = 50;
        else sampleMeters = 100;
    }

    const polygonBbox = bbox(polygon);

    const grid = squareGrid(polygonBbox, sampleMeters / 1000, {
        units: 'kilometers',
        mask: polygon.geometry
    });

    let clippedGrid = grid.features.map((feature) =>
        intersect(feature.geometry, polygon)
    );

    // Remove some random null values
    clippedGrid = clippedGrid.filter((feature) => feature);

    const clippedGridF = featureCollection(clippedGrid);

    return geojson.readFeatures(clippedGridF, {
        dataProjection: 'EPSG:4326',
        featureProjection: projection
    }) as Feature<Polygon>[];
};

/**
 *
 * @param arr
 * @returns
 */
export const average = (arr: number[]) =>
    arr.reduce((a, b) => a + b, 0) / arr.length;

/**
 *
 * @param coordsWithZ
 * @param smoothValue
 * @returns
 */
export const getSmoothedCoords = (
    coordsWithZ: Coordinate[],
    smoothValue = 0
): Coordinate[] => {
    coordsWithZ = [...coordsWithZ];
    const zCoords = coordsWithZ.map((coord) => coord[2]);

    const zSmooth = smooth(zCoords, smoothValue);

    return coordsWithZ.map((coord, i) => {
        coord[2] = zSmooth[i];
        return coord;
    });
};

/**
 *
 * @param src
 * @returns
 */
export const addSrcToImage = (
    img: HTMLImageElement,
    src: string
): Promise<any> => {
    return new Promise((resolve, reject) => {
        img.onload = () => resolve(img.height);
        img.onerror = reject;
        img.src = src;
    });
};
