"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { Move3D, Minimize, MousePointerClick, X, Sparkles } from "lucide-react";
import { useStudyStore, PerformanceMode } from "@/store/useStudyStore";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";


// --- DICTIONARIES ---
const CRYSTAL_CATALOG: Record<string, { color: string, emissive: string }> = {
    quartz: { color: "#e0f8ff", emissive: "#8cd8f5" }, aquamarine: { color: "#ecfeff", emissive: "#06b6d4" },
    rose_quartz: { color: "#fdf2f8", emissive: "#f43f5e" }, amethyst: { color: "#f3e8ff", emissive: "#c084fc" },
    citrine: { color: "#fefce8", emissive: "#eab308" }, emerald: { color: "#ecfdf5", emissive: "#34d399" },
    sapphire: { color: "#eff6ff", emissive: "#3b82f6" }, morganite: { color: "#fdf2f8", emissive: "#f472b6" },
    celestine: { color: "#f0f9ff", emissive: "#7dd3fc" }, jade: { color: "#f0fdf4", emissive: "#4ade80" },
    sunstone: { color: "#fff7ed", emissive: "#ea580c" }, obsidian: { color: "#1f2937", emissive: "#6b21a8" },
    lapis: { color: "#1e3a8a", emissive: "#fbbf24" }, carnelian: { color: "#fef2f2", emissive: "#dc2626" },
    malachite: { color: "#064e3b", emissive: "#10b981" }, ruby: { color: "#fff1f2", emissive: "#fb7185" },
    topaz: { color: "#fff7ed", emissive: "#f97316" }, moonstone: { color: "#f8fafc", emissive: "#94a3b8" },
    opal: { color: "#f8fafc", emissive: "#14b8a6" }, onyx: { color: "#111827", emissive: "#dc2626" },
    fluorite: { color: "#fdf4ff", emissive: "#d946ef" }, bismuth: { color: "#312e81", emissive: "#ec4899" },
};

const SCENE_FILTERS = {
    default: { bg: '#7a98a3', fogStart: 15, fogEnd: 60, amb: '#b0c4de', mainLight: '#e0f2fe', fillLight: '#86a6b5' },
    dark: { bg: '#0f172a', fogStart: 10, fogEnd: 45, amb: '#1e293b', mainLight: '#38bdf8', fillLight: '#312e81' },
    refreshing: { bg: '#bbf7d0', fogStart: 12, fogEnd: 55, amb: '#f0fdf4', mainLight: '#fef08a', fillLight: '#34d399' },
    cool: { bg: '#082f49', fogStart: 15, fogEnd: 60, amb: '#0284c7', mainLight: '#7dd3fc', fillLight: '#0c4a6e' }
};

