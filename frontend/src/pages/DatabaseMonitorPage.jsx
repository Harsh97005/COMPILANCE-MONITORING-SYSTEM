import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const DatabaseMonitorPage = () => {
    const navigate = useNavigate();
    const [connections, setConnections] = useState([]);
    const [rulesCount, setRulesCount] = useState(0);
    const [isScanning, setIsScanning] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        db_type: 'postgres',
        connection_url: ''
    });
    const [csvFile, setCsvFile] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, dbRes] = await Promise.all([
                    fetch('http://localhost:8000/api/v1/stats'),
                    fetch('http://localhost:8000/api/v1/databases')
                ]);

                const stats = await statsRes.json();
                const dbs = await dbRes.json();

                if (statsRes.ok) setRulesCount(stats.rules);
                if (dbRes.ok) setConnections(dbs);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleConnect = async (e) => {
        e.preventDefault();
        try {
            let response;
            if (formData.db_type === 'csv') {
                if (!csvFile) {
                    alert('Please select a CSV file');
                    return;
                }
                const uploadData = new FormData();
                uploadData.append('name', formData.name);
                uploadData.append('file', csvFile);

                response = await fetch('http://localhost:8000/api/v1/databases/upload_csv', {
                    method: 'POST',
                    body: uploadData
                });
            } else {
                response = await fetch('http://localhost:8000/api/v1/databases', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
            }

            if (response.ok) {
                const newDb = await response.json();
                setConnections([...connections, newDb]);
                setIsModalOpen(false);
                setFormData({ name: '', db_type: 'postgres', connection_url: '' });
                setCsvFile(null);
            } else {
                alert('Failed to connect database');
            }
        } catch (error) {
            console.error('Connection failed:', error);
            alert('Failed to connect database');
        }
    };

    const toggleActivate = async (id) => {
        try {
            const response = await fetch(`http://localhost:8000/api/v1/databases/${id}/activate`, {
                method: 'PATCH'
            });
            if (response.ok) {
                setConnections(connections.map(c => ({
                    ...c,
                    is_active: c.id === id
                })));
            }
        } catch (error) {
            console.error('Activation failed:', error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove this connection?')) return;
        try {
            const response = await fetch(`http://localhost:8000/api/v1/databases/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setConnections(connections.filter(c => c.id !== id));
            }
        } catch (error) {
            console.error('Deletion failed:', error);
        }
    };

    const activeDb = connections.find(c => c.is_active);
    const isConnected = !!activeDb;

    const handleRunScan = async () => {
        if (!isConnected) {
            alert('Please activate a database connection first.');
            return;
        }
        if (rulesCount === 0) {
            alert('No rules found. Please upload a policy first.');
            return;
        }

        setIsScanning(true);
        try {
            const response = await fetch('http://localhost:8000/api/v1/scans', {
                method: 'POST'
            });
            const data = await response.json();
            if (response.ok) {
                alert(`Scan triggered! Job ID: ${data.job_id}`);
            }
        } catch (error) {
            alert('Scan failed to trigger');
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark">
            <Sidebar />
            <main className="flex-1 lg:pl-64 flex flex-col h-full overflow-y-auto">
                <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-10 py-3 sticky top-0 z-50">
                    <div className="flex items-center gap-4 text-slate-900 dark:text-white lg:hidden">
                        <h2 className="text-lg font-bold">Database Monitor</h2>
                    </div>
                    <div className="flex flex-1 justify-end gap-8">
                        <div className="flex items-center gap-4">
                            <button className="flex items-center justify-center rounded-full size-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200" onClick={() => navigate('/history')}>
                                <span className="material-symbols-outlined">history</span>
                            </button>
                            <button className="flex items-center justify-center rounded-full size-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined">notifications</span>
                            </button>
                            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-slate-200 dark:border-slate-700" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBo_ATFI1MheZL9jEF-hMKkmhT_izklS7ZL2CMINtV9pSkB73lX0eOsKVaHIuHp-jqYGHjRdv0jfGYURCcZhWu_PP66bKrTMMDWLfkAFwpptc-WvfzhuxKHpxLIAkpe-Y7octq-UeWjfmB5C7MZK8SPprwB-BRQLR99MOh2rtZ7LFPXfXmXivQyUbEhq05EQWhOVrpx1YD_R5nrFyZs5HrNS8PFtbmLB-NMmZhfADHUdGDVDYR3Zdqx8atwEXoj_djAJ1ANWPPsrVc')" }}></div>
                        </div>
                    </div>
                </header>

                <div className="flex flex-1 justify-center py-5 px-4 md:px-10 lg:px-40">
                    <div className="flex flex-col max-w-[1200px] flex-1 w-full gap-8">
                        {/* Breadcrumbs & Header */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <span>Monitors</span>
                                <span className="material-symbols-outlined text-xs">chevron_right</span>
                                <span className={`${isConnected ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-400'}`}>
                                    {isConnected ? activeDb.name : 'No active connection'}
                                </span>
                            </div>
                            <div className="flex flex-wrap justify-between items-end gap-4">
                                <div className="flex flex-col gap-1">
                                    <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Database Monitor</h1>
                                    <p className="text-slate-500 dark:text-slate-400 text-base font-normal">Manage connected databases and run compliance scans.</p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white border border-primary hover:bg-primary-dark transition-colors text-sm font-bold shadow-sm"
                                >
                                    <span className="material-symbols-outlined mr-2 text-lg">add_link</span>
                                    <span className="truncate">Connect New Database</span>
                                </button>
                            </div>
                        </div>

                        {/* Connection List */}
                        <div className="grid gap-4">
                            {isLoading ? (
                                <div className="p-8 text-center text-slate-400">Loading connections...</div>
                            ) : connections.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center flex flex-col items-center gap-3">
                                    <span className="material-symbols-outlined text-4xl text-slate-300">database_off</span>
                                    <p className="text-slate-500">No database connections saved.</p>
                                    <button onClick={() => setIsModalOpen(true)} className="text-primary font-bold text-sm hover:underline">Connect your first database</button>
                                </div>
                            ) : (
                                connections.map(conn => (
                                    <div key={conn.id} className={`rounded-xl border p-6 flex flex-col md:flex-row justify-between items-center gap-6 transition-all ${conn.is_active ? 'bg-white dark:bg-slate-900 border-primary/30 shadow-md ring-1 ring-primary/5' : 'bg-slate-50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800'}`}>
                                        <div className="flex items-center gap-5 w-full md:w-auto">
                                            <div className={`p-3 rounded-lg ${conn.is_active ? 'bg-primary/10 text-primary' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                                <span className="material-symbols-outlined text-2xl">database</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{conn.name}</h3>
                                                    {conn.is_active && (
                                                        <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase px-1.5 py-0.5 rounded">Active Target</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-0.5">{conn.db_type} • {conn.db_type === 'csv' ? conn.connection_url.split(/[\\/]/).pop() : conn.connection_url.split('@').pop()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                            {!conn.is_active && (
                                                <button onClick={() => toggleActivate(conn.id)} className="flex-1 md:flex-none text-xs font-bold text-primary px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors">Set as Target</button>
                                            )}
                                            <button onClick={() => handleDelete(conn.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                                                <span className="material-symbols-outlined text-[20px]">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Modals & Scan Controls */}
                        <div className="grid lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                {/* Rest of the monitored tables UI... */}
                                <div className="flex flex-col gap-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Connection Details</h3>
                                    </div>
                                    <div className={`rounded-xl border p-8 ${isConnected ? 'bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-900/30' : 'bg-slate-50 dark:bg-slate-800/10 border-slate-200 dark:border-slate-800 opacity-50'}`}>
                                        {isConnected ? (
                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Connection Name</label>
                                                        <p className="text-slate-900 dark:text-white font-bold text-lg">{activeDb.name}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Database Type</label>
                                                        <p className="text-slate-900 dark:text-white font-medium capitalize">{activeDb.db_type}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</label>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Authenticated & Ready</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Sync</label>
                                                        <p className="text-slate-500 dark:text-slate-400 text-sm">Just now</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-8 text-center text-slate-400 italic">No active database selected for monitoring.</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-6">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Scan Controls</h3>
                                <div className={`bg-white dark:bg-slate-900 rounded-xl border shadow-md overflow-hidden relative ${isConnected ? 'border-primary/20' : 'border-slate-200 opacity-50 grayscale'}`}>
                                    <div className="p-6 flex flex-col gap-6 relative z-10">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Target: {isConnected ? activeDb.name : 'Unknown'}</span>
                                                <span className="material-symbols-outlined text-primary">{isConnected ? 'task_alt' : 'cloud_off'}</span>
                                            </div>
                                            <h4 className="text-xl font-bold text-slate-900 dark:text-white">Full Compliance Scan</h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Scan this specific database against all extracted compliance rules.</p>
                                        </div>
                                        <button
                                            disabled={!isConnected || isScanning}
                                            onClick={handleRunScan}
                                            className={`w-full flex items-center justify-center rounded-lg h-12 px-5 text-base font-bold transition-all shadow-md ${isConnected ? 'bg-primary text-white hover:bg-primary-dark shadow-primary/20' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'}`}
                                        >
                                            <span className={`material-symbols-outlined mr-2 ${isScanning ? 'animate-spin' : ''}`}>
                                                {isScanning ? 'sync' : 'play_arrow'}
                                            </span>
                                            {isScanning ? 'Scanning...' : 'Run Scan Now'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Connect Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Connect Database</h2>
                            <p className="text-slate-500 text-sm mt-1">Add a new target database for compliance monitoring.</p>
                        </div>
                        <form onSubmit={handleConnect} className="p-8 space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Connection Name</label>
                                <input
                                    required
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    placeholder="e.g. Production PostgreSQL"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Database Type</label>
                                <select
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                                    value={formData.db_type}
                                    onChange={e => setFormData({ ...formData, db_type: e.target.value })}
                                >
                                    <option value="postgres">PostgreSQL</option>
                                    <option value="mysql">MySQL</option>
                                    <option value="sqlite">SQLite</option>
                                    <option value="csv">CSV File Upload</option>
                                </select>
                            </div>
                            {formData.db_type === 'csv' ? (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Upload CSV File</label>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        required
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                                        onChange={e => setCsvFile(e.target.files[0])}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Connection URL</label>
                                    <input
                                        required
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none font-mono text-sm"
                                        placeholder="postgresql://user:pass@host:5432/db"
                                        value={formData.connection_url}
                                        onChange={e => setFormData({ ...formData, connection_url: e.target.value })}
                                    />
                                </div>
                            )}
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-white font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">Connect DB</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatabaseMonitorPage;
