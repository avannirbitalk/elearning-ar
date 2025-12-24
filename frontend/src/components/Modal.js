import { IoCloseOutline } from 'react-icons/io5';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className={`relative w-full ${maxWidth} bg-white dark:bg-slate-900 rounded-2xl shadow-xl`}>
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <IoCloseOutline className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
