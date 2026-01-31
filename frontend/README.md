# StreamPulse - Real-Time Monitoring Dashboard

![StreamPulse](https://img.shields.io/badge/Vite-React-blue?style=flat-square&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)

Enterprise-grade real-time monitoring dashboard with Server-Sent Events (SSE) for live system metrics and global server health tracking.

## 🚀 Features

- **📊 Real-Time Monitoring**: Live system metrics updated every 2 seconds
- **🌍 Global Coverage**: Multi-region server health monitoring
- **⚡ Instant Updates**: Server-Sent Events for seamless data streaming
- **📈 Performance Analytics**: Response time, throughput, and error tracking
- **🎯 Anomaly Detection**: Automated issue identification and alerts
- **📱 Responsive Design**: Works perfectly on desktop, tablet, and mobile

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Glassmorphism Design
- **Real-Time**: Server-Sent Events (SSE)
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Build**: Vite + PostCSS

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dimasergei/streampulse.git
   cd streampulse/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Add your API keys to `.env.local`:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🏗️ Architecture

```
src/
├── api/
│   └── stream.ts            # SSE client implementation
├── mock-stream.ts           # Mock data generator
├── components/
│   ├── Button.tsx          # Reusable UI components
│   ├── Card.tsx            # Glass card components
│   └── Badge.tsx           # Status badges
├── App.tsx                 # Main dashboard component
├── main.tsx               # Vite entry point
└── globals.css            # Global styles
```

### Real-Time Data Streaming

The application uses Server-Sent Events for live data updates:

```typescript
const stopStream = startMockStream((metrics: StreamMetrics) => {
  setMetrics(metrics);
  // Real-time updates every 2 seconds
}, 2000);
```

## 📊 Live Demo

**🔗 [https://streampulse-bice.vercel.app](https://streampulse-bice.vercel.app)**

Experience real-time monitoring with:
- Live server metrics
- Global health status
- Anomaly detection
- Performance analytics

## 🎯 Key Features

### Real-Time Metrics
- Response time monitoring
- Throughput tracking
- Error rate analysis
- Active user counting
- Anomaly detection

### Multi-Region Monitoring
- US East/West servers
- European infrastructure
- Asian data centers
- Australian coverage
- South American presence

### Performance Analytics
- Historical trend analysis
- Performance bottleneck identification
- Capacity planning insights
- Health status indicators

## 🔧 Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Project Structure

- **`src/api/`**: SSE client and type definitions
- **`src/components/`**: Reusable React components
- **`src/App.tsx`**: Main dashboard with real-time logic
- **`public/`**: Static assets
- **`dist/`**: Production build output

## 🌟 Highlights

- **⚡ Real-Time Updates**: Live data streaming with SSE
- **🎨 Beautiful UI**: Glassmorphism design with smooth animations
- **📱 Responsive**: Works perfectly on desktop, tablet, and mobile
- **🔒 Secure**: Client-side monitoring with no data storage
- **🚀 Production Ready**: Optimized build with Vite

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For support, email dimitris@example.com or create an issue on GitHub.

---

**Built with ❤️ using React, TypeScript, and Server-Sent Events**