function CylinderGlitter({ count, completionRatio }: { count: number, completionRatio: number }) {
    const pointsRef = useRef<THREE.Points>(null);
    const geoRef = useRef<THREE.BufferGeometry>(null);

    // 1. Calculate the perfect cylinder ONLY ONCE
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2; // Full circle
            const radius = Math.sqrt(Math.random()) * 25; // Grass plate radius

            pos[i * 3] = Math.cos(theta) * radius;     // X
            pos[i * 3 + 1] = Math.random() * 40;       // Y (Height into the sky)
            pos[i * 3 + 2] = Math.sin(theta) * radius; // Z
        }
        return pos;
    }, [count]);

    // 2. Animate the floating effect
    useFrame((state) => {
        if (pointsRef.current) {
            // Gentle rotation like a slow tornado
            pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
            // Gentle floating up and down
            pointsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 1.5;
        }
    });

    // 3. Dynamically update how many particles to draw based on completion
    useEffect(() => {
        if (geoRef.current) {
            const displayCount = Math.floor(completionRatio * count);
            geoRef.current.setDrawRange(0, displayCount);
        }
    }, [completionRatio, count]);

    return (
        <points ref={pointsRef}>
            <bufferGeometry ref={geoRef}>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    // Pass the array and itemSize directly into the constructor args
                    args={[positions, 3]}
                />
            </bufferGeometry>
            {/* sizeAttenuation ensures particles get smaller when further from the camera */}
            {/* The Glowing Material Setup */}
            <pointsMaterial
                size={0.15}
                // Multiply the color by 5 to push it past the Bloom threshold!
                color={new THREE.Color("#e0f2fe").multiplyScalar(5)}
                toneMapped={false} // Prevents Three.js from dimming our artificially bright color
                transparent
                opacity={0.8}
                sizeAttenuation
                depthWrite={false}
                // Additive blending makes them intensely bright when they overlap (like real light)
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

export function createMasterFlowerGeometry() {
    const prep = (geometry: THREE.BufferGeometry) => {
        const cleanGeo = geometry.index ? geometry.toNonIndexed() : geometry;
        cleanGeo.deleteAttribute('uv');
        return cleanGeo;
    };

    const stem = prep(new THREE.CylinderGeometry(0.015, 0.015, 1, 4));
    stem.translate(0, 0.5, 0);

    const core = prep(new THREE.DodecahedronGeometry(0.025, 0));
    // Raised it from 1.0 to 1.05 so it sits on top of the massive petals
    core.translate(0, 1.08, 0);

    // 1. MASSIVE PETALS: Increased base radius and adjusted segments for better lighting
    const basePetal = prep(new THREE.SphereGeometry(0.12, 7, 5));
    // Scale X (width), Y (thickness), Z (length)
    // Making them much longer (2.5) and nicely wide (1.5)
    basePetal.scale(1.5, 0.1, 2.5);

    const petals = [];
    for (let i = 0; i < 3; i++) {
        const petal = basePetal.clone();
        const matrix = new THREE.Matrix4();

        // 2. PUSH OUT: Move them further from the center core so they separate
        matrix.makeTranslation(0, 0, 0.18);

        // 3. BLOOM ANGLE: Tilt them outward more (0.4 instead of 0.15) so they fan out
        const droop = new THREE.Matrix4().makeRotationX(0.4);
        matrix.multiply(droop);

        // 120-degree perfectly distinct spacing
        const rotationY = new THREE.Matrix4().makeRotationY((Math.PI * 2 / 3) * i);
        matrix.premultiply(rotationY);

        // Move to the top of the stem
        const moveUp = new THREE.Matrix4().makeTranslation(0, 1.0, 0);
        matrix.premultiply(moveUp);

        petal.applyMatrix4(matrix);
        petals.push(petal);
    }

    // MERGE!
    const mergedGeometry = BufferGeometryUtils.mergeGeometries(
        [stem, core, petals[0], petals[1], petals[2]],
        true
    );

    mergedGeometry.computeBoundingSphere();
    mergedGeometry.computeBoundingBox();

    return mergedGeometry;
}

// --- PROCEDURAL GENERATORS ---
function generateTrilliums(count: number) {
    const flowers = [];
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 2.5 + Math.sqrt(Math.random()) * 21.5;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        const stemHeight = 0.15 + Math.random() * 0.35;
        const scale = 1.0 + Math.random() * 2.0; // Varies in size

        // Give each flower head a slight natural tilt
        const tiltX = (Math.random() - 0.5) * 0.5;
        const tiltZ = (Math.random() - 0.5) * 0.5;

        flowers.push({
            pos: [x, -0.4, z],
            stemHeight,
            scale,
            rotY: Math.random() * Math.PI * 2,
            tiltX,
            tiltZ
        });
    }
    return flowers;
}

function generateCrystalCluster(count: number) {
    const crystals = [];
    crystals.push({ pos: [0, 0.1, 0], rot: [0, Math.random(), 0], radius: 0.5, height: 2.2 });
    crystals.push({ pos: [0.15, 0.05, 0.2], rot: [0.15, Math.random(), -0.1], radius: 0.45, height: 1.8 });
    crystals.push({ pos: [-0.2, 0.1, -0.1], rot: [-0.1, Math.random(), 0.15], radius: 0.4, height: 1.9 });

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 0.2 + Math.random() * 0.7;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        const tiltX = z * 0.6 + (Math.random() - 0.5) * 0.2;
        const tiltZ = -x * 0.6 + (Math.random() - 0.5) * 0.2;
        const radius = 0.15 + Math.random() * 0.15;
        const height = 0.4 + Math.random() * 1.2;
        crystals.push({ pos: [x, 0.1, z], rot: [tiltX, Math.random() * Math.PI, tiltZ], radius, height });
    }
    return crystals;
}

