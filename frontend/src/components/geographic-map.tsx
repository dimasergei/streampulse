'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Activity, AlertTriangle, TrendingUp } from 'lucide-react'
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

interface GeographicMapProps {
  data: LocationData[]
  onLocationClick?: (location: LocationData) => void
}

export function GeographicMap({ data, onLocationClick }: GeographicMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null)
  const [pulseLocations, setPulseLocations] = useState<Set<string>>(new Set())

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseLocations(new Set(data.filter(loc => loc.status !== 'normal').map(loc => loc.id)))
    }, 2000)

    return () => clearInterval(interval)
  }, [data])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-500'
      case 'warning': return 'bg-yellow-500'
      case 'normal': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusRingColor = (status: string) => {
    switch (status) {
      case 'critical': return 'ring-red-500/50'
      case 'warning': return 'ring-yellow-500/50'
      case 'normal': return 'ring-green-500/50'
      default: return 'ring-gray-500/50'
    }
  }

  const formatLatency = (latency: number) => {
    if (latency < 1000) return `${latency}ms`
    return `${(latency / 1000).toFixed(1)}s`
  }

  const formatThroughput = (throughput: number) => {
    if (throughput >= 1000000) return `${(throughput / 1000000).toFixed(1)}M/s`
    if (throughput >= 1000) return `${(throughput / 1000).toFixed(1)}K/s`
    return `${throughput}/s`
  }

  return (
    <div className="space-y-6">
      {/* Map */}
      <Card className="surface-glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Global Infrastructure Map
            <Badge variant="secondary" className="bg-primary/15 text-primary-foreground border-primary/20">
              {data.length} Locations
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full h-96 surface-glass-subtle rounded-lg overflow-hidden border border-border">
            {/* World Map Background */}
            <div className="absolute inset-0 opacity-20">
              <svg viewBox="0 0 800 400" className="w-full h-full">
                {/* Simplified world map outline */}
                <path
                  d="M 100 150 Q 200 100 300 150 T 500 150 Q 600 100 700 150"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-muted-foreground"
                />
                <path
                  d="M 150 200 Q 250 180 350 200 T 550 200"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-muted-foreground"
                />
                <path
                  d="M 200 250 Q 300 230 400 250 T 600 250"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-muted-foreground"
                />
              </svg>
            </div>

            {/* Location Points */}
            {data.map((location) => (
              <motion.div
                key={location.id}
                className="absolute cursor-pointer"
                style={{
                  left: `${location.coordinates.x}%`,
                  top: `${location.coordinates.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                onClick={() => {
                  setSelectedLocation(location)
                  onLocationClick?.(location)
                }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                {/* Pulse effect for active locations */}
                {pulseLocations.has(location.id) && (
                  <motion.div
                    className={cn(
                      "absolute inset-0 rounded-full",
                      getStatusRingColor(location.status)
                    )}
                    animate={{
                      scale: [1, 2, 1],
                      opacity: [0.8, 0, 0.8],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                )}

                {/* Location marker */}
                <div className="relative">
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border-2 border-white shadow-lg",
                      getStatusColor(location.status)
                    )}
                  />
                  {location.status !== 'normal' && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [1, 0.5, 1],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}
                </div>

                {/* Location label */}
                <div className="absolute top-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <div className="surface-glass px-2 py-1 rounded text-xs font-medium">
                    {location.name}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 surface-glass rounded-lg p-3">
              <div className="text-xs font-medium mb-2">Status</div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs">Normal</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-xs">Warning</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-xs">Critical</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Location Details */}
      {selectedLocation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="surface-glass">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                {selectedLocation.name}
                <Badge className={getStatusColor(selectedLocation.status)}>
                  {selectedLocation.status.toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="surface-glass-subtle rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Latency</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {formatLatency(selectedLocation.latency)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedLocation.latency < 100 ? 'Excellent' : selectedLocation.latency < 500 ? 'Good' : 'Poor'}
                  </div>
                </div>

                <div className="surface-glass-subtle rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-secondary" />
                    <span className="text-sm font-medium">Throughput</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {formatThroughput(selectedLocation.throughput)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Requests per second
                  </div>
                </div>

                <div className="surface-glass-subtle rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium">Error Rate</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {selectedLocation.errors}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedLocation.errors < 1 ? 'Healthy' : selectedLocation.errors < 5 ? 'Warning' : 'Critical'}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>Country: {selectedLocation.country}</span>
                <span>Last updated: {selectedLocation.lastUpdate.toLocaleTimeString()}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Location Summary */}
      <Card className="surface-glass">
        <CardHeader>
          <CardTitle className="text-lg">Location Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {data.filter(loc => loc.status === 'normal').length}
              </div>
              <div className="text-sm text-muted-foreground">Normal</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {data.filter(loc => loc.status === 'warning').length}
              </div>
              <div className="text-sm text-muted-foreground">Warning</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                {data.filter(loc => loc.status === 'critical').length}
              </div>
              <div className="text-sm text-muted-foreground">Critical</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
