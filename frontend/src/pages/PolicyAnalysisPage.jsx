import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const PolicyAnalysisPage = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [extractedRules, setExtractedRules] = useState([]);
    const [selectedPolicyId, setSelectedPolicyId] = useState(null);
    const [stats, setStats] = useState({ rules: 0 });
    const [isUploading, setIsUploading] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [latestPolicy, setLatestPolicy] = useState(null);

    const fetchLatestPolicy = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/v1/policies/latest');
            if (response.ok) {
                const data = await response.json();
                setLatestPolicy(data);
                if (data && data.id) {
                    fetchRules(data.id);
                }
            }
        } catch (error) {
            console.error('Error fetching latest policy:', error);
        }
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/v1/stats');
                const data = await response.json();
                if (response.ok) setStats(data);
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        };
        fetchStats();
        fetchLatestPolicy();
    }, []);

    const fetchRules = async (policyId) => {
        try {
            const response = await fetch(`http://localhost:8000/api/v1/policies/${policyId}/rules`);
            const data = await response.json();
            if (response.ok) {
                setExtractedRules(data);
            }
        } catch (error) {
            console.error('Failed to fetch rules:', error);
        }
    };

    const handleDeletePolicy = async () => {
        if (!latestPolicy) return;
        if (!window.confirm('Are you sure you want to delete this policy and all its rules?')) return;

        try {
            const response = await fetch(`http://localhost:8000/api/v1/policies/${latestPolicy.id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setLatestPolicy(null);
                setExtractedRules([]);
                setStats(prev => ({ ...prev, rules: 0 }));
                alert('Policy deleted successfully.');
            }
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const handleRunScan = async () => {
        if (stats.rules === 0) {
            alert('Cannot start scan: No compliance rules found. Please upload and analyze a policy first.');
            return;
        }

        setIsScanning(true);
        try {
            const response = await fetch('http://localhost:8000/api/v1/scans', { method: 'POST' });
            const data = await response.json();
            if (response.ok) {
                alert(`Scan triggered successfully! Job ID: ${data.job_id}`);
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

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            await uploadFile(file);
        }
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (file) {
            await uploadFile(file);
            event.target.value = ''; // Reset input
        }
    };

    const uploadFile = async (file) => {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Upload Policy
            const uploadRes = await fetch('http://localhost:8000/api/v1/policies', {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadRes.json();

            if (!uploadRes.ok) throw new Error(uploadData.detail || 'Upload failed');

            const policyId = uploadData.policy_id;
            setSelectedPolicyId(policyId);

            // Extract Rules
            const extractRes = await fetch(`http://localhost:8000/api/v1/policies/${policyId}/extract`, {
                method: 'POST'
            });
            const extractData = await extractRes.json();

            if (!extractRes.ok) throw new Error(extractData.detail || 'Extraction failed');

            alert(`Success: ${file.name} processed. ${extractData.rules_count} rules extracted.`);

            // Refresh rules and stats
            await fetchRules(policyId);
            const statsRes = await fetch('http://localhost:8000/api/v1/stats');
            const statsData = await statsRes.json();
            if (statsRes.ok) setStats(statsData);

        } catch (error) {
            console.error(error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark">
            <Sidebar />
            <main className="flex-1 lg:pl-64 flex flex-col h-full overflow-hidden relative">
                {/* Header */}
                <header className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-5 flex items-center justify-between z-10">
                    <div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                            <span className="hover:text-primary cursor-pointer">Policies</span>
                            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Policy Analysis</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/history')}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">history</span>
                            History
                        </button>
                        <button
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors shadow-sm shadow-primary/20 disabled:opacity-50"
                            onClick={handleRunScan}
                            disabled={isScanning}
                        >
                            <span className={`material-symbols-outlined text-[20px] ${isScanning ? 'animate-spin' : ''}`}>
                                {isScanning ? 'sync' : 'play_arrow'}
                            </span>
                            {isScanning ? 'Scanning...' : 'Run Full Scan'}
                        </button>
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {/* Upload Area */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                    />
                    <div
                        className={`rounded-xl border-2 border-dashed ${isDragOver ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50'} p-8 flex flex-col items-center justify-center text-center gap-4 transition-all hover:border-primary/50 hover:bg-primary/5 group cursor-pointer`}
                        onClick={triggerFileInput}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="h-12 w-12 rounded-full bg-primary-light dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className={`material-symbols-outlined text-primary text-[24px] ${isUploading ? 'animate-spin' : ''}`}>
                                {isUploading ? 'sync' : 'upload_file'}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {isUploading ? 'Uploading...' : latestPolicy ? 'Update Policy PDF' : 'Upload Policy PDF'}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-md mx-auto">
                                {latestPolicy
                                    ? `Current: ${latestPolicy.filename}. Drag and drop a new version to re-analyze.`
                                    : "Drag and drop your compliance policy PDF here to extract monitoring rules automatically."}
                            </p>
                        </div>
                    </div>

                    {/* Split View */}
                    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-320px)] min-h-[600px]">
                        {/* Left Panel: Doc Viewer */}
                        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-rose-500 text-[20px]">picture_as_pdf</span>
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        {latestPolicy ? latestPolicy.filename : "No Document"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {latestPolicy && (
                                        <button
                                            onClick={handleDeletePolicy}
                                            className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 font-medium transition-colors mr-4"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                            Delete Policy
                                        </button>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200">
                                            <span className="material-symbols-outlined text-[18px]">zoom_out</span>
                                        </button>
                                        <span className="text-xs font-mono text-slate-500">100%</span>
                                        <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200">
                                            <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-slate-900 relative">
                                {latestPolicy ? (
                                    <div className="w-full h-full flex flex-col">
                                        <div className="p-6 border border-slate-100 rounded-lg bg-slate-50/50 mb-4 animate-pulse-slow">
                                            <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
                                            <div className="h-4 bg-slate-200 rounded w-full mb-4"></div>
                                            <div className="h-4 bg-slate-200 rounded w-5/6 mb-4"></div>
                                            <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                                        </div>
                                        <div className="p-6 border border-slate-100 rounded-lg bg-slate-50/50 flex-1">
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">visibility</span>
                                                <p className="text-sm">Document preview is active for <b>{latestPolicy.filename}</b></p>
                                                <p className="text-xs mt-1">Rules on the right are extracted from this document.</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 h-full">
                                        <span className="material-symbols-outlined text-4xl mb-4 opacity-50">description</span>
                                        <p>No document selected or processed.</p>
                                        <p className="text-xs mt-2">Upload a policy PDF using the area above.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Panel: Extracted Rules */}
                        <div className="w-full xl:w-[450px] flex flex-col bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[20px]">psychology</span>
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Extracted Rules</span>
                                </div>
                                {extractedRules.length > 0 && (
                                    <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">
                                        {extractedRules.length} New
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {extractedRules.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 h-full">
                                        <span className="material-symbols-outlined text-4xl mb-4 opacity-50">rule</span>
                                        <p>No rules extracted yet. Upload and analyze a policy to see them here.</p>
                                    </div>
                                ) : (
                                    extractedRules.map((rule, idx) => (
                                        <div key={idx} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4 hover:border-primary transition-colors cursor-pointer group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono font-medium text-slate-400">RULE-{100 + rule.id}</span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${rule.severity === 'critical' ? 'bg-rose-100 text-rose-700' :
                                                        rule.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {rule.severity} Severity
                                                    </span>
                                                </div>
                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">verified</span> 98%
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{rule.name}</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{rule.description}</p>
                                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Target: {rule.target_table}</span>
                                                <span className="text-primary text-xs font-bold flex items-center gap-1">
                                                    View Match <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PolicyAnalysisPage;
