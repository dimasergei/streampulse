export interface StreamMetrics {
  timestamp: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  anomalies: number;
  activeUsers: number;
  serverHealth: 'healthy' | 'warning' | 'critical';
  regions: Array<{
    name: string;
    latency: number;
    status: 'online' | 'degraded' | 'offline';
  }>;
}

export class StreamService {
  private eventSource: EventSource | null = null;
  private listeners: Array<(metrics: StreamMetrics) => void> = [];

  connect(url: string = '/api/stream') {
    if (this.eventSource) {
      this.disconnect();
    }

    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      try {
        const metrics: StreamMetrics = JSON.parse(event.data);
        this.listeners.forEach(listener => listener(metrics));
      } catch (error) {
        console.error('Error parsing stream data:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('Stream error:', error);
    };
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  subscribe(listener: (metrics: StreamMetrics) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
}

export const streamService = new StreamService();
