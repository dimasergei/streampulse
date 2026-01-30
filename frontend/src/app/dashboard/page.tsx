'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'

export default function Dashboard() {
  const [liveData, setLiveData] = useState<any[]>([])
  const [metrics, setMetrics] = useState({
    eventsPerSecond: 0,
    avgLatency: 0,
    anomalies: 0,
  })

  useEffect(() => {
    // WebSocket connection for real-time updates
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!)
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'metric') {
        setLiveData(prev => [...prev.slice(-100), data])
      } else if (data.type === 'stats') {
        setMetrics(data.stats)
      }
    }
    
    return () => ws.close()
  }, [])

  return (
    <div className="p-8 bg-gray-900 min-h-screen">
      <h1 className="text-4xl font-bold text-white mb-8">StreamPulse Dashboard</h1>
      
      {/* Real-time metrics */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <MetricCard 
          title="Events/Second" 
          value={metrics.eventsPerSecond.toFixed(0)}
          subtitle="Processing rate"
        />
        <MetricCard 
          title="Avg Latency" 
          value={`${metrics.avgLatency.toFixed(1)}ms`}
          subtitle="Query performance"
        />
        <MetricCard 
          title="Anomalies Today" 
          value={metrics.anomalies}
          subtitle="Detected outliers"
        />
      </div>
      
      {/* Live chart */}
      <Card className="p-6 bg-gray-800">
        <h2 className="text-white text-xl mb-4">Real-Time Data Stream</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={liveData}>
            <XAxis dataKey="timestamp" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}

function MetricCard({ title, value, subtitle }: any) {
  return (
    <Card className="p-6 bg-gray-800">
      <p className="text-gray-400 text-sm mb-2">{title}</p>
      <p className="text-4xl font-bold text-white mb-1">{value}</p>
      <p className="text-gray-500 text-xs">{subtitle}</p>
    </Card>
  )
}
