import { tenderScanService } from './tender-scan-service.js';

// Reusable entrypoint for an external scheduler bridge.
export async function runTenderSyncJob({ from = '', to = '' } = {}) {
  if (from && to) {
    return tenderScanService.runImportRange({ from, to, trigger: 'external-cron' });
  }
  return tenderScanService.runCatchUpImport();
}
