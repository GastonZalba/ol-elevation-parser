# OpenLayers Elevation Parser
Parser to retrive elevation data from Open Layers sources (TileWMS, TileImage, XYZ), using grayscale (float) or rgb (Terrarium, Mapbox, or custom function) rasters.


## Usage

```js
import ElevationParser from 'ol-elevation-parser';

import TileWMS from 'ol/source/TileWMS';

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

var opt_options = {
    source: elevationLayer,
    calculateZMethod: 'getFeatureInfo',
    samples: 50,
    noDataValue: -10000
}

var elevationParser = new ElevationParser(map, opt_options);
```

## Install

### Browser

#### JS

### Parcel, Webpack, etc.

NPM package: [ol-elevation-parser](https://www.npmjs.com/package/ol-elevation-parser).

Install the package via `npm`

    npm install ol-elevation-parser --save-dev

#### JS

```js
import ElevationParser from 'ol-elevation-parser';
```

##### TypeScript type definition

TypeScript types are shipped with the project in the dist directory and should be automatically used in a TypeScript project. Interfaces are provided for the Options.

## API

## License
MIT (c) Gastón Zalba.