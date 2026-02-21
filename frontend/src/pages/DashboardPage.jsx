import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const DashboardPage = () => {
    const navigate = useNavigate();
    const [isScanning, setIsScanning] = useState(false);
    const [stats, setStats] = useState({
        policies: 0,
        rules: 0,
        violations: 0,
        last_scan: '--',
        overall_health: 100
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/v1/stats');
                const data = await response.json();
                if (response.ok) {
                    setStats(prev => ({
                        ...prev,
                        ...data,
                        overall_health: data.overall_health ?? 100
                    }));
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        };
        fetchStats();
    }, []);

    const handleStartScan = async () => {
        if (stats.rules === 0) {
            alert('Cannot start scan: No compliance rules found. Please upload a policy first.');
            return;
        }

        setIsScanning(true);
        try {
            const response = await fetch('http://localhost:8000/api/v1/scans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (response.ok) {
                alert(`Scan triggered successfully! Job ID: ${data.job_id}`);
            }
        } catch (error) {
            alert('Error connecting to backend API.');
        } finally {
            setIsScanning(false);
        }
    };

    const handleExport = () => {
        window.open('http://localhost:8000/api/v1/violations/export', '_blank');
    };

    return (
        <div className="flex min-h-screen w-full bg-background-light">
            <Sidebar />
            <main className="flex-1 lg:pl-64 flex flex-col min-h-screen">
                {/* Top Header */}
                <header className="flex items-center justify-between h-16 px-8 bg-white border-b border-slate-200 sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <button className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-lg">
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <h2 className="text-lg font-bold text-slate-900">Dashboard Overview</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative hidden sm:block">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                                <span className="material-symbols-outlined text-[20px]">search</span>
                            </div>
                            <input className="block w-64 rounded-lg border-0 bg-slate-100 py-1.5 pl-10 pr-3 text-slate-900 focus:ring-2 focus:ring-primary sm:text-sm sm:leading-6 placeholder:text-slate-500" placeholder="Search..." type="text" />
                        </div>
                        <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors" onClick={() => navigate('/history')}>
                            <span className="material-symbols-outlined">history</span>
                        </button>
                        <button
                            className="hidden sm:flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-primary/30 disabled:opacity-50"
                            onClick={handleStartScan}
                            disabled={isScanning}
                        >
                            <span className={`material-symbols-outlined text-[18px] ${isScanning ? 'animate-spin' : ''}`}>
                                {isScanning ? 'sync' : 'play_arrow'}
                            </span>
                            {isScanning ? 'Scanning...' : 'Start New Scan'}
                        </button>
                    </div>
                </header>

                <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
                    {/* Welcome Section */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">System Overview</h1>
                            <p className="text-slate-500 mt-1">Real-time compliance monitoring status.</p>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-32 hover:border-primary/30 transition-colors group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Policies Loaded</p>
                                    <p className="text-3xl font-bold text-slate-900 mt-2">{stats.policies}</p>
                                </div>
                                <div className="p-2 bg-primary/5 text-primary rounded-lg group-hover:bg-primary/10 transition-colors">
                                    <span className="material-symbols-outlined">folder_open</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-32 hover:border-primary/30 transition-colors group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Rules Extracted</p>
                                    <p className="text-3xl font-bold text-slate-900 mt-2">{stats.rules}</p>
                                </div>
                                <div className="p-2 bg-primary/5 text-primary rounded-lg group-hover:bg-primary/10 transition-colors">
                                    <span className="material-symbols-outlined">rule</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-32 hover:border-primary/30 transition-colors group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Last Scan</p>
                                    <p className="text-3xl font-bold text-slate-900 mt-2">{stats.last_scan}</p>
                                </div>
                                <div className="p-2 bg-primary/5 text-primary rounded-lg group-hover:bg-primary/10 transition-colors">
                                    <span className="material-symbols-outlined">timer</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-32 border-l-4 border-l-orange-500 hover:border-primary/30 transition-colors group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Active Violations</p>
                                    <p className="text-3xl font-bold text-slate-900 mt-2">{stats.violations}</p>
                                </div>
                                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                    <span className="material-symbols-outlined icon-filled">warning</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Compliance Health Section */}
                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1 w-full">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-lg font-bold text-slate-900">Compliance Health Score</h3>
                                    <span className={`px-2.5 py-0.5 rounded-full ${stats.overall_health >= 90 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'} text-sm font-semibold`}>
                                        {stats.overall_health >= 90 ? 'Healthy' : 'Warning'}
                                    </span>
                                </div>
                                <p className="text-slate-500 text-sm mb-6">
                                    {stats.overall_health >= 90
                                        ? "System is operating within acceptable parameters. Adherence to policies remains high."
                                        : "Violations detected. Please review compliance protocols and address breaches."}
                                </p>
                                <div className="relative pt-1">
                                    <div className="flex mb-2 items-center justify-between">
                                        <div className="text-right w-full">
                                            <span className="text-xs font-semibold inline-block text-primary">{stats.overall_health}%</span>
                                        </div>
                                    </div>
                                    <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-slate-100">
                                        <div
                                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-1000 ease-out"
                                            style={{ width: `${stats.overall_health}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative shrink-0 size-40 flex items-center justify-center">
                                <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4"></path>
                                    <path className="text-primary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${stats.overall_health}, 100`} strokeLinecap="round" strokeWidth="4"></path>
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center text-center">
                                    <span className="text-3xl font-black text-slate-900">{stats.overall_health}%</span>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">Overall</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Violations Table */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Recent Violations</h3>
                                <p className="text-sm text-slate-500">Summary of the most recent breaches detected.</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleExport}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                                    <tr>
                                        <th className="px-6 py-4">Violation ID</th>
                                        <th className="px-6 py-4">Rule Name</th>
                                        <th className="px-6 py-4">Source Table</th>
                                        <th className="px-6 py-4">Severity</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                                            No recent violations found.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DashboardPage;
