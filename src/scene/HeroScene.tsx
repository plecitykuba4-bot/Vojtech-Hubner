import { RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  type RapierRigidBody,
} from "@react-three/rapier";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Hero scéna v6: ID karta na šňůrce a ethernetové kabely, všechno na fyzice.
export const controls = {
  gravity: -32,
  cardW: 1.6,
  cardH: 2.4,
  strapWidth: 0.16,
  cableRadius: 0.06,
  wind: 0.045, // síla jemného vlání kabelů
};

const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Body = RefObject<RapierRigidBody | null>;
const seg = { type: "dynamic" as const, canSleep: true, colliders: false as const, angularDamping: 2, linearDamping: 2 };

function Rope({ a, b, len }: { a: Body; b: Body; len: number }) {
  useRopeJoint(a as RefObject<RapierRigidBody>, b as RefObject<RapierRigidBody>, [[0, 0, 0], [0, 0, 0], len]);
  return null;
}

// plochý pásek natočený ke kameře, UV běží po délce, ať text na šňůrce teče
function updateRibbon(geo: THREE.BufferGeometry, pts: THREE.Vector3[], width: number, repeat: number) {
  const n = pts.length;
  let pos = geo.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!pos || pos.count !== n * 2) {
    pos = new THREE.BufferAttribute(new Float32Array(n * 6), 3);
    geo.setAttribute("position", pos);
    geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 4), 2));
    const idx: number[] = [];
    for (let i = 0; i < n - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    geo.setIndex(idx);
  }
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  const t = new THREE.Vector3(), side = new THREE.Vector3(), z = new THREE.Vector3(0, 0, 1);
  let len = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    t.subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
    side.crossVectors(t, z).normalize().multiplyScalar(width / 2);
    if (i > 0) len += p.distanceTo(pts[i - 1]);
    pos.setXYZ(i * 2, p.x - side.x, p.y - side.y, p.z);
    pos.setXYZ(i * 2 + 1, p.x + side.x, p.y + side.y, p.z);
    uv.setXY(i * 2, len / repeat, 0);
    uv.setXY(i * 2 + 1, len / repeat, 1);
  }
  pos.needsUpdate = true;
  uv.needsUpdate = true;
  geo.computeBoundingSphere();
}

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, 8);
  const p = g.getAttribute("position");
  const uv = g.getAttribute("uv");
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - x) / w, (p.getY(i) - y) / h);
  return g;
}