function TinySprout() {
    return (
        <group position={[0, 0.1, 0]}>
            <mesh castShadow>
                <cylinderGeometry args={[0.03, 0.05, 0.3, 5]} />
                <meshStandardMaterial color="#4ade80" roughness={0.8} />
            </mesh>
            <mesh position={[0.08, 0.1, 0]} rotation={[0, 0, -0.6]} castShadow>
                <sphereGeometry args={[0.08, 5, 2]} />
                <meshStandardMaterial color="#22c55e" flatShading roughness={0.7} />
            </mesh>
            <mesh position={[-0.07, 0.05, 0]} rotation={[0, 0, 0.6]} castShadow>
                <sphereGeometry args={[0.06, 5, 2]} />
                <meshStandardMaterial color="#16a34a" flatShading roughness={0.7} />
            </mesh>
        </group>
    );
}

// --- MAIN COMPONENTS ---
function QuartzCluster({ progress, themeKey, setViewingShard, allFlowerPositions, masteredShards, flowerCount, isRebirthing }: any) {
    const shardsRef = useRef<THREE.Group>(null);
    const coreLightRef = useRef<THREE.PointLight>(null);
    const bgMeshRef = useRef<THREE.InstancedMesh>(null);
    const masteredMeshRef = useRef<THREE.InstancedMesh>(null);

    // 1. ONLY PULL WHAT WE STILL NEED FROM THE STORE
    const { windSpeed, swayAmount, swayEnabled = true } = useStudyStore();

    // 2. KEEP ONLY THESE TWO USE-MEMOS (The rest are passed in as props now!)
    const crystalData = useMemo(() => generateCrystalCluster(35), []);
    const theme = CRYSTAL_CATALOG[themeKey] || CRYSTAL_CATALOG.quartz;
    const masterFlowerGeometry = useMemo(() => createMasterFlowerGeometry(), []);

    const shaderUniforms = useMemo(() => ({
        uTime: { value: 0 },
        uSwayAmount: { value: swayAmount }
    }), [swayAmount]);

    const materials = useMemo(() => {
        const mats = {
            quartz: new THREE.MeshPhysicalMaterial({
                color: theme.color, emissive: theme.emissive, emissiveIntensity: progress * 0.25,
                transmission: 0.95, opacity: 1, transparent: true, roughness: 0.1, thickness: 3.5,
                ior: 1.55, flatShading: true, clearcoat: 1, clearcoatRoughness: 0.1
            }),
            rock: new THREE.MeshStandardMaterial({ color: "#475560", roughness: 0.9, flatShading: true }),
            grass: new THREE.MeshStandardMaterial({ color: "#4a685e", roughness: 1 }),
            stem: new THREE.MeshStandardMaterial({ color: "#166534", roughness: 0.9 }),
            center: new THREE.MeshStandardMaterial({ color: "#fef08a", roughness: 0.8 }),
            petal: new THREE.MeshStandardMaterial({
                color: "#ffffff",
                emissive: "#ffffff",
                emissiveIntensity: 0.65, // Low intensity so it stays white but still catches the Bloom
                roughness: 0.6,
                flatShading: true
            }),
            // MASTERED PETAL: Blindingly bright glow using the crystal's theme color
            masteredPetal: new THREE.MeshStandardMaterial({
                color: "#ffffff",
                emissive: new THREE.Color(theme.emissive),
                emissiveIntensity: 6.0,
                roughness: 0.6,
                flatShading: true
            })
        };

        [mats.stem, mats.petal, mats.masteredPetal, mats.center].forEach(mat => {
            mat.onBeforeCompile = (shader) => {
                shader.uniforms.uTime = shaderUniforms.uTime;
                shader.uniforms.uSwayAmount = shaderUniforms.uSwayAmount;
                shader.vertexShader = `uniform float uTime;\nuniform float uSwayAmount;\n${shader.vertexShader}`;
                shader.vertexShader = shader.vertexShader.replace(
                    `#include <begin_vertex>`,
                    `#include <begin_vertex>\nfloat sway = sin(uTime + position.x * 0.5 + position.z * 0.5) * uSwayAmount;\ntransformed.x += sway * position.y;\ntransformed.z += sway * position.y;`
                );
            };
        });
        return mats;
    }, [theme, shaderUniforms]);

    const bgMaterialArray = useMemo(() => [materials.stem, materials.center, materials.petal, materials.petal, materials.petal], [materials]);
    const masteredMaterialArray = useMemo(() => [materials.stem, materials.center, materials.masteredPetal, materials.masteredPetal, materials.masteredPetal], [materials]);

    // 3. POPULATE THE TWO MESHES
    useEffect(() => {
        const dummy = new THREE.Object3D();
        const masteredCount = masteredShards.length;
        // Make sure we don't try to draw more mastered flowers than we generated positions for
        const safeMasteredCount = Math.min(masteredCount, flowerCount);

        // A. Populate Mastered Flowers
        if (masteredMeshRef.current && safeMasteredCount > 0) {
            for (let i = 0; i < safeMasteredCount; i++) {
                const f = allFlowerPositions[i];
                dummy.position.set(f.pos[0], f.pos[1], f.pos[2]);
                dummy.rotation.set(f.tiltX, f.rotY, f.tiltZ);
                // 🌸 BIGGER MASTERED FLOWERS
                const scale = f.scale * 0.65;
                dummy.scale.set(scale, scale, scale);
                // Lift them slightly higher so they sit proudly above the grass
                dummy.position.set(f.pos[0], f.pos[1] + 0.15, f.pos[2]);
                dummy.updateMatrix();
                masteredMeshRef.current.setMatrixAt(i, dummy.matrix);
            }
            masteredMeshRef.current.instanceMatrix.needsUpdate = true;
        }

        // B. Populate Background Flowers
        if (bgMeshRef.current) {
            const bgCount = Math.max(0, flowerCount - safeMasteredCount);
            for (let i = 0; i < bgCount; i++) {
                const f = allFlowerPositions[i + safeMasteredCount];
                if (!f) break; // Safety catch
                dummy.position.set(f.pos[0], f.pos[1], f.pos[2]);
                dummy.rotation.set(f.tiltX, f.rotY, f.tiltZ);
                // 🌸 BIGGER BACKGROUND FLOWERS
                const scale = f.scale * 0.45;
                dummy.scale.set(scale, scale, scale);
                dummy.position.set(f.pos[0], f.pos[1], f.pos[2]);
                dummy.updateMatrix();
                bgMeshRef.current.setMatrixAt(i, dummy.matrix);
            }
            bgMeshRef.current.instanceMatrix.needsUpdate = true;
        }
    }, [allFlowerPositions, masteredShards.length, flowerCount]);

    useFrame((state) => {
        if (shardsRef.current && coreLightRef.current) {
            const targetYScale = isRebirthing ? 0 : (progress === 0 ? 0.05 : 0.2 + (progress * 1.2));
            const targetXZScale = isRebirthing ? 0 : (progress === 0 ? 0.05 : 0.6 + (progress * 0.6));
            shardsRef.current.scale.lerp(new THREE.Vector3(targetXZScale, targetYScale, targetXZScale), isRebirthing ? 0.15 : 0.05);
            const targetIntensity = progress === 0 ? 0.2 : 1.5 + (progress * 5);
            coreLightRef.current.intensity = THREE.MathUtils.lerp(coreLightRef.current.intensity, targetIntensity, 0.05);
            materials.quartz.emissiveIntensity = THREE.MathUtils.lerp(materials.quartz.emissiveIntensity, progress * 0.25, 0.05);
        }
        shaderUniforms.uTime.value = state.clock.elapsedTime * windSpeed;
        // Turn off sway instantly if toggled in dev tools
        shaderUniforms.uSwayAmount.value = swayEnabled ? swayAmount : 0;
    });

    return (
        <group position={[0, -0.5, 0]}>
            <pointLight ref={coreLightRef} color={theme.color} distance={10} decay={2} position={[0, 1.5, 0]} />

            <mesh position={[0, -0.4, 0]} receiveShadow material={materials.grass}><cylinderGeometry args={[25, 25, 0.4, 64]} /></mesh>

            <ContactShadows frames={1} position={[0, -0.19, 0]} scale={50} blur={1.5} opacity={0.65} resolution={512} color="#000000" raycast={() => null} />

            <instancedMesh
                ref={bgMeshRef}
                args={[masterFlowerGeometry, bgMaterialArray, Math.max(0, flowerCount - masteredShards.length)]}
                castShadow={false} receiveShadow={false}
                frustumCulled={false}
                raycast={() => null} // PREVENTS BACKGROUND FROM STEALING YOUR HOVER/CLICKS
            />

            {masteredShards.length > 0 && (
                <instancedMesh
                    ref={masteredMeshRef}
                    // Pre-allocate space for 100 mastered shards maximum
                    args={[masterFlowerGeometry, masteredMaterialArray, 100]}
                    // Dynamically tell the GPU how many of those 100 slots to actually draw
                    count={masteredShards.length}
                    castShadow={false}
                    receiveShadow={false}
                    frustumCulled={false}
                    onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
                    onPointerOut={() => { document.body.style.cursor = 'auto'; }}
                    onClick={(e) => {
                        e.stopPropagation();
                        // Prevent interacting with invisible/unallocated slots
                        if (e.instanceId !== undefined && e.instanceId < masteredShards.length) {
                            const shard = masteredShards[e.instanceId];
                            if (shard) setViewingShard(shard);
                        }
                    }}
                />
            )}

            <mesh position={[0, 0.1, 0]} castShadow receiveShadow material={materials.rock}>
                <dodecahedronGeometry args={[1.5, 1]} />
            </mesh>

            <Float speed={1.5} rotationIntensity={0.02} floatIntensity={0.05}>
                <group ref={shardsRef} position={[0, 0.3, 0]}>
                    {progress > 0 && progress < 0.02 ? (
                        <TinySprout />
                    ) : (
                        crystalData.map((c, i) => (
                            <group key={i} position={c.pos as any} rotation={c.rot as any}>
                                <mesh position={[0, c.height / 2, 0]} material={materials.quartz} castShadow>
                                    <cylinderGeometry args={[c.radius, c.radius, c.height, 6]} />
                                    <mesh position={[0, c.height / 2 + (c.radius * 0.6), 0]} material={materials.quartz}>
                                        <coneGeometry args={[c.radius, c.radius * 1.2, 6]} />
                                    </mesh>
                                </mesh>
                            </group>
                        ))
                    )}
                </group>
            </Float>
        </group>
    );
}

