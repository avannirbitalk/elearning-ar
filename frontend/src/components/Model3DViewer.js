import { useState, useRef, useEffect } from 'react';
import { FaExpand, FaCompress, FaCube, FaCamera, FaPlay, FaPause, FaRedo } from 'react-icons/fa';
import { TbAugmentedReality, TbCube } from 'react-icons/tb';

// Main 3D Viewer Component using iframe with model-viewer CDN
export default function Model3DViewer({ modelUrl, scale = 1, arEnabled = true, title }) {
  const [mode, setMode] = useState('3D');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);
  const iframeRef = useRef(null);

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

  // Create HTML content for the iframe with model-viewer
  const getIframeContent = () => {
    const arButton = arEnabled ? 'ar ar-modes="webxr scene-viewer quick-look"' : '';
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; overflow: hidden; }
            model-viewer {
              width: 100%;
              height: 100%;
              background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
              --poster-color: transparent;
            }
            model-viewer::part(default-ar-button) {
              bottom: 16px;
              right: 16px;
              background: rgba(30, 41, 59, 0.9);
              border: 1px solid rgba(59, 130, 246, 0.5);
              border-radius: 8px;
              padding: 8px 16px;
            }
            .loading {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              text-align: center;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 3px solid #e2e8f0;
              border-top-color: #3b82f6;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 16px;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <model-viewer
            id="viewer"
            src="${modelUrl}"
            alt="${title || 'Model 3D'}"
            auto-rotate
            camera-controls
            touch-action="pan-y"
            shadow-intensity="1"
            exposure="1"
            ${arButton}
          >
            <div class="loading" slot="poster">
              <div class="spinner"></div>
              <p style="color: #64748b; font-size: 14px;">Memuat Model 3D...</p>
            </div>
          </model-viewer>
          <script>
            const viewer = document.getElementById('viewer');
            viewer.addEventListener('load', () => {
              window.parent.postMessage({ type: 'model-loaded' }, '*');
            });
            viewer.addEventListener('error', () => {
              window.parent.postMessage({ type: 'model-error' }, '*');
            });
          </script>
        </body>
      </html>
    `;
  };

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'model-loaded') {
        setIsLoading(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="relative w-full h-[450px] border-2 border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-lg"
      >
        {mode === '3D' ? (
          <iframe
            ref={iframeRef}
            srcDoc={getIframeContent()}
            title={title || "Model 3D Viewer"}
            className="w-full h-full border-none"
            allow="autoplay; fullscreen; xr-spatial-tracking; camera"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="text-center text-white p-8">
              <FaCamera className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold mb-2">Mode AR</h3>
              <p className="text-sm text-slate-300 mb-4 max-w-md">
                Untuk melihat model dalam Augmented Reality, klik tombol AR 
                <span className="inline-block mx-2 px-2 py-1 bg-slate-700 rounded text-xs">
                  <TbAugmentedReality className="inline w-4 h-4" />
                </span> 
                pada viewer 3D.<br/><br/>
                Fitur AR memerlukan perangkat dengan kamera yang mendukung WebXR, ARCore (Android), atau ARKit (iOS).
              </p>
              <button
                onClick={() => setMode('3D')}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
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

        {/* AR Info Button */}
        {arEnabled && (
          <button
            onClick={() => setMode(mode === '3D' ? 'AR' : '3D')}
            className={`${buttonClass} absolute top-3 right-3 z-20`}
            title={mode === '3D' ? 'Info AR' : 'Mode 3D'}
          >
            {mode === '3D' ? (
              <TbAugmentedReality className="w-6 h-6" />
            ) : (
              <TbCube className="w-6 h-6" />
            )}
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