// ---------- ID karta na šňůrce ----------
function Badge({ anchor }: { anchor: [number, number, number] }) {
  const fixed = useRef<RapierRigidBody>(null);
  const j1 = useRef<RapierRigidBody>(null);
  const j2 = useRef<RapierRigidBody>(null);
  const j3 = useRef<RapierRigidBody>(null);
  const card = useRef<RapierRigidBody>(null);
  const band = useRef<THREE.Mesh>(null!);
  const { camera, gl } = useThree();
  const [dragged, setDragged] = useState<THREE.Vector3 | null>(null);
  const [hovered, setHovered] = useState(false);

  const { W, H } = { W: controls.cardW, H: controls.cardH };

  const tex = useMemo(() => {
    const l = new THREE.TextureLoader();
    const front = l.load("/img/badge-front.jpg");
    const back = l.load("/img/badge-back.jpg");
    const strap = l.load("/img/strap.png");
    for (const t of [front, back, strap]) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; }
    strap.wrapS = THREE.RepeatWrapping;
    return { front, back, strap };
  }, []);
  const faceGeo = useMemo(() => roundedRect(W, H, 0.08), [W, H]);
  const curve = useMemo(() => new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], false, "catmullrom", 0.5), []);
  const lerped = useRef<{ j1?: THREE.Vector3; j2?: THREE.Vector3 }>({});
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), dir: new THREE.Vector3(), ang: new THREE.Vector3(), rot: new THREE.Vector3() }), []);

  useEffect(() => {
    document.body.style.cursor = dragged ? "grabbing" : hovered ? "grab" : "";
    return () => { document.body.style.cursor = ""; };
  }, [hovered, dragged]);

  useFrame((state, delta) => {
    const c = card.current, a = j1.current, b = j2.current, d = j3.current, f = fixed.current;
    if (!c || !a || !b || !d || !f) return;
    if (dragged) {
      tmp.v.set(state.pointer.x, state.pointer.y, 0.5).unproject(camera);
      tmp.dir.copy(tmp.v).sub(camera.position).normalize();
      tmp.v.add(tmp.dir.multiplyScalar(camera.position.length()));
      [c, a, b, d, f].forEach((r) => r.wakeUp());
      c.setNextKinematicTranslation({ x: tmp.v.x - dragged.x, y: tmp.v.y - dragged.y, z: tmp.v.z - dragged.z });
    }
    // klouzavé vyhlazení článků šňůrky, jinak se třese
    const L = lerped.current;
    if (!L.j1) L.j1 = new THREE.Vector3().copy(a.translation() as THREE.Vector3);
    if (!L.j2) L.j2 = new THREE.Vector3().copy(b.translation() as THREE.Vector3);
    for (const [key, ref] of [["j1", a], ["j2", b]] as const) {
      const v = L[key]!;
      const dist = Math.max(0.1, Math.min(1, v.distanceTo(ref.translation() as THREE.Vector3)));
      v.lerp(ref.translation() as THREE.Vector3, Math.min(1, delta * (10 + dist * 40)));
    }
    curve.points[0].copy(d.translation() as THREE.Vector3);
    curve.points[1].copy(L.j2!);
    curve.points[2].copy(L.j1!);
    curve.points[3].copy(f.translation() as THREE.Vector3);
    if (curve.points.some((p) => !Number.isFinite(p.x + p.y + p.z))) return;
    updateRibbon(band.current.geometry, curve.getPoints(40), controls.strapWidth, controls.strapWidth * (2048 / 96));
    // karta se pomalu stáčí zpátky čelem ke kameře
    tmp.ang.copy(c.angvel() as THREE.Vector3);
    const r = c.rotation();
    const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(r.x, r.y, r.z, r.w));
    c.setAngvel({ x: tmp.ang.x, y: tmp.ang.y - e.y * 0.25, z: tmp.ang.z }, true);
  });

  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    gl.domElement.setPointerCapture?.(e.pointerId);
    const ct = card.current!.translation();
    setDragged(new THREE.Vector3().copy(e.point).sub(new THREE.Vector3(ct.x, ct.y, ct.z)));
  };
  const up = (e: ThreeEvent<PointerEvent>) => {
    gl.domElement.releasePointerCapture?.(e.pointerId);
    setDragged(null);
  };

  return (
    <>
      <group position={anchor}>
        <RigidBody ref={fixed} {...seg} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...seg}><BallCollider args={[0.1]} /></RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...seg}><BallCollider args={[0.1]} /></RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...seg}><BallCollider args={[0.1]} /></RigidBody>
        <RigidBody position={[2, 0, 0]} ref={card} {...seg} type={dragged ? "kinematicPosition" : "dynamic"}>
          <CuboidCollider args={[W / 2, H / 2, 0.02]} />
          <group
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onPointerDown={down}
            onPointerUp={up}
          >
            <RoundedBox args={[W, H, 0.03]} radius={0.08} smoothness={4} castShadow>
              <meshPhysicalMaterial color="#f7f7f4" roughness={0.4} clearcoat={1} clearcoatRoughness={0.15} />
            </RoundedBox>
            <mesh geometry={faceGeo} position={[0, 0, 0.0161]}>
              <meshPhysicalMaterial map={tex.front} roughness={0.6} clearcoat={0.25} clearcoatRoughness={0.5} />
            </mesh>
            <mesh geometry={faceGeo} position={[0, 0, -0.0161]} rotation={[0, Math.PI, 0]}>
              <meshPhysicalMaterial map={tex.back} roughness={0.6} clearcoat={0.25} clearcoatRoughness={0.5} />
            </mesh>
            {/* kovový klip */}
            <mesh position={[0, H / 2 + 0.06, 0]}>
              <boxGeometry args={[0.32, 0.2, 0.06]} />
              <meshStandardMaterial color="#c9ccd1" metalness={1} roughness={0.25} />
            </mesh>
          </group>
        </RigidBody>
        <Rope a={fixed} b={j1} len={1} />
        <Rope a={j1} b={j2} len={1} />
        <Rope a={j2} b={j3} len={1} />
        <SphericalJ a={j3} b={card} anchorB={[0, H / 2 + 0.16, 0]} />
      </group>
      <mesh ref={band}>
        <bufferGeometry />
        <meshStandardMaterial map={tex.strap} side={THREE.DoubleSide} roughness={0.7} />
      </mesh>
    </>
  );
}

function SphericalJ({ a, b, anchorB }: { a: Body; b: Body; anchorB: [number, number, number] }) {
  useSphericalJoint(a as RefObject<RapierRigidBody>, b as RefObject<RapierRigidBody>, [[0, 0, 0], anchorB]);
  return null;
}

