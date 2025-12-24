import { useState, useRef, useEffect } from 'react';
import { FaExpand, FaCompress, FaCube, FaCamera } from 'react-icons/fa';
import { TbAugmentedReality, TbCube } from 'react-icons/tb';
import '@google/model-viewer';

// Main 3D Viewer Component using Google's model-viewer
export default function Model3DViewer({ modelUrl, scale = 1, arEnabled = true, title }) {
  const [mode, setMode] = useState('3D');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef(null);
  const modelViewerRef = useRef(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen error:', error);
    }
  };

  const buttonClass = `
    bg-slate-800/80 backdrop-blur
    border border-blue-400/50
    p-2 rounded-md shadow-md
    hover:scale-105 hover:bg-slate-700/80
    hover:border-blue-300 hover:shadow-lg
    transition text-white
    flex items-center justify-center
    cursor-pointer
  `;

  if (hasError) {
    return (
      <div className="w-full h-[450px] border-2 border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-800">
        <div className="text-center p-8">
          <FaCube className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Gagal memuat model 3D</h3>
          <p className="text-sm text-slate-500">Model mungkin tidak tersedia atau format tidak didukung</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="relative w-full h-[450px] border-2 border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-lg bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900"
      >
        {mode === '3D' ? (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 z-10">
                <div className="text-center">
                  <div className="inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat Model 3D...</p>
                </div>
              </div>
            )}
            <model-viewer
              ref={modelViewerRef}
              src={modelUrl}
              alt={title || "Model 3D"}
              auto-rotate
              camera-controls
              touch-action="pan-y"
              shadow-intensity="1"
              exposure="1"
              style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="text-center text-white p-8">
              <FaCamera className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold mb-2">Mode AR</h3>
              <p className="text-sm text-slate-300 mb-4">
                Untuk melihat model dalam AR, klik tombol AR pada model 3D viewer.<br/>
                Fitur ini memerlukan perangkat dengan kamera yang mendukung AR.
              </p>
              <button
                onClick={() => setMode('3D')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Kembali ke Mode 3D
              </button>
            </div>
          </div>
        )}

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className={`${buttonClass} absolute top-3 left-3 z-20`}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <FaCompress className="w-5 h-5" /> : <FaExpand className="w-5 h-5" />}
        </button>

        {/* Mode Switch Button */}
        {arEnabled && mode === '3D' && (
          <button
            onClick={() => setMode('AR')}
            className={`${buttonClass} absolute bottom-3 right-3 z-20`}
            title="Info AR"
          >
            <TbAugmentedReality className="w-7 h-7" />
          </button>
        )}

        {mode === 'AR' && (
          <button
            onClick={() => setMode('3D')}
            className={`${buttonClass} absolute bottom-3 right-3 z-20`}
            title="Mode 3D"
          >
            <TbCube className="w-7 h-7" />
          </button>
        )}
      </div>

      {title && (
        <p className="text-center text-sm text-slate-600 dark:text-slate-400 font-semibold mt-3">
          {title}
        </p>
      )}
    </div>
  );
}
