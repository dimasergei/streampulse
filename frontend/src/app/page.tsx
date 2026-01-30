'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Zap, 
  Globe, 
  Shield, 
  BarChart3, 
  Settings, 
  Play, 
  Pause, 
  RefreshCw,
  Sparkles,
  ArrowRight,
  MapPin,
  Clock,
  Target,
  Database,
  Cpu,
  Monitor,
  Wifi,
  Server,
  Cloud,
  Router
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AnomalySimulator } from '@/components/anomaly-simulator'
import { GeographicMap } from '@/components/geographic-map'
import { AnimatedCharts } from '@/components/animated-charts'
import { cn } from '@/lib/utils'

interface LocationData {
  id: string
  name: string
  country: string
  coordinates: { x: number; y: number }
  status: 'normal' | 'warning' | 'critical'
  latency: number
  throughput: number
  errors: number
  lastUpdate: Date
}

interface AnomalyEvent {
  id: string
  type: 'spike' | 'drop' | 'pattern' | 'outlier'
  severity: 'low' | 'medium' | 'high' | 'critical'
  location: string
  metric: string
  value: number
  threshold: number
  timestamp: Date
  description: string
}

const INITIAL_LOCATIONS: LocationData[] = [
  {
    id: '1',
    name: 'US-East',
    country: 'United States',
    coordinates: { x: 25, y: 35 },
    status: 'normal',
    latency: 45,
    throughput: 2500,
    errors: 0.2,
    lastUpdate: new Date()
  },
  {
    id: '2',
    name: 'US-West',
    country: 'United States',
    coordinates: { x: 15, y: 40 },
    status: 'normal',
    latency: 62,
    throughput: 1800,
    errors: 0.1,
    lastUpdate: new Date()
  },
  {
    id: '3',
    name: 'EU-West',
    country: 'Ireland',
    coordinates: { x: 48, y: 25 },
    status: 'warning',
    latency: 89,
    throughput: 1200,
    errors: 2.1,
    lastUpdate: new Date()
  },
  {
    id: '4',
    name: 'APAC',
    country: 'Singapore',
    coordinates: { x: 75, y: 55 },
    status: 'normal',
    latency: 120,
    throughput: 900,
    errors: 0.5,
    lastUpdate: new Date()
  },
  {
    id: '5',
    name: 'South America',
    country: 'Brazil',
    coordinates: { x: 35, y: 70 },
    status: 'normal',
    latency: 156,
    throughput: 600,
    errors: 1.2,
    lastUpdate: new Date()
  },
  {
    id: '6',
    name: 'Africa',
    country: 'South Africa',
    coordinates: { x: 52, y: 65 },
    status: 'critical',
    latency: 234,
    throughput: 300,
    errors: 8.7,
    lastUpdate: new Date()
  }
]

const INITIAL_CHART_DATA = [
  { time: '10:00:00', value: 45 },
  { time: '10:00:05', value: 48 },
  { time: '10:00:10', value: 52 },
  { time: '10:00:15', value: 49 },
  { time: '10:00:20', value: 55 },
  { time: '10:00:25', value: 58 },
  { time: '10:00:30', value: 62 },
  { time: '10:00:35', value: 65 },
  { time: '10:00:40', value: 61 },
  { time: '10:00:45', value: 67 }
]

