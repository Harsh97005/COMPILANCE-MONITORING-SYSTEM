import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const ViolationsPage = () => {
    const [violations, setViolations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedViolation, setSelectedViolation] = useState(null);

    useEffect(() => {
        const fetchViolations = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/v1/violations');
                const data = await response.json();
                if (response.ok) {
                    setViolations(data.violations);
                }
            } catch (error) {
                console.error('Error fetching violations:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchViolations();
    }, []);

    const handleExport = () => {
        window.open('http://localhost:8000/api/v1/violations/export', '_blank');
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark">
            <Sidebar />
            <main className="flex-1 lg:pl-64 flex flex-col h-full overflow-hidden">
                {/* Header */}
                <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 shrink-0 z-20">
                    <h2 className="text-lg font-bold tracking-tight">Violations Management</h2>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleExport}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
                        </button>
                        <div className="relative hidden sm:block">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                <span className="material-symbols-outlined text-[20px]">search</span>
                            </span>
                            <input className="w-64 rounded-lg bg-slate-100 dark:bg-slate-800 border-none py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-primary/20" placeholder="Search violations..." type="text" />
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel: Table */}
                    <section className="flex flex-col flex-1 min-w-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Violations</h1>
                                <span className={`${violations.length > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'} text-xs font-semibold px-2 py-0.5 rounded-full`}>
                                    {violations.length} Active
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-12"><input type="checkbox" className="rounded border-slate-300 text-primary" /></th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Severity</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rule Name</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Target Table / ID</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Detected</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {isLoading ? (
                                        <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">Loading violations...</td></tr>
                                    ) : violations.length === 0 ? (
                                        <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">No active violations found.</td></tr>
                                    ) : (
                                        violations.map((v) => (
                                            <tr
                                                key={v.id}
                                                onClick={() => setSelectedViolation(v)}
                                                className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${selectedViolation?.id === v.id ? 'bg-primary/5' : ''}`}
                                            >
                                                <td className="px-4 py-3"><input type="checkbox" className="rounded border-slate-300 text-primary" /></td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${v.severity === 'critical' ? 'bg-rose-100 text-rose-700' :
                                                        v.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                                            v.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                                                        }`}>
                                                        {v.severity}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{v.rule_name}</td>
                                                <td className="px-4 py-3 text-sm text-slate-500">
                                                    <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mr-2">{v.table_name}</span>
                                                    ID: {v.record_id}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-400 text-right">{new Date(v.detected_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Right Panel: Inspector */}
                    <aside className="w-[450px] shrink-0 border-l border-slate-200 dark:border-slate-800 bg-background-light dark:bg-background-dark flex flex-col shadow-xl z-10 overflow-hidden">
                        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded uppercase tracking-wide">
                                        {selectedViolation ? `Violation VIOL-${1000 + selectedViolation.id}` : 'Select a Violation'}
                                    </span>
                                </div>
                                <h2 className={`text-lg font-bold ${selectedViolation ? 'text-slate-900 dark:text-white' : 'text-slate-400'} leading-tight`}>
                                    {selectedViolation ? selectedViolation.rule_name : 'No violation selected'}
                                </h2>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {selectedViolation ? (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Detected Information</h3>
                                        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Table Name</span>
                                                <span className="font-mono text-slate-900 dark:text-white">{selectedViolation.table_name}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Record ID</span>
                                                <span className="font-mono text-slate-900 dark:text-white">{selectedViolation.record_id}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Timestamp</span>
                                                <span className="text-slate-900 dark:text-white">{new Date(selectedViolation.detected_at).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Evidence Data</h3>
                                        <div className="bg-slate-950 rounded-lg p-4 overflow-x-auto">
                                            <pre className="text-emerald-400 text-xs font-mono">
                                                {JSON.stringify(selectedViolation.metadata || {}, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <p className="text-slate-500 text-sm">Select a violation from the list to view details.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 z-10 flex flex-col gap-3">
                            <div className="flex gap-3">
                                <button className="flex-1 bg-primary hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[20px]">check_circle</span> Mark as Resolved
                                </button>
                                <button className="flex-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[20px]">visibility</span> Mark Reviewed
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
};

export default ViolationsPage;
