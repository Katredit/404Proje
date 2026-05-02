import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard, useGLTF, Clone } from '@react-three/drei';
import marketUrl from '../assets/market.glb';

useGLTF.preload(marketUrl);

function StoreBuilding({ store, onClick, isSelected, isHovered, onHover }) {
  const groupRef = useRef();
  const [localHover, setLocalHover] = useState(false);

  const hovered = isHovered || localHover;

  const { scene } = useGLTF(marketUrl);

  useFrame((state) => {
    if (groupRef.current) {
      const targetY = hovered || isSelected ? 0.3 : 0;
      groupRef.current.position.y +=
        (targetY - groupRef.current.position.y) * 0.08;

      if (isSelected) {
        groupRef.current.rotation.y =
          Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      } else {
        groupRef.current.rotation.y *= 0.9;
      }
    }
  });

  const [bx, , bz] = store.position;

  return (
    <group
      ref={groupRef}
      position={[bx, 0, bz]}
      onClick={(e) => {
        e.stopPropagation();
        onClick(store);
      }}
      onPointerEnter={(e) => {
        e.stopPropagation();
        setLocalHover(true);
        onHover(store.id);
        document.body.style.cursor = 'pointer';
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        setLocalHover(false);
        onHover(null);
        document.body.style.cursor = 'default';
      }}
    >
      {/* Golge / zemin halkasi */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, 0]}>
        <circleGeometry args={[1.6, 16]} />
        <meshBasicMaterial
          color={isSelected ? store.accentColor : '#000000'}
          transparent
          opacity={isSelected ? 0.25 : 0.12}
        />
      </mesh>

      {/* market.glb modeli — Clone geometri/materyal paylasar, cok daha performansli */}
      <Clone
        object={scene}
        scale={[2, 2, 2]}
        position={[0, 0.75, 0]}
        castShadow
        receiveShadow
      />

      {/* Secili iken renkli isik (sadece secili magaza — performans) */}
      {isSelected && (
        <pointLight
          position={[0, 2.5, 0]}
          intensity={2}
          color={store.accentColor}
          distance={5}
        />
      )}

      {/* Billboard etiket */}
      <Billboard position={[0, 3.0, 0]}>
        <Text
          fontSize={0.28}
          color={hovered || isSelected ? store.accentColor : '#FFFFFF'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
          maxWidth={3}
          textAlign="center"
        >
          {store.name}
        </Text>
      </Billboard>

      {/* Hover durumunda rating goster */}
      {(hovered || isSelected) && (
        <Billboard position={[0, 2.55, 0]}>
          <Text
            fontSize={0.2}
            color="#F1C40F"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.015}
            outlineColor="#000000"
          >
            {'⭐ ' + store.rating + ' (' + store.reviewCount + ')'}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

export default StoreBuilding;
