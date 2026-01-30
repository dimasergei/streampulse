'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Activity, Zap, AlertCircle, TrendingUp, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface AnomalySimulatorProps {
  onAnomalyDetected: (anomaly: AnomalyEvent) => void
  isSimulating: boolean
  onToggleSimulation: () => void
}

export function AnomalySimulator({ 
  onAnomalyDetected, 
  isSimulating, 
  onToggleSimulation 
}: AnomalySimulatorProps) {
  const [recentAnomalies, setRecentAnomalies] = useState<AnomalyEvent[]>([])

  const anomalyTypes = [
    { type: 'spike', description: 'Sudden traffic spike detected', icon: <TrendingUp className="w-4 h-4" /> },
    { type: 'drop', description: 'Unusual drop in performance', icon: <Activity className="w-4 h-4" /> },
    { type: 'pattern', description: 'Abnormal traffic pattern', icon: <Zap className="w-4 h-4" /> },
    { type: 'outlier', description: 'Statistical outlier detected', icon: <AlertCircle className="w-4 h-4" /> }
  ]

  const locations = [
    'US-East', 'US-West', 'EU-West', 'APAC', 'South America', 'Africa'
  ]

  const metrics = [
    'Response Time', 'Error Rate', 'Throughput', 'CPU Usage', 'Memory Usage'
  ]

  const generateAnomaly = (): AnomalyEvent => {
    const type = anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)].type as AnomalyEvent['type']
    const severities: AnomalyEvent['severity'][] = ['low', 'medium', 'high', 'critical']
    const severity = severities[Math.floor(Math.random() * severities.length)]
    const location = locations[Math.floor(Math.random() * locations.length)]
    const metric = metrics[Math.floor(Math.random() * metrics.length)]
    
    const baseValue = Math.random() * 100
    const threshold = baseValue * (1 + Math.random() * 0.5)
    const value = threshold * (1 + Math.random() * 0.8)

    return {
      id: Math.random().toString(36).substr(2, 9),
      type,
      severity,
      location,
      metric,
      value: Math.round(value),
      threshold: Math.round(threshold),
      timestamp: new Date(),
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} detected in ${metric} at ${location}`
    }
  }

  useEffect(() => {
    if (!isSimulating) return

    const interval = setInterval(() => {
      const anomaly = generateAnomaly()
      setRecentAnomalies(prev => [anomaly, ...prev.slice(0, 4)])
      onAnomalyDetected(anomaly)
    }, 2000 + Math.random() * 3000)

    return () => clearInterval(interval)
  }, [isSimulating, onAnomalyDetected])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/15 text-red-200 border-red-500/30'
      case 'high': return 'bg-orange-500/15 text-orange-200 border-orange-500/30'
      case 'medium': return 'bg-yellow-500/15 text-yellow-200 border-yellow-500/30'
      case 'low': return 'bg-blue-500/15 text-blue-200 border-blue-500/30'
      default: return 'bg-gray-500/15 text-gray-200 border-gray-500/30'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'spike': return <TrendingUp className="w-4 h-4" />
      case 'drop': return <Activity className="w-4 h-4" />
      case 'pattern': return <Zap className="w-4 h-4" />
      case 'outlier': return <AlertCircle className="w-4 h-4" />
      default: return <AlertTriangle className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card className="surface-glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Anomaly Simulator
            <Badge 
              variant={isSimulating ? "destructive" : "secondary"}
              className={isSimulating ? "bg-red-500/15 text-red-200 border-red-500/30" : "bg-primary/15 text-primary-foreground border-primary/20"}
            >
              <span className={cn("mr-2 inline-block h-2 w-2 rounded-full", isSimulating ? "bg-red-400 pulse-glow" : "bg-primary")} />
              {isSimulating ? 'Simulating' : 'Ready'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Simulate real-time anomalies to test detection capabilities
              </p>
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <span>Types: {anomalyTypes.length}</span>
                <span>Locations: {locations.length}</span>
                <span>Metrics: {metrics.length}</span>
              </div>
            </div>
            <Button
              onClick={onToggleSimulation}
              className={cn(
                "transition-all duration-300",
                isSimulating 
                  ? "bg-red-500 hover:bg-red-600 text-white" 
                  : "bg-gradient-to-r from-primary to-accent text-white border-0 hover:opacity-90"
              )}
            >
              {isSimulating ? (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Stop Simulation
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  Start Simulation
                </>
              )}
            </Button>
          </div>

          {/* Anomaly Types */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {anomalyTypes.map((anomalyType, index) => (
              <motion.div
                key={anomalyType.type}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="surface-glass-subtle rounded-lg p-3 text-center"
              >
                <div className="flex justify-center mb-2 text-primary">
                  {anomalyType.icon}
                </div>
                <div className="text-xs font-medium capitalize">{anomalyType.type}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {anomalyType.description}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Anomalies */}
      <Card className="surface-glass">
        <CardHeader>
          <CardTitle className="text-lg">Recent Anomalies</CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatePresence>
            {recentAnomalies.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  {isSimulating ? 'Waiting for anomalies...' : 'Start simulation to see anomalies'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAnomalies.map((anomaly, index) => (
                  <motion.div
                    key={anomaly.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className={cn(
                      "surface-glass-subtle rounded-lg p-4 border transition-all duration-300",
                      isSimulating && "border-red-500/30 bg-red-500/5"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="mt-1">
                          {getTypeIcon(anomaly.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge className={getSeverityColor(anomaly.severity)}>
                              {anomaly.severity.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground capitalize">
                              {anomaly.type}
                            </span>
                          </div>
                          <p className="text-sm font-medium mb-1">{anomaly.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{anomaly.location}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Activity className="w-3 h-3" />
                              <span>{anomaly.metric}</span>
                            </div>
                            <div>
                              Value: {anomaly.value} (threshold: {anomaly.threshold})
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {anomaly.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}
