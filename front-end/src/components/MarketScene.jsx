import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Sky,
  Stars,
  Html,
} from '@react-three/drei';
import { Suspense, useRef, useEffect, useState } from 'react';
import StoreBuilding from './StoreBuilding';
import GroundDecor from './GroundDecor';
import GroundModel from './GroundModel';

/* ── Tıklanan yerdeki iğne ── */
function PinMarker({ position, index, onRemove }) {
  const ringRef = useRef();
  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const s = 1 + 0.25 * Math.sin(clock.elapsedTime * 3 + index);
    ringRef.current.scale.set(s, s, s);
    ringRef.current.material.opacity = 0.6 - 0.3 * Math.sin(clock.elapsedTime * 3 + index);
  });
  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Silindir gövde */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1, 8]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00b0cc" emissiveIntensity={1.2} />
      </mesh>
      {/* Baş küresi */}
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={2} />
      </mesh>
      {/* Nabız halkası */}
      <mesh ref={ringRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.15, 0.25, 24]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      {/* HTML etiket */}
      <Html position={[0, 1.5, 0]} center distanceFactor={14} zIndexRange={[100, 0]}>
        <div
          style={{
            background: 'rgba(0,0,0,0.78)',
            color: '#00e5ff',
            fontFamily: 'monospace',
            fontSize: '10px',
            padding: '3px 7px',
            borderRadius: '5px',
            border: '1px solid #00e5ff44',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          title="Kaldır"
          onClick={onRemove}
        >
          #{index + 1} ({position.x.toFixed(1)}, {position.y.toFixed(1)}, {position.z.toFixed(1)})
        </div>
      </Html>
    </group>
  );
}

/* ── Taş zemin tile ── */
function StoneTile({ position, onRemove }) {
  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[2.0, 32]} />
        <meshStandardMaterial color="#9E9E9E" roughness={0.95} metalness={0} />
      </mesh>
      <Html position={[0, 0.5, 0]} center distanceFactor={14} zIndexRange={[100, 0]}>
        <div
          style={{ background:'rgba(0,0,0,0.78)', color:'#B0BEC5', fontFamily:'monospace', fontSize:'10px',
            padding:'3px 7px', borderRadius:'5px', border:'1px solid #B0BEC544',
            whiteSpace:'nowrap', cursor:'pointer', userSelect:'none' }}
          title="Kaldır" onClick={onRemove}
        >
          🪨 ({position.x.toFixed(1)}, {position.z.toFixed(1)})
        </div>
      </Html>
    </group>
  );
}

/* ── Hayalet mağaza binası ── */
function PlaceholderBuilding({ position, onRemove }) {
  const groupRef = useRef();
  useFrame(({ clock }) => {
    if (groupRef.current)
      groupRef.current.position.y = Math.sin(clock.elapsedTime * 1.5) * 0.08;
  });
  return (
    <group ref={groupRef} position={[position.x, 0, position.z]}>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[2.2, 2, 2.2]} />
        <meshStandardMaterial color="#7B68EE" transparent opacity={0.42} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <coneGeometry args={[1.6, 1.2, 4]} />
        <meshStandardMaterial color="#9370DB" transparent opacity={0.52} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[2.22, 2.02, 2.22]} />
        <meshBasicMaterial color="#B39DDB" wireframe transparent opacity={0.55} />
      </mesh>
      <Html position={[0, 3.5, 0]} center distanceFactor={14} zIndexRange={[100, 0]}>
        <div
          style={{ background:'rgba(0,0,0,0.78)', color:'#B39DDB', fontFamily:'monospace', fontSize:'10px',
            padding:'3px 7px', borderRadius:'5px', border:'1px solid #B39DDB44',
            whiteSpace:'nowrap', cursor:'pointer', userSelect:'none' }}
          title="Kaldır" onClick={onRemove}
        >
          🏪 ({position.x.toFixed(1)}, {position.z.toFixed(1)})
        </div>
      </Html>
    </group>
  );
}

/* ── Tıklama algılayıcısı (OrbitControls sürüklemeyle çakışmaz) ── */
function ClickPlacer({ onPlace, mousePosRef, toolRef }) {
  const { gl } = useThree();
  const downPos = useRef(null);

  useEffect(() => {
    const canvas = gl.domElement;
    const onDown = (e) => { downPos.current = { x: e.clientX, y: e.clientY }; };
    const onUp = (e) => {
      if (!downPos.current) return;
      const dx = e.clientX - downPos.current.x;
      const dy = e.clientY - downPos.current.y;
      if (Math.hypot(dx, dy) < 5 && mousePosRef.current) {
        onPlace(toolRef.current, { ...mousePosRef.current });
      }
      downPos.current = null;
    };
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mouseup', onUp);
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mouseup', onUp);
    };
  }, [gl, onPlace, mousePosRef, toolRef]);

  return null;
}