// ---------- ethernetový kabel s konektorem RJ45 ----------
const LINKS = 9;
function Cable({ anchor, color, link, phase }: { anchor: [number, number, number]; color: string; link: number; phase: number }) {
  const refs = useMemo(() => Array.from({ length: LINKS + 1 }, () => ({ current: null as RapierRigidBody | null })), []);
  const plug = useRef<RapierRigidBody>(null);
  const tube = useRef<THREE.Mesh>(null!);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(refs.map(() => new THREE.Vector3()), false, "catmullrom", 0.5), [refs]);
  const lastSum = useRef(Infinity);
  const { camera, gl } = useThree();
  const [dragged, setDragged] = useState<THREE.Vector3 | null>(null);
  const [hovered, setHovered] = useState(false);
  // kabel se táhne v rovině, ve které visí
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), -anchor[2]), [anchor]);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const hit = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (!hovered && !dragged) return;
    document.body.style.cursor = dragged ? "grabbing" : "grab";
    return () => { document.body.style.cursor = ""; };
  }, [hovered, dragged]);
  // puštění kdekoli na stránce kabel uvolní
  useEffect(() => {
    if (!dragged) return;
    const up = () => setDragged(null);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [dragged]);

  useFrame((state) => {
    const ok = refs.every((r) => r.current) && plug.current;
    if (!ok) return;
    const pl = plug.current!;
    if (dragged) {
      ray.setFromCamera(state.pointer, camera);
      if (ray.ray.intersectPlane(plane, hit)) {
        refs.forEach((r) => r.current!.wakeUp());
        pl.setNextKinematicTranslation({ x: hit.x - dragged.x, y: hit.y - dragged.y, z: hit.z - dragged.z });
      }
    } else if (!reduced) {
      // jemné vlání: malá proměnlivá síla na konektor, kurzor do kabelů nestrká
      const t = state.clock.elapsedTime;
      const f = controls.wind;
      pl.resetForces(false);
      pl.addForce({ x: f * (Math.sin(t * 0.9 + phase * 1.7) + 0.45 * Math.sin(t * 2.1 + phase)), y: 0, z: f * 0.5 * Math.sin(t * 0.7 + phase * 2.3) }, true);
    }
    refs.forEach((r, i) => curve.points[i].copy(r.current!.translation() as THREE.Vector3));
    // poslední bod kabelu je zadní hrana konektoru
    const p = plug.current!.translation();
    const q = plug.current!.rotation();
    const back = new THREE.Vector3(0, 0.28, 0).applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w));
    curve.points[LINKS].set(p.x + back.x, p.y + back.y, p.z + back.z);
    if (curve.points.some((pt) => !Number.isFinite(pt.x + pt.y + pt.z))) return;
    // kabel v klidu se nepřestavuje, šetří to snímky i paměť
    const sum = curve.points.reduce((acc, pt) => acc + pt.x * 1.3 + pt.y * 0.7 + pt.z, 0);
    if (Math.abs(sum - lastSum.current) < 0.0005) return;
    lastSum.current = sum;
    const old = tube.current.geometry;
    tube.current.geometry = new THREE.TubeGeometry(curve, 36, controls.cableRadius, 7, false);
    old.dispose();
  });

  return (
    <>
      <group position={anchor}>
        {refs.map((r, i) => (
          <RigidBody key={i} ref={(b) => { r.current = b; }} {...seg} type={i === 0 ? "fixed" : "dynamic"} position={[0, -i * link, 0]} linearDamping={1.2} angularDamping={1.5}>
            {i > 0 && <BallCollider args={[0.07]} />}
          </RigidBody>
        ))}
        <RigidBody ref={plug} {...seg} type={dragged ? "kinematicPosition" : "dynamic"} canSleep={false} position={[0, -LINKS * link - 0.3, 0]} linearDamping={1.2} angularDamping={1.5}>
          <CuboidCollider args={[0.17, 0.3, 0.12]} />
          {/* za konektor jde kabel chytit a zatáhnout */}
          <group
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.target as Element).setPointerCapture?.(e.pointerId);
              gl.domElement.setPointerCapture?.(e.pointerId);
              const p = plug.current!.translation();
              setDragged(new THREE.Vector3().copy(e.point).sub(new THREE.Vector3(p.x, p.y, p.z)));
            }}
            onPointerUp={(e) => { gl.domElement.releasePointerCapture?.(e.pointerId); setDragged(null); }}
          >
          {/* bota v barvě kabelu */}
          <RoundedBox args={[0.3, 0.26, 0.22]} radius={0.05} position={[0, 0.16, 0]} castShadow>
            <meshPhysicalMaterial color={color} roughness={0.4} clearcoat={0.6} />
          </RoundedBox>
          {/* hlava konektoru: skoro neprůhledná, poloprůhledná by na tmavém pozadí zešedla */}
          <RoundedBox args={[0.3, 0.36, 0.2]} radius={0.03} position={[0, -0.15, 0]}>
            <meshPhysicalMaterial color="#f6f7f9" transparent opacity={0.94} roughness={0.18} clearcoat={0.6} clearcoatRoughness={0.2} />
          </RoundedBox>
          {/* tmavší okénko a zlaté kontakty na přední stěně */}
          <mesh position={[0, -0.25, 0.101]}>
            <planeGeometry args={[0.26, 0.13]} />
            <meshStandardMaterial color="#c9ccd2" roughness={0.5} />
          </mesh>
          {Array.from({ length: 8 }, (_, k) => (
            <mesh key={k} position={[-0.105 + k * 0.03, -0.26, 0.104]}>
              <boxGeometry args={[0.016, 0.11, 0.006]} />
              <meshStandardMaterial color="#e8b53e" metalness={0.6} roughness={0.25} />
            </mesh>
          ))}
          </group>
        </RigidBody>
        {refs.slice(1).map((r, i) => (
          <Rope key={i} a={refs[i]} b={r} len={link} />
        ))}
        <SphericalJ a={refs[LINKS]} b={plug} anchorB={[0, 0.29, 0]} />
      </group>
      <mesh ref={tube} castShadow>
        <tubeGeometry />
        <meshPhysicalMaterial color={color} roughness={0.45} clearcoat={0.25} clearcoatRoughness={0.45} />
      </mesh>
    </>
  );
}


