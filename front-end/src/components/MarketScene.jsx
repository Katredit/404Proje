import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Stars } from '@react-three/drei';
import { Suspense } from 'react';
import StoreBuilding from './StoreBuilding';
import GroundModel from './GroundModel';

function Scene({ stores, selectedStore, setSelectedStore, hoveredId, setHoveredId }) {
  return (
    <>
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

      <Sky
        distance={450000}
        sunPosition={[100, 20, 100]}
        inclination={0}
        azimuth={0.25}
        rayleigh={0.5}
      />
      <Stars radius={120} depth={50} count={1500} factor={3} fade speed={0.8} />

      <GroundModel />

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

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={4}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0, 0]}
        dampingFactor={0.06}
        enableDamping
      />
    </>
  );
}

function MarketScene({ stores, selectedStore, setSelectedStore, hoveredId, setHoveredId }) {
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
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default MarketScene;
