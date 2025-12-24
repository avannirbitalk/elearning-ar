import { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Center } from '@react-three/drei';
import * as THREE from 'three';
import { FaPlay, FaStop, FaExpand, FaCompress, FaCube, FaCamera } from 'react-icons/fa';
import { TbAugmentedReality, TbCube } from 'react-icons/tb';

// 3D Model Component
function Model({ modelUrl, scale = 1, isPlaying, playDirection }) {
  const gltf = useGLTF(modelUrl);
  const mixer = useRef();
  const actions = useRef([]);

  useEffect(() => {
    if (gltf.animations.length && gltf.scene) {
      mixer.current = new THREE.AnimationMixer(gltf.scene);
      actions.current = gltf.animations.map((clip) => {
        const action = mixer.current.clipAction(clip);
        action.play();
        return action;
      });
    }
  }, [gltf]);

  useEffect(() => {
    if (actions.current.length > 0) {
      actions.current.forEach((action) => {
        action.timeScale = playDirection * 0.5;
      });
    }
  }, [playDirection]);

  useFrame((_, delta) => {
    if (isPlaying && mixer.current) {
      mixer.current.update(delta);
    }
  });

  return (
    <Center>
      <primitive object={gltf.scene} scale={scale} />
    </Center>
  );
}

// Loading fallback
function LoadingModel() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#3b82f6" wireframe />
    </mesh>
  );
}

// Main 3D Viewer Component
export default function Model3DViewer({ modelUrl, scale = 1, arEnabled = true, title }) {
  const [mode, setMode] = useState('3D');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playDirection, setPlayDirection] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

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

  const handlePlay = () => {
    setPlayDirection(1);
    setIsPlaying(true);
  };

  const handleReverse = () => {
    setPlayDirection(-1);
    setIsPlaying(true);
  };

  const handleStop = () => {
    setIsPlaying(false);
  };

  const buttonClass = `
    bg-slate-800/80 backdrop-blur
    border border-blue-400/50
    p-2 rounded-md shadow-md
    hover:scale-105 hover:bg-slate-700/80
    hover:border-blue-300 hover:shadow-lg
    transition text-white
    flex items-center justify-center
  `;

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="relative w-full h-[450px] border-2 border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-lg bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900"
      >
        {mode === '3D' ? (
          <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <pointLight position={[-5, 5, -5]} intensity={0.5} />
            <Suspense fallback={<LoadingModel />}>
              <Model
                modelUrl={modelUrl}
                scale={scale}
                isPlaying={isPlaying}
                playDirection={playDirection}
              />
            </Suspense>
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              autoRotate={!isPlaying}
              autoRotateSpeed={1}
            />
            <Environment preset="studio" />
          </Canvas>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <div className="text-center text-white p-8">
              <FaCamera className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold mb-2">Mode AR</h3>
              <p className="text-sm text-slate-300 mb-4">
                Arahkan kamera ke permukaan datar untuk melihat model 3D dalam Augmented Reality
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
          className={`${buttonClass} absolute top-3 left-3 z-10`}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <FaCompress className="w-5 h-5" /> : <FaExpand className="w-5 h-5" />}
        </button>

        {/* Playback Controls */}
        {mode === '3D' && (
          <div className="absolute bottom-3 left-3 flex gap-2 z-10">
            <button onClick={handleReverse} className={buttonClass} title="Reverse">
              <FaPlay className="w-5 h-5 transform rotate-180" />
            </button>
            <button onClick={handleStop} className={buttonClass} title="Stop">
              <FaStop className="w-5 h-5" />
            </button>
            <button onClick={handlePlay} className={buttonClass} title="Play">
              <FaPlay className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Mode Switch Button */}
        {arEnabled && (
          <button
            onClick={() => setMode(mode === '3D' ? 'AR' : '3D')}
            className={`${buttonClass} absolute bottom-3 right-3 z-10`}
            title={mode === '3D' ? 'Mode AR' : 'Mode 3D'}
          >
            {mode === '3D' ? (
              <TbAugmentedReality className="w-7 h-7" />
            ) : (
              <TbCube className="w-7 h-7" />
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