// až je fyzika i všechny objekty ve scéně: zkompilovat shadery a po pár snímcích scénu ukázat
function Ready({ onReady }: { onReady?: () => void }) {
  const { gl, scene, camera } = useThree();
  const cb = useRef(onReady);
  cb.current = onReady;
  // jen jednou po připojení; nová funkce onReady z rodiče nesmí kompilaci spouštět znovu
  useEffect(() => {
    gl.compile(scene, camera);
    let n = 0, raf = 0;
    const wait = () => { raf = ++n > 4 ? 0 : requestAnimationFrame(wait); if (!raf) cb.current?.(); };
    raf = requestAnimationFrame(wait);
    return () => cancelAnimationFrame(raf);
  }, [gl, scene, camera]);
  return null;
}

function Env() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.55;
    return () => { env.dispose(); pm.dispose(); };
  }, [gl, scene]);
  return null;
}

const CABLES_DESK: { x: number; color: string; link: number }[] = [
  { x: 0.9, color: "#2f6bff", link: 0.34 },
  { x: 1.5, color: "#ff6a2b", link: 0.25 },
  { x: 3.9, color: "#18c37e", link: 0.31 },
  { x: 4.5, color: "#111111", link: 0.22 },
];
const CABLES_MOB: { x: number; color: string; link: number }[] = [
  { x: -1.3, color: "#2f6bff", link: 0.24 },
  { x: 1.4, color: "#ff6a2b", link: 0.2 },
  { x: 2.0, color: "#18c37e", link: 0.28 },
];

export function HeroScene({ running, onReady }: { running: boolean; onReady?: () => void }) {
  const top = mobile ? 4.6 : 4.4;
  const cables = mobile ? CABLES_MOB : CABLES_DESK;
  return (
    <Canvas
      frameloop={running ? "always" : "never"}
      dpr={[1, mobile ? 1.5 : 1.75]}
      camera={{ position: [0, 0, 13], fov: mobile ? 34 : 26 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      shadows
      flat

    >
      <Env />
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 8]} intensity={1.6} castShadow />
      <Physics gravity={[0, controls.gravity, 0]} timeStep={1 / 60} interpolate>
        <Badge anchor={[mobile ? -0.4 : 2.0, mobile ? 6.3 : top, 0]} />
        {cables.map((c, i) => (
          <Cable key={i} anchor={[c.x, top + 0.2, -0.6 - i * 0.25]} color={c.color} link={c.link} phase={i} />
        ))}
        <Ready onReady={onReady} />
      </Physics>
    </Canvas>
  );
}