/* ── Dev overlay içini her frame'de DOM üzerinden günceller (React re-render yok) ── */
function DevTracker({ overlayRef, mousePosRef }) {
  const { camera, scene, raycaster, gl } = useThree();

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

function Scene({ stores, selectedStore, setSelectedStore, hoveredId, setHoveredId, overlayRef, mousePosRef, devObjects, onPlace, onRemoveDevObj, toolRef }) {
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
      {/* <GroundDecor /> */}

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

      {/* Tıklama ile nesne ekleme */}
      <ClickPlacer onPlace={onPlace} mousePosRef={mousePosRef} toolRef={toolRef} />

      {/* Dev nesneler */}
      {devObjects.map((obj, i) => {
        const rem = () => onRemoveDevObj(obj.id);
        if (obj.type === 'pin')    return <PinMarker          key={obj.id} position={obj.position} index={i} onRemove={rem} />;
        if (obj.type === 'stone')  return <StoneTile           key={obj.id} position={obj.position} onRemove={rem} />;
        if (obj.type === 'market') return <PlaceholderBuilding key={obj.id} position={obj.position} onRemove={rem} />;
        return null;
      })}
    </>
  );
}

const TOOLS = [
  { id: 'pin',    icon: '📍', label: 'Pin',       color: '#00e5ff' },
  { id: 'market', icon: '🏪', label: 'Mağaza',    color: '#B39DDB' },
  { id: 'stone',  icon: '🪨', label: 'Taş Zemin', color: '#B0BEC5' },
];

