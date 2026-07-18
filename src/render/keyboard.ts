// Keyboard geometry, materials, label atlas, lights and camera (spec §5).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { KEY_LAYOUT, type KeyDef } from '../input/layout';
import { toThreeColor } from '../style/color';
import type { Oklch, Style } from '../style/types';
import type { Stage } from './stage';

const GAP = 0.12;
const ATLAS_SIZE = 2048;
const ATLAS_COLS = 10;
const ATLAS_ROWS = Math.ceil(KEY_LAYOUT.length / ATLAS_COLS);

export interface KeyMesh {
  def: KeyDef;
  group: THREE.Group;
  mesh: THREE.Mesh;
  material: THREE.MeshPhysicalMaterial;
  edges: THREE.LineSegments;
  edgesMaterial: THREE.LineBasicMaterial;
  labelMesh: THREE.Mesh;
  labelMaterial: THREE.MeshBasicMaterial;
  dissolveUniform: { value: number };
}

export interface Keyboard {
  group: THREE.Group;
  keys: readonly KeyMesh[];
  keyByCode: ReadonlyMap<string, KeyMesh>;
  rebuildGeometry: (style: Style) => void;
  applyMaterials: (style: Style) => void;
}

function chromaScale(c: Oklch, mul: number): Oklch {
  return { l: c.l, c: c.c * mul, h: c.h };
}

