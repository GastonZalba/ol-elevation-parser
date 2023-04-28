import { IOptions } from './ol-elevation-parser';
import { loggerIsEnabled } from './logger';

const options: IOptions = {
    source: null,
    calculateZMethod: 'getFeatureInfo',
    samples: 50,
    smooth: 0,
    sampleSizeArea: 'auto',
    noDataValue: -10000,
    verbose: loggerIsEnabled
};

export default options;
