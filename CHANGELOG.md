# Changelog

## v1.0.0
* Module created

## v1.0.3
* Ol7 Compatibility
* Updated dependencies

## v1.0.4
* Improved sampledArea polygons (to avoid crashing on extrelarges polygons)
* Added function to allow configure the number of `samples` and `sampleSizeArea` on each measurement
* Added jest, configured some tests

## v1.1.0
* Added "type" module attribute to package.json
* Removed index.js
* Updated dependencies

## v1.1.1
* Improved rollup and ts configs

## v1.2.0
* Added ".js" extension on imports to work better with webpack 5 default's config
* Lib is builded with es2017 target (downgraded from esnext)
* Removed babel deps
* Added header to dist files

## v1.2.1
* Fixed EventTypes

## v1.3.0
* Added `smooth` option
* Added reload on `change:calculateZMethod`
* Replaced `Coordinate` type with `CoordinatesXYZ` and `CoordinatesXY`
* Some minor type improvements
* Converted some methods to private

## v1.3.1
* Fixed small bug preventing `smooth` being applied
* Added `error` event 

## v1.3.2
* Added `tilesResolution` options that allows to configure the resolution of the tiles used for the elevation data calculations
* Added param `silent` to multiple setters methods

## v1.3.3
* Added GeoTIFF support
* Removed manual cache of tiles
* Added `bands` option

## v1.3.4
* Fixed bug with polygon samples

## v1.3.5
* Improved warning messages on wrong resolutions, and use fallback

## v1.3.6
* Fixed deepObjectAssign function mutating the defaults options (preventing running two instances with different configs)

## v1.3.7
* Fixed type event, from `change:resolution` to `change:tilesResolution` 

## v1.3.8
* Added public methods: `getBands`, `getTilesResolution`, `getNoDataValue`, `getSmooth`, `getSampleSizeArea`, `getSamples`
* Replaced dependency `Axios` with native `fetch`
* Added option `timeout`

## v1.3.9
* Added param `customOptions` to the `getElevationValues` method, allowing to change the quality/resolution at each reading
* Added helper methods `getMaxTilesResolution` and `getCurrentViewResolution`
* Added event `load`
* Improved `readFromImage` class to avoid some retiterated function calls on loops

## v1.3.10
* Improved README