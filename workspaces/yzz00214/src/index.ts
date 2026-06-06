export * from './models';
export * from './rules';
export * from './status';
export * from './records';
export * from './api/anomaly-card-api';

import { AnomalyCardApi } from './api/anomaly-card-api';
import { DEFAULT_THRESHOLD_CONFIG } from './models';

export function createAnomalyCardApi() {
  return new AnomalyCardApi(DEFAULT_THRESHOLD_CONFIG);
}

export default AnomalyCardApi;
