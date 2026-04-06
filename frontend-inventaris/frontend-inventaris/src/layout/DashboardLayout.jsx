import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { 
    Menu, X, LayoutGrid, Package, Trash2, Users, 
    LogOut, User as UserIcon, 
    MapPinned,
    ChevronDown,
    Layers,
    UserCheck,
    ArrowLeftRight,
    Wrench,
    HandCoins,
    ChevronRight
} from "lucide-react"; 
import { useState, useEffect, useRef, useMemo } from "react"; 

export default function DashboardLayout() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(true); 
    const [isProfileOpen, setIsProfileOpen] = useState(false); 
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false); 
    const profileRef = useRef(null); 

    const [user, setUser] = useState({
        name: 'Guest',
        role: 'unknown',
        initials: '?',
        isLoggedIn: false,
    });
    
    const currentRole = user.role.toLowerCase(); 

    // --- 1. LOGIKA LOCK SCROLL ---
    useEffect(() => {
        if (open && window.innerWidth < 1024) {
            document.body.style.overflow = 'hidden';
            document.body.style.height = '100%';
        } else {
            document.body.style.overflow = 'unset';
            document.body.style.height = 'auto';
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.body.style.height = 'auto';
        };
    }, [open]);

    // --- 2. RESPONSIVE HANDLER ---
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) setOpen(false);
            else setOpen(true);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // --- 3. LOAD USER DATA ---
    useEffect(() => {
        const storedToken = localStorage.getItem('authToken');
        const storedRole = localStorage.getItem('userRole'); 
        const storedName = localStorage.getItem('userName'); 

        if (storedToken && storedRole && storedName) { 
            const initial = storedName.charAt(0).toUpperCase();
            setUser({
                name: storedName, 
                role: storedRole.toLowerCase(),
                initials: initial,
                isLoggedIn: true,
            });
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName'); 
        setUser({ name: 'Guest', role: 'unknown', initials: '?', isLoggedIn: false });
        navigate('/login'); 
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- 4. STYLE NAVLINK (DIPERBAIKI UNTUK PC KONSISTENSI) ---
    const getNavLinkClass = ({ isActive }) => {
        return `
            flex items-center gap-3 px-3 py-2 rounded-lg
            transition-all duration-200 text-[13px]
            ${isActive 
                ? "bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-100 shadow-sm" 
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}
            ${open ? "justify-start" : "lg:justify-center justify-start"}
        `;
    };

    const navItems = useMemo(() => ([
        { to: "/dashboard", icon: <LayoutGrid size={18}/>, label: "Dashboard", roles: ['admin', 'user', 'staf', 'supervisor', 'unknown'] }, 
        { to: "/Assets", icon: <Package size={18}/>, label: "Assets", roles: ['admin', 'user', 'staf', 'supervisor'] },
        { to: "/Categories", icon: <Layers size={18}/>, label: "Categories", roles: ['admin', 'user', 'staf', 'supervisor'] },
        { to: "/Locations", icon: <MapPinned size={18}/>, label: "Locations", roles: ['admin', 'user', 'staf', 'supervisor'] },
        { to: "/AssetOwner", icon: <UserCheck size={18}/>, label: "Asset Owner", roles: ['admin', 'user', 'staf', 'supervisor'] },
        { to: "/AssetTransfers", icon: <ArrowLeftRight size={18}/>, label: "Asset Transfers", roles: ['admin', 'user', 'staf', 'supervisor'] },
        { to: "/AssetMaintenance", icon: <Wrench size={18}/>, label: "Asset Maintenance", roles: ['admin', 'user', 'staf', 'supervisor'] },
        { to: "/AssetLoans", icon: <HandCoins size={18}/>, label: "Asset Borrowing", roles: ['admin', 'user', 'staf', 'supervisor'] },
        { to: "/AssetDisposal", icon: <Trash2 size={18}/>, label: "Asset Disposal", roles: ['admin', 'user', 'staf', 'supervisor'] }, 
    ]).filter(item => item.roles.includes(currentRole)), [currentRole]);

    return (
        <div className="flex min-h-screen bg-gray-50/50 overflow-x-hidden text-left font-sans">
            
            {/* CSS Internal untuk menyembunyikan scrollbar di sidebar */}
            <style dangerouslySetInnerHTML={{ __html: `
                .sidebar-nav::-webkit-scrollbar { display: none; }
                .sidebar-nav { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />

            {/* Overlay Mobile */}
            {open && (
                <div 
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[50] lg:hidden transition-opacity" 
                    onClick={() => setOpen(false)} 
                />
            )}

            {/* SIDEBAR */}
            <aside className={`
                fixed top-0 left-0 z-[60] h-full lg:h-screen bg-white shadow-sm border-r border-gray-100 transition-all duration-300 flex flex-col overflow-hidden
                ${open ? "w-60 translate-x-0" : "w-16 -translate-x-full lg:translate-x-0"}
            `}>
                {/* Header Sidebar */}
                <div className="flex items-center justify-between px-4 h-16 flex-shrink-0 border-b border-gray-50">
                    <h1 className={`text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent ${(open || window.innerWidth < 1024) ? "block" : "hidden"}`}>
                        NASA
                    </h1>
                    <button onClick={() => setOpen(!open)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
                        {open ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
                
                {/* Navigasi - Area Scroll (Fix: Scrollbar disembunyikan) */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-1 sidebar-nav" style={{ overscrollBehavior: 'contain' }}>
                    <ul className={`space-y-1 ${open ? "min-w-[180px]" : ""}`}>
                        {navItems.map((item, i) => (
                            <li key={i}>
                                <NavLink to={item.to} className={getNavLinkClass} onClick={() => window.innerWidth < 1024 && setOpen(false)}>
                                    <span className={`shrink-0 transition-colors`}>{item.icon}</span>
                                    {(open || window.innerWidth < 1024) && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                                </NavLink>
                            </li>
                        ))}

                        {/* Management User (Dropdown) */}
                        {currentRole === 'admin' && (
                            <li className="space-y-1">
                                <button 
                                    onClick={() => { if(!open) setOpen(true); setIsUserMenuOpen(!isUserMenuOpen); }}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-[13px] 
                                        ${isUserMenuOpen && open ? "bg-gray-50 text-gray-900" : "text-gray-600 hover:bg-gray-50"} 
                                        ${!open && "lg:justify-center px-0"}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Users size={18} className="shrink-0" />
                                        {(open || window.innerWidth < 1024) && <span className="font-medium whitespace-nowrap">Settings</span>}
                                    </div>
                                    {open && <ChevronRight size={14} className={`transition-transform opacity-50 ${isUserMenuOpen ? "rotate-90" : ""}`} />}
                                </button>

                                {isUserMenuOpen && open && (
                                    <div className="ml-8 mt-1 flex flex-col gap-1 border-l border-gray-200 pl-4">
                                        <NavLink to="/Users" onClick={() => window.innerWidth < 1024 && setOpen(false)} className={({isActive}) => `py-2 text-[12px] transition-colors ${isActive ? "text-blue-600 font-semibold" : "text-gray-500 hover:text-blue-600"}`}>Users List</NavLink>
                                        <NavLink to="/AuditLogs" onClick={() => window.innerWidth < 1024 && setOpen(false)} className={({isActive}) => `py-2 text-[12px] transition-colors ${isActive ? "text-blue-600 font-semibold" : "text-gray-500 hover:text-blue-600"}`}>Audit Trail</NavLink>
                                    </div>
                                )}
                            </li>
                        )}
                    </ul>
                </nav>

                {/* Footer Profil - Sticky & Fix Layout */}
                <div className="mt-auto border-t border-gray-50 shrink-0 bg-white z-50" ref={profileRef}>
                    {/* Logout Button Dropdown Area */}
                    <div className={`overflow-hidden transition-all duration-300 ${isProfileOpen && open ? "max-h-20 p-2" : "max-h-0 opacity-0"}`}>
                        <button 
                            onClick={handleLogout}
                            className="flex items-center justify-center gap-2 w-full py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors active:scale-95"
                        >
                            <LogOut size={16} /> <span>Logout</span>
                        </button>
                    </div>

                    {/* Profil Clickable Area */}
                    <div 
                        onClick={() => { if(!open) setOpen(true); setIsProfileOpen(!isProfileOpen); }}
                        className={`flex items-center cursor-pointer p-4 hover:bg-gray-50 transition-colors ${open ? "justify-start" : "lg:justify-center px-2"}`}
                    >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shrink-0 bg-blue-600 ${(open || window.innerWidth < 1024) ? 'mr-3' : 'mx-0'}`}>
                            {user.initials}
                        </div>
                        {(open || window.innerWidth < 1024) && (
                            <div className="flex-1 min-w-0 flex items-center justify-between overflow-hidden">
                                <div className="flex flex-col text-left">
                                    <span className="font-semibold text-gray-900 truncate text-[13px] leading-tight">{user.name}</span>
                                    <span className="text-[11px] text-gray-400 font-medium capitalize">{user.role}</span>
                                </div>
                                <ChevronDown size={14} className={`text-gray-300 transition-transform ml-2 ${isProfileOpen ? "rotate-180" : ""}`} />
                            </div>
                        )}
                    </div>
                </div>
            </aside>
            
            {/* MAIN CONTENT AREA */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ${open ? "lg:ml-60" : "lg:ml-16"} ml-0 w-full min-w-0`}>
                <header className="lg:hidden bg-white shadow-sm px-4 h-16 flex items-center sticky top-0 z-20">
                    <button onClick={() => setOpen(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                        <Menu size={24} />
                    </button>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">NASA</h1>
                    </div>
                </header>

                <main className="p-4 md:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}