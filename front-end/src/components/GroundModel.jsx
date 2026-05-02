import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import groundUrl from '../assets/zindanonu_duz2.glb';

function GroundModel() {
  const { scene } = useGLTF(groundUrl);

  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  // Modelin üst yüzeyini Y=-1'e (mağaza zemin seviyesi) hizala
  const offsetY = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    return -1 - box.max.y;
  }, [clonedScene]);

  // Tüm mesh'lere gölge
  useMemo(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.receiveShadow = false;
        child.castShadow = false;
      }
    });
  }, [clonedScene]);

  return (
    <primitive
      object={clonedScene}
      position={[-30, -6, 45]}
      rotation={[0.045, 0, -0.05]}
    />
  );
}

useGLTF.preload(groundUrl);

export default GroundModel;