function LowPolyClouds({ filter }: { filter: any }) {
    return (
        <Float speed={0.4} floatIntensity={0.6}>
            <group position={[0, 4, -20]}>
                {/* Grand, distant background clouds */}
                <mesh position={[-30, 8, -15]} scale={2.5}><dodecahedronGeometry args={[8]} /><meshStandardMaterial color={filter.fillLight} flatShading opacity={0.6} transparent /></mesh>
                <mesh position={[25, 12, -10]} scale={3.0}><dodecahedronGeometry args={[6]} /><meshStandardMaterial color={filter.bg} flatShading opacity={0.5} transparent /></mesh>

                {/* Mid-ground scatter */}
                <mesh position={[-15, 14, -5]} scale={1.5}><dodecahedronGeometry args={[10]} /><meshStandardMaterial color={filter.amb} flatShading opacity={0.4} transparent /></mesh>
                <mesh position={[10, 18, 5]} scale={1.8}><dodecahedronGeometry args={[7]} /><meshStandardMaterial color={filter.fillLight} flatShading opacity={0.7} transparent /></mesh>
                <mesh position={[0, 22, -8]} scale={2.0}><dodecahedronGeometry args={[5]} /><meshStandardMaterial color={filter.amb} flatShading opacity={0.5} transparent /></mesh>
            </group>
        </Float>
    );
}

