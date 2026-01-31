import type { StreamMetrics } from './api/stream';

export type { StreamMetrics };

// Mock stream data generator for Vite SPA
export function generateMockMetrics(): StreamMetrics {
  const regions = [
    { name: 'US East', latency: 45 + Math.random() * 20, status: 'online' as const },
    { name: 'US West', latency: 65 + Math.random() * 25, status: Math.random() > 0.1 ? 'online' as const : 'degraded' as const },
    { name: 'Europe', latency: 85 + Math.random() * 30, status: Math.random() > 0.05 ? 'online' as const : 'degraded' as const },
    { name: 'Asia', latency: 120 + Math.random() * 40, status: Math.random() > 0.15 ? 'online' as const : 'degraded' as const },
  ];

  return {
    timestamp: Date.now(),
    responseTime: 40 + Math.random() * 60,
    throughput: 1000 + Math.random() * 500,
    errorRate: Math.random() * 2,
    anomalies: Math.floor(Math.random() * 5),
    activeUsers: 500 + Math.floor(Math.random() * 1000),
    serverHealth: Math.random() > 0.1 ? 'healthy' : Math.random() > 0.5 ? 'warning' : 'critical',
    regions
  };
}

export function startMockStream(callback: (metrics: StreamMetrics) => void, interval: number = 2000) {
  const intervalId = setInterval(() => {
    callback(generateMockMetrics());
  }, interval);

  return () => clearInterval(intervalId);
}
