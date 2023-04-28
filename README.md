# OpenLayers Elevation Parser

<p align="center">
    <a href="https://www.npmjs.com/package/ol-elevation-parser">
        <img src="https://img.shields.io/npm/v/ol-elevation-parser.svg" alt="npm version">
    </a>
    <a href="https://img.shields.io/npm/dm/ol-elevation-parser">
        <img alt="npm" src="https://img.shields.io/npm/dm/ol-elevation-parser">
    </a>
    <a href="https://github.com/gastonzalba/ol-elevation-parser/blob/master/LICENSE">
        <img src="https://img.shields.io/npm/l/ol-elevation-parser.svg" alt="license">
    </a>
</p>

Tiny module to retrieve and parse data to create elevation profiles and/or volume calculations from raster sources. This wiil sample a provided geometries and then parse the elevation data from differents Open Layers sources (TileWMS, TileImage, XYZ), using raster grayscale (float) or rgb ([Terrarium](https://www.mapzen.com/blog/terrain-tile-service/), [Mapbox](https://docs.mapbox.com/data/tilesets/guides/access-elevation-data) or custom processings) elevation models as source.

Tested with OpenLayers version 6 and 7.

## How it works

ol-elevation-parser supports calculations from Points, LineStrings and Polygons. Each of these geometries is processed diferently:

-   `Points`: in this case, there is no further processing, the coordinates of each point are consulted according to the configured method (see [calculateZMethod](#calculateZMethod)) and the same supplied coordinates are returned with the z value embedded.
-   `LineStrings`: here it's necessary to resample the geometry to assemble the profile, and make requests only of those sampled points. The greater the number of samples (see [samples](#samples)), the longer it will take, but the better the quality of the profile will be. In the the sampling, the length of that line is divided into x number of parts to obtain the coordinates of each of the extremes. Then, the vertices of the geometry are also added to those sampled coordinates.
-   `Polygons`: two different samples are made:
    -   on the one hand, the contour of the polygon, to which the same procedure as the LineStrings is applied. This contour is useful to obtain the base level that borders the area, which allows the volume of the polygon to be calculated later.
    -   on the other hand, the area. To calculate this, a sampling is done in the form of a grid (see [sampleSizeArea](#sampleSizeArea), from which an interior point is obtained. Each of those points is requested. The greater the number of samples, the longer it will take, but the greater the accuracy of the calculation.

## Usage

```js
import ElevationParser from 'ol-elevation-parser';

import TileWMS from 'ol/source/TileWMS';
import LineString from 'ol/geom/LineString';
import Feature from 'ol/Feature';

var elevationLayer = new TileWMS({
    url: 'http://localhost:8080/geoserver/dipsohdev/ows',
    serverType: 'geoserver',
    crossOrigin: null,
    interpolate: false,
    params: {
        SERVICE: 'wms',
        LAYERS: 'mdeIgnRgb'
    }
});

var options = {
    source: elevationLayer,
    calculateZMethod: 'getFeatureInfo',
    samples: 50, // For LineStrings and Polygons contour
    sampleSizeArea: 'auto', // For Polygons area
    noDataValue: -10000,
    smooth: 0
};

var elevationParser = new ElevationParser(options);

// Add control the the Open Layers map instance
map.addControl(elevationParser);

var lineStringFeature = new Feature(new LineString(/*...*/));

const data = await elevationParser.getElevationValues(feature);
```

## Changelog

See CHANGELOG for details of changes in each release.

## Install

### Parcel, Webpack, etc.

NPM package: [ol-elevation-parser](https://www.npmjs.com/package/ol-elevation-parser).

Install the package via `npm`

    npm install ol-elevation-parser

#### JS

```js
import ElevationParser from 'ol-elevation-parser';
```

##### TypeScript type definition

TypeScript types are shipped with the project in the dist directory and should be automatically used in a TypeScript project. Interfaces are provided for the Options.

## API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

#### Table of Contents

-   [ElevationParser](#elevationparser)
    -   [Parameters](#parameters)
    -   [getElevationValues](#getelevationvalues)
        -   [Parameters](#parameters-1)
    -   [setSource](#setsource)
        -   [Parameters](#parameters-2)
    -   [getSource](#getsource)
    -   [setSamples](#setsamples)
        -   [Parameters](#parameters-3)
    -   [setSampleSizeArea](#setsamplesizearea)
        -   [Parameters](#parameters-4)
    -   [setCalculateZMethod](#setcalculatezmethod)
        -   [Parameters](#parameters-5)
    -   [setNoDataValue](#setnodatavalue)
        -   [Parameters](#parameters-6)
    -   [setMap](#setmap)
        -   [Parameters](#parameters-7)
-   [ElevationParserEventTypes](#elevationparsereventtypes)
-   [IGetElevationValues](#igetelevationvalues)
    -   [gridPolygons](#gridpolygons)
-   [IElevationCoords](#ielevationcoords)
    -   [mainCoords](#maincoords)
    -   [contourCoords](#contourcoords)
-   [IOptions](#ioptions)
    -   [source](#source)
    -   [calculateZMethod](#calculatezmethod)
    -   [samples](#samples)
    -   [sampleSizeArea](#samplesizearea)
    -   [noDataValue](#nodatavalue)
    -   [verbose](#verbose)

### ElevationParser

**Extends ol/control/Control~Control**

#### Parameters

-   `options` **[IOptions](#ioptions)**&#x20;

#### getElevationValues

##### Parameters

-   `feature` **Feature<(LineString | Point | Polygon)>**&#x20;

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[IGetElevationValues](#igetelevationvalues)>**&#x20;

#### setSource

##### Parameters

-   `source` **any**&#x20;

Returns **void**&#x20;

#### getSource

Returns **any**&#x20;

#### setSamples

##### Parameters

-   `samples` **any**&#x20;

Returns **void**&#x20;

#### setSampleSizeArea

##### Parameters

-   `sampleSizeArea` **any**&#x20;

Returns **void**&#x20;

#### setCalculateZMethod

##### Parameters

-   `calculateZMethod` **any**&#x20;

Returns **void**&#x20;

#### setNoDataValue

##### Parameters

-   `noDataValue` **any**&#x20;

Returns **void**&#x20;

#### setMap

##### Parameters

-   `map` **[Map](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)**&#x20;

Returns **void**&#x20;

### ElevationParserEventTypes

**_\[type]_**

Type: (`"change:samples"` | `"change:sampleSizeArea"` | `"change:source"` | `"change:calculateZMethod"` | `"change:noDataValue"`)

### IGetElevationValues

**Extends IElevationCoords**

**_\[interface]_**

#### gridPolygons

Sampled Polygons

Type: [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)\<Feature\<Polygon>>

### IElevationCoords

**_\[interface]_**

#### mainCoords

Sampled coordinates from LineStrings, Point coordinates,
or sampled coordinates from Polygons, obtained by subdividing the area in multiples squares and getting each center point.

Type: [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)\<Coordinate>

#### contourCoords

Contour coordinates from Polygons features.

Type: [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)\<Coordinate>

### IOptions

**Extends Omit\<ControlOptions, 'target'>**

**_\[interface]_**

#### source

Source to obtain the elevation values.
If not provided, the zGraph would be not displayed.
You can provide a custom function to call an API or other methods to obtain the data.

Type: (TileWMS | TileImage | XYZ | function (originalFeature: Feature<(LineString | Point | Polygon)>, sampledCoords: [IElevationCoords](#ielevationcoords)): [Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[IElevationCoords](#ielevationcoords)>)

#### calculateZMethod

To obtain the elevation values from the diferrents sources, you can:

-   Calculate the zValues from the rgb pixel data (`TileImage` and `XYZ` source formats need this):

    -   `Mapbox` preset: (r \* 256 \* 256 + g \* 256 + b) \* 0.1 - 10000
    -   `Terrarium` preset: (r \* 256 + g + b / 256) - 32768
    -   Provided your custom function to calculate elevation from the rgb pixel data

-   Making requests to the geoserver (`TileWMS` source)
    `getFeatureInfo`: make requests to the source url using service [getFeatureInfo](https://docs.geoserver.org/stable/en/user/services/wms/reference.html#getfeatureinfo)

By default:

-   `TileWMS` format use `'getFeatureInfo'` requests to the source_url to obtain the values.
-   `TileImage` and `XYZ` formats are calculated from the pixel data using `'Mapbox'` preset.

Type: (`"getFeatureInfo"` | `"Mapbox"` | `"Terrarium"` | function (r: [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number), g: [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number), b: [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)): [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

#### samples

To obtain the elevation values on each distance measurement, multiples samples are taken across the line.
This number is used as equally percentage steps across the geom, plus all the vertices positions.

-   `getFeatureInfo` on TileWMS sources will make one request per sample
-   `TileImage`and `XYZ` are calculated across each pixel after downloading the required tiles.
    The bigger the number, the greater the quality of the elevation data, but slower response times and
    bigger overhead (principally on `getFeatureInfo` method).
    This value is used to sample LinesStrings and Polygons contour
    `50` is the default

Type: ([number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | function (length: [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)): [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

#### sampleSizeArea

To obtain the elevation values on a volume measurement, multiples samples are taken across the polygon.
The value provided must be in meters. The bigger the number, the greater the quality of the measurement,
but slower response times and bigger overhead (principally on `getFeatureInfo` method).
`'auto'` is the default

Type: ([number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | `"auto"` | function (area: [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)): [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number))

#### noDataValue

When calculating the zGraph statistics from the raster dataset, you can choose to ignore specific values with the NoDataValue parameter.
These values are considerated as transparency, so probably you want these replaced by 0.

`-10000` is the default
`false` to disable

Type: ([number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | `false`)

#### verbose

console.log to help debug the code
`false` is the default

Type: [boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)

## TODO

-   Improve README and documentation
-   Add jest
-   Add check/msg for invalid geometries
-   Add live example