function CameraRig({ isFocused, isFreecam, keys, snipingShard, setSnipingShard, setViewingShard, allFlowerPositions, masteredShards }: any) {
    const controlsRef = useRef<any>(null);
    const velocity = useRef(new THREE.Vector3());
    const isReturning = useRef(false);
    const isSniping = useRef(false);

    const defaultCamPos = useMemo(() => new THREE.Vector3(0, 8, 14), []);
    const defaultTarget = useMemo(() => new THREE.Vector3(0, 1.5, 0), []);

    useEffect(() => {
        if (snipingShard) isSniping.current = true;
    }, [snipingShard]);

    // 🔥 CANCEL SNIPE ON MOUSE/WHEEL INTERACTION 🔥
    useEffect(() => {
        const cancelSnipe = () => {
            if (isSniping.current) {
                isSniping.current = false;
                setSnipingShard(null); // Instantly abort
            }
        };
        const canvas = controlsRef.current?.domElement;
        if (canvas) {
            canvas.addEventListener('wheel', cancelSnipe);
            canvas.addEventListener('pointerdown', cancelSnipe);
        }
        return () => {
            if (canvas) {
                canvas.removeEventListener('wheel', cancelSnipe);
                canvas.removeEventListener('pointerdown', cancelSnipe);
            }
        }
    }, [setSnipingShard]);

    // 🔥 FREECAM AND RETURN LOGIC 🔥
    useEffect(() => {
        if (!isFreecam && isFocused) {
            // Always return to crystal if we aren't actively sniping
            if (!snipingShard) isReturning.current = true;
        }
        if (isFreecam) {
            setSnipingShard(null);
            isSniping.current = false;
        }
    }, [isFreecam, isFocused, snipingShard, setSnipingShard]);

    useFrame((state) => {
        if (!controlsRef.current) return;

        if (isSniping.current && snipingShard) {
            const index = masteredShards.findIndex((s: any) => s.id === snipingShard.id);
            if (index !== -1 && allFlowerPositions[index]) {
                const fPos = allFlowerPositions[index].pos;
                const targetPos = new THREE.Vector3(fPos[0], fPos[1] + 0.5, fPos[2]);
                const camPos = new THREE.Vector3(fPos[0], fPos[1] + 1.5, fPos[2] + 2.5);

                state.camera.position.lerp(camPos, 0.04);
                controlsRef.current.target.lerp(targetPos, 0.05);

                // Relaxed distance check prevents rubber-banding at the very end of the animation
                if (state.camera.position.distanceTo(camPos) < 0.2 && controlsRef.current.target.distanceTo(targetPos) < 0.2) {
                    state.camera.position.copy(camPos);
                    controlsRef.current.target.copy(targetPos);
                    isSniping.current = false;
                    setSnipingShard(null);
                    setViewingShard(snipingShard);
                }
                controlsRef.current.update();
                return;
            }
        }

        if (isFreecam) {
            isReturning.current = false;

            const { camera } = state;
            const dir = new THREE.Vector3();
            const right = new THREE.Vector3();
            camera.getWorldDirection(dir);
            dir.normalize(); dir.y = 0; dir.normalize();
            right.crossVectors(camera.up, dir).normalize();

            const accel = new THREE.Vector3();
            if (keys.current.w) accel.add(dir);
            if (keys.current.s) accel.sub(dir);
            if (keys.current.a) accel.add(right);
            if (keys.current.d) accel.sub(right);
            if (keys.current.e) accel.y += 1;
            if (keys.current.q) accel.y -= 1;

            if (accel.lengthSq() > 0) accel.normalize().multiplyScalar(0.015);
            velocity.current.add(accel);
            velocity.current.multiplyScalar(0.92);

            camera.position.add(velocity.current);
            controlsRef.current.target.add(velocity.current);

            const bound = 20;
            camera.position.x = THREE.MathUtils.clamp(camera.position.x, -bound, bound);
            camera.position.y = THREE.MathUtils.clamp(camera.position.y, 0.5, 12);
            camera.position.z = THREE.MathUtils.clamp(camera.position.z, -bound, bound);
            controlsRef.current.target.x = THREE.MathUtils.clamp(controlsRef.current.target.x, -bound, bound);
            controlsRef.current.target.y = THREE.MathUtils.clamp(controlsRef.current.target.y, 0, 10);
            controlsRef.current.target.z = THREE.MathUtils.clamp(controlsRef.current.target.z, -bound, bound);

            controlsRef.current.update();
        } else if (isFocused && isReturning.current) {
            state.camera.position.lerp(defaultCamPos, 0.05);
            controlsRef.current.target.lerp(defaultTarget, 0.08);

            if (controlsRef.current.target.distanceTo(defaultTarget) < 0.05) {
                controlsRef.current.target.copy(defaultTarget);
                isReturning.current = false;
            }
            controlsRef.current.update();
        }
    });

    return (
        <OrbitControls
            ref={controlsRef}
            enableZoom={isFocused || isFreecam}
            enablePan={isFreecam}
            minDistance={isFreecam ? 0 : 5}
            maxDistance={22}
            maxPolarAngle={Math.PI / 2 - 0.05}
            minPolarAngle={0}
            makeDefault
        />
    );
}

