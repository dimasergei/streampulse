import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, Zap, Shield, BarChart3, Globe, Play, Activity, AlertTriangle, TrendingUp, MapPin, Server, Wifi, Clock, Users, Cpu } from 'lucide-react';

export default function Home() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [metrics, setMetrics] = useState({
    responseTime: 45,
    throughput: 1250,
    errorRate: 0.1,
    anomalies: 0
  });
  const [locations, setLocations] = useState([
    { name: 'US East', status: 'healthy', latency: 12, load: 65 },
    { name: 'US West', status: 'healthy', latency: 18, load: 72 },
    { name: 'Europe', status: 'warning', latency: 25, load: 84 },
    { name: 'Asia', status: 'healthy', latency: 35, load: 58 },
    { name: 'Australia', status: 'healthy', latency: 42, load: 45 },
    { name: 'South America', status: 'healthy', latency: 28, load: 51 }
  ]);

  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setMetrics(prev => ({
        responseTime: Math.max(20, Math.min(200, prev.responseTime + (Math.random() - 0.5) * 20)),
        throughput: Math.max(800, Math.min(2000, prev.throughput + (Math.random() - 0.5) * 100)),
        errorRate: Math.max(0, Math.min(5, prev.errorRate + (Math.random() - 0.5) * 0.5)),
        anomalies: Math.max(0, Math.min(10, prev.anomalies + Math.floor(Math.random() * 3)))
      }));

      setLocations(prev => prev.map(loc => ({
        ...loc,
        load: Math.max(20, Math.min(95, loc.load + (Math.random() - 0.5) * 10)),
        latency: Math.max(10, Math.min(100, loc.latency + (Math.random() - 0.5) * 5)),
        status: Math.random() > 0.9 ? (Math.random() > 0.5 ? 'warning' : 'critical') : 'healthy'
      })));
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  return (
    <main className="min-h-screen bg-[#0A0E27] text-white overflow-hidden relative selection:bg-blue-500/30 font-sans">
      
      {/* 1. ATMOSPHERE (The "Enterprise" Glow) */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* 2. NAVBAR (Floating Glass) */}
      <nav className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-8 py-3 flex items-center gap-12 shadow-2xl">
          <div className="font-bold text-xl tracking-tighter bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            StreamPulse
          </div>
          <div className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
            {['Product', 'Solutions', 'Enterprise', 'Pricing'].map((item) => (
              <a key={item} href="#" className="hover:text-white transition-colors">{item}</a>
            ))}
          </div>
          <button className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-full text-sm font-medium transition-all border border-white/5">
            Sign In
          </button>
        </div>
      </nav>

      {/* 3. HERO SECTION (The Big Structure) */}
      <div className="relative pt-40 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center z-10">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Live Stream Monitor
        </div>

        {/* HEADLINE */}
        <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8 bg-gradient-to-b from-white via-white/90 to-white/50 bg-clip-text text-transparent max-w-5xl">
          Real-Time Anomaly Detection
        </h1>

        {/* SUBTITLE */}
        <p className="text-xl text-gray-400 max-w-2xl mb-12 leading-relaxed">
          Monitor global infrastructure with sub-millisecond precision. Detect outliers before they become outages.
        </p>

        {/* CTA BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-6 mb-20">
          <button 
            onClick={() => setIsSimulating(!isSimulating)}
            className="group relative px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-semibold text-lg transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] flex items-center gap-2"
          >
            {isSimulating ? (
              <>
                <Activity className="w-5 h-5" />
                Stop Simulation
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start Monitoring
              </>
            )}
          </button>
          <button className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-semibold text-lg backdrop-blur-md transition-all flex items-center gap-2">
            <Globe className="w-5 h-5" />
            View Infrastructure
          </button>
        </div>

        {/* 4. THE METRIC GLASS BAR (The EnterpriseRAG Signature) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-white/10">
            <div className="text-5xl font-bold text-white mb-2 tracking-tight">&lt;100ms</div>
            <div className="text-sm font-medium text-blue-200/60 uppercase tracking-widest">Response</div>
          </div>
          
          <div className="relative flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-white/10">
            <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-2 tracking-tight">99.99%</div>
            <div className="text-sm font-medium text-blue-200/60 uppercase tracking-widest">Uptime</div>
          </div>
          
          <div className="relative flex flex-col items-center justify-center p-4">
            <div className="text-5xl font-bold text-white mb-2 tracking-tight">24/7</div>
            <div className="text-sm font-medium text-blue-200/60 uppercase tracking-widest">Active</div>
          </div>
        </div>

      </div>

      {/* 5. LIVE INFRASTRUCTURE MONITORING */}
      <div className="max-w-7xl mx-auto px-6 pb-32">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            Live Infrastructure Monitoring
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Real-time monitoring of global infrastructure with advanced anomaly detection.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Global Infrastructure Map */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Global Infrastructure Map</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-sm text-gray-400">{locations.filter(l => l.status === 'healthy').length} Locations</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {locations.map((location, index) => (
                <div key={index} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium">{location.name}</span>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      location.status === 'healthy' ? 'bg-green-400' : 
                      location.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                    }`}></div>
                  </div>
                  <div className="text-xs text-gray-400">
                    <div>Latency: {location.latency}ms</div>
                    <div>Load: {location.load}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Metrics */}
          <div className="space-y-6">
            {/* Response Time */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Response Time</h3>
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-center">
                <div className={`text-4xl font-bold mb-2 ${
                  metrics.responseTime < 50 ? 'text-green-400' : 
                  metrics.responseTime < 100 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {metrics.responseTime.toFixed(0)}ms
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 mt-4">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      metrics.responseTime < 50 ? 'bg-green-400' : 
                      metrics.responseTime < 100 ? 'bg-yellow-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${Math.min(100, (metrics.responseTime / 200) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Throughput */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Throughput</h3>
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400 mb-2">
                  {metrics.throughput.toFixed(0)}
                </div>
                <div className="text-sm text-gray-400">requests/sec</div>
              </div>
            </div>

            {/* Anomaly Detection */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Anomaly Detection</h3>
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </div>
              <div className="text-center">
                <div className={`text-4xl font-bold mb-2 ${
                  metrics.anomalies === 0 ? 'text-green-400' : 
                  metrics.anomalies < 5 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {metrics.anomalies}
                </div>
                <div className="text-sm text-gray-400">active anomalies</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. FEATURE GRID (Glassmorphism) */}
      <div className="max-w-7xl mx-auto px-6 pb-32">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="group p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Activity className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Instant Alerts</h3>
            <p className="text-gray-400 leading-relaxed">
              Real-time anomaly detection with intelligent alerting and automated incident response.
            </p>
          </div>

          <div className="group p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Predictive Insights</h3>
            <p className="text-gray-400 leading-relaxed">
              ML-powered predictions that identify potential issues before they impact your systems.
            </p>
          </div>

          <div className="group p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Globe className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Global Heatmap</h3>
            <p className="text-gray-400 leading-relaxed">
              Visualize system performance across all global regions with interactive geographic maps.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
