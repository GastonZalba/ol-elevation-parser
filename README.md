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

Tiny module to retrieve and parse data to create elevation profiles and/or volume calculations from raster sources. This will sample the provided geometries and then parse the elevation data from differents Open Layers sources, using raster grayscale or color processed rgbs as source.

Tested with OpenLayers version 6 and 7.

## How it works

### Supported sources:

-   [XYZ](https://openlayers.org/en/latest/apidoc/module-ol_source_XYZ-XYZ.html)
-   [TileWMS](https://openlayers.org/en/latest/apidoc/module-ol_source_TileWMS-TileWMS.html)
-   [TileImage](https://openlayers.org/en/latest/apidoc/module-ol_source_TileImage-TileImage.html)
-   [GeoTIFF](https://openlayers.org/en/latest/apidoc/module-ol_source_GeoTIFF-GeoTIFFSource.html)
-   Custom function to retrieve data from an API or so

### Supported color formats:

-   [Terrarium](https://www.mapzen.com/blog/terrain-tile-service/)
-   [Mapbox](https://docs.mapbox.com/data/tilesets/guides/access-elevation-data)
-   Geoserver raster grayscale MDE (16, 24, 32 bits, etc) using `getFeatureInfo` function (very slow to calculate LineStrings and Polygons, but useful in some specific cases).
-   Custom color processing (you must provide the function to decode the pixel RGB values)

### Supported geometries:

Supports calculations from Points, LineStrings and Polygons. Each of these geometries is processed diferently:

-   `Points`: in this case, there is no further processing, the coordinates of each point are consulted according to the configured method (see [calculateZMethod](#calculateZMethod)) and the same supplied coordinates are returned with the z value embedded.
-   `LineStrings`: here it's necessary to resample the geometry to assemble the profile, and make requests only of those sampled points. The greater the number of samples (see [samples](#samples)), the longer it will take, but the better the quality of the profile will be. In the the sampling, the length of that line is divided into x number of parts to obtain the coordinates of each of the extremes. Then, the vertices of the geometry are also added to those sampled coordinates.
-   `Polygons`: two different samples are made:
    -   on the one hand, the contour of the polygon, to which the same procedure as the LineStrings is applied. This contour is useful to obtain the base level that borders the area, which allows the volume of the polygon to be calculated later.
    -   on the other hand, the area. To calculate this, a sampling is done in the form of a grid (see [sampleSizeArea](#sampleSizeArea)), from which an interior point is obtained. Each of those points is requested. The greater the number of samples, the longer it will take, but the greater the accuracy of the calculation.

## Examples
-   Basic usage using Geotiff sources: create an OpenLayers map instance and add Ol Elevation Parser as a control [See example](https://raw.githack.com/GastonZalba/ol-elevation-parser/master/examples/geotiff).

## Usage

```js
import ElevationParser from 'ol-elevation-parser';

import TileWMS from 'ol/source/TileWMS.js';
import LineString from 'ol/geom/LineString.js';
import Feature from 'ol/Feature.js';

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
    tilesResolution: 'current',
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
### Browser

#### JS

Load `ol-elevation-parser.js` after [OpenLayers](https://www.npmjs.com/package/ol). Elevation Parser is available as `ElevationParser`.

```HTML
<script src="https://unpkg.com/ol-elevation-parser@1.3.14"></script>
```
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
    -   [getSource](#getsource)
    -   [setSource](#setsource)
        -   [Parameters](#parameters-2)
    -   [getSamples](#getsamples)
    -   [setSamples](#setsamples)
        -   [Parameters](#parameters-3)
    -   [getSampleSizeArea](#getsamplesizearea)
    -   [setSampleSizeArea](#setsamplesizearea)
        -   [Parameters](#parameters-4)
    -   [getCalculateZMethod](#getcalculatezmethod)
    -   [setCalculateZMethod](#setcalculatezmethod)
        -   [Parameters](#parameters-5)
    -   [getSmooth](#getsmooth)
    -   [setSmooth](#setsmooth)
        -   [Parameters](#parameters-6)
    -   [getNoDataValue](#getnodatavalue)
    -   [setNoDataValue](#setnodatavalue)
        -   [Parameters](#parameters-7)
    -   [getTilesResolution](#gettilesresolution)
    -   [setTilesResolution](#settilesresolution)
        -   [Parameters](#parameters-8)
    -   [getBands](#getbands)
    -   [setBands](#setbands)
        -   [Parameters](#parameters-9)
    -   [getTimeout](#gettimeout)
    -   [setTimeout](#settimeout)
        -   [Parameters](#parameters-10)
    -   [getMaxTilesResolution](#getmaxtilesresolution)
    -   [getCurrentViewResolution](#getcurrentviewresolution)
    -   [setMap](#setmap)
        -   [Parameters](#parameters-11)
-   [mainCoords](#maincoords)
-   [contourCoords](#contourcoords)
-   [ElevationParserEventTypes](#elevationparsereventtypes)
-   [IGetElevationValues](#igetelevationvalues)
    -   [gridPolygons](#gridpolygons)
-   [CoordinatesXYZ](#coordinatesxyz)
-   [CoordinatesXY](#coordinatesxy)
-   [IElevationCoords](#ielevationcoords)
    -   [mainCoords](#maincoords-1)
    -   [contourCoords](#contourcoords-1)
-   [RasterSources](#rastersources)
-   [CustomSourceFn](#customsourcefn)
-   [ElevationValuesIndividualOptions](#elevationvaluesindividualoptions)
-   [Options](#options)
    -   [source](#source)
    -   [calculateZMethod](#calculatezmethod)
    -   [tilesResolution](#tilesresolution)
    -   [bands](#bands)
    -   [samples](#samples)
    -   [sampleSizeArea](#samplesizearea)
    -   [smooth](#smooth)
    -   [noDataValue](#nodatavalue)
    -   [timeout](#timeout)
    -   [verbose](#verbose)

### ElevationParser

**Extends ol/control/Control~Control**

#### Parameters

-   `options` **[Options](#options)**&#x20;

#### getElevationValues

Get Feature's elevation values.
Use custom options to overwrite the general ones for specific cases

##### Parameters

-   `feature` **Feature<(LineString | Point | Polygon)>**&#x20;
-   `customOptions` **[ElevationValuesIndividualOptions](#elevationvaluesindividualoptions)** (optional, default `null`)

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<([IGetElevationValues](#igetelevationvalues) | [Error](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error))>**&#x20;

#### getSource

Returns **any**&#x20;

#### setSource

##### Parameters

-   `source` **any**&#x20;
-   `silent` (optional, default `false`)

Returns **void**&#x20;

#### getSamples

Returns **any**&#x20;

#### setSamples

##### Parameters

-   `samples` **any**&#x20;
-   `silent` (optional, default `false`)

Returns **void**&#x20;

#### getSampleSizeArea

Returns **any**&#x20;

#### setSampleSizeArea

##### Parameters

-   `sampleSizeArea` **any**&#x20;
-   `silent` **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**&#x20;

Returns **void**&#x20;

#### getCalculateZMethod

Returns **any**&#x20;

#### setCalculateZMethod

##### Parameters

-   `calculateZMethod` **any**&#x20;
-   `silent` (optional, default `false`)

Returns **void**&#x20;

#### getSmooth

Returns **any**&#x20;

#### setSmooth

##### Parameters

-   `smooth` **any**&#x20;
-   `silent` (optional, default `false`)

Returns **void**&#x20;

#### getNoDataValue

Returns **any**&#x20;

#### setNoDataValue

##### Parameters

-   `noDataValue` **any**&#x20;
-   `silent` (optional, default `false`)

Returns **void**&#x20;

#### getTilesResolution

Returns **any**&#x20;

#### setTilesResolution

##### Parameters

-   `tilesResolution` **any**&#x20;
-   `silent` (optional, default `false`)

Returns **void**&#x20;

#### getBands

Returns **any**&#x20;

#### setBands

##### Parameters

-   `bands` **any**&#x20;
-   `silent` (optional, default `false`)

Returns **void**&#x20;

#### getTimeout

Returns **any**&#x20;

#### setTimeout

##### Parameters

-   `timeout` **any**&#x20;
-   `silent` (optional, default `false`)

Returns **void**&#x20;

#### getMaxTilesResolution

Maximum tile resolution of the image source
Only if the source is a raster

Returns **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)**&#x20;

#### getCurrentViewResolution

Current view resolution
Unsupported if the view of a GeoTIFF is used in the map

Returns **[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)**&#x20;

#### setMap

##### Parameters

-   `map` **[Map](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)**&#x20;

Returns **void**&#x20;

### mainCoords

Sampled coordinates from LineStrings, Point coordinates,
or sampled coordinates from Polygons, obtained by subdividing the area in multiples squares and getting each center point.

Type: [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[CoordinatesXY](#coordinatesxy)>

### contourCoords

Contour coordinates from Polygons features.

Type: [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[CoordinatesXY](#coordinatesxy)>

### ElevationParserEventTypes

**_\[type]_**

Type: (`"change:samples"` | `"change:sampleSizeArea"` | `"change:source"` | `"change:calculateZMethod"` | `"change:noDataValue"` | `"change:smooth"` | `"change:bands"` | `"change:tilesResolution"` | `"change:timeout"`)

### IGetElevationValues

**Extends IElevationCoords**

**_\[interface]_**

#### gridPolygons

Sampled Polygons
Useful to to calculate fill and cut values on ovolume measurements

Type: [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)\<Feature\<Polygon>>

### CoordinatesXYZ

**_\[type]_**

Type: \[[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number), [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number), [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)]

### CoordinatesXY

**_\[type]_**

Type: \[[number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number), [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)]

### IElevationCoords

**_\[interface]_**

#### mainCoords

Sampled coordinates from LineStrings, Point coordinates,
or sampled coordinates from Polygons, obtained by subdividing the area in multiples squares and getting each center point.

Type: [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[CoordinatesXYZ](#coordinatesxyz)>

#### contourCoords

Contour coordinates from Polygons features.

Type: [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[CoordinatesXYZ](#coordinatesxyz)>

### RasterSources

**_\[type]_**

Type: (TileWMS | TileImage | XYZ | GeoTIFF)

### CustomSourceFn

**_\[type]_**

Type: function (originalFeature: Feature<(LineString | Point | Polygon)>, sampledCoords: any): [Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[IElevationCoords](#ielevationcoords)>

### ElevationValuesIndividualOptions

**_\[interface]_**

### Options

**Extends Omit\<ControlOptions, 'target'>**

**_\[interface]_**

#### source

Source from which it is obtained the elevation values. If not provided, the zGraph would be not displayed.

If a Raster source is used and the option `resolution` is set to `max`, provide the `maxZoom` attribute
to allow download the data in the higher resolution available.

Also, you can provide a custom function to call an API or other methods to obtain the data.

Type: ([RasterSources](#rastersources) | [CustomSourceFn](#customsourcefn))

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

#### tilesResolution

Only used if `calculateZMethod` is not `getFeatureInfo`.

This sets the resolution in wich the tiles are downloaded to calculate the z values.

If `max`, the tiles will be downloaded using the maximum quality possible, but you
have to configure the `maxZoom` attribute of the source to prevent requesting inexisting tiles.
Using `max` provides the maximum quality, but the requests are gonna be in higher number and would be slower.
Use the method `getMaxTilesResolution` to get the max resolution in a number number.

´current´ uses the current view resolution of the map. If the source is visible in the map,
the already downloaded tiles would be used to the calculations so is it's the faster method.
Use the method `getCurrentViewResolution` to get the curent view resolution number.
Doesn't work if the source is GeoTIFF and the map use its `view`

´current´ is the default

Type: ([number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | `"max"` | `"current"`)

#### bands

Only used if `calculateZMethod` is not `getFeatureInfo`.

Default is 4

Type: [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)

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

#### smooth

Smooth result values on LineStrings measurements
`0` is the default (no smoothing)

Type: [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)

#### noDataValue

When calculating the zGraph statistics from the raster dataset, you can choose to ignore specific values with the NoDataValue parameter.
These values are considerated as transparency, so probably you want these replaced by 0.

`-10000` is the default
`false` to disable

Type: ([number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number) | `false`)

#### timeout

Timeout in ms to wait before close the requests

`5000` ms is the default

Type: [number](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)

#### verbose

console.log to help debug the code
`false` is the default

Type: [boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)

## TODO

-   Remove axios
-   Improve README and documentation
-   Add jest
-   Add check/msg for invalid geometries
-   Add live example
