import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard, RoundedBox } from '@react-three/drei';

function StoreBuilding({ store, onClick, isSelected, isHovered, onHover }) {
  const groupRef = useRef();
  const [localHover, setLocalHover] = useState(false);

  const hovered = isHovered || localHover;

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
      {/* Gölge / zemin halkası */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, 0]}>
        <circleGeometry args={[1.6, 32]} />
        <meshBasicMaterial
          color={isSelected ? store.accentColor : '#000000'}
          transparent
          opacity={isSelected ? 0.25 : 0.12}
        />
      </mesh>

      {/* Ana bina gövdesi */}
      <RoundedBox
        args={[2.4, 2.2, 2.4]}
        radius={0.08}
        smoothness={4}
        position={[0, 0.1, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={hovered || isSelected ? store.accentColor : store.color}
          roughness={0.45}
          metalness={0.05}
        />
      </RoundedBox>

      {/* Çatı - üçgen prizma */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <coneGeometry args={[1.85, 1.2, 4]} />
        <meshStandardMaterial
          color={store.roofColor}
          roughness={0.6}
          metalness={0.0}
        />
      </mesh>

      {/* Kapı */}
      <mesh position={[0, -0.45, 1.22]}>
        <boxGeometry args={[0.7, 1.2, 0.05]} />
        <meshStandardMaterial color="#5D4037" roughness={0.8} />
      </mesh>
      {/* Kapı topu */}
      <mesh position={[0.28, -0.45, 1.26]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color="#FFD700" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Sol pencere */}
      <mesh position={[-0.75, 0.2, 1.22]}>
        <boxGeometry args={[0.55, 0.55, 0.05]} />
        <meshStandardMaterial
          color="#AED6F1"
          roughness={0.1}
          metalness={0.1}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Sağ pencere */}
      <mesh position={[0.75, 0.2, 1.22]}>
        <boxGeometry args={[0.55, 0.55, 0.05]} />
        <meshStandardMaterial
          color="#AED6F1"
          roughness={0.1}
          metalness={0.1}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Pencere çerçeveleri */}
      {[-0.75, 0.75].map((x, i) => (
        <mesh key={i} position={[x, 0.2, 1.23]}>
          <boxGeometry args={[0.63, 0.63, 0.03]} />
          <meshStandardMaterial color="#FDFEFE" roughness={0.9} />
        </mesh>
      ))}

      {/* Tabelası */}
      <mesh position={[0, -0.1, 1.24]}>
        <boxGeometry args={[2.0, 0.4, 0.04]} />
        <meshStandardMaterial color="#FDFEFE" roughness={0.9} />
      </mesh>

      {/* Rozet (badge) - ön çatıya yakın */}
      {isSelected && (
        <mesh position={[0, 1.1, 1.22]}>
          <boxGeometry args={[1.4, 0.28, 0.04]} />
          <meshStandardMaterial color={store.accentColor} />
        </mesh>
      )}

      {/* Bina üstü ışık efekti seçilince */}
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

      {/* Hover durumunda rating göster */}
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
