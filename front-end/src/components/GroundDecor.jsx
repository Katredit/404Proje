import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

// Peri bacası benzeri koni şekli
function FairyChimney({ position, color, scale = 1 }) {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Gövde */}
      <mesh castShadow>
        <cylinderGeometry args={[0.18, 0.38, 1.2, 8]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {/* Tepe */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </mesh>
    </group>
  );
}

// Küçük ağaç
function Tree({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.15, 0.8, 6]} />
        <meshStandardMaterial color="#5D4037" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <coneGeometry args={[0.55, 1.4, 7]} />
        <meshStandardMaterial color="#2E7D32" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <coneGeometry args={[0.38, 1.0, 7]} />
        <meshStandardMaterial color="#388E3C" roughness={0.8} />
      </mesh>
    </group>
  );
}

// Fener direği
function Lamp({ position }) {
  const lightRef = useRef();
  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.intensity = 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group position={position}>
      {/* Direk */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 3, 8]} />
        <meshStandardMaterial color="#424242" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Lamba başlığı */}
      <mesh position={[0, 3.1, 0]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial
          color="#FFF9C4"
          emissive="#FFF176"
          emissiveIntensity={1.2}
        />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, 3.1, 0]}
        intensity={0.9}
        color="#FFE082"
        distance={6}
        castShadow={false}
      />
    </group>
  );
}

// Çeşme / süsleme
function Fountain({ position }) {
  const waterRef = useRef();
  useFrame((state) => {
    if (waterRef.current) {
      waterRef.current.material.opacity =
        0.6 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
    }
  });

  return (
    <group position={position}>
      {/* Havuz kenarı */}
      <mesh position={[0, -0.6, 0]} receiveShadow>
        <cylinderGeometry args={[1.1, 1.2, 0.3, 16]} />
        <meshStandardMaterial color="#D7CCC8" roughness={0.9} />
      </mesh>
      {/* Su */}
      <mesh ref={waterRef} position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.95, 24]} />
        <meshStandardMaterial
          color="#1565C0"
          transparent
          opacity={0.7}
          roughness={0.1}
          metalness={0.2}
        />
      </mesh>
      {/* Merkez sütun */}
      <mesh position={[0, -0.2, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 0.8, 8]} />
        <meshStandardMaterial color="#BCAAA4" roughness={0.85} />
      </mesh>
      {/* Çeşme ağzı */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#A1887F" roughness={0.8} />
      </mesh>
    </group>
  );
}

// Tabela / yönlendirici
function SignPost({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 1.6, 6]} />
        <meshStandardMaterial color="#5D4037" roughness={0.9} />
      </mesh>
      <mesh position={[0.5, 1.4, 0]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[1.1, 0.3, 0.08]} />
        <meshStandardMaterial color="#FF8F00" roughness={0.7} />
      </mesh>
      <mesh position={[-0.45, 1.0, 0]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[1.0, 0.28, 0.08]} />
        <meshStandardMaterial color="#1565C0" roughness={0.7} />
      </mesh>
    </group>
  );
}

function GroundDecor() {
  return (
    <group>
      {/* Peri bacaları */}
      <FairyChimney position={[-12, -0.4, -5]} color="#C2956C" scale={1.4} />
      <FairyChimney position={[12, -0.4, -6]} color="#A0785A" scale={1.0} />
      <FairyChimney position={[14, -0.4, 2]} color="#D4A87A" scale={0.8} />
      <FairyChimney position={[-13, -0.4, 3]} color="#B8835A" scale={1.1} />
      <FairyChimney position={[0, -0.4, -10]} color="#C8926A" scale={1.6} />
      <FairyChimney position={[-6, -0.4, -8]} color="#BF8560" scale={0.9} />
      <FairyChimney position={[6, -0.4, -8]} color="#CA9068" scale={1.0} />

      {/* Ağaçlar */}
      <Tree position={[-10, -1, 1]} />
      <Tree position={[10, -1, 0]} />
      <Tree position={[-2, -1, -8]} />
      <Tree position={[2, -1, -8]} />
      <Tree position={[-9, -1, -4]} />
      <Tree position={[9, -1, -4]} />
      <Tree position={[-6, -1, 7]} />
      <Tree position={[6, -1, 7]} />

      {/* Fener direkleri */}
      <Lamp position={[-2, -1, 0.5]} />
      <Lamp position={[2, -1, 0.5]} />
      <Lamp position={[-6, -1, 0.5]} />
      <Lamp position={[6, -1, 0.5]} />
      <Lamp position={[-6, -1, -5.5]} />
      <Lamp position={[6, -1, -5.5]} />

      {/* Merkez çeşme */}
      <Fountain position={[0, 0, 2]} />

      {/* Yön tabelası */}
      <SignPost position={[-2, -1, 2]} />
      <SignPost position={[2, -1, -5]} />

      {/* Yol taşları - kaldırım benzeri */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh
          key={i}
          position={[i * 2 - 9, -0.97, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <boxGeometry args={[1.8, 1.8, 0.05]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? '#D7CCC8' : '#BCAAA4'}
            roughness={0.95}
          />
        </mesh>
      ))}
      {/* Dikey yol */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh
          key={'v' + i}
          position={[0, -0.97, i * 2 - 6]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <boxGeometry args={[1.8, 1.8, 0.05]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? '#D7CCC8' : '#BCAAA4'}
            roughness={0.95}
          />
        </mesh>
      ))}
    </group>
  );
}

export default GroundDecor;