function buildLabelAtlas(): { texture: THREE.CanvasTexture; uv: Map<string, [number, number, number, number]> } {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
  ctx.font = '600 14px system-ui';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cellW = ATLAS_SIZE / ATLAS_COLS;
  const cellH = ATLAS_SIZE / ATLAS_ROWS;
  const uv = new Map<string, [number, number, number, number]>();

  KEY_LAYOUT.forEach((def, i) => {
    const col = i % ATLAS_COLS;
    const row = Math.floor(i / ATLAS_COLS);
    const cellX = col * cellW;
    const cellY = row * cellH;
    if (def.label) {
      ctx.fillText(def.label, cellX + cellW / 2, cellY + cellH / 2);
    }
    const u0 = cellX / ATLAS_SIZE;
    const u1 = (cellX + cellW) / ATLAS_SIZE;
    const v1 = 1 - cellY / ATLAS_SIZE;
    const v0 = 1 - (cellY + cellH) / ATLAS_SIZE;
    uv.set(def.code, [u0, v0, u1, v1]);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return { texture, uv };
}

function makeLabelGeometry(uvRect: [number, number, number, number], width: number, depth: number): THREE.BufferGeometry {
  const [u0, v0, u1, v1] = uvRect;
  const geo = new THREE.PlaneGeometry(width, depth);
  geo.rotateX(-Math.PI / 2);
  const uvAttr = geo.getAttribute('uv') as THREE.BufferAttribute;
  // Default PlaneGeometry vertex order: top-left, top-right, bottom-left, bottom-right.
  uvAttr.setXY(0, u0, v1);
  uvAttr.setXY(1, u1, v1);
  uvAttr.setXY(2, u0, v0);
  uvAttr.setXY(3, u1, v0);
  uvAttr.needsUpdate = true;
  return geo;
}

function buildKeyGeometry(def: KeyDef, style: Style): THREE.BufferGeometry {
  return new RoundedBoxGeometry(
    def.width - GAP,
    style.keyDepth,
    1 - GAP,
    3,
    style.keyBevel,
  );
}

export function createKeyboard(stage: Stage, style: Style): Keyboard {
  const group = new THREE.Group();
  group.rotation.x = THREE.MathUtils.degToRad(-18);
  group.position.y = 0;

  const { texture: atlasTexture, uv } = buildLabelAtlas();

  const keys: KeyMesh[] = [];
  const keyByCode = new Map<string, KeyMesh>();

  const baseColor = toThreeColor(chromaScale(style.palette[2], style.keyChromaMul));
  const emissiveColor = toThreeColor(style.palette[4]);
  const labelColor = toThreeColor(style.palette[5]);

  for (const def of KEY_LAYOUT) {
    const keyGroup = new THREE.Group();
    keyGroup.position.set(def.x, 0, def.z);

    const geometry = buildKeyGeometry(def, style);
    const material = new THREE.MeshPhysicalMaterial({
      color: baseColor,
      emissive: emissiveColor,
      emissiveIntensity: style.emissiveIdle,
      roughness: style.roughness,
      metalness: style.metalness,
      transmission: style.transmission,
      thickness: style.transmission > 0.01 ? style.keyDepth : 0,
      ior: 1.45,
    });

    const dissolveUniform = { value: 0 };
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uDissolve = dissolveUniform;
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        [
          'uniform float uDissolve;',
          'void main() {',
          '  float dmask = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);',
          '  if (uDissolve > 0.0 && dmask < uDissolve) discard;',
        ].join('\n'),
      );
    };

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0;
    keyGroup.add(mesh);

    const edgesMaterial = new THREE.LineBasicMaterial({
      color: emissiveColor,
      transparent: true,
      opacity: style.wireframe,
      blending: THREE.AdditiveBlending,
      depthTest: true,
    });
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgesMaterial);
    keyGroup.add(edges);

    const labelMaterial = new THREE.MeshBasicMaterial({
      map: atlasTexture,
      color: labelColor,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    const uvRect = uv.get(def.code)!;
    const labelGeo = makeLabelGeometry(uvRect, def.width - GAP, 1 - GAP);
    const labelMesh = new THREE.Mesh(labelGeo, labelMaterial);
    labelMesh.position.y = style.keyDepth / 2 + 0.02;
    keyGroup.add(labelMesh);

    group.add(keyGroup);

    const km: KeyMesh = {
      def,
      group: keyGroup,
      mesh,
      material,
      edges,
      edgesMaterial,
      labelMesh,
      labelMaterial,
      dissolveUniform,
    };
    keys.push(km);
    keyByCode.set(def.code, km);
  }

  stage.scene.add(group);

  function rebuildGeometry(newStyle: Style): void {
    for (const km of keys) {
      const oldGeo = km.mesh.geometry;
      km.mesh.geometry = buildKeyGeometry(km.def, newStyle);
      oldGeo.dispose();
      const oldEdgesGeo = km.edges.geometry;
      km.edges.geometry = new THREE.EdgesGeometry(km.mesh.geometry);
      oldEdgesGeo.dispose();
      // Label sits 0.02 above the (possibly new) cap top.
      km.labelMesh.position.y = newStyle.keyDepth / 2 + 0.02;
    }
  }

  function applyMaterials(newStyle: Style): void {
    const base = toThreeColor(chromaScale(newStyle.palette[2], newStyle.keyChromaMul));
    const emissive = toThreeColor(newStyle.palette[4]);
    const label = toThreeColor(newStyle.palette[5]);
    for (const km of keys) {
      km.material.color.copy(base);
      km.material.emissive.copy(emissive);
      km.material.roughness = newStyle.roughness;
      km.material.metalness = newStyle.metalness;
      km.material.transmission = newStyle.transmission;
      km.material.thickness = newStyle.transmission > 0.01 ? newStyle.keyDepth : 0;
      km.edgesMaterial.color.copy(emissive);
      km.edgesMaterial.opacity = newStyle.wireframe;
      km.labelMaterial.color.copy(label);
    }
  }

  return { group, keys, keyByCode, rebuildGeometry, applyMaterials };
}

export function updateLights(stage: Stage, style: Style): void {
  stage.ambientLight.color.copy(toThreeColor(style.palette[1]));
  stage.pointLight.color.copy(toThreeColor(style.palette[3]));
}

export function setupEnvironment(stage: Stage): void {
  const pmrem = new THREE.PMREMGenerator(stage.renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  stage.scene.environment = envTexture;
  stage.scene.environmentIntensity = 0.5;
  pmrem.dispose();
}
