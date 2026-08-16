import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../utility/config';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: 'fa-solid fa-gauge', end: true },
  { to: '/admin/tests', label: 'Tests', icon: 'fa-solid fa-file-lines' },
];

export default function AdminLayout() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    setRefreshing(true);
    window.location.reload();
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <i className="fa-solid fa-graduation-cap text-blue-600"></i> Examiner Admin
        </div>
        <nav className="admin-mobile-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              <i className={item.icon}></i> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh data"
            className="admin-icon-btn"
          >
            <i className={`fa-solid fa-arrows-rotate ${refreshing ? 'fa-spin' : ''}`}></i>
          </button>
          <span className="text-xs text-slate-500 hidden sm:inline">{user?.email}</span>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="text-xs font-medium text-slate-600 hover:text-red-600 flex items-center gap-1"
          >
            <i className="fa-solid fa-right-from-bracket"></i> Sign out
          </button>
        </div>
      </header>

      <div className="admin-body">
        <aside className="admin-sidebar">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              <i className={item.icon}></i> {item.label}
            </NavLink>
          ))}
        </aside>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
