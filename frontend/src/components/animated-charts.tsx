'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, TrendingUp, AlertTriangle, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataPoint {
  time: string
  value: number
  anomaly?: boolean
  type?: 'normal' | 'anomaly'
}

interface AnimatedChartsProps {
  data: DataPoint[]
  isSimulating?: boolean
}

export function AnimatedCharts({ data, isSimulating = false }: AnimatedChartsProps) {
  const [animatedData, setAnimatedData] = useState<DataPoint[]>(data)
  const [highlightedPoint, setHighlightedPoint] = useState<number | null>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    if (!isSimulating) {
      setAnimatedData(data)
      return
    }

    const animate = () => {
      setAnimatedData(prevData => {
        const newData = [...prevData]
        
        // Add new data point
        const lastValue = newData[newData.length - 1]?.value || 50
        const change = (Math.random() - 0.5) * 20
        const newValue = Math.max(0, Math.min(100, lastValue + change))
        
        const isAnomaly = Math.random() < 0.1 // 10% chance of anomaly
        
        newData.push({
          time: new Date().toLocaleTimeString(),
          value: newValue,
          anomaly: isAnomaly,
          type: isAnomaly ? 'anomaly' : 'normal'
        })
        
        // Keep only last 20 points
        if (newData.length > 20) {
          newData.shift()
        }
        
        return newData
      })
    }

    animationRef.current = window.setInterval(animate, 1000)

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current)
      }
    }
  }, [isSimulating, data])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="surface-glass p-3 rounded-lg border border-border">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-lg font-bold">{data.value}</p>
          {data.anomaly && (
            <p className="text-xs text-red-400 flex items-center">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Anomaly Detected
            </p>
          )}
        </div>
      )
    }
    return null
  }

  const getLineColor = (dataPoint: DataPoint) => {
    if (dataPoint.anomaly) return '#ef4444'
    return '#3b82f6'
  }

  const getAreaColor = (dataPoint: DataPoint) => {
    if (dataPoint.anomaly) return 'rgba(239, 68, 68, 0.3)'
    return 'rgba(59, 130, 246, 0.3)'
  }

  return (
    <div className="space-y-6">
      {/* Real-time Metrics Chart */}
      <Card className="surface-glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Real-time Metrics
            <Badge 
              variant={isSimulating ? "destructive" : "secondary"}
              className={isSimulating ? "bg-red-500/15 text-red-200 border-red-500/30" : "bg-primary/15 text-primary-foreground border-primary/20"}
            >
              <span className={cn("mr-2 inline-block h-2 w-2 rounded-full", isSimulating ? "bg-red-400 pulse-glow" : "bg-primary")} />
              {isSimulating ? 'Live' : 'Static'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={animatedData}>
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="anomalyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9ca3af"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorGradient)"
                  animationDuration={500}
                />
                {/* Anomaly overlay */}
                {animatedData.map((point, index) => (
                  point.anomaly && (
                    <Area
                      key={`anomaly-${index}`}
                      dataKey="value"
                      data={[{ time: point.time, value: 0 }, { time: point.time, value: point.value }]}
                      stroke="#ef4444"
                      strokeWidth={3}
                      fill="url(#anomalyGradient)"
                      animationDuration={300}
                    />
                  )
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Distribution Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="surface-glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Response Time Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { range: '0-100ms', count: Math.floor(Math.random() * 50) + 30 },
                  { range: '100-500ms', count: Math.floor(Math.random() * 30) + 10 },
                  { range: '500ms-1s', count: Math.floor(Math.random() * 20) + 5 },
                  { range: '1s+', count: Math.floor(Math.random() * 10) + 1 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis 
                    dataKey="range" 
                    stroke="#9ca3af"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" animationDuration={1000}>
                    {['#10b981', '#3b82f6', '#f59e0b', '#ef4444'].map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Throughput Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                  { time: '00:00', value: Math.floor(Math.random() * 1000) + 500 },
                  { time: '04:00', value: Math.floor(Math.random() * 1000) + 500 },
                  { time: '08:00', value: Math.floor(Math.random() * 2000) + 1000 },
                  { time: '12:00', value: Math.floor(Math.random() * 3000) + 2000 },
                  { time: '16:00', value: Math.floor(Math.random() * 2500) + 1500 },
                  { time: '20:00', value: Math.floor(Math.random() * 1500) + 800 },
                  { time: '23:59', value: Math.floor(Math.random() * 1000) + 500 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#9ca3af"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Anomaly Detection Status */}
      <Card className="surface-glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Anomaly Detection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="surface-glass-subtle rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                {animatedData.filter(d => !d.anomaly).length}
              </div>
              <div className="text-sm text-muted-foreground">Normal Points</div>
            </div>
            <div className="surface-glass-subtle rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-400">
                {animatedData.filter(d => d.anomaly).length}
              </div>
              <div className="text-sm text-muted-foreground">Anomalies</div>
            </div>
            <div className="surface-glass-subtle rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {animatedData.length > 0 ? Math.round((animatedData.filter(d => d.anomaly).length / animatedData.length) * 100) : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Anomaly Rate</div>
            </div>
            <div className="surface-glass-subtle rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">
                {animatedData.length > 0 ? Math.round(animatedData.reduce((sum, d) => sum + d.value, 0) / animatedData.length) : 0}
              </div>
              <div className="text-sm text-muted-foreground">Avg Value</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
