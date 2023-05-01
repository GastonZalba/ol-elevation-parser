import { Options } from './ol-elevation-parser';
import { loggerIsEnabled } from './logger';

const options: Options = {
    source: null,
    calculateZMethod: 'getFeatureInfo',
    tilesResolution: 'current',
    bands: 4,
    samples: 50,
    smooth: 0,
    sampleSizeArea: 'auto',
    noDataValue: -10000,
    verbose: loggerIsEnabled
};

export default options;
