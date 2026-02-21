import { useLocation, Link } from 'react-router-dom';

const Sidebar = () => {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;

    const links = [
        { path: '/', label: 'Dashboard', icon: 'dashboard' },
        { path: '/policies', label: 'Policy Analysis', icon: 'description' },
        { path: '/databases', label: 'Database Monitor', icon: 'database' },
        { path: '/violations', label: 'Violations', icon: 'report_problem' },
        { path: '/history', label: 'Scan History', icon: 'history' },
    ];

    return (
        <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col">
            <div className="flex h-16 shrink-0 items-center px-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-8 rounded bg-primary/10 text-primary">
                        <span className="material-symbols-outlined icon-filled text-xl">verified_user</span>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-slate-900 text-base font-bold leading-none">ComplianceOS</h1>
                        <p className="text-slate-500 text-xs font-normal mt-1">Enterprise Edition</p>
                    </div>
                </div>
            </div>
            <div className="flex flex-col flex-1 gap-1 px-3 py-4 overflow-y-auto">
                {links.slice(0, 5).map(link => (
                    <Link
                        key={link.path}
                        to={link.path}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${isActive(link.path) ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <span className={`material-symbols-outlined ${isActive(link.path) ? 'icon-filled' : ''}`}>{link.icon}</span>
                        <span className="text-sm font-medium">{link.label}</span>
                    </Link>
                ))}
            </div>
        </aside>
    );
};

export default Sidebar;
