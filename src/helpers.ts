// @turf
import bbox from '@turf/bbox';
import area from '@turf/area';
import intersect from '@turf/intersect';
import { featureCollection } from '@turf/helpers';
import squareGrid from '@turf/square-grid';

import { Coordinate } from 'ol/coordinate';
import Polygon from 'ol/geom/Polygon';
import LineString from 'ol/geom/LineString';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';

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
    samples: number
): Coordinate[] => {
    const stepPercentage = 100 / samples;

    const totalLength = geom.getLength();

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
    nSamples: number | 'auto'
): Feature<Polygon>[] => {
    const polygon = geojson.writeFeatureObject(polygonFeature, {
        dataProjection: 'EPSG:4326',
        featureProjection: projection
    }) as any;

    const areaPol = area(polygon.geometry);

    let sampleMeters: number;

    if (nSamples !== 'auto') {
        sampleMeters = nSamples;
    } else {
        if (areaPol <= 1000) sampleMeters = 0.5;
        else if (areaPol < 10000) sampleMeters = 1;
        else sampleMeters = 10;
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

export const average = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

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
