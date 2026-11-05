import { PlatformAdapter } from '../types';
import { MockAdapter } from './mock-adapter';
import { LiveAdapter } from './live-adapter';

let adapterInstance: PlatformAdapter | null = null;

export function getAdapter(): PlatformAdapter {
  if (!adapterInstance) {
    const dataSource = process.env.DATA_SOURCE || 'mock';
    if (dataSource.toLowerCase() === 'live') {
      adapterInstance = new LiveAdapter();
    } else {
      adapterInstance = new MockAdapter();
    }
  }
  return adapterInstance;
}

export * from './mock-adapter';
export * from './live-adapter';
