import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';

function createCeramicTexture(colors) {
  const [, motif, accent] = colors;
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Krem arka plan
  ctx.fillStyle = '#FFF8E1';
  ctx.fillRect(0, 0, W, H);

  // Üst & alt bordür bandı
  ctx.fillStyle = motif;
  ctx.fillRect(0, 0, W, 46);
  ctx.fillRect(0, H - 46, W, 46);

  // Altın çizgi
  ctx.fillStyle = '#F9A825';
  ctx.fillRect(0, 46, W, 6);
  ctx.fillRect(0, H - 52, W, 6);
  ctx.fillRect(0, 56, W, 3);
  ctx.fillRect(0, H - 59, W, 3);

  // Bordür basamak deseni
  ctx.fillStyle = '#FFF8E1';
  for (let x = 0; x < W; x += 26) {
    ctx.fillRect(x + 3, 7, 14, 32);
    ctx.fillRect(x + 3, H - 39, 14, 32);
  }

  // Nokta bordürü
  ctx.fillStyle = '#FFF8E1';
  for (let x = 22; x < W; x += 40) {
    ctx.beginPath();
    ctx.arc(x, 62, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, H - 62, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lale motifi çizme yardımcısı
  const drawTulip = (cx, cy) => {
    // Sap
    ctx.strokeStyle = '#388E3C';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 56);
    ctx.bezierCurveTo(cx - 6, cy + 30, cx + 6, cy + 20, cx, cy + 5);
    ctx.stroke();
    // Sol yaprak
    ctx.fillStyle = '#388E3C';
    ctx.beginPath();
    ctx.ellipse(cx - 18, cy + 32, 8, 20, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // Sağ yaprak
    ctx.beginPath();
    ctx.ellipse(cx + 18, cy + 32, 8, 20, 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Ana çiçek gövdesi
    ctx.fillStyle = motif;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 5, 18, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    // Üst petal
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 22);
    ctx.lineTo(cx, cy - 45);
    ctx.lineTo(cx + 10, cy - 22);
    ctx.closePath();
    ctx.fill();
    // Sol yanak petal
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 5);
    ctx.lineTo(cx - 34, cy - 26);
    ctx.lineTo(cx - 16, cy + 12);
    ctx.closePath();
    ctx.fill();
    // Sağ yanak petal
    ctx.beginPath();
    ctx.moveTo(cx + 16, cy - 5);
    ctx.lineTo(cx + 34, cy - 26);
    ctx.lineTo(cx + 16, cy + 12);
    ctx.closePath();
    ctx.fill();
    // Stamen (erkek organ)
    ctx.fillStyle = '#FFF8E1';
    ctx.beginPath();
    ctx.arc(cx, cy - 5, 6, 0, Math.PI * 2);
    ctx.fill();
  };

  // Lale arası elmas motifi
  const drawDiamond = (cx, cy, size) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size, cy);
    ctx.lineTo(cx, cy + size);
    ctx.lineTo(cx - size, cy);
    ctx.closePath();
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.fillStyle = '#FFF8E1';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.38, 0, Math.PI * 2);
    ctx.fill();
  };

  // 6 lale çiz
  const midY = H / 2 + 8;
  const count = 6;
  for (let i = 0; i < count; i++) {
    const x = (i + 0.5) * (W / count);
    drawTulip(x, midY - 22);
  }
  // Laleler arası elmas
  for (let i = 0; i < count; i++) {
    const x = (i + 1) * (W / count);
    drawDiamond(x, midY - 22, 16);
  }

  return new THREE.CanvasTexture(canvas);
}

// Testi (su kabı) profil noktaları
function buildVasePoints() {
  return [
    new THREE.Vector2(0.05, 0.0),
    new THREE.Vector2(0.46, 0.02),
    new THREE.Vector2(0.56, 0.18),
    new THREE.Vector2(0.43, 0.38),
    new THREE.Vector2(0.36, 0.62),
    new THREE.Vector2(0.62, 1.04),
    new THREE.Vector2(0.88, 1.48),
    new THREE.Vector2(0.96, 1.72),
    new THREE.Vector2(0.86, 2.02),
    new THREE.Vector2(0.60, 2.32),
    new THREE.Vector2(0.30, 2.54),
    new THREE.Vector2(0.24, 2.70),
    new THREE.Vector2(0.34, 2.84),
    new THREE.Vector2(0.42, 2.92),
    new THREE.Vector2(0.30, 2.98),
  ];
}

function VaseMesh({ product }) {
  const meshRef = useRef();

  useFrame(() => {
    if (meshRef.current) meshRef.current.rotation.y += 0.005;
  });

  const points = useMemo(() => buildVasePoints(), []);

  const texture = useMemo(
    () => createCeramicTexture(product.colors || ['#E3F2FD', '#1565C0', '#E53935']),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product.colors ? product.colors.join() : '']
  );

  return (
    <group position={[0, -1.52, 0]}>
      {/* Sergi kaidesi */}
      <mesh position={[0, -0.22, 0]} receiveShadow>
        <cylinderGeometry args={[0.92, 1.12, 0.32, 32]} />
        <meshStandardMaterial color="#D7CCC8" roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.38, 0]} receiveShadow>
        <cylinderGeometry args={[1.12, 1.32, 0.2, 32]} />
        <meshStandardMaterial color="#BCAAA4" roughness={0.8} />
      </mesh>
      {/* Vazo */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <latheGeometry args={[points, 72]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.28}
          metalness={0.06}
          side={THREE.FrontSide}
        />
      </mesh>
    </group>
  );
}

function CeramicViewer({ product }) {
  return (
    <>
      <color attach="background" args={['#f0ece6']} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
      <directionalLight position={[-5, 4, -3]} intensity={0.45} color="#BBDEFB" />
      <pointLight position={[0, 5, 3]} intensity={0.4} color="#FFF9C4" />
      {/* Zemin */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.6, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#e8e2db" roughness={1} />
      </mesh>
      <VaseMesh product={product} />
      <OrbitControls
        enablePan={false}
        minDistance={2.5}
        maxDistance={12}
        enableDamping
        dampingFactor={0.07}
      />
      <GizmoHelper alignment="bottom-right" margin={[72, 72]}>
        <GizmoViewport
          axisColors={['#e74c3c', '#2ecc71', '#3498db']}
          labelColor="#333333"
        />
      </GizmoHelper>
    </>
  );
}

export default CeramicViewer;
