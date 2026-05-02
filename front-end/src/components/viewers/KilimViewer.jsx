import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';

function createKilimTexture(colors) {
  const [bg, fg, acc] = colors;
  const W = 512, H = 768;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const diamond = (x, y, w, h, color, stroke) => {
    ctx.beginPath();
    ctx.moveTo(x, y - h / 2);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x, y + h / 2);
    ctx.lineTo(x - w / 2, y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  };

  // Arka plan
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Dış bordür bandı
  ctx.fillStyle = acc;
  ctx.fillRect(0, 0, W, 40);
  ctx.fillRect(0, H - 40, W, 40);
  ctx.fillRect(0, 0, 40, H);
  ctx.fillRect(W - 40, 0, 40, H);

  // Basamak deseni (step pattern) bordür üzerinde
  ctx.fillStyle = fg;
  for (let i = 0; i < W; i += 24) {
    ctx.fillRect(i + 2, 8, 12, 24);
    ctx.fillRect(i + 2, H - 32, 12, 24);
  }
  for (let j = 40; j < H - 40; j += 24) {
    ctx.fillRect(8, j + 2, 24, 12);
    ctx.fillRect(W - 32, j + 2, 24, 12);
  }

  // İç çerçeve çizgisi
  ctx.strokeStyle = fg;
  ctx.lineWidth = 5;
  ctx.strokeRect(52, 52, W - 104, H - 104);
  ctx.lineWidth = 2;
  ctx.strokeRect(62, 62, W - 124, H - 124);

  // Satır 1: 4 küçük elmas motifi (y=150)
  for (let i = 0; i < 4; i++) {
    const cx = 85 + i * 115;
    const cy = 155;
    diamond(cx, cy, 62, 84, fg);
    diamond(cx, cy, 40, 54, bg);
    diamond(cx, cy, 22, 30, acc);
    diamond(cx, cy, 9, 12, fg);
  }

  // Yatay şerit 1 (y~230)
  ctx.fillStyle = fg;
  ctx.fillRect(65, 228, W - 130, 10);
  ctx.fillStyle = acc;
  ctx.fillRect(65, 242, W - 130, 5);
  ctx.fillStyle = fg;
  ctx.fillRect(65, 251, W - 130, 3);

  // Merkez madalyon
  const cx = W / 2, cy = H / 2;
  diamond(cx, cy, 136, 186, fg);
  diamond(cx, cy, 100, 136, bg);
  diamond(cx, cy, 70, 96, acc);
  diamond(cx, cy, 44, 60, fg);
  diamond(cx, cy, 22, 30, bg);
  diamond(cx, cy, 10, 14, acc);

  // Merkez etrafında 4 köşe elması
  [[-78, -105], [78, -105], [-78, 105], [78, 105]].forEach(([dx, dy]) => {
    diamond(cx + dx, cy + dy, 46, 62, fg);
    diamond(cx + dx, cy + dy, 28, 38, acc);
    diamond(cx + dx, cy + dy, 13, 18, fg);
  });

  // Yatay şerit 2 (y~H/2+120)
  ctx.fillStyle = fg;
  ctx.fillRect(65, cy + 118, W - 130, 10);
  ctx.fillStyle = acc;
  ctx.fillRect(65, cy + 132, W - 130, 5);
  ctx.fillStyle = fg;
  ctx.fillRect(65, cy + 141, W - 130, 3);

  // Satır 3: 4 küçük elmas motifi (y~H-155)
  for (let i = 0; i < 4; i++) {
    const cx2 = 85 + i * 115;
    const cy2 = H - 155;
    diamond(cx2, cy2, 62, 84, fg);
    diamond(cx2, cy2, 40, 54, bg);
    diamond(cx2, cy2, 22, 30, acc);
    diamond(cx2, cy2, 9, 12, fg);
  }

  return new THREE.CanvasTexture(canvas);
}

function KilimMesh({ product }) {
  const meshRef = useRef();

  useFrame(() => {
    if (meshRef.current) meshRef.current.rotation.y += 0.004;
  });

  const texture = useMemo(
    () => createKilimTexture(product.colors || ['#8B1A1A', '#F5DEB3', '#2D5016']),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product.colors ? product.colors.join() : '']
  );

  return (
    <group>
      {/* Zemin düzlemi */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.55, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#e8e0d4" roughness={1} />
      </mesh>
      {/* Kilim */}
      <mesh ref={meshRef} position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 4.8, 0.07]} />
        <meshStandardMaterial map={texture} roughness={0.92} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function KilimViewer({ product }) {
  return (
    <>
      <color attach="background" args={['#2c2420']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 5]} intensity={1.6} castShadow />
      <directionalLight position={[-4, 4, -3]} intensity={0.4} color="#FFE0B2" />
      <KilimMesh product={product} />
      <OrbitControls
        enablePan={false}
        minDistance={3.5}
        maxDistance={14}
        enableDamping
        dampingFactor={0.07}
      />
      <GizmoHelper alignment="bottom-right" margin={[72, 72]}>
        <GizmoViewport
          axisColors={['#e74c3c', '#2ecc71', '#3498db']}
          labelColor="#ffffff"
        />
      </GizmoHelper>
    </>
  );
}

export default KilimViewer;