export default function StreamPulse() {
  const [locations, setLocations] = useState<LocationData[]>(INITIAL_LOCATIONS)
  const [chartData, setChartData] = useState(INITIAL_CHART_DATA)
  const [isSimulating, setIsSimulating] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null)
  const [recentAnomalies, setRecentAnomalies] = useState<AnomalyEvent[]>([])

  useEffect(() => {
    if (!isSimulating) return

    const interval = setInterval(() => {
      // Update locations with random changes
      setLocations(prevLocations => 
        prevLocations.map(location => {
          const latencyChange = (Math.random() - 0.5) * 20
          const throughputChange = (Math.random() - 0.5) * 200
          const errorChange = (Math.random() - 0.5) * 2
          
          const newLatency = Math.max(10, Math.min(500, location.latency + latencyChange))
          const newThroughput = Math.max(100, Math.min(5000, location.throughput + throughputChange))
          const newErrors = Math.max(0, Math.min(20, location.errors + errorChange))
          
          // Determine status based on metrics
          let status: 'normal' | 'warning' | 'critical' = 'normal'
          if (newLatency > 200 || newErrors > 5) {
            status = 'critical'
          } else if (newLatency > 100 || newErrors > 2) {
            status = 'warning'
          }
          
          return {
            ...location,
            latency: Math.round(newLatency),
            throughput: Math.round(newThroughput),
            errors: Math.round(newErrors * 10) / 10,
            status,
            lastUpdate: new Date()
          }
        })
      )
    }, 3000)

    return () => clearInterval(interval)
  }, [isSimulating])

  const handleAnomalyDetected = (anomaly: AnomalyEvent) => {
    setRecentAnomalies(prev => [anomaly, ...prev.slice(0, 9)])
    
    // Update affected location
    setLocations(prevLocations =>
      prevLocations.map(location =>
        location.name === anomaly.location
          ? { ...location, status: anomaly.severity === 'critical' ? 'critical' : 'warning' }
          : location
      )
    )
  }

  const handleLocationClick = (location: LocationData) => {
    setSelectedLocation(location)
  }

  const resetData = () => {
    setLocations(INITIAL_LOCATIONS)
    setChartData(INITIAL_CHART_DATA)
    setRecentAnomalies([])
    setSelectedLocation(null)
    setIsSimulating(false)
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full surface-glass-subtle z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-glow">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gradient">StreamPulse</h1>
                <p className="text-xs text-muted-foreground">Real-time Anomaly Detection</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={resetData}
                className="border-border hover:bg-muted/50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Badge
                variant="secondary"
                className={cn(
                  "bg-emerald-500/15 text-emerald-200 border-emerald-500/30",
                  isSimulating && "bg-red-500/15 text-red-200 border-red-500/30"
                )}
              >
                <span className={cn(
                  "mr-2 inline-block h-2 w-2 rounded-full",
                  isSimulating ? "bg-red-400 pulse-glow" : "bg-emerald-400"
                )} />
                {isSimulating ? 'Detecting' : 'Monitoring'}
              </Badge>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-muted/30 rounded-full px-4 py-2 mb-8 surface-glass-subtle">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent-foreground">AI-Powered Detection</span>
            </div>
            
            <h1 className="text-6xl font-bold mb-6 leading-tight text-gradient animate-er-gradient">
              Real-time
              <br />
              Anomaly Detection
            </h1>
            
            <p className="text-xl text-muted-foreground mb-12 leading-relaxed max-w-3xl mx-auto">
              Advanced AI-powered monitoring system that detects anomalies in real-time across 
              your global infrastructure with intelligent alerts and predictive insights.
            </p>
            
            <div className="flex items-center justify-center space-x-8">
              <div className="text-center animate-er-float">
                <div className="text-3xl font-bold text-gradient">99.9%</div>
                <div className="text-sm text-muted-foreground">Detection Accuracy</div>
              </div>
              <div className="text-center animate-er-float" style={{ animationDelay: '0.5s' }}>
                <div className="text-3xl font-bold text-gradient">&lt;100ms</div>
                <div className="text-sm text-muted-foreground">Response Time</div>
              </div>
              <div className="text-center animate-er-float" style={{ animationDelay: '1s' }}>
                <div className="text-3xl font-bold text-gradient">24/7</div>
                <div className="text-sm text-muted-foreground">Monitoring</div>
              </div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <Card className="surface-glass hover:shadow-glow transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold">Instant Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Machine learning algorithms detect anomalies in milliseconds with 99.9% accuracy
                </p>
                <div className="flex items-center text-sm text-primary font-medium">
                  <ArrowRight className="w-4 h-4 mr-1" />
                  Learn more
                </div>
              </CardContent>
            </Card>

            <Card className="surface-glass hover:shadow-glow transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-secondary to-secondary/80 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold">Global Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Monitor infrastructure across 6 continents with real-time geographic visualization
                </p>
                <div className="flex items-center text-sm text-secondary font-medium">
                  <ArrowRight className="w-4 h-4 mr-1" />
                  Learn more
                </div>
              </CardContent>
            </Card>

            <Card className="surface-glass hover:shadow-glow transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-br from-accent to-accent/80 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold">Predictive Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  AI-powered predictions alert you before issues impact your systems
                </p>
                <div className="flex items-center text-sm text-accent font-medium">
                  <ArrowRight className="w-4 h-4 mr-1" />
                  Learn more
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Dashboard */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gradient">Live Infrastructure Monitoring</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Monitor your global infrastructure in real-time with advanced anomaly detection and intelligent alerts.
            </p>
          </div>

          {/* Geographic Map */}
          <GeographicMap 
            data={locations}
            onLocationClick={handleLocationClick}
          />

          {/* Animated Charts */}
          <div className="mt-12">
            <AnimatedCharts 
              data={chartData}
              isSimulating={isSimulating}
            />
          </div>

          {/* Anomaly Simulator */}
          <div className="mt-12">
            <AnomalySimulator
              onAnomalyDetected={handleAnomalyDetected}
              isSimulating={isSimulating}
              onToggleSimulation={() => setIsSimulating(!isSimulating)}
            />
          </div>

          {/* System Status Overview */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="surface-glass">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Locations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{locations.length}</div>
                <div className="text-xs text-muted-foreground">Active monitoring</div>
              </CardContent>
            </Card>

            <Card className="surface-glass">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(locations.reduce((sum, loc) => sum + loc.latency, 0) / locations.length)}ms
                </div>
                <div className="text-xs text-muted-foreground">Global average</div>
              </CardContent>
            </Card>

            <Card className="surface-glass">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Throughput</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(locations.reduce((sum, loc) => sum + loc.throughput, 0) / 1000)}K/s
                </div>
                <div className="text-xs text-muted-foreground">Requests per second</div>
              </CardContent>
            </Card>

            <Card className="surface-glass">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(locations.reduce((sum, loc) => sum + loc.errors, 0) / locations.length).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">Global average</div>
              </CardContent>
            </Card>
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 surface-glass-subtle">
                <Database className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-time Data</h3>
              <p className="text-muted-foreground">Stream processing at scale</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4 surface-glass-subtle">
                <BarChart3 className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Advanced Analytics</h3>
              <p className="text-muted-foreground">ML-powered insights</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 surface-glass-subtle">
                <Shield className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Enterprise Security</h3>
              <p className="text-muted-foreground">SOC2 compliant</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 surface-glass-subtle">
                <Cloud className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Cloud Native</h3>
              <p className="text-muted-foreground">Scalable architecture</p>
            </div>
          </div>

          <footer className="mt-14 border-t border-border py-10 text-center">
            <p className="text-sm text-muted-foreground">© 2026 StreamPulse. Real-time Anomaly Detection Platform.</p>
          </footer>
        </div>
      </section>
    </div>
  )
}