// ─── COMPONENT ENTRY ───
export default function GeodeScene({ completionRatio, snipingShard, setSnipingShard, isRebirthing }: { completionRatio: number, snipingShard?: any, setSnipingShard?: any, isRebirthing?: boolean }) {
    const [isFocused, setIsFocused] = useState(false);
    const [isFreecam, setIsFreecam] = useState(false);
    const [viewingShard, setViewingShard] = useState<any>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const keys = useRef({ w: false, a: false, s: false, d: false, q: false, e: false });

    const {
        activeCrystalTheme,
        activeAtmosphereFilter,
        shards,
        flowerCount = 10000,
        performanceSettings = { mode: 'auto', showParticles: true, bloomEnabled: true, antialiasing: true }
    } = useStudyStore();

    // Performance Heuristics
    const isPerformanceLow = performanceSettings.mode === 'low' || (performanceSettings.mode === 'auto' && typeof window !== 'undefined' && window.innerWidth < 768);
    const resolvedFlowerCount = isPerformanceLow ? Math.min(flowerCount, 2000) : performanceSettings.mode === 'balanced' ? Math.min(flowerCount, 5000) : flowerCount;
    const resolvedGlitterCount = isPerformanceLow ? 1000 : performanceSettings.mode === 'balanced' ? 3000 : 6000;
    const isCrystalMastered = completionRatio >= 1;
    const resolvedBloomIntensity = !performanceSettings.bloomEnabled || isPerformanceLow
        ? 0
        : performanceSettings.mode === 'balanced'
            ? (isCrystalMastered ? 1.2 : 0.4)
            : (isCrystalMastered ? 1.8 : 0.5 + (completionRatio * 2.0));
    const activeAtmosphere = SCENE_FILTERS[activeAtmosphereFilter as keyof typeof SCENE_FILTERS] || SCENE_FILTERS.default;

    const allFlowerPositions = useMemo(() => generateTrilliums(resolvedFlowerCount), [resolvedFlowerCount]);
    const masteredShards = useMemo(() => shards.filter(s => s.isMastered), [shards]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsFocused(false); setIsFreecam(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isFocused) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.key.toLowerCase() === 'c') {
                e.preventDefault(); setIsFreecam(prev => !prev);
            }
            const key = e.key.toLowerCase();
            if (keys.current.hasOwnProperty(key)) (keys.current as any)[key] = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (keys.current.hasOwnProperty(key)) (keys.current as any)[key] = false;
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            keys.current = { w: false, a: false, s: false, d: false, q: false, e: false };
        };
    }, [isFocused]);

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            className={`w-full h-full relative transition-all duration-300 outline-none ${isFocused ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:opacity-90'}`}
            onClick={() => { if (!isFocused) setIsFocused(true); }}
        >

            {/* UI OVERLAYS FOR FREECAM */}
            {isFocused && (
                <div className="absolute bottom-4 left-4 z-10 flex flex-col items-start gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setIsFreecam(!isFreecam); }} className={`backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-2 ${isFreecam ? 'bg-[var(--accent-teal)]/20 text-[var(--accent-teal)] border-[var(--accent-teal)]/50' : 'bg-black/40 text-white/90 hover:bg-black/60 border-white/10'}`}>
                        {isFreecam ? <Minimize size={14} /> : <Move3D size={14} />} {isFreecam ? 'Exit Freecam (C)' : 'Freecam (C)'}
                    </button>
                    {isFreecam && <div className="bg-black/40 backdrop-blur-md border border-white/10 text-white/70 text-[10px] p-2 rounded-lg text-left font-mono">WASD to move <br /> EQ for elevation <br /> Scroll to zoom</div>}
                </div>
            )}
            {!isFocused && (
                <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
                    <div className="bg-black/20 backdrop-blur-md text-white/70 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-white/5 flex items-center gap-2">
                        <MousePointerClick size={12} /> Click to focus
                    </div>
                </div>
            )}

            {/* THE MASTERED SHARD READING MODAL */}
            {viewingShard && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setViewingShard(null); }}>
                    <div className="bg-[var(--bg-card)] border border-[var(--accent-teal)] rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto custom-scrollbar relative shadow-[0_0_30px_rgba(20,184,166,0.2)]" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setViewingShard(null)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                        <h2 className="text-2xl font-black text-[var(--text-main)] mb-2 flex items-center gap-2">
                            <Sparkles className="text-[var(--accent-teal)]" size={20} />
                            {viewingShard.title}
                        </h2>
                        <div className="text-[10px] text-[var(--accent-teal)] font-bold uppercase tracking-widest mb-6">
                            Mastered Knowledge Seed
                        </div>
                        <div className="prose prose-invert prose-sm text-[var(--text-main)] whitespace-pre-wrap">
                            {viewingShard.content}
                        </div>
                    </div>
                </div>
            )}

            {/* THE 3D CANVAS */}
            <Canvas shadows camera={{ position: [0, 3, 8], fov: 45 }} style={{ pointerEvents: 'auto', position: 'relative', zIndex: 1 }}>
                <color attach="background" args={[activeAtmosphere.bg]} />
                <fog attach="fog" args={[activeAtmosphere.bg, activeAtmosphere.fogStart, activeAtmosphere.fogEnd]} />

                <ambientLight intensity={0.5} color={activeAtmosphere.amb} />
                <directionalLight position={[5, 10, -5]} intensity={1.2} color={activeAtmosphere.mainLight} castShadow shadow-mapSize={[1024, 1024]} />
                <directionalLight position={[-5, 5, 5]} intensity={0.4} color={activeAtmosphere.fillLight} />

                <LowPolyClouds filter={activeAtmosphere} />

                <QuartzCluster
                    progress={completionRatio}
                    themeKey={activeCrystalTheme}
                    setViewingShard={setViewingShard}
                    allFlowerPositions={allFlowerPositions}
                    masteredShards={masteredShards}
                    flowerCount={resolvedFlowerCount}
                    isRebirthing={isRebirthing}
                />

                <CameraRig
                    isFocused={isFocused}
                    isFreecam={isFreecam}
                    keys={keys}
                    snipingShard={snipingShard}
                    setSnipingShard={setSnipingShard}
                    setViewingShard={setViewingShard}
                    allFlowerPositions={allFlowerPositions}
                    masteredShards={masteredShards}
                />
                {isCrystalMastered && performanceSettings.showParticles && (
                    <CylinderGlitter count={resolvedGlitterCount} completionRatio={completionRatio} />
                )}

                <EffectComposer enabled={resolvedBloomIntensity > 0}>
                    <Bloom luminanceThreshold={1} mipmapBlur intensity={resolvedBloomIntensity} />
                </EffectComposer>
            </Canvas>
        </div>
    );
}