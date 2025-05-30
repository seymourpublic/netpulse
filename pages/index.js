import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Play, Pause, Wifi, Activity, TrendingUp, Clock, MapPin, Award } from 'lucide-react';

const NETPULSE = () => {
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState({
    download: 0,
    upload: 0,
    latency: 0,
    jitter: 0,
    packetLoss: 0
  });
  const [testHistory, setTestHistory] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('download');
  const [ispRankings, setIspRankings] = useState([]);
  const [networkInfo, setNetworkInfo] = useState({
    isp: 'Detecting...',
    type: 'WiFi',
    location: 'Unknown',
    ip: 'Fetching...'
  });
  const intervalRef = useRef(null);

  // Mock ISP data
  const mockISPs = [
    { name: 'Fiber Pro', avgSpeed: 950, reliability: 98, region: 'Urban' },
    { name: 'Cable Connect', avgSpeed: 420, reliability: 94, region: 'Urban' },
    { name: 'DSL Plus', avgSpeed: 85, reliability: 89, region: 'Rural' },
    { name: 'Mobile Max', avgSpeed: 180, reliability: 92, region: 'Mobile' },
    { name: 'Satellite Link', avgSpeed: 45, reliability: 85, region: 'Rural' }
  ];

  // Generate mock historical data
  const generateMockHistory = () => {
    const history = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      history.push({
        timestamp: time.toISOString(),
        download: Math.random() * 400 + 100,
        upload: Math.random() * 50 + 20,
        latency: Math.random() * 30 + 10,
        jitter: Math.random() * 5 + 1,
        packetLoss: Math.random() * 2,
        hour: time.getHours(),
        time: `${time.getHours()}:00`
      });
    }
    return history;
  };

  // Simulate speed test
  const runSpeedTest = () => {
    setIsTestRunning(true);
    let progress = 0;
    
    intervalRef.current = setInterval(() => {
      progress += 2;
      
      const downloadTarget = Math.random() * 400 + 100;
      const uploadTarget = Math.random() * 50 + 20;
      const latencyTarget = Math.random() * 30 + 10;
      
      setCurrentTest({
        download: Math.max(0, (downloadTarget * Math.min(progress / 100, 1)) + Math.random() * 20 - 10),
        upload: Math.max(0, (uploadTarget * Math.min(progress / 100, 1)) + Math.random() * 5 - 2.5),
        latency: Math.max(1, latencyTarget + Math.random() * 10 - 5),
        jitter: Math.max(0, Math.random() * 5 + 1),
        packetLoss: Math.max(0, Math.random() * 2)
      });

      if (progress >= 100) {
        clearInterval(intervalRef.current);
        setIsTestRunning(false);
        
        const newTest = {
          timestamp: new Date().toISOString(),
          download: downloadTarget,
          upload: uploadTarget,
          latency: latencyTarget,
          jitter: Math.random() * 5 + 1,
          packetLoss: Math.random() * 2,
          hour: new Date().getHours(),
          time: `${new Date().getHours()}:00`
        };
        
        setTestHistory(prev => [newTest, ...prev.slice(0, 23)]);
      }
    }, 100);
  };

  const stopTest = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      setIsTestRunning(false);
    }
  };

  // Initialize data
  useEffect(() => {
    setTestHistory(generateMockHistory());
    setIspRankings(mockISPs);
    
    setTimeout(() => {
      setNetworkInfo({
        isp: 'Fiber Pro Networks',
        type: 'Fiber',
        location: 'New York, NY',
        ip: '192.168.1.100'
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const getSpeedColor = (speed) => {
    if (speed > 300) return 'text-green-400';
    if (speed > 100) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSpeedGrade = (speed) => {
    if (speed > 300) return 'Excellent';
    if (speed > 100) return 'Good';
    if (speed > 50) return 'Fair';
    return 'Poor';
  };

  // Generate heatmap hours
  const generateHeatmapHours = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      let speed = 200;
      if (i >= 19 && i <= 23) speed *= 0.6; // Evening slowdown
      if (i >= 8 && i <= 10) speed *= 0.8; // Morning slowdown
      
      const intensity = Math.min(speed, 400) / 400;
      hours.push({
        hour: i,
        speed: speed + Math.random() * 50 - 25,
        intensity
      });
    }
    return hours;
  };

  const heatmapHours = generateHeatmapHours();

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)', color: 'white', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header style={{ 
        background: 'rgba(30, 41, 59, 0.5)', 
        backdropFilter: 'blur(10px)', 
        borderBottom: '1px solid #374151',
        padding: '1rem 0'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                padding: '0.5rem', 
                background: '#3b82f6', 
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Activity size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0' }}>NETPULSE</h1>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0' }}>Internet Performance Monitor</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Wifi size={16} color="#60a5fa" />
                <span>{networkInfo.isp}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={16} color="#4ade80" />
                <span>{networkInfo.location}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Speed Test Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          {/* Main Speed Test */}
          <div style={{ 
            gridColumn: 'span 2',
            background: 'rgba(30, 41, 59, 0.3)', 
            backdropFilter: 'blur(10px)', 
            borderRadius: '1rem', 
            padding: '2rem', 
            border: '1px solid #374151',
            minWidth: '300px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Internet Speed Test</h2>
              <button
                onClick={isTestRunning ? stopTest : runSpeedTest}
                style={{
                  padding: '1rem 2rem',
                  borderRadius: '0.75rem',
                  fontWeight: '600',
                  fontSize: '1.125rem',
                  background: isTestRunning ? '#ef4444' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  margin: '0 auto',
                  transition: 'all 0.2s',
                  transform: 'scale(1)'
                }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
              >
                {isTestRunning ? <Pause size={20} /> : <Play size={20} />}
                <span>{isTestRunning ? 'Stop Test' : 'Start Test'}</span>
              </button>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
              gap: '1.5rem',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#60a5fa', marginBottom: '0.5rem' }}>
                  {currentTest.download.toFixed(1)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Mbps Download</div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }} className={getSpeedColor(currentTest.download)}>
                  {getSpeedGrade(currentTest.download)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4ade80', marginBottom: '0.5rem' }}>
                  {currentTest.upload.toFixed(1)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Mbps Upload</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#facc15', marginBottom: '0.5rem' }}>
                  {currentTest.latency.toFixed(0)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>ms Latency</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#a855f7', marginBottom: '0.5rem' }}>
                  {currentTest.jitter.toFixed(1)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>ms Jitter</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f87171', marginBottom: '0.5rem' }}>
                  {currentTest.packetLoss.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Packet Loss</div>
              </div>
            </div>
          </div>

          {/* Network Info */}
          <div style={{ 
            background: 'rgba(30, 41, 59, 0.3)', 
            backdropFilter: 'blur(10px)', 
            borderRadius: '1rem', 
            padding: '1.5rem', 
            border: '1px solid #374151'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Connection Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Internet Provider</div>
                <div style={{ fontWeight: '600' }}>{networkInfo.isp}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Connection Type</div>
                <div style={{ fontWeight: '600' }}>{networkInfo.type}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Location</div>
                <div style={{ fontWeight: '600' }}>{networkInfo.location}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>IP Address</div>
                <div style={{ fontWeight: '600', fontFamily: 'monospace', fontSize: '0.875rem' }}>{networkInfo.ip}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          {/* Historical Performance */}
          <div style={{ 
            background: 'rgba(30, 41, 59, 0.3)', 
            backdropFilter: 'blur(10px)', 
            borderRadius: '1rem', 
            padding: '1.5rem', 
            border: '1px solid #374151'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0' }}>Performance History</h3>
              <select 
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                style={{
                  background: '#374151',
                  border: '1px solid #4b5563',
                  borderRadius: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  color: 'white'
                }}
              >
                <option value="download">Download Speed</option>
                <option value="upload">Upload Speed</option>
                <option value="latency">Latency</option>
              </select>
            </div>
            <div style={{ height: '250px' }}>
              {testHistory && testHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={testHistory.slice().reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#9CA3AF"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: 'white'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey={selectedMetric} 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                  No data available. Run some speed tests to see history.
                </div>
              )}
            </div>
          </div>

          {/* ISP Rankings */}
          <div style={{ 
            background: 'rgba(30, 41, 59, 0.3)', 
            backdropFilter: 'blur(10px)', 
            borderRadius: '1rem', 
            padding: '1.5rem', 
            border: '1px solid #374151'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Award size={20} color="#facc15" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0' }}>ISP Rankings</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {ispRankings.map((isp, index) => (
                <div 
                  key={isp.name} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '0.75rem', 
                    background: 'rgba(55, 65, 81, 0.3)', 
                    borderRadius: '0.5rem' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      fontWeight: 'bold',
                      background: index === 0 ? '#facc15' : 
                                 index === 1 ? '#9ca3af' : 
                                 index === 2 ? '#f59e0b' : '#4b5563',
                      color: index < 3 ? 'black' : 'white'
                    }}>
                      {index + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600' }}>{isp.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{isp.region}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600' }}>{isp.avgSpeed} Mbps</div>
                    <div style={{ fontSize: '0.75rem', color: '#4ade80' }}>{isp.reliability}% reliable</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Heatmap */}
        <div style={{ 
          background: 'rgba(30, 41, 59, 0.3)', 
          backdropFilter: 'blur(10px)', 
          borderRadius: '1rem', 
          padding: '1.5rem', 
          border: '1px solid #374151',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <Clock size={20} color="#3b82f6" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0' }}>Best & Worst Times</h3>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: '0 0 0 1rem' }}>Peak performance hours analysis</p>
          </div>
          
          {/* Hour labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: '2px', marginBottom: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
            {Array.from({length: 24}, (_, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                {i % 4 === 0 ? `${i}:00` : ''}
              </div>
            ))}
          </div>
          
          {/* Heatmap */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: '2px', marginBottom: '1rem' }}>
            {heatmapHours.map((data, index) => (
              <div
                key={index}
                style={{
                  aspectRatio: '1',
                  borderRadius: '2px',
                  background: `rgba(59, 130, 246, ${data.intensity * 0.8 + 0.1})`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}
                title={`${data.hour}:00 - ${data.speed.toFixed(0)} Mbps`}
              >
                {data.hour % 6 === 0 ? data.hour : ''}
              </div>
            ))}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
            <span>Hours of the day (0-23)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Slower</span>
              <div style={{ display: 'flex', gap: '2px' }}>
                {[0.1, 0.3, 0.5, 0.7, 0.9].map(opacity => (
                  <div
                    key={opacity}
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '2px',
                      background: `rgba(59, 130, 246, ${opacity})`
                    }}
                  />
                ))}
              </div>
              <span>Faster</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div style={{ 
            background: 'rgba(30, 41, 59, 0.3)', 
            backdropFilter: 'blur(10px)', 
            borderRadius: '0.75rem', 
            padding: '1.5rem', 
            border: '1px solid #374151',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa', marginBottom: '0.5rem' }}>
              {testHistory.length ? (testHistory.reduce((acc, test) => acc + test.download, 0) / testHistory.length).toFixed(1) : '0'}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Average Download (Mbps)</div>
          </div>
          <div style={{ 
            background: 'rgba(30, 41, 59, 0.3)', 
            backdropFilter: 'blur(10px)', 
            borderRadius: '0.75rem', 
            padding: '1.5rem', 
            border: '1px solid #374151',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ade80', marginBottom: '0.5rem' }}>
              {testHistory.length}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Tests Completed</div>
          </div>
          <div style={{ 
            background: 'rgba(30, 41, 59, 0.3)', 
            backdropFilter: 'blur(10px)', 
            borderRadius: '0.75rem', 
            padding: '1.5rem', 
            border: '1px solid #374151',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#facc15', marginBottom: '0.5rem' }}>
              {testHistory.length ? Math.min(...testHistory.map(t => t.latency)).toFixed(0) : '0'}ms
            </div>
            <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Best Latency</div>
          </div>
          <div style={{ 
            background: 'rgba(30, 41, 59, 0.3)', 
            backdropFilter: 'blur(10px)', 
            borderRadius: '0.75rem', 
            padding: '1.5rem', 
            border: '1px solid #374151',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#a855f7', marginBottom: '0.5rem' }}>98.5%</div>
            <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Uptime Score</div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NETPULSE;