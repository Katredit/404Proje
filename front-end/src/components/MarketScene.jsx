import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Sky,
  Stars,
} from '@react-three/drei';
import { Suspense, useRef, useEffect } from 'react';
import StoreBuilding from './StoreBuilding';
import GroundDecor from './GroundDecor';
import GroundModel from './GroundModel';

/* ── Dev overlay içini her frame'de DOM üzerinden günceller (React re-render yok) ── */
function DevTracker({ overlayRef, mousePosRef }) {
  const { camera, scene, raycaster, gl } = useThree();

  /* Canvas'a native mousemove dinleyicisi ekle → gerçek sahne geometrisine ray fırlat */
  useEffect(() => {
    const canvas = gl.domElement;
    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      const ny = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera({ x: nx, y: ny }, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      mousePosRef.current = hits.length > 0 ? hits[0].point : null;
    };
    const onLeave = () => { mousePosRef.current = null; };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, [camera, scene, raycaster, gl]);

  useFrame(() => {
    if (!overlayRef.current) return;
    const mp = mousePosRef.current;
    const c  = camera.position;
    const fmt = (n) => n.toFixed(2).padStart(7);
    overlayRef.current.innerHTML =
      `<div class="dev-row"><span class="dev-lbl">🖱 Fare</span>` +
      (mp
        ? `X: <b>${fmt(mp.x)}</b>  Y: <b>${fmt(mp.y)}</b>  Z: <b>${fmt(mp.z)}</b>`
        : `<span class="dev-na">—</span>`) +
      `</div>` +
      `<div class="dev-row"><span class="dev-lbl">📷 Kamera</span>` +
      `X: <b>${fmt(c.x)}</b>  Y: <b>${fmt(c.y)}</b>  Z: <b>${fmt(c.z)}</b></div>`;
  });
  return null;
}

function Scene({ stores, selectedStore, setSelectedStore, hoveredId, setHoveredId, overlayRef, mousePosRef }) {
  return (
    <>
      {/* Işıklar */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={60}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight position={[-8, 12, -8]} intensity={0.4} color="#FFE0B2" />

      {/* Gökyüzü */}
      <Sky
        distance={450000}
        sunPosition={[100, 20, 100]}
        inclination={0}
        azimuth={0.25}
        rayleigh={0.5}
      />
      <Stars radius={120} depth={50} count={1500} factor={3} fade speed={0.8} />

      {/* GLB Zemin modeli */}
      <GroundModel />

      {/* Zemin süslemeleri */}
      <GroundDecor />

      {/* Mağazalar */}
      {stores.map((store) => (
        <StoreBuilding
          key={store.id}
          store={store}
          onClick={(s) => setSelectedStore(selectedStore?.id === s.id ? null : s)}
          isSelected={selectedStore?.id === store.id}
          isHovered={hoveredId === store.id}
          onHover={setHoveredId}
        />
      ))}

      {/* Kamera kontrolü */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={4}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0, 0]}
        dampingFactor={0.06}
        enableDamping
      />

      {/* Developer overlay güncelleyici */}
      <DevTracker overlayRef={overlayRef} mousePosRef={mousePosRef} />
    </>
  );
}

function MarketScene({ stores, selectedStore, setSelectedStore, hoveredId, setHoveredId }) {
  const overlayRef  = useRef(null);
  const mousePosRef = useRef(null);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        shadows
        camera={{ position: [0, 12, 20], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <Scene
            stores={stores}
            selectedStore={selectedStore}
            setSelectedStore={setSelectedStore}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            overlayRef={overlayRef}
            mousePosRef={mousePosRef}
          />
        </Suspense>
      </Canvas>

      {/* ── Developer Pozisyon Overlay ── */}
      <div style={{
        position: 'absolute',
        bottom: '14px',
        right: '14px',
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        color: '#e2f0d0',
        fontFamily: '"JetBrains Mono", "Fira Mono", monospace',
        fontSize: '11.5px',
        lineHeight: '1.7',
        padding: '10px 14px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.12)',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 999,
        minWidth: '300px',
      }}>
        <div style={{ color: '#aaa', fontSize: '10px', letterSpacing: '0.08em', marginBottom: '4px', textTransform: 'uppercase' }}>
          Dev · Pozisyon
        </div>
        <div ref={overlayRef} />
      </div>

      <style>{`
        .dev-row { display:flex; gap:6px; align-items:center; white-space:pre; }
        .dev-lbl { color:#7ecfc0; min-width:72px; display:inline-block; font-size:10.5px; }
        .dev-na  { color:#666; }
        .dev-row b { color:#fff; font-weight:600; }
      `}</style>
    </div>
  );
}

export default MarketScene;
