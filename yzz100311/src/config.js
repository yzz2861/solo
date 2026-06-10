module.exports = {
  WEIGHT_DIFF_TOLERANCE: 0.03,
  NET_WEIGHT_DIFF_TOLERANCE: 0.05,
  STATUS: {
    ENTERED: 'entered',
    LOADING: 'loading',
    LOADED: 'loaded',
    EXITED: 'exited',
    REVIEWED: 'reviewed'
  },
  ANOMALY_TYPES: {
    DUPLICATE_ENTRY: 'duplicate_entry',
    WEIGHT_DIFF_EXCEEDED: 'weight_diff_exceeded',
    MISSING_EXIT_WEIGHBRIDGE: 'missing_exit_weighbridge',
    DRIVER_MISMATCH: 'driver_mismatch',
    DUPLICATE_EXIT: 'duplicate_exit'
  }
};
