import ElevationParser from '../src/ol-elevation-parser';
import Map from 'ol/Map';
import View from 'ol/View';
import XYZ from 'ol/source/XYZ';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';

// MOCK
import resizeObserver from 'resize-observer-polyfill';
global.ResizeObserver = resizeObserver;

//global.URL.createObjectURL = jest.fn();

const key = 'LPfN5AdCKdfeyvNx46hb';

const elevation = new XYZ({
    url:
        'https://api.maptiler.com/tiles/terrain-rgb/{z}/{x}/{y}.png?key=' + key,
    crossOrigin: 'anonymous',
    maxZoom: 12
});

const elevationParser = new ElevationParser({
    source: elevation,
    calculateZMethod: 'Mapbox',
    samples: 250, // For LineStrings and Polygons contour
    sampleSizeArea: 'auto', // For Polygons area
    noDataValue: -10000
});

const olMap = new Map({
    view: new View({
        projection: 'EPSG:3857',
        resolution: 10
    })
});
elevationParser.setMap(olMap);

// 
// Dsiabled test. It's not working. Image.onload problem
// test('Get elevation values from diferents geometries', async () => {

//     const featurePoint = new Feature({
//         geometry: new Point([-6906022, -4580495])
//     });
//     const data = await elevationParser.getElevationValues(featurePoint);
//     expect(data.mainCoords.length).toBeGreaterThan(0);

// });

test('Get samples from diferents geometries', async () => {

    // POINT
    const featurePoint = new Feature(new Point([-6906022, -4580495]));
    const samplesPoint = elevationParser._sampleFeatureCoords(featurePoint);
    expect(samplesPoint.sampledCoords.mainCoords.length).toBe(1);
    expect(samplesPoint.sampledCoords.contourCoords).toBe(undefined);
    expect(samplesPoint.gridPolygons).toBe(undefined);

    // LINESTRING
    const featureLine = new Feature(
        new LineString([
            [-6907042, -4581425],
            [-6916122, -4570295]
        ])
    );

    const samplesLine = elevationParser._sampleFeatureCoords(featureLine);
    expect(samplesLine.sampledCoords.mainCoords.length).toBe(251);
    expect(samplesLine.sampledCoords.contourCoords).toBe(undefined);
    expect(samplesLine.gridPolygons).toBe(undefined);

    // POLYGON
    const featurePolygon = new Feature(
        new Polygon([
            [
                [-6907042, -4585425],
                [-6916122, -4572295],
                [-6918122, -4574295],
                [-6907042, -4585425]
            ]
        ])
    );

    const samplesPol = elevationParser._sampleFeatureCoords(featurePolygon);
    expect(samplesPol.sampledCoords.mainCoords.length).toBe(1549);
    expect(samplesPol!.sampledCoords!.contourCoords!.length).toBe(252);
    expect(samplesPol!.gridPolygons!.length).toBe(1549);
});
