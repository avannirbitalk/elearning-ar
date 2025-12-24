import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoLogOutOutline } from 'react-icons/io5';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ title, subtitle, backTo, rightActions }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            {backTo && (
              <button
                onClick={() => navigate(backTo)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <IoArrowBack className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            )}
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h1>
              {subtitle && (
                <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {rightActions}
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400 hidden sm:block">
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Logout"
                >
                  <IoLogOutOutline className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
