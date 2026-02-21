import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const ScanHistoryPage = () => {
    const [scanHistory, setScanHistory] = useState([]);
    const [stats, setStats] = useState({
        policies: 0,
        rules: 0,
        violations: 0,
        last_scan: '--'
    });
    const [isScanning, setIsScanning] = useState(false);

    const fetchData = async () => {
        try {
            // Fetch Stats
            const statsRes = await fetch('http://localhost:8000/api/v1/stats');
            const statsData = await statsRes.json();
            if (statsRes.ok) setStats(statsData);

            // Fetch History
            const historyRes = await fetch('http://localhost:8000/api/v1/scans');
            const historyData = await historyRes.json();
            if (historyRes.ok) setScanHistory(historyData);

            return historyData;
        } catch (error) {
            console.error('Error fetching data:', error);
            return [];
        }
    };

    useEffect(() => {
        fetchData();

        // Setup Polling if any scan is running
        const interval = setInterval(async () => {
            const history = await fetchData();
            const hasRunning = history.some(s => s.status === 'running');
            if (!hasRunning) {
                // You could keep polling at a slower rate or stop
                // clearInterval(interval); 
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleNewScan = async () => {
        if (stats.rules === 0) {
            alert('Cannot start scan: No compliance rules found. Please upload a policy first.');
            return;
        }

        setIsScanning(true);
        try {
            const response = await fetch('http://localhost:8000/api/v1/scans', { method: 'POST' });
            const data = await response.json();
            if (response.ok) {
                // fetchData will pick it up on the next interval
                await fetchData();
            } else {
                alert(`Error: ${data.detail || 'Failed to trigger scan'}`);
            }
        } catch (error) {
            console.error(error);
            alert('Failed to connect to backend.');
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark">
            <Sidebar />
            <main className="flex-1 lg:pl-64 flex flex-col h-full overflow-hidden relative">
                <header className="h-16 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <span>Compliance</span>
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        <span className="text-slate-900 dark:text-white font-medium">Scan History</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <span className="material-symbols-outlined text-[20px]">notifications</span>
                        </button>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-6xl mx-auto flex flex-col gap-8">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Scan History</h1>
                                <p className="text-slate-500 dark:text-slate-400">Audit trail of continuous monitoring and compliance checks.</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    disabled={isScanning}
                                    onClick={handleNewScan}
                                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    <span className={`material-symbols-outlined text-[18px] ${isScanning ? 'animate-spin' : ''}`}>
                                        {isScanning ? 'sync' : 'play_arrow'}
                                    </span>
                                    {isScanning ? 'Scanning...' : 'New Scan'}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-850 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Scans (30d)</span>
                                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">trending_up</span> 12%
                                    </span>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total_scans || 0}</span>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-850 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Violations Detected</span>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-bold text-slate-900 dark:text-white">{stats.violations || 0}</span>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-850 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Avg. Duration</span>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-bold text-slate-900 dark:text-white">{stats.avg_duration || '--'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Scan ID / Time</th>
                                            <th className="px-6 py-4">Violations</th>
                                            <th className="px-6 py-4">Duration</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {scanHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                                                    No scan history available.
                                                </td>
                                            </tr>
                                        ) : (
                                            scanHistory.map((scan, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-2">
                                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${scan.status === 'completed' ? 'bg-green-50 text-green-700' :
                                                                scan.status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'
                                                                }`}>
                                                                <span className="relative flex h-2 w-2">
                                                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${scan.status === 'completed' ? 'bg-green-400' : 'bg-blue-400'}`}></span>
                                                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${scan.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                                                                </span>
                                                                {scan.status}
                                                            </span>
                                                            {scan.status === 'running' && (
                                                                <div className="w-full max-w-[120px] flex flex-col gap-1">
                                                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-blue-500 transition-all duration-500"
                                                                            style={{ width: `${scan.progress || 0}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <span className="text-[10px] text-slate-400 font-medium">{scan.progress || 0}% complete</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-900 dark:text-white">SCAN-{1000 + scan.id}</span>
                                                            <span className="text-xs text-slate-500">{new Date(scan.start_time).toLocaleString()}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className={`font-mono font-bold ${scan.violations_found > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                                                                {scan.violations_found}
                                                            </span>
                                                            {scan.status === 'running' && <span className="text-[10px] text-slate-400">detecting...</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">
                                                        <div className="flex flex-col">
                                                            <span>{scan.records_scanned?.toLocaleString() || 0} records</span>
                                                            {scan.status === 'running' && <span className="text-[10px] text-slate-400 italic">scanning database...</span>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ScanHistoryPage;