function MarketScene({ stores, selectedStore, setSelectedStore, hoveredId, setHoveredId }) {
  const overlayRef   = useRef(null);
  const mousePosRef  = useRef(null);
  const idCounter    = useRef(0);
  const toolRef      = useRef('pin');
  const [tool, setTool]             = useState('pin');
  const [devObjects, setDevObjects] = useState([]);

  const [exportModal, setExportModal] = useState(false);
  const [copied, setCopied]           = useState(false);

  const setActiveTool = (t) => { setTool(t); toolRef.current = t; };
  const handlePlace   = (type, pos) => setDevObjects((p) => [...p, { id: idCounter.current++, type, position: pos }]);
  const handleRemove  = (id)        => setDevObjects((p) => p.filter((o) => o.id !== id));
  const counts = devObjects.reduce((acc, o) => ({ ...acc, [o.type]: (acc[o.type] || 0) + 1 }), {});

  const pins = devObjects.filter((o) => o.type === 'pin');
  const exportCode = pins.length === 0 ? '// Henüz pin eklenmedi' :
    `// stores.js → position alanı için hazır koordinatlar\n` +
    pins.map((o, i) => {
      const p = o.position;
      return `  // Pin #${i + 1}\n  position: [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}],`;
    }).join('\n') +
    `\n\n// Toplu dizi olarak:\nconst positions = [\n` +
    pins.map((o) => {
      const p = o.position;
      return `  [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}]`;
    }).join(',\n') +
    `\n];`;

  const handleCopy = () => {
    navigator.clipboard.writeText(exportCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
            devObjects={devObjects}
            onPlace={handlePlace}
            onRemoveDevObj={handleRemove}
            toolRef={toolRef}
          />
        </Suspense>
      </Canvas>

      {/* ── Araç Seçici Toolbar ── */}
      <div style={{
        position: 'absolute', bottom: '14px', left: '14px',
        display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 999,
      }}>
        <div style={{ color:'#aaa', fontSize:'9.5px', letterSpacing:'0.08em',
          textTransform:'uppercase', marginBottom:'2px', userSelect:'none' }}>
          Dev · Araç
        </div>
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id)}
            style={{
              display:'flex', alignItems:'center', gap:'8px',
              background: tool === t.id ? `${t.color}22` : 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(6px)',
              border: `1px solid ${tool === t.id ? t.color : 'rgba(255,255,255,0.12)'}`,
              color: tool === t.id ? t.color : '#999',
              fontFamily: '"JetBrains Mono","Fira Mono",monospace',
              fontSize: '11.5px', padding: '7px 14px', borderRadius: '8px',
              cursor: 'pointer', userSelect: 'none', minWidth: '148px',
            }}
          >
            <span style={{ fontSize:'15px' }}>{t.icon}</span>
            <span>{t.label}</span>
            {counts[t.id] > 0 && (
              <span style={{ marginLeft:'auto', background:`${t.color}33`, color:t.color,
                fontSize:'9.5px', padding:'1px 7px', borderRadius:'999px' }}>
                {counts[t.id]}
              </span>
            )}
          </button>
        ))}
        {devObjects.length > 0 && (
          <button
            onClick={() => setDevObjects([])}
            style={{ background:'rgba(255,80,80,0.15)', border:'1px solid #ff505044',
              color:'#ff8080', fontFamily:'"JetBrains Mono",monospace', fontSize:'10px',
              padding:'6px 14px', borderRadius:'8px', cursor:'pointer', marginTop:'2px' }}
          >
            ✕ Tümünü Temizle
          </button>
        )}
        {pins.length > 0 && (
          <button
            onClick={() => setExportModal(true)}
            style={{
              display:'flex', alignItems:'center', gap:'8px',
              background:'rgba(255,214,0,0.14)', border:'1px solid #ffd60044',
              color:'#ffd600', fontFamily:'"JetBrains Mono",monospace', fontSize:'10.5px',
              padding:'7px 14px', borderRadius:'8px', cursor:'pointer', marginTop:'2px',
            }}
          >
            <span style={{ fontSize:'14px' }}>📤</span>
            Koordinatları Dışa Aktar
            <span style={{ marginLeft:'auto', background:'#ffd60033', color:'#ffd600',
              fontSize:'9.5px', padding:'1px 7px', borderRadius:'999px' }}>
              {pins.length}
            </span>
          </button>
        )}
      </div>

      {/* ── Developer Pozisyon Overlay ── */}
      <div style={{
        position: 'absolute', bottom: '14px', right: '14px',
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
        color: '#e2f0d0', fontFamily: '"JetBrains Mono","Fira Mono",monospace',
        fontSize: '11.5px', lineHeight: '1.7', padding: '10px 14px',
        borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)',
        userSelect: 'none', zIndex: 999, minWidth: '300px',
      }}>
        <div style={{ color:'#aaa', fontSize:'10px', letterSpacing:'0.08em',
          marginBottom:'4px', textTransform:'uppercase' }}>
          Dev · Pozisyon
        </div>
        <div ref={overlayRef} style={{ pointerEvents:'none' }} />
      </div>

      <style>{`
        .dev-row { display:flex; gap:6px; align-items:center; white-space:pre; }
        .dev-lbl { color:#7ecfc0; min-width:72px; display:inline-block; font-size:10.5px; }
        .dev-na  { color:#666; }
        .dev-row b { color:#fff; font-weight:600; }
      `}</style>

      {/* ── Export Modal ── */}
      {exportModal && (
        <div
          onClick={() => setExportModal(false)}
          style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.72)',
            backdropFilter:'blur(4px)', zIndex:2000,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background:'#121212', border:'1px solid rgba(255,214,0,0.3)',
              borderRadius:'14px', padding:'24px 28px', width:'540px', maxWidth:'90vw',
              fontFamily:'"JetBrains Mono","Fira Mono",monospace',
            }}
          >
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
              <span style={{ color:'#ffd600', fontSize:'13px', fontWeight:700 }}>
                📤 Pin Koordinatları — {pins.length} nokta
              </span>
              <button
                onClick={() => setExportModal(false)}
                style={{ background:'none', border:'none', color:'#666', fontSize:'18px', cursor:'pointer' }}
              >✕</button>
            </div>

            <pre style={{
              background:'#0a0a0a', border:'1px solid #222', borderRadius:'8px',
              padding:'14px 16px', fontSize:'11.5px', lineHeight:'1.7',
              color:'#b5e853', overflowX:'auto', margin:0, whiteSpace:'pre',
              maxHeight:'320px', overflowY:'auto',
            }}>
              {exportCode}
            </pre>

            <div style={{ display:'flex', gap:'10px', marginTop:'16px' }}>
              <button
                onClick={handleCopy}
                style={{
                  flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                  background: copied ? 'rgba(0,230,118,0.18)' : 'rgba(255,214,0,0.15)',
                  border: `1px solid ${copied ? '#00e67644' : '#ffd60044'}`,
                  color: copied ? '#00e676' : '#ffd600',
                  fontFamily:'inherit', fontSize:'11.5px',
                  padding:'9px 0', borderRadius:'8px', cursor:'pointer',
                }}
              >
                <span style={{ fontSize:'14px' }}>{copied ? '✓' : '📋'}</span>
                {copied ? 'Kopyalandı!' : 'Panoya Kopyala'}
              </button>
              <button
                onClick={() => setExportModal(false)}
                style={{
                  background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
                  color:'#888', fontFamily:'inherit', fontSize:'11.5px',
                  padding:'9px 20px', borderRadius:'8px', cursor:'pointer',
                }}
              >
                Kapat
              </button>
            </div>

            <div style={{ marginTop:'12px', color:'#555', fontSize:'10px', lineHeight:'1.6' }}>
              💡 Bu koordinatları <span style={{ color:'#888' }}>stores.js</span> dosyasındaki{' '}
              <span style={{ color:'#ffd600' }}>position: [x, y, z]</span> alanına yapıştırabilirsin.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketScene;
