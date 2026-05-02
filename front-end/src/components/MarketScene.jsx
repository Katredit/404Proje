import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Sky,
  Stars,
  Environment,
  Grid,
  ContactShadows,
} from '@react-three/drei';
import { Suspense, useRef } from 'react';
import StoreBuilding from './StoreBuilding';
import { stores } from '../data/stores';
import GroundDecor from './GroundDecor';
import GroundModel from './GroundModel';

function Scene({ selectedStore, setSelectedStore, hoveredId, setHoveredId }) {
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

      {/* Grid çizgisi */}
      <Grid
        args={[80, 80]}
        position={[0, -0.99, 0]}
        cellSize={2}
        cellThickness={0.3}
        cellColor="#B8A888"
        sectionSize={8}
        sectionThickness={0.8}
        sectionColor="#9E8B6E"
        fadeDistance={50}
        fadeStrength={1.5}
        followCamera={false}
        infiniteGrid={false}
      />

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

      {/* Temas gölgesi */}
      <ContactShadows
        position={[0, -0.98, 0]}
        opacity={0.35}
        scale={40}
        blur={2}
        far={10}
      />

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
    </>
  );
}

function MarketScene({ selectedStore, setSelectedStore, hoveredId, setHoveredId }) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 12, 20], fov: 55 }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <Scene
          selectedStore={selectedStore}
          setSelectedStore={setSelectedStore}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
        />
      </Suspense>
    </Canvas>
  );
}

export default MarketScene;
