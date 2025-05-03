import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Wifi, Upload, Download, Clock, Activity, Package, Calendar, Server } from 'lucide-react';

// Main SpeedTest dashboard component
export default function SpeedTestDashboard() {
  // State for speed test results and status
  const [testStatus, setTestStatus] = useState('idle'); // idle, testing, completed, error
  const [results, setResults] = useState({
    download: 0,
    upload: 0,
    latency: 0,
    jitter: 0,
    packetLoss: 0,
    timestamp: null,
    device: '',
    networkType: '',
    isp: '',
    serverLocation: ''
  });
  const [testHistory, setTestHistory] = useState([]);
  const [selectedISP, setSelectedISP] = useState('All');
  const [topISPs, setTopISPs] = useState([]);

  // Detect network information
  useEffect(() => {
    const deviceInfo = {
      device: `${navigator.platform} - ${navigator.userAgent.split(') ')[0].split('(')[1]}`,
      networkType: navigator.connection ? 
        navigator.connection.effectiveType || 'Unknown' : 
        'Unknown'
    };
    
    setResults(prev => ({...prev, ...deviceInfo}));
  }, []);

  // Load test history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('speedTestHistory');
    if (savedHistory) {
      try {
        setTestHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Error parsing saved history:', e);
      }
    }
    
    // Simulate fetching top ISP data
    const mockTopISPs = [
      { name: 'Fiber Co', downloadAvg: 940, uploadAvg: 910, latencyAvg: 5 },
      { name: 'Cable Net', downloadAvg: 520, uploadAvg: 35, latencyAvg: 15 },
      { name: 'DSL Provider', downloadAvg: 120, uploadAvg: 20, latencyAvg: 30 },
      { name: 'Wireless ISP', downloadAvg: 80, uploadAvg: 15, latencyAvg: 45 },
    ];
    setTopISPs(mockTopISPs);
  }, []);

  // Save test history to localStorage when it changes
  useEffect(() => {
    if (testHistory.length > 0) {
      localStorage.setItem('speedTestHistory', JSON.stringify(testHistory));
    }
  }, [testHistory]);

  // Function to start the speed test
  const startSpeedTest = async () => {
    setTestStatus('testing');
    
    try {
      // This would be replaced with actual API calls to your speed test backend
      // Simulating a speed test with timeout delays for demonstration
      await simulateSpeedTest();
      
      // After test completes, add to history
      const newTest = {...results, timestamp: new Date().toISOString()};
      setTestHistory(prev => [newTest, ...prev].slice(0, 100)); // Keep last 100 tests
      setTestStatus('completed');
    } catch (error) {
      console.error('Speed test failed:', error);
      setTestStatus('error');
    }
  };

  // Simulate a speed test (this would be replaced by actual API calls)
  const simulateSpeedTest = async () => {
    // Simulate download test
    await new Promise(resolve => setTimeout(resolve, 2000));
    setResults(prev => ({...prev, download: Math.random() * 500 + 100}));
    
    // Simulate upload test
    await new Promise(resolve => setTimeout(resolve, 2000));
    setResults(prev => ({...prev, upload: Math.random() * 100 + 20}));
    
    // Simulate latency and other metrics
    await new Promise(resolve => setTimeout(resolve, 1000));
    setResults(prev => ({
      ...prev, 
      latency: Math.random() * 50 + 5,
      jitter: Math.random() * 10 + 1,
      packetLoss: Math.random() * 2,
      isp: 'Example ISP',
      serverLocation: 'Server Location: New York'
    }));
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Render metric card with icon and value
  const MetricCard = ({ icon, title, value, unit, color }) => (
    <div className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center">
      <div className={`flex items-center justify-center w-12 h-12 rounded-full mb-2 ${color}`}>
        {icon}
      </div>
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-xl font-bold flex items-baseline">
        {value !== null && value !== undefined ? value.toFixed(2) : '—'}
        <span className="text-sm ml-1">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Internet Speed Test & ISP Tracker</h1>
        
        {/* Main speed test section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Speed Test</h2>
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-48 h-48 rounded-full bg-gray-100 flex items-center justify-center mb-4 relative">
              <div className="text-center">
                {testStatus === 'idle' && (
                  <div className="flex flex-col items-center">
                    <Wifi size={48} className="text-blue-500 mb-2" />
                    <span>Ready to Test</span>
                  </div>
                )}
                
                {testStatus === 'testing' && (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                    <span className="mt-2">Testing...</span>
                  </div>
                )}
                
                {testStatus === 'completed' && (
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-bold text-blue-600">{results.download.toFixed(2)}</div>
                    <div className="text-sm">Mbps Download</div>
                  </div>
                )}
                
                {testStatus === 'error' && (
                  <div className="flex flex-col items-center">
                    <div className="text-red-500">Error</div>
                    <div className="text-sm">Please try again</div>
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={startSpeedTest}
              disabled={testStatus === 'testing'}
              className={`px-6 py-3 rounded-full font-medium ${
                testStatus === 'testing'
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {testStatus === 'testing' ? 'Testing...' : 'Start Speed Test'}
            </button>
          </div>
          
          {/* Results section */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricCard 
              icon={<Download className="text-white" />} 
              title="Download" 
              value={results.download} 
              unit="Mbps"
              color="bg-blue-500"
            />
            <MetricCard 
              icon={<Upload className="text-white" />} 
              title="Upload" 
              value={results.upload} 
              unit="Mbps"
              color="bg-green-500"
            />
            <MetricCard 
              icon={<Clock className="text-white" />} 
              title="Latency" 
              value={results.latency} 
              unit="ms"
              color="bg-orange-500"
            />
            <MetricCard 
              icon={<Activity className="text-white" />} 
              title="Jitter" 
              value={results.jitter} 
              unit="ms"
              color="bg-purple-500"
            />
            <MetricCard 
              icon={<Package className="text-white" />} 
              title="Packet Loss" 
              value={results.packetLoss} 
              unit="%"
              color="bg-red-500"
            />
          </div>
          
          {/* Additional test info */}
          {testStatus === 'completed' && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center">
                <Calendar size={16} className="mr-2 text-gray-500" />
                <span className="text-gray-500">Date: {formatDate(results.timestamp || new Date())}</span>
              </div>
              <div className="flex items-center">
                <Server size={16} className="mr-2 text-gray-500" />
                <span className="text-gray-500">{results.serverLocation}</span>
              </div>
              <div className="flex items-center">
                <Wifi size={16} className="mr-2 text-gray-500" />
                <span className="text-gray-500">ISP: {results.isp}</span>
              </div>
              <div className="flex items-center">
                <Activity size={16} className="mr-2 text-gray-500" />
                <span className="text-gray-500">Network: {results.networkType}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* History and Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Historical test results */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test History</h2>
            
            {testHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-2 text-left">Date & Time</th>
                      <th className="p-2 text-right">Download</th>
                      <th className="p-2 text-right">Upload</th>
                      <th className="p-2 text-right">Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testHistory.slice(0, 5).map((test, index) => (
                      <tr key={index} className="border-t border-gray-100">
                        <td className="p-2">{formatDate(test.timestamp)}</td>
                        <td className="p-2 text-right">{test.download?.toFixed(2)} Mbps</td>
                        <td className="p-2 text-right">{test.upload?.toFixed(2)} Mbps</td>
                        <td className="p-2 text-right">{test.latency?.toFixed(2)} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No test history available. Run your first speed test!
              </div>
            )}
          </div>
          
          {/* ISP Rankings */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Top ISPs by Download Speed</h2>
            
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topISPs}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Mbps', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => [`${value} Mbps`]} />
                <Legend />
                <Bar dataKey="downloadAvg" name="Download Speed" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}