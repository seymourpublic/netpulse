import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  Play,
  Pause,
  Wifi,
  Activity,
  TrendingUp,
  Clock,
  MapPin,
  Award,
  Zap,
  Shield,
  Globe,
} from 'lucide-react';

const NETPULSE = () => {
  // Main state management
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testState, setTestState] = useState({
    stage: 'idle', // idle, server_selection, latency, download, upload, packet_loss, analysis, complete, error
    progress: 0,
    currentSpeed: 0,
    server: null,
    error: null,
  });

  const [currentTest, setCurrentTest] = useState({
    download: { speed: 0, consistency: 0 },
    upload: { speed: 0, consistency: 0 },
    latency: { avg: 0, min: 0, max: 0, jitter: 0 },
    packetLoss: 0,
    quality: { score: 0, grade: 'N/A' },
    reliability: 0,
  });

  const [testHistory, setTestHistory] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('download');
  const [ispRankings, setIspRankings] = useState([]);
  const [networkInfo, setNetworkInfo] = useState({
    isp: 'Detecting...',
    type: 'Unknown',
    location: 'Detecting location...',
    ip: 'Fetching...',
  });

  // Notification state
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'success' // 'success', 'error', 'info'
  });

  // Real-time data for charts
  const [realTimeData, setRealTimeData] = useState({
    latency: [],
    downloadSpeeds: [],
    uploadSpeeds: [],
  });

  // Session management
  const [sessionToken] = useState(
    () => `netpulse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  // WebSocket connection
  const wsRef = useRef(null);
  const intervalRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);

  // Ports configuration - detect current port and use API server port
  const CURRENT_PORT = '3000';
  const API_PORT = 5000;
  const API_BASE_URL = `http://localhost:${API_PORT}`;
  
  console.log(`Frontend running on port: ${CURRENT_PORT}, API server on port: ${API_PORT}`);

  // Initialize WebSocket connection and data fetching
  useEffect(() => {
    connectWebSocket();
    fetchInitialData();
    checkServerStatus();

    // Set up periodic server status checks
    const statusInterval = setInterval(checkServerStatus, 30000); // Check every 30 seconds

    return () => {
      disconnectWebSocket();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearInterval(statusInterval);
    };
  }, []);

  // Check server status
  const checkServerStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        setApiConnected(true);
        console.log('✅ API server is connected');
      } else {
        setApiConnected(false);
        console.warn('⚠️ API server returned non-OK status:', response.status);
      }
    } catch (error) {
      setApiConnected(false);
      console.error('❌ API server connection failed:', error);
    }
  };

  const connectWebSocket = () => {
    try {
      // WebSocket should connect to the same server that serves the API
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//localhost:${API_PORT}`;
      
      console.log('🔌 Attempting WebSocket connection to:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('🔗 WebSocket connected');
        setWsConnected(true);
        
        // Subscribe to speed test updates
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'subscribe',
              sessionToken: sessionToken,
            })
          );
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
        setWsConnected(false);
        
        // Attempt to reconnect after 3 seconds, but only if not intentionally closed
        if (event.code !== 1000) { // 1000 = normal closure
          setTimeout(() => {
            if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
              connectWebSocket();
            }
          }, 3000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setWsConnected(false);
    }
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting'); // Normal closure
      wsRef.current = null;
      setWsConnected(false);
    }
  };

  // Handle real-time WebSocket updates
  const handleWebSocketMessage = (message) => {
    switch (message.type) {
      case 'speedtest_update':
        handleSpeedTestUpdate(message);
        break;
      case 'connected':
        console.log('✅ WebSocket session established');
        break;
      case 'subscribed':
        console.log('✅ Subscribed to speed test updates');
        break;
      case 'pong':
        // Keep-alive response
        break;
      default:
        console.log('Unknown WebSocket message:', message);
    }
  };

  // Handle speed test real-time updates
  const handleSpeedTestUpdate = (message) => {
    const { event, data } = message;

    switch (event) {
      case 'test_started':
        setIsTestRunning(true);
        setTestState({
          stage: 'server_selection',
          progress: 0,
          currentSpeed: 0,
          server: null,
          error: null,
        });
        setRealTimeData({ latency: [], downloadSpeeds: [], uploadSpeeds: [] });
        break;

      case 'stage_started':
        setTestState((prev) => ({
          ...prev,
          stage: data.stage,
          progress: data.progress || prev.progress,
        }));
        break;

      case 'stage_completed':
        setTestState((prev) => ({
          ...prev,
          progress: data.progress,
          ...(data.stage === 'server_selection' && { server: data.data }),
        }));
        break;

      case 'latency_sample':
        setTestState((prev) => ({
          ...prev,
          currentSpeed: data.currentAvg,
        }));
        setRealTimeData((prev) => ({
          ...prev,
          latency: [...prev.latency.slice(-20), data.sample],
        }));
        break;

      case 'download_progress':
        setTestState((prev) => ({
          ...prev,
          currentSpeed: data.currentSpeed,
        }));
        setRealTimeData((prev) => ({
          ...prev,
          downloadSpeeds: [...prev.downloadSpeeds.slice(-50), data.currentSpeed],
        }));
        break;

      case 'upload_progress':
        setTestState((prev) => ({
          ...prev,
          currentSpeed: data.currentSpeed,
        }));
        setRealTimeData((prev) => ({
          ...prev,
          uploadSpeeds: [...prev.uploadSpeeds.slice(-50), data.currentSpeed],
        }));
        break;

      case 'test_completed':
        setIsTestRunning(false);
        setTestState({
          stage: 'complete',
          progress: 100,
          currentSpeed: 0,
          server: data.server,
          error: null,
        });

        // Update current test results
        setCurrentTest({
          download: data.results.download || { speed: 0, consistency: 0 },
          upload: data.results.upload || { speed: 0, consistency: 0 },
          latency: data.results.latency || { avg: 0, min: 0, max: 0, jitter: 0 },
          packetLoss: data.results.packetLoss || 0,
          quality: data.results.quality || { score: 0, grade: 'N/A' },
          reliability: data.metadata?.reliability || 0,
        });

        // Add to test history
        addToTestHistory(data.results);
        break;

      case 'test_error':
        setIsTestRunning(false);
        setTestState((prev) => ({
          ...prev,
          stage: 'error',
          error: data.error,
        }));
        break;
    }
  };

  // Fetch initial data from backend with proper CORS handling
  const fetchInitialData = async () => {
    try {
      // Fetch test history
      try {
        const historyResponse = await fetch(
          `${API_BASE_URL}/api/speed-test/history?sessionToken=${sessionToken}&limit=24`,
          {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            }
          }
        );
        
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setTestHistory(historyData.tests || []);
        } else {
          console.warn('Failed to fetch test history:', historyResponse.status);
        }
      } catch (error) {
        console.error('Test history fetch failed:', error);
      }

      // Fetch ISP rankings
      try {
        const rankingsResponse = await fetch(
          `${API_BASE_URL}/api/isp/rankings?limit=10`,
          {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            }
          }
        );
        
        if (rankingsResponse.ok) {
          const rankingsData = await rankingsResponse.json();
          setIspRankings(rankingsData.rankings || []);
        } else {
          console.warn('Failed to fetch ISP rankings:', rankingsResponse.status);
        }
      } catch (error) {
        console.error('ISP rankings fetch failed:', error);
      }

      // Get network info from IP
      try {
        const networkResponse = await fetch(
          `${API_BASE_URL}/api/speed-test/network-info`,
          {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            }
          }
        );
        
        if (networkResponse.ok) {
          const networkData = await networkResponse.json();
          setNetworkInfo({
            isp: networkData.isp || 'Unknown ISP',
            type: networkData.connectionType || 'Unknown',
            location: `${networkData.location?.city || 'Unknown'}, ${
              networkData.location?.country || 'Unknown'
            }`,
            ip: networkData.ip || 'Unknown',
          });
        } else {
          console.warn('Failed to fetch network info:', networkResponse.status);
        }
      } catch (error) {
        console.error('Network info fetch failed:', error);
      }

    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    }
  };

  // Start comprehensive speed test with proper error handling
  const runComprehensiveSpeedTest = async () => {
    if (isTestRunning) return;

    if (!apiConnected) {
      setTestState(prev => ({
        ...prev,
        stage: 'error',
        error: 'API server is not available. Please check if the backend is running on port 5000.'
      }));
      return;
    }

    try {
      setIsTestRunning(true);
      setTestState({
        stage: 'initializing',
        progress: 0,
        currentSpeed: 0,
        server: null,
        error: null,
      });

      console.log('🚀 Starting comprehensive speed test...');

      const response = await fetch(
        `${API_BASE_URL}/api/speed-test/comprehensive`,
        {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionToken: sessionToken,
            testConfig: {
              testDuration: 15,
              latencyTests: 10,
              concurrentConnections: 4,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: `HTTP ${response.status}: ${errorText}` };
        }
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Speed test initiated successfully:', result);

      // If WebSocket is not connected, handle the result directly
      if (!wsConnected) {
        setIsTestRunning(false);
        setTestState({
          stage: 'complete',
          progress: 100,
          currentSpeed: 0,
          server: result.metadata?.server,
          error: null,
        });

        setCurrentTest({
          download: result.results?.download || { speed: 0, consistency: 0 },
          upload: result.results?.upload || { speed: 0, consistency: 0 },
          latency: result.results?.latency || { avg: 0, min: 0, max: 0, jitter: 0 },
          packetLoss: result.results?.packetLoss || 0,
          quality: result.results?.quality || { score: 0, grade: 'N/A' },
          reliability: result.metadata?.reliability || 0,
        });

        addToTestHistory(result.results);
      } else {
        // WebSocket is connected, but also update state with initial results
        // This provides immediate feedback while real-time updates continue
        if (result.results) {
          setCurrentTest({
            download: result.results?.download || { speed: 0, consistency: 0 },
            upload: result.results?.upload || { speed: 0, consistency: 0 },
            latency: result.results?.latency || { avg: 0, min: 0, max: 0, jitter: 0 },
            packetLoss: result.results?.packetLoss || 0,
            quality: result.results?.quality || { score: 0, grade: 'N/A' },
            reliability: result.metadata?.reliability || 0,
          });

          // Update test state to complete since we have results
          setIsTestRunning(false);
          setTestState({
            stage: 'complete',
            progress: 100,
            currentSpeed: 0,
            server: result.metadata?.server,
            error: null,
          });

          addToTestHistory(result.results);
          
          // Show success notification
          showNotification(
            `Speed test completed! Download: ${result.results?.download?.speed?.toFixed(1) || 0} Mbps, Upload: ${result.results?.upload?.speed?.toFixed(1) || 0} Mbps`,
            'success'
          );
        }
      }

      // The test will continue via WebSocket updates if connected
      // Final results will be handled in the WebSocket message handler

    } catch (error) {
      console.error('Speed test failed:', error);
      setIsTestRunning(false);
      setTestState(prev => ({
        ...prev,
        stage: 'error',
        error: error.message || 'Speed test failed to start'
      }));
    }
  };

  // Stop speed test
  const stopSpeedTest = () => {
    setIsTestRunning(false);
    setTestState({
      stage: 'idle',
      progress: 0,
      currentSpeed: 0,
      server: null,
      error: null,
    });

    // Reset current test display
    setCurrentTest({
      download: { speed: 0, consistency: 0 },
      upload: { speed: 0, consistency: 0 },
      latency: { avg: 0, min: 0, max: 0, jitter: 0 },
      packetLoss: 0,
      quality: { score: 0, grade: 'N/A' },
      reliability: 0,
    });
  };

  // Add test result to history
  const addToTestHistory = (results) => {
    const newTest = {
      timestamp: new Date().toISOString(),
      download: results.download?.speed || 0,
      upload: results.upload?.speed || 0,
      latency: results.latency?.avg || 0,
      jitter: results.latency?.jitter || 0,
      packetLoss: results.packetLoss || 0,
      qualityScore: results.quality?.score || 0,
      hour: new Date().getHours(),
      time: `${new Date().getHours()}:00`,
    };

    setTestHistory((prev) => [newTest, ...prev.slice(0, 23)]);
  };

  // Show notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Utility functions
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

  const getQualityColor = (score) => {
    if (score >= 90) return '#22c55e'; // green
    if (score >= 80) return '#eab308'; // yellow
    if (score >= 70) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const formatStage = (stage) => {
    return stage.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Generate heatmap data for best/worst times (deterministic to prevent hydration mismatch)
  const generateHeatmapHours = () => {
    const hours = [];

    // Predefined pattern to avoid Math.random() hydration issues
    const basePattern = [
      186, 223, 199, 207, 194, 207, 196, 184, 156, 146, 143, 217, 199, 181, 179, 219, 209, 189, 195, 120, 115, 128, 112,
      123,
    ];

    for (let i = 0; i < 24; i++) {
      // Use real data if available, otherwise use deterministic pattern
      const testData = testHistory.filter((test) => test.hour === i);
      let avgSpeed;

      if (testData.length > 0) {
        avgSpeed = testData.reduce((sum, test) => sum + test.download, 0) / testData.length;
      } else {
        // Use deterministic base pattern instead of Math.random()
        avgSpeed = basePattern[i];
      }

      const intensity = Math.min(avgSpeed, 400) / 400;
      hours.push({
        hour: i,
        speed: avgSpeed,
        intensity: Math.max(0.1, intensity),
      });
    }
    return hours;
  };

  const [heatmapHours, setHeatmapHours] = useState([]);

  // Generate heatmap only on client side to prevent hydration mismatch
  useEffect(() => {
    setHeatmapHours(generateHeatmapHours());
  }, [testHistory]);

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)',
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
      {/* Header */}
      <header
        style={{
          background: 'rgba(30, 41, 59, 0.5)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #374151',
          padding: '1rem 0',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  padding: '0.5rem',
                  background: '#3b82f6',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Activity size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0' }}>NETPULSE</h1>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0' }}>
                  {isTestRunning ? formatStage(testState.stage) : 'Internet Performance Monitor'}
                </p>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                fontSize: '0.875rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Wifi size={16} color="#60a5fa" />
                <span>{networkInfo.isp}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={16} color="#4ade80" />
                <span>{networkInfo.location}</span>
              </div>
              {testState.server && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Globe size={16} color="#f59e0b" />
                  <span>Server: {testState.server.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification.show && (
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            padding: '1rem 1.5rem',
            borderRadius: '0.5rem',
            background: notification.type === 'success' ? 'rgba(34, 197, 94, 0.9)' : 
                       notification.type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 
                       'rgba(59, 130, 246, 0.9)',
            color: 'white',
            fontSize: '0.875rem',
            maxWidth: '400px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            zIndex: 1000,
            animation: 'slideIn 0.3s ease-out',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {notification.type === 'success' && <span>✅</span>}
            {notification.type === 'error' && <span>❌</span>}
            {notification.type === 'info' && <span>ℹ️</span>}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Speed Test Section */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            marginBottom: '2rem',
          }}
        >
          {/* Main Speed Test */}
          <div
            style={{
              gridColumn: 'span 2',
              background: 'rgba(30, 41, 59, 0.3)',
              backdropFilter: 'blur(10px)',
              borderRadius: '1rem',
              padding: '2rem',
              border: '1px solid #374151',
              minWidth: '300px',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                Comprehensive Speed Test
              </h2>

              {/* Connection Status Alert */}
              {!apiConnected && (
                <div
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#fca5a5',
                  }}
                >
                  ⚠️ Backend server not connected. Please ensure the API server is running on port {API_PORT}.
                </div>
              )}

              {/* Progress indicator */}
              {isTestRunning && (
                <div style={{ marginBottom: '1rem' }}>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      background: 'rgba(55, 65, 81, 0.3)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <div
                      style={{
                        width: `${testState.progress}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                    {formatStage(testState.stage)} - {Math.round(testState.progress)}%
                    {testState.currentSpeed > 0 && (
                      <span style={{ marginLeft: '1rem', color: '#60a5fa' }}>
                        {testState.currentSpeed.toFixed(1)} Mbps
                      </span>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={isTestRunning ? stopSpeedTest : runComprehensiveSpeedTest}
                disabled={testState.stage === 'error' || (!apiConnected && !isTestRunning)}
                style={{
                  padding: '1rem 2rem',
                  borderRadius: '0.75rem',
                  fontWeight: '600',
                  fontSize: '1.125rem',
                  background:
                    isTestRunning
                      ? '#ef4444'
                      : testState.stage === 'error' || !apiConnected
                      ? '#6b7280'
                      : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  cursor: (testState.stage === 'error' || (!apiConnected && !isTestRunning)) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  margin: '0 auto',
                  transition: 'all 0.2s',
                  transform: 'scale(1)',
                  opacity: (testState.stage === 'error' || (!apiConnected && !isTestRunning)) ? 0.6 : 1,
                }}
                onMouseOver={(e) => {
                  if (testState.stage !== 'error' && (apiConnected || isTestRunning)) {
                    e.target.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
              >
                {isTestRunning ? <Pause size={20} /> : <Play size={20} />}
                <span>
                  {isTestRunning
                    ? 'Stop Test'
                    : testState.stage === 'error'
                    ? 'Test Failed'
                    : !apiConnected
                    ? 'Server Disconnected'
                    : 'Start Test'}
                </span>
              </button>

              {testState.error && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#fca5a5',
                  }}
                >
                  Error: {testState.error}
                </div>
              )}
            </div>

            {/* Test Results Display */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '1.5rem',
                textAlign: 'center',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: '#60a5fa',
                    marginBottom: '0.5rem',
                  }}
                >
                  {currentTest.download.speed.toFixed(1)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Mbps Download</div>
                <div
                  style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}
                  className={getSpeedColor(currentTest.download.speed)}
                >
                  {getSpeedGrade(currentTest.download.speed)}
                </div>
                {currentTest.download.consistency > 0 && (
                  <div
                    style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}
                  >
                    {currentTest.download.consistency.toFixed(1)}% consistent
                  </div>
                )}
              </div>

              <div>
                <div
                  style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: '#4ade80',
                    marginBottom: '0.5rem',
                  }}
                >
                  {currentTest.upload.speed.toFixed(1)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Mbps Upload</div>
                {currentTest.upload.consistency > 0 && (
                  <div
                    style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}
                  >
                    {currentTest.upload.consistency.toFixed(1)}% consistent
                  </div>
                )}
              </div>

              <div>
                <div
                  style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: '#facc15',
                    marginBottom: '0.5rem',
                  }}
                >
                  {currentTest.latency.avg.toFixed(0)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>ms Latency</div>
                {currentTest.latency.jitter > 0 && (
                  <div
                    style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}
                  >
                    ±{currentTest.latency.jitter.toFixed(1)}ms jitter
                  </div>
                )}
              </div>

              <div>
                <div
                  style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: '#f87171',
                    marginBottom: '0.5rem',
                  }}
                >
                  {currentTest.packetLoss.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Packet Loss</div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: getQualityColor(currentTest.quality.score),
                    marginBottom: '0.5rem',
                  }}
                >
                  {currentTest.quality.grade}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Quality Grade</div>
                {currentTest.quality.score > 0 && (
                  <div
                    style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}
                  >
                    {currentTest.quality.score.toFixed(1)}/100
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Network Info & Real-time Data */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.3)',
              backdropFilter: 'blur(10px)',
              borderRadius: '1rem',
              padding: '1.5rem',
              border: '1px solid #374151',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              Connection Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
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
                <div
                  style={{
                    fontWeight: '600',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                  }}
                >
                  {networkInfo.ip}
                </div>
              </div>
              {currentTest.reliability > 0 && (
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Reliability Score</div>
                  <div style={{ fontWeight: '600', color: '#4ade80' }}>
                    {currentTest.reliability.toFixed(1)}%
                  </div>
                </div>
              )}
            </div>

            {/* Real-time Speed Chart */}
            {(realTimeData.downloadSpeeds.length > 0 ||
              realTimeData.uploadSpeeds.length > 0) && (
              <div>
                <h4
                  style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    marginBottom: '0.75rem',
                  }}
                >
                  Live Speed
                </h4>
                <div style={{ height: '120px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={realTimeData.downloadSpeeds.map((speed, i) => ({
                        x: i,
                        download: speed,
                        upload: realTimeData.uploadSpeeds[i] || 0,
                      }))}
                    >
                      <XAxis dataKey="x" hide />
                      <YAxis hide />
                      <Line
                        type="monotone"
                        dataKey="download"
                        stroke="#60a5fa"
                        strokeWidth={2}
                        dot={false}
                      />
                      {realTimeData.uploadSpeeds.length > 0 && (
                        <Line
                          type="monotone"
                          dataKey="upload"
                          stroke="#4ade80"
                          strokeWidth={2}
                          dot={false}
                        />
                      )}
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Charts Section */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '2rem',
            marginBottom: '2rem',
          }}
        >
          {/* Historical Performance */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.3)',
              backdropFilter: 'blur(10px)',
              borderRadius: '1rem',
              padding: '1.5rem',
              border: '1px solid #374151',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0' }}>
                Performance History
              </h3>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                style={{
                  background: '#374151',
                  border: '1px solid #4b5563',
                  borderRadius: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  color: 'white',
                }}
              >
                <option value="download">Download Speed</option>
                <option value="upload">Upload Speed</option>
                <option value="latency">Latency</option>
                <option value="qualityScore">Quality Score</option>
              </select>
            </div>
            <div style={{ height: '250px' }}>
              {testHistory && testHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={testHistory.slice().reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: 'white',
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#94a3b8',
                  }}
                >
                  No data available. Run some speed tests to see history.
                </div>
              )}
            </div>
          </div>

          {/* ISP Rankings */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.3)',
              backdropFilter: 'blur(10px)',
              borderRadius: '1rem',
              padding: '1.5rem',
              border: '1px solid #374151',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Award size={20} color="#facc15" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0' }}>ISP Rankings</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {ispRankings.length > 0 ? ispRankings.map((isp, index) => (
                <div
                  key={isp.name || isp.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    background: 'rgba(55, 65, 81, 0.3)',
                    borderRadius: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        background:
                          index === 0
                            ? '#facc15'
                            : index === 1
                            ? '#9ca3af'
                            : index === 2
                            ? '#f59e0b'
                            : '#4b5563',
                        color: index < 3 ? 'black' : 'white',
                      }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600' }}>{isp.displayName || isp.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{isp.region}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600' }}>
                      {isp.statistics?.averageDownload?.toFixed(0) || isp.avgSpeed} Mbps
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#4ade80' }}>
                      {isp.statistics?.reliabilityScore?.toFixed(0) || isp.reliability}% reliable
                    </div>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                  No ISP rankings available. Check your connection to the backend server.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Performance Heatmap */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.3)',
            backdropFilter: 'blur(10px)',
            borderRadius: '1rem',
            padding: '1.5rem',
            border: '1px solid #374151',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            <Clock size={20} color="#3b82f6" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0' }}>Best & Worst Times</h3>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: '0 0 0 1rem' }}>
              Performance analysis by hour of day
            </p>
          </div>

          {/* Only render heatmap after client-side hydration */}
          {heatmapHours.length > 0 && (
            <>
              {/* Hour labels */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(24, 1fr)',
                  gap: '2px',
                  marginBottom: '1rem',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                }}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    {i % 4 === 0 ? `${i}:00` : ''}
                  </div>
                ))}
              </div>

              {/* Heatmap */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(24, 1fr)',
                  gap: '2px',
                  marginBottom: '1rem',
                }}
              >
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
                      fontWeight: '500',
                      position: 'relative',
                    }}
                    title={`${data.hour}:00 - ${Math.round(data.speed)} Mbps average`}
                  >
                    {data.hour % 6 === 0 ? data.hour : ''}
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                }}
              >
                <span>Hours of the day (0-23)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>Slower</span>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[0.1, 0.3, 0.5, 0.7, 0.9].map((opacity) => (
                      <div
                        key={opacity}
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '2px',
                          background: `rgba(59, 130, 246, ${opacity})`,
                        }}
                      />
                    ))}
                  </div>
                  <span>Faster</span>
                </div>
              </div>
            </>
          )}

          {/* Loading placeholder */}
          {heatmapHours.length === 0 && (
            <div
              style={{
                height: '120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                fontSize: '0.875rem',
              }}
            >
              Loading performance heatmap...
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
          }}
        >
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.3)',
              backdropFilter: 'blur(10px)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              border: '1px solid #374151',
              textAlign: 'center',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}
            >
              <TrendingUp size={20} color="#60a5fa" style={{ marginRight: '0.5rem' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa', marginBottom: '0.5rem' }}>
              {testHistory.length
                ? (testHistory.reduce((acc, test) => acc + test.download, 0) / testHistory.length).toFixed(1)
                : '0'}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Average Download (Mbps)</div>
          </div>

          <div
            style={{
              background: 'rgba(30, 41, 59, 0.3)',
              backdropFilter: 'blur(10px)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              border: '1px solid #374151',
              textAlign: 'center',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}
            >
              <Activity size={20} color="#4ade80" style={{ marginRight: '0.5rem' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ade80', marginBottom: '0.5rem' }}>
              {testHistory.length}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Tests Completed</div>
          </div>

          <div
            style={{
              background: 'rgba(30, 41, 59, 0.3)',
              backdropFilter: 'blur(10px)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              border: '1px solid #374151',
              textAlign: 'center',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}
            >
              <Zap size={20} color="#facc15" style={{ marginRight: '0.5rem' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#facc15', marginBottom: '0.5rem' }}>
              {testHistory.length ? Math.min(...testHistory.map((t) => t.latency)).toFixed(0) : '0'}ms
            </div>
            <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Best Latency</div>
          </div>

          <div
            style={{
              background: 'rgba(30, 41, 59, 0.3)',
              backdropFilter: 'blur(10px)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              border: '1px solid #374151',
              textAlign: 'center',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}
            >
              <Shield size={20} color="#a855f7" style={{ marginRight: '0.5rem' }} />
            </div>
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#a855f7',
                marginBottom: '0.5rem',
              }}
            >
              {currentTest.reliability > 0
                ? `${currentTest.reliability.toFixed(1)}%`
                : testHistory.length
                ? `${(testHistory.filter((t) => t.qualityScore > 70).length / testHistory.length * 100).toFixed(1)}%`
                : '0%'}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Network Reliability</div>
          </div>
        </div>

        {/* Connection Status Indicator */}
        <div
          style={{
            position: 'fixed',
            bottom: '1rem',
            right: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(30, 41, 59, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: '2rem',
            border: '1px solid #374151',
            fontSize: '0.75rem',
            color: '#94a3b8',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: apiConnected ? '#4ade80' : '#ef4444',
            }}
          />
          <span>
            API: {apiConnected ? 'Connected' : 'Disconnected'}
          </span>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: wsConnected ? '#4ade80' : '#ef4444',
              marginLeft: '0.5rem',
            }}
          />
          <span>WebSocket: {wsConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </main>
    </div>
    </>
  );
};

export default NETPULSE;