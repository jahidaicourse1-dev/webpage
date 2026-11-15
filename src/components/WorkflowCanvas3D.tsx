import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { ThemeMode } from '../utils/theme';
import WorkflowFallback from './WorkflowFallback';

interface WorkflowCanvas3DProps {
  scrollProgressRef: React.MutableRefObject<number>;
  theme: ThemeMode;
  className?: string;
}

// Pre-allocated scratch math helpers outside render loop (zero GC)
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 0, 0);
const _pulsePos = new THREE.Vector3();
const _pulseMat = new THREE.Matrix4();
const _pulseQuat = new THREE.Quaternion();
const _pulseScale = new THREE.Vector3(1, 1, 1);

const THEME_PALETTES = {
  light: {
    stageBg: 0xece8de,
    gridMain: 0xc5bfb1,
    gridSub: 0xdad5c8,
    housing: 0x222220,
    collar: 0xe9e4da,
    pin: 0x767268,
    inactiveCore: 0x858177,
    accent: 0xe8501a,
    accentEmissive: 0xc93f0e,
    pulse: 0xff7c47,
  },
  dark: {
    stageBg: 0x181816,
    gridMain: 0x35352f,
    gridSub: 0x242420,
    housing: 0x272723,
    collar: 0xefebe2,
    pin: 0x99958b,
    inactiveCore: 0x5c5a55,
    accent: 0xff6a33,
    accentEmissive: 0xe8501a,
    pulse: 0xff9166,
  },
} as const;

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createWorkflowNodeGroup(
  housingMat: THREE.Material,
  collarMat: THREE.Material,
  coreMat: THREE.Material,
  pinMat: THREE.Material,
  isPrimary: boolean,
): { group: THREE.Group; core: THREE.Mesh; collar: THREE.Mesh } {
  const group = new THREE.Group();

  const bodyGeo = new THREE.CylinderGeometry(isPrimary ? 0.5 : 0.4, isPrimary ? 0.54 : 0.44, 0.34, 8);
  const bodyMesh = new THREE.Mesh(bodyGeo, housingMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  const collarGeo = new THREE.TorusGeometry(isPrimary ? 0.44 : 0.35, 0.038, 12, 28);
  const collarMesh = new THREE.Mesh(collarGeo, collarMat);
  collarMesh.rotation.x = Math.PI / 2;
  collarMesh.position.y = 0.19;
  group.add(collarMesh);

  const coreGeo = new THREE.CylinderGeometry(isPrimary ? 0.2 : 0.15, isPrimary ? 0.2 : 0.15, 0.14, 16);
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.position.y = 0.21;
  group.add(coreMesh);

  const portGeo = new THREE.BoxGeometry(0.16, 0.1, 0.16);
  const portLeft = new THREE.Mesh(portGeo, pinMat);
  portLeft.position.set(isPrimary ? -0.54 : -0.44, 0, 0);
  const portRight = new THREE.Mesh(portGeo, pinMat);
  portRight.position.set(isPrimary ? 0.54 : 0.44, 0, 0);
  group.add(portLeft, portRight);

  return { group, core: coreMesh, collar: collarMesh };
}

export default function WorkflowCanvas3D({
  scrollProgressRef,
  theme,
  className = '',
}: WorkflowCanvas3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const themeRef = useRef<ThemeMode>(theme);
  const applyThemeRef = useRef<((mode: ThemeMode) => void) | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    themeRef.current = theme;
    applyThemeRef.current?.(theme);
  }, [theme]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const initialPal = THEME_PALETTES[themeRef.current];
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(initialPal.stageBg);
    scene.fog = new THREE.Fog(initialPal.stageBg, 9, 24);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 60);
    camera.position.set(0.15, 2.75, 8.4);
    camera.lookAt(0, 0, 0);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    const hemiLight = new THREE.HemisphereLight(0xfff6ed, 0x2a2926, 1.0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.85);
    keyLight.position.set(5, 8, 6);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -8;
      keyLight.shadow.camera.right = 8;
      keyLight.shadow.camera.top = 6;
      keyLight.shadow.camera.bottom = -6;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffb08f, 0.85);
    rimLight.position.set(-5, 3, -4);
    scene.add(rimLight);

    const pipelineRig = new THREE.Group();
    scene.add(pipelineRig);

    let gridHelper = new THREE.GridHelper(18, 24, initialPal.gridMain, initialPal.gridSub);
    gridHelper.position.y = -0.68;
    pipelineRig.add(gridHelper);

    const housingMat = new THREE.MeshStandardMaterial({
      color: initialPal.housing,
      roughness: 0.45,
      metalness: 0.5,
    });
    const collarMat = new THREE.MeshStandardMaterial({
      color: initialPal.collar,
      roughness: 0.22,
      metalness: 0.85,
    });
    const pinMat = new THREE.MeshStandardMaterial({
      color: initialPal.pin,
      roughness: 0.28,
      metalness: 0.8,
    });
    const conduitMat = new THREE.MeshStandardMaterial({
      color: initialPal.accent,
      roughness: 0.3,
      metalness: 0.45,
      emissive: initialPal.accentEmissive,
      emissiveIntensity: 0.35,
    });
    const traceLineMat = new THREE.LineBasicMaterial({
      color: initialPal.accent,
      transparent: true,
      opacity: 0.95,
    });
    const branchMat = new THREE.MeshStandardMaterial({
      color: initialPal.accent,
      roughness: 0.35,
      metalness: 0.4,
      emissive: initialPal.accentEmissive,
      emissiveIntensity: 0.25,
    });
    const pulseMat = new THREE.MeshStandardMaterial({
      color: initialPal.pulse,
      roughness: 0.2,
      metalness: 0.2,
      emissive: initialPal.accent,
      emissiveIntensity: 0.85,
    });

    const nodeCoords = [
      new THREE.Vector3(-2.55, 0.28, 0.7),
      new THREE.Vector3(-1.3, -0.14, -0.45),
      new THREE.Vector3(0.0, 0.4, 0.28),
      new THREE.Vector3(1.3, -0.1, -0.48),
      new THREE.Vector3(2.55, 0.24, 0.48),
    ];

    const nodes: Array<{ group: THREE.Group; core: THREE.Mesh; collar: THREE.Mesh }> = [];
    const nodeCoreMats: THREE.MeshStandardMaterial[] = [];

    nodeCoords.forEach((pos, idx) => {
      const coreMat = new THREE.MeshStandardMaterial({
        color: idx === 0 ? initialPal.accent : initialPal.inactiveCore,
        roughness: 0.25,
        metalness: 0.3,
        emissive: idx === 0 ? initialPal.accentEmissive : 0x000000,
        emissiveIntensity: idx === 0 ? 0.55 : 0,
      });
      nodeCoreMats.push(coreMat);

      const node = createWorkflowNodeGroup(housingMat, collarMat, coreMat, pinMat, idx === 2);
      node.group.position.copy(pos);
      pipelineRig.add(node.group);
      nodes.push(node);
    });

    // Base structural pipeline rail (always visible) + active Signal Orange conduit that draws in cleanly
    const curve = new THREE.CatmullRomCurve3(nodeCoords);
    const baseRailGeo = new THREE.TubeGeometry(curve, 72, 0.028, 8, false);
    const baseRailMat = new THREE.MeshStandardMaterial({
      color: initialPal.pin,
      roughness: 0.5,
      metalness: 0.6,
      transparent: true,
      opacity: 0.45,
    });
    const baseRailMesh = new THREE.Mesh(baseRailGeo, baseRailMat);
    pipelineRig.add(baseRailMesh);

    const tubeGeo = new THREE.TubeGeometry(curve, 72, 0.056, 10, false);
    const totalTubeIndices = tubeGeo.index ? tubeGeo.index.count : tubeGeo.attributes.position.count;
    tubeGeo.setDrawRange(0, Math.floor(totalTubeIndices * 0.4));
    const tubeMesh = new THREE.Mesh(tubeGeo, conduitMat);
    pipelineRig.add(tubeMesh);

    const tracePoints = curve.getPoints(96);
    const traceGeo = new THREE.BufferGeometry().setFromPoints(tracePoints);
    traceGeo.translate(0, 0.14, 0);
    traceGeo.setDrawRange(0, Math.floor(tracePoints.length * 0.4));
    const traceLine = new THREE.Line(traceGeo, traceLineMat);
    pipelineRig.add(traceLine);

    // Parallel branch return line that progressively connects as user scrolls
    const branchCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.3, -0.14, -0.45),
      new THREE.Vector3(-0.15, -0.36, -1.1),
      new THREE.Vector3(1.3, -0.1, -0.48),
    ]);
    const branchGeo = new THREE.TubeGeometry(branchCurve, 40, 0.032, 8, false);
    const totalBranchIndices = branchGeo.index
      ? branchGeo.index.count
      : branchGeo.attributes.position.count;
    branchGeo.setDrawRange(0, Math.floor(totalBranchIndices * 0.35));
    const branchMesh = new THREE.Mesh(branchGeo, branchMat);
    pipelineRig.add(branchMesh);

    // Instanced signal pulses travelling along the drawn conduit
    const PULSE_COUNT = 10;
    const pulseGeo = new THREE.SphereGeometry(0.088, 12, 12);
    const mainPulses = new THREE.InstancedMesh(pulseGeo, pulseMat, PULSE_COUNT);
    mainPulses.frustumCulled = false;
    pipelineRig.add(mainPulses);

    // Dynamic theme switcher without tearing down WebGL
    applyThemeRef.current = (mode: ThemeMode) => {
      const pal = THEME_PALETTES[mode];
      scene.background = new THREE.Color(pal.stageBg);
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.setHex(pal.stageBg);
      }
      housingMat.color.setHex(pal.housing);
      collarMat.color.setHex(pal.collar);
      pinMat.color.setHex(pal.pin);
      baseRailMat.color.setHex(pal.pin);
      conduitMat.color.setHex(pal.accent);
      conduitMat.emissive.setHex(pal.accentEmissive);
      traceLineMat.color.setHex(pal.accent);
      branchMat.color.setHex(pal.accent);
      branchMat.emissive.setHex(pal.accentEmissive);
      pulseMat.color.setHex(pal.pulse);
      pulseMat.emissive.setHex(pal.accent);

      pipelineRig.remove(gridHelper);
      gridHelper.geometry.dispose();
      if (Array.isArray(gridHelper.material)) {
        gridHelper.material.forEach((m) => m.dispose());
      } else {
        gridHelper.material.dispose();
      }
      gridHelper = new THREE.GridHelper(18, 24, pal.gridMain, pal.gridSub);
      gridHelper.position.y = -0.68;
      pipelineRig.add(gridHelper);
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      pointer.targetX = THREE.MathUtils.clamp(nx, -1, 1);
      pointer.targetY = THREE.MathUtils.clamp(ny, -1, 1);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    let disposed = false;
    let isVisible = true;
    let frameId = 0;
    const startMs = performance.now();
    let lastMs = startMs;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed || !isVisible) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed || !isVisible || document.hidden) return;
      const nowMs = performance.now();
      const delta = Math.min((nowMs - lastMs) / 1000, 0.1);
      lastMs = nowMs;
      const elapsed = (nowMs - startMs) / 1000;
      const scrollP = THREE.MathUtils.clamp(scrollProgressRef.current, 0, 1);
      const pal = THEME_PALETTES[themeRef.current];

      const dampFactor = 1 - Math.exp(-8 * delta);
      pointer.x = THREE.MathUtils.lerp(pointer.x, pointer.targetX, dampFactor);
      pointer.y = THREE.MathUtils.lerp(pointer.y, pointer.targetY, dampFactor);

      // Swift draw-in lines on load (0.4 -> 1.0 over 0.65s) + scroll-driven branch completion
      const introDraw = THREE.MathUtils.clamp(0.4 + (elapsed / 0.65) * 0.6, 0.4, 1);
      const fullDraw = THREE.MathUtils.clamp(Math.max(introDraw, 0.55 + scrollP * 0.45), 0.4, 1);
      const tubeDrawCount = Math.floor((totalTubeIndices * fullDraw) / 3) * 3;
      tubeGeo.setDrawRange(0, tubeDrawCount);
      traceGeo.setDrawRange(0, Math.floor(tracePoints.length * fullDraw));

      const branchDraw = THREE.MathUtils.clamp(0.35 + scrollP * 0.65 + (introDraw - 0.4) * 0.6, 0.35, 1);
      const branchDrawCount = Math.floor((totalBranchIndices * branchDraw) / 3) * 3;
      branchGeo.setDrawRange(0, branchDrawCount);

      // Nodes illuminate progressively across the pipeline and brighten further on scroll
      const activeNodeThreshold = Math.max(2, scrollP * 4.5 + introDraw * 2.5);
      nodes.forEach((node, idx) => {
        const base = nodeCoords[idx];
        const wave = Math.sin(elapsed * 1.7 + idx * 0.85) * 0.055;
        node.group.position.y = THREE.MathUtils.lerp(base.y, 0.12, scrollP * 0.7) + wave;
        node.group.position.z = THREE.MathUtils.lerp(base.z, 0, scrollP * 0.7);
        node.group.rotation.y = elapsed * 0.45 + idx * 0.45 + scrollP * Math.PI * 0.6;

        const isNodeLit = idx <= activeNodeThreshold;
        const mat = nodeCoreMats[idx];
        mat.color.setHex(isNodeLit ? pal.accent : pal.inactiveCore);
        mat.emissive.setHex(isNodeLit ? pal.accentEmissive : 0x000000);
        mat.emissiveIntensity = isNodeLit ? 0.55 + Math.sin(elapsed * 2.5 + idx) * 0.12 : 0;
        node.core.scale.y = isNodeLit ? 1.05 + Math.sin(elapsed * 2.4 + idx) * 0.1 : 0.85;
      });

      pipelineRig.rotation.y = pointer.x * 0.18 + scrollP * 0.24;
      pipelineRig.rotation.x = -pointer.y * 0.1;

      _targetCamPos.set(
        THREE.MathUtils.lerp(0.15, 1.25, scrollP) + pointer.x * 0.4,
        THREE.MathUtils.lerp(2.75, 1.95, scrollP) - pointer.y * 0.22,
        THREE.MathUtils.lerp(8.4, 6.75, scrollP),
      );
      camera.position.lerp(_targetCamPos, dampFactor);

      _targetLookAt.set(THREE.MathUtils.lerp(0, 0.45, scrollP), 0.1, 0);
      _currentLookAt.lerp(_targetLookAt, dampFactor);
      camera.lookAt(_currentLookAt);

      for (let i = 0; i < PULSE_COUNT; i++) {
        const t = ((elapsed * 0.26 + i / PULSE_COUNT + scrollP * 0.35) % 1) * fullDraw;
        curve.getPointAt(Math.min(0.999, Math.max(0.001, t)), _pulsePos);
        _pulseMat.compose(_pulsePos, _pulseQuat, _pulseScale);
        mainPulses.setMatrixAt(i, _pulseMat);
      }
      mainPulses.instanceMatrix.needsUpdate = true;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    // Pause rendering automatically when canvas scrolls off-screen or tab is hidden
    const resumeLoop = () => {
      if (disposed || !isVisible || document.hidden) return;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      lastMs = performance.now();
      tick();
    };

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const nextVisible = Boolean(entry?.isIntersecting);
        if (nextVisible === isVisible) return;
        isVisible = nextVisible;
        if (isVisible) {
          resumeLoop();
        } else {
          cancelAnimationFrame(frameId);
          clearTimeout(frameId);
        }
      },
      { threshold: 0.02 },
    );
    intersectionObserver.observe(container);

    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
      } else if (isVisible) {
        resumeLoop();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      applyThemeRef.current = null;

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      nodeCoreMats.forEach((m) => m.dispose());
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [scrollProgressRef]);

  if (webglFailed) {
    return <WorkflowFallback className={className} />;
  }

  return (
    <div
      ref={mountRef}
      data-testid="workflow-canvas"
      aria-label="Interactive 3D workflow pipeline visualization"
      className={`relative w-full h-full min-h-[340px] border border-[var(--border)] bg-[var(--surface-subtle)] overflow-hidden ${className}`}
    />
  );
}
