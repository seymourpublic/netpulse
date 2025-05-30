const RealtimeSpeedTest = () => {
  const [testState, setTestState] = useState({
    isRunning: false,
    stage: 'idle',
    progress: 0,
    currentSpeed: 0,
    results: null,
    server: null,
    realTimeData: {
      latency: [],
      downloadSpeeds: [],
      uploadSpeeds: []
    }
  });

  const wsRef = useRef(null);

  useEffect(() => {
    // Initialize WebSocket connection
    wsRef.current = new WebSocket('ws://localhost:5000');
    
    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'speedtest_update') {
        handleSpeedTestUpdate(message);
      }
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleSpeedTestUpdate = (message) => {
    const { event, data } = message;
    
    switch (event) {
      case 'test_started':
        setTestState(prev => ({
          ...prev,
          isRunning: true,
          stage: 'server_selection',
          progress: 0,
          results: null
        }));
        break;

      case 'stage_started':
        setTestState(prev => ({
          ...prev,
          stage: data.stage,
          progress: data.progress
        }));
        break;

      case 'stage_completed':
        setTestState(prev => ({
          ...prev,
          progress: data.progress,
          ...(data.stage === 'server_selection' && { server: data.data })
        }));
        break;

      case 'latency_sample':
        setTestState(prev => ({
          ...prev,
          currentSpeed: data.currentAvg,
          realTimeData: {
            ...prev.realTimeData,
            latency: [...prev.realTimeData.latency.slice(-20), data.sample]
          }
        }));
        break;

      case 'download_progress':
        setTestState(prev => ({
          ...prev,
          currentSpeed: data.currentSpeed,
          realTimeData: {
            ...prev.realTimeData,
            downloadSpeeds: [...prev.realTimeData.downloadSpeeds.slice(-50), data.currentSpeed]
          }
        }));
        break;

      case 'upload_progress':
        setTestState(prev => ({
          ...prev,
          currentSpeed: data.currentSpeed,
          realTimeData: {
            ...prev.realTimeData,
            uploadSpeeds: [...prev.realTimeData.uploadSpeeds.slice(-50), data.currentSpeed]
          }
        }));
        break;

      case 'test_completed':
        setTestState(prev => ({
          ...prev,
          isRunning: false,
          stage: 'complete',
          progress: 100,
          results: data.results,
          currentSpeed: 0
        }));
        break;

      case 'test_error':
        setTestState(prev => ({
          ...prev,
          isRunning: false,
          stage: 'error',
          error: data.error
        }));
        break;
    }
  };

  const startRealtimeTest = async () => {
    try {
      const response = await fetch('/api/speed-test/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: 'test-session-' + Date.now(),
          wsConnectionId: wsRef.current?.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start speed test');
      }

    } catch (error) {
      console.error('Error starting speed test:', error);
      setTestState(prev => ({ ...prev, error: error.message }));
    }
  };

  return (
    <div className="realtime-speedtest">
      <div className="test-controls">
        <button 
          onClick={startRealtimeTest}
          disabled={testState.isRunning}
          className="start-test-btn"
        >
          {testState.isRunning ? 'Testing...' : 'Start Speed Test'}
        </button>
      </div>

      {testState.isRunning && (
        <div className="test-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${testState.progress}%` }}
            />
          </div>
          
          <div className="stage-info">
            <p>Stage: {testState.stage.replace('_', ' ').toUpperCase()}</p>
            <p>Progress: {Math.round(testState.progress)}%</p>
            {testState.currentSpeed > 0 && (
              <p>Current Speed: {testState.currentSpeed.toFixed(1)} Mbps</p>
            )}
          </div>
        </div>
      )}

      {testState.realTimeData.downloadSpeeds.length > 0 && (
        <div className="realtime-chart">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={testState.realTimeData.downloadSpeeds.map((speed, i) => ({ x: i, speed }))}>
              <XAxis dataKey="x" />
              <YAxis />
              <Line type="monotone" dataKey="speed" stroke="#3b82f6" strokeWidth={2} />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {testState.results && (
        <div className="test-results">
          <h3>Speed Test Results</h3>
          <div className="results-grid">
            <div className="result-item">
              <span className="label">Download</span>
              <span className="value">{testState.results.results.download.speed.toFixed(1)} Mbps</span>
            </div>
            <div className="result-item">
              <span className="label">Upload</span>
              <span className="value">{testState.results.results.upload.speed.toFixed(1)} Mbps</span>
            </div>
            <div className="result-item">
              <span className="label">Latency</span>
              <span className="value">{testState.results.results.latency.avg.toFixed(1)} ms</span>
            </div>
            <div className="result-item">
              <span className="label">Quality Score</span>
              <span className="value">{testState.results.results.quality.score.toFixed(1)}/100</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};