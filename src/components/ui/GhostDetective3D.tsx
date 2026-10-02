'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function BrandLogo() {
  return (
    <svg viewBox="0 0 240 54" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full h-auto">
      <g transform="translate(4, 6) scale(0.42)">
        <path
          d="M 50 15 C 32 15 24 28 24 46 C 24 66 25 76 31 74 C 36 72 40 76 45 74 C 50 72 54 76 59 74 C 64 72 68 76 73 74 C 77 72 76 66 76 46 C 76 28 68 15 50 15 Z"
          fill="#f4f4f5"
          opacity="0.95"
        />
        <path d="M 12 24 C 28 18 72 18 88 24 C 92 25 89 29 79 28 C 58 25 42 25 21 28 C 11 29 8 25 12 24 Z" fill="#18181b" />
        <path d="M 28 22 C 27 10 36 2 44 4 C 48 5 52 5 56 4 C 64 2 73 10 72 22 Z" fill="#18181b" />
        <path d="M 27 20 C 40 18 60 18 73 20 L 73 23 C 60 21 40 21 27 23 Z" fill="#c8f135" />
        <path d="M 36 38 C 39 35 44 36 45 38" stroke="#18181b" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="62" cy="38" r="7.5" fill="#09090b" stroke="#00f0ff" strokeWidth="2.2" />
        <circle cx="62" cy="38" r="2.8" fill="#c8f135" />
      </g>
      <text x="56" y="34" fill="#f4f4f5" fontSize="23" fontWeight="900" fontFamily="var(--font-mono, monospace)" letterSpacing="-0.03em">
        GHOST<tspan fill="#c8f135">BOARD</tspan>
      </text>
      <text x="58" y="47" fill="#a1a1aa" fontSize="9.5" fontWeight="700" fontFamily="var(--font-mono, monospace)" letterSpacing="0.16em">
        AI TELEPROMPTER & COACH
      </text>
    </svg>
  );
}

// ── High-Performance & Aesthetic 3D Detective Ghost ──
export function GhostDetective3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Detect mobile or low-power device
    const isMobile = window.innerWidth < 768 || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 9.6);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile, // Disable MSAA on mobile for huge fill-rate boost
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);

    // Strict pixelRatio cap: 1.0 on mobile, max 1.5 on desktop (eliminates 4K GPU lag)
    const maxDpr = isMobile ? 1.0 : Math.min(window.devicePixelRatio, 1.5);
    renderer.setPixelRatio(maxDpr);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 2. Procedural Studio Gradient Environment for Silky Glass Reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envScene = new THREE.Scene();

    const envReflectorLime = new THREE.DirectionalLight(0xc8f135, 2.2);
    envReflectorLime.position.set(4, 5, 3);
    envScene.add(envReflectorLime);

    const envReflectorCyan = new THREE.DirectionalLight(0x00f0ff, 2.8);
    envReflectorCyan.position.set(-4, -2, -2);
    envScene.add(envReflectorCyan);

    const envAmbient = new THREE.AmbientLight(0x181c24, 2.0);
    envScene.add(envAmbient);

    const envTexture = pmremGenerator.fromScene(envScene).texture;
    scene.environment = envTexture;

    // 3. Studio Cinematic Lighting (Optimized count & range)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    // Electric Cyan Key Light (Front-Left)
    const cyanLight = new THREE.PointLight(0x00f0ff, 3.8, 25);
    cyanLight.position.set(-4.5, 3.2, 4);
    scene.add(cyanLight);

    // Cyber Lime Key Light (Front-Right)
    const limeLight = new THREE.PointLight(0xc8f135, 4.0, 25);
    limeLight.position.set(4.5, 3.2, 4.5);
    scene.add(limeLight);

    // Warm Violet Rim Light from Behind for Depth
    const backRim = new THREE.PointLight(0xa855f7, 3.0, 20);
    backRim.position.set(0, 3.5, -4);
    scene.add(backRim);

    // Soft Bottom Fill Light
    const bottomGlow = new THREE.PointLight(0x00f0ff, 2.0, 12);
    bottomGlow.position.set(0, -3.5, 2);
    scene.add(bottomGlow);

    // 4. Character Rig Group
    const characterGroup = new THREE.Group();
    characterGroup.position.set(0, -0.15, 0);
    scene.add(characterGroup);

    // ── 4A. Inner Glowing Ghost Core ──
    const innerCoreLight = new THREE.PointLight(0xc8f135, 2.6, 3.2);
    innerCoreLight.position.set(0, -0.1, 0.2);
    characterGroup.add(innerCoreLight);

    const innerCyanCore = new THREE.PointLight(0x00f0ff, 1.8, 2.8);
    innerCyanCore.position.set(0, 0.3, 0.1);
    characterGroup.add(innerCyanCore);

    // ── 4B. Ethereal Pearlescent Ghost Body (Optimized geometry: 48x48) ──
    const bodyGeometry = new THREE.SphereGeometry(1.38, 48, 48);
    const bodyPos = bodyGeometry.attributes.position;
    const baseBodyVertices: Float32Array = bodyPos.array.slice() as Float32Array;

    // Precomputed Skirt Indices & Angles for Ultra-Fast CPU Skirt Waves (O(skirt) instead of O(total))
    const skirtIndices: number[] = [];
    const skirtAngles: Float32Array = new Float32Array(bodyPos.count);
    const skirtWeights: Float32Array = new Float32Array(bodyPos.count);

    for (let i = 0; i < bodyPos.count; i++) {
      let x = bodyPos.getX(i);
      let y = bodyPos.getY(i);
      let z = bodyPos.getZ(i);

      if (y < 0) {
        // Bell flare with soft ripples
        const flare = 1.0 + Math.pow(Math.abs(y), 1.25) * 0.45;
        const angle = Math.atan2(z, x);
        const wave = Math.sin(angle * 6) * 0.08 * (Math.abs(y) / 1.38);
        x *= flare + wave;
        z *= flare + wave;
        y *= 1.06;

        if (y < -0.3) {
          skirtIndices.push(i);
          skirtAngles[i] = angle;
          skirtWeights[i] = Math.min(1.0, Math.abs(y) / 1.38);
        }
      } else {
        y *= 1.15;
        x *= 0.98;
        z *= 0.96;
      }
      bodyPos.setXYZ(i, x, y, z);
      baseBodyVertices[i * 3] = x;
      baseBodyVertices[i * 3 + 1] = y;
      baseBodyVertices[i * 3 + 2] = z;
    }
    bodyGeometry.computeVertexNormals();

    // Silky, pearlescent porcelain/jelly physical glass
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0x071e28,
      emissiveIntensity: 0.5,
      roughness: 0.18,
      metalness: 0.03,
      transmission: 0.55,
      thickness: 1.5,
      ior: 1.48,
      attenuationColor: new THREE.Color(0xd9f99d),
      attenuationDistance: 2.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.96,
    });
    const ghostBodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    characterGroup.add(ghostBodyMesh);

    // ── 4C. Cute Ghost Hands ──
    const handMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0x071e28,
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0.03,
      transmission: 0.55,
      ior: 1.46,
      clearcoat: 0.85,
      transparent: true,
      opacity: 0.94,
    });

    const handGeo = new THREE.SphereGeometry(0.24, 24, 24);
    handGeo.scale(1.1, 0.75, 1.35);

    const leftHand = new THREE.Mesh(handGeo, handMat);
    leftHand.position.set(-1.24, -0.36, 0.35);
    leftHand.rotation.set(0.15, 0.2, 0.45);
    characterGroup.add(leftHand);

    const rightHand = new THREE.Mesh(handGeo, handMat);
    rightHand.position.set(1.24, -0.32, 0.42);
    rightHand.rotation.set(0.15, -0.2, -0.4);
    characterGroup.add(rightHand);

    // ── 4D. Detective Fedora Hat (Realistic Curves & Crease) ──
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 1.38, 0.06);
    hatGroup.rotation.z = -0.07;
    hatGroup.rotation.x = -0.05;

    const hatMat = new THREE.MeshStandardMaterial({
      color: 0x141418,
      roughness: 0.82,
      metalness: 0.12,
    });

    // Realistic Fedora Brim: curved dipped front, raised back, side curl (48 segments)
    const brimGeo = new THREE.CylinderGeometry(1.64, 1.76, 0.07, 48);
    brimGeo.scale(1.02, 1, 1.14);
    const brimPos = brimGeo.attributes.position;
    for (let i = 0; i < brimPos.count; i++) {
      const x = brimPos.getX(i);
      const y = brimPos.getY(i);
      const z = brimPos.getZ(i);

      const frontDip = z > 0 ? -z * 0.13 : 0;
      const sideRise = (x * x) * 0.055;
      const backSweep = z < 0 ? -z * 0.09 : 0;

      brimPos.setY(i, y + frontDip + sideRise + backSweep);
    }
    brimGeo.computeVertexNormals();
    const brimMesh = new THREE.Mesh(brimGeo, hatMat);
    hatGroup.add(brimMesh);

    // Pinched Fedora Crown (Tapered with center crease and front side dents)
    const crownGeo = new THREE.CylinderGeometry(0.92, 1.16, 0.96, 48, 12);
    crownGeo.scale(0.94, 1, 1.06);
    const crownPos = crownGeo.attributes.position;
    for (let i = 0; i < crownPos.count; i++) {
      let x = crownPos.getX(i);
      let y = crownPos.getY(i);
      let z = crownPos.getZ(i);

      if (y > 0.25) {
        const distFromCenter = Math.sqrt(x * x + z * z);
        const centerDent = Math.max(0, 0.95 - distFromCenter * 1.3) * 0.16;
        y -= centerDent;

        if (z > 0.2 && Math.abs(x) > 0.22) {
          x *= 0.88;
        }
      }
      crownPos.setXYZ(i, x, y, z);
    }
    crownGeo.computeVertexNormals();
    const crownMesh = new THREE.Mesh(crownGeo, hatMat);
    crownMesh.position.y = 0.48;
    hatGroup.add(crownMesh);

    // Neon Electric-Lime Satin Hatband
    const bandGeo = new THREE.CylinderGeometry(1.17, 1.19, 0.18, 48);
    bandGeo.scale(0.95, 1, 1.07);
    const bandMat = new THREE.MeshStandardMaterial({
      color: 0xc8f135,
      emissive: 0xc8f135,
      emissiveIntensity: 2.2,
      roughness: 0.25,
      metalness: 0.1,
    });
    const bandMesh = new THREE.Mesh(bandGeo, bandMat);
    bandMesh.position.y = 0.16;
    hatGroup.add(bandMesh);

    // Golden Detective Shield Badge Pin on Hatband
    const badgeShape = new THREE.Shape();
    badgeShape.moveTo(0, 0.12);
    badgeShape.lineTo(0.09, 0.08);
    badgeShape.lineTo(0.06, -0.06);
    badgeShape.lineTo(0, -0.12);
    badgeShape.lineTo(-0.06, -0.06);
    badgeShape.lineTo(-0.09, 0.08);
    badgeShape.closePath();

    const badgeExtrude = new THREE.ExtrudeGeometry(badgeShape, {
      depth: 0.03,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2,
    });
    const badgeMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.92,
      roughness: 0.2,
      emissive: 0xc8f135,
      emissiveIntensity: 0.35,
    });
    const badgeMesh = new THREE.Mesh(badgeExtrude, badgeMat);
    badgeMesh.position.set(0.68, 0.18, 0.94);
    badgeMesh.rotation.y = 0.58;
    hatGroup.add(badgeMesh);

    characterGroup.add(hatGroup);

    // ── 4E. Chic Trenchcoat V-Collar & Cyber Tie ──
    const coatMat = new THREE.MeshStandardMaterial({
      color: 0x16161a,
      roughness: 0.8,
      metalness: 0.15,
    });

    // Left Lapel
    const leftLapelGeo = new THREE.BoxGeometry(0.38, 0.72, 0.08);
    const leftLapel = new THREE.Mesh(leftLapelGeo, coatMat);
    leftLapel.position.set(-0.46, -0.84, 1.0);
    leftLapel.rotation.set(0.18, 0.22, -0.38);
    characterGroup.add(leftLapel);

    // Right Lapel
    const rightLapel = new THREE.Mesh(leftLapelGeo, coatMat);
    rightLapel.position.set(0.46, -0.84, 1.0);
    rightLapel.rotation.set(0.18, -0.22, 0.38);
    characterGroup.add(rightLapel);

    // Glowing Cyan Tech Tie
    const tieKnotGeo = new THREE.ConeGeometry(0.12, 0.34, 16);
    const tieMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 2.0,
      roughness: 0.2,
    });
    const tieKnot = new THREE.Mesh(tieKnotGeo, tieMat);
    tieKnot.position.set(0, -0.78, 1.08);
    tieKnot.rotation.x = Math.PI;
    characterGroup.add(tieKnot);

    // ── 4F. Expressive Face & Cyber-HUD Monocle ──
    const faceGroup = new THREE.Group();
    faceGroup.position.set(0, 0.34, 1.26);

    // 1. Sleek Upward Curved Detective Smile
    const smileCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.24, -0.42, 0.02),
      new THREE.Vector3(-0.1, -0.49, 0.06),
      new THREE.Vector3(0.08, -0.50, 0.07),
      new THREE.Vector3(0.24, -0.41, 0.03),
    ]);
    const smileGeo = new THREE.TubeGeometry(smileCurve, 24, 0.032, 8, false);
    const smileMat = new THREE.MeshStandardMaterial({
      color: 0x121214,
      roughness: 0.35,
      metalness: 0.2,
    });
    const smileMesh = new THREE.Mesh(smileGeo, smileMat);
    faceGroup.add(smileMesh);

    // Dimple accent on cheek for charm
    const dimpleGeo = new THREE.SphereGeometry(0.03, 10, 10);
    const dimpleRight = new THREE.Mesh(dimpleGeo, smileMat);
    dimpleRight.position.set(0.26, -0.39, 0.04);
    faceGroup.add(dimpleRight);

    // 2. Left Eye: Expressive Curved Wink Arc 😉
    const winkGroup = new THREE.Group();
    winkGroup.position.set(-0.48, 0.1, 0.04);

    const winkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.18, -0.04, 0),
      new THREE.Vector3(0, 0.06, 0.02),
      new THREE.Vector3(0.18, -0.04, 0),
    ]);
    const winkGeo = new THREE.TubeGeometry(winkCurve, 16, 0.036, 8, false);
    const eyeGlossMat = new THREE.MeshStandardMaterial({
      color: 0x0f0f12,
      roughness: 0.2,
      metalness: 0.3,
    });
    const winkMesh = new THREE.Mesh(winkGeo, eyeGlossMat);
    winkGroup.add(winkMesh);

    // Expressive tilted arched eyebrow
    const browCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.2, 0.18, 0),
      new THREE.Vector3(0, 0.24, 0.02),
      new THREE.Vector3(0.2, 0.21, 0),
    ]);
    const browGeo = new THREE.TubeGeometry(browCurve, 16, 0.026, 8, false);
    const browMesh = new THREE.Mesh(browGeo, eyeGlossMat);
    browMesh.rotation.z = 0.12;
    winkGroup.add(browMesh);

    // Tiny Sparkle Star Glint on Left Eye
    const sparkleGeo = new THREE.PlaneGeometry(0.06, 0.06);
    const sparkleMat = new THREE.MeshBasicMaterial({
      color: 0xc8f135,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const sparkle = new THREE.Mesh(sparkleGeo, sparkleMat);
    sparkle.position.set(0.14, 0.05, 0.03);
    sparkle.rotation.z = Math.PI / 4;
    winkGroup.add(sparkle);

    faceGroup.add(winkGroup);

    // 3. Right Eye: Holographic Cyber Monocle & AI Targeting Reticle
    const monocleGroup = new THREE.Group();
    monocleGroup.position.set(0.48, 0.08, 0.04);

    const monocleBezelGeo = new THREE.TorusGeometry(0.32, 0.038, 16, 48);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 2.2,
      roughness: 0.18,
      metalness: 0.85,
    });
    const monocleBezel = new THREE.Mesh(monocleBezelGeo, bezelMat);
    monocleGroup.add(monocleBezel);

    const innerRimGeo = new THREE.TorusGeometry(0.26, 0.016, 12, 36);
    const innerRimMat = new THREE.MeshStandardMaterial({
      color: 0xc8f135,
      emissive: 0xc8f135,
      emissiveIntensity: 2.0,
      roughness: 0.2,
    });
    const innerRim = new THREE.Mesh(innerRimGeo, innerRimMat);
    innerRim.position.z = 0.01;
    monocleGroup.add(innerRim);

    // Holographic Glass Lens
    const lensGeo = new THREE.CircleGeometry(0.3, 24);
    const lensMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const lensMesh = new THREE.Mesh(lensGeo, lensMat);
    lensMesh.position.z = 0.015;
    monocleGroup.add(lensMesh);

    // Active AI Eye Pupil behind monocle
    const pupilGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const pupilMat = new THREE.MeshStandardMaterial({
      color: 0x050508,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.8,
      roughness: 0.1,
    });
    const pupilMesh = new THREE.Mesh(pupilGeo, pupilMat);
    pupilMesh.position.set(0, 0, -0.04);
    monocleGroup.add(pupilMesh);

    // Rotating HUD Ring with Sci-Fi Arc Segments
    const hudArc1Geo = new THREE.RingGeometry(0.22, 0.245, 24, 1, 0, Math.PI * 1.1);
    const hudArcMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const hudArc1 = new THREE.Mesh(hudArc1Geo, hudArcMat);
    hudArc1.position.z = 0.022;
    monocleGroup.add(hudArc1);

    const hudArc2Geo = new THREE.RingGeometry(0.18, 0.20, 20, 1, Math.PI * 1.2, Math.PI * 0.5);
    const hudArc2Mat = new THREE.MeshBasicMaterial({
      color: 0xc8f135,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const hudArc2 = new THREE.Mesh(hudArc2Geo, hudArc2Mat);
    hudArc2.position.z = 0.024;
    monocleGroup.add(hudArc2);

    // Central Precision Targeting Reticle Cross
    const reticleGroup = new THREE.Group();
    const reticleMat = new THREE.MeshBasicMaterial({ color: 0xc8f135 });
    const reticleH = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.02), reticleMat);
    const reticleV = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.24), reticleMat);
    const centerTarget = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.065, 16), reticleMat);
    reticleGroup.add(reticleH, reticleV, centerTarget);
    reticleGroup.position.z = 0.028;
    monocleGroup.add(reticleGroup);

    // Elegant Draped Monocle Chain
    const chainCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.3, -0.06, 0.01),
      new THREE.Vector3(0.52, -0.32, 0.08),
      new THREE.Vector3(0.48, -0.58, 0.06),
      new THREE.Vector3(0.28, -0.80, 0.02),
    ]);
    const chainGeo = new THREE.TubeGeometry(chainCurve, 24, 0.014, 6, false);
    const chainMat = new THREE.MeshStandardMaterial({
      color: 0xc8f135,
      emissive: 0xc8f135,
      emissiveIntensity: 1.1,
      roughness: 0.25,
      metalness: 0.8,
    });
    const chainMesh = new THREE.Mesh(chainGeo, chainMat);
    monocleGroup.add(chainMesh);

    faceGroup.add(monocleGroup);
    characterGroup.add(faceGroup);

    // 5. Ambient Cyber Motes & Glowing Dust (60 lightweight particles)
    const particlesCount = 60;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particlesCount * 3);
    const particleColors = new Float32Array(particlesCount * 3);

    const colorLime = new THREE.Color(0xc8f135);
    const colorCyan = new THREE.Color(0x00f0ff);

    for (let i = 0; i < particlesCount; i++) {
      const idx = i * 3;
      particlePositions[idx] = (Math.random() - 0.5) * 14;
      particlePositions[idx + 1] = (Math.random() - 0.5) * 10;
      particlePositions[idx + 2] = (Math.random() - 0.5) * 6;

      const chosenColor = Math.random() > 0.4 ? colorLime : colorCyan;
      particleColors[idx] = chosenColor.r;
      particleColors[idx + 1] = chosenColor.g;
      particleColors[idx + 2] = chosenColor.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 6. Interactive Smooth Pointer Gaze
    const mouse = { x: 0, y: 0 };
    const targetRotation = { x: 0, y: 0 };
    const currentRotation = { x: 0, y: 0 };
    let clickNod = 0;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.x = Math.max(-1, Math.min(1, nx));
      mouse.y = Math.max(-1, Math.min(1, ny));
    };

    const handlePointerDown = () => {
      clickNod = 0.22;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });

    // 7. Render Loop with Visibility Caching & Optimized Skirt Waves
    let animId: number;
    let isVisible = true;
    const clock = new THREE.Clock();

    const animate = () => {
      if (!isVisible) return; // Zero GPU / CPU execution when scrolled out of view!

      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth kinematic lerp for head tracking
      targetRotation.y = mouse.x * 0.45;
      targetRotation.x = -mouse.y * 0.28;
      currentRotation.y += (targetRotation.y - currentRotation.y) * 0.055;
      currentRotation.x += (targetRotation.x - currentRotation.x) * 0.055;

      // Handle playful nod decay
      if (clickNod > 0.001) {
        clickNod *= 0.92;
      } else {
        clickNod = 0;
      }

      characterGroup.rotation.y = currentRotation.y;
      characterGroup.rotation.x = currentRotation.x + clickNod;
      characterGroup.rotation.z = -mouse.x * 0.08;

      // Organic Disney/Pixar Breathing Squash & Stretch
      const breath = Math.sin(elapsedTime * 1.8);
      characterGroup.scale.y = 1.0 + breath * 0.024;
      characterGroup.scale.x = 1.0 - breath * 0.012;
      characterGroup.scale.z = 1.0 - breath * 0.012;

      // Monocle Targeting Animations
      reticleGroup.position.x = mouse.x * 0.08;
      reticleGroup.position.y = mouse.y * 0.08;
      reticleGroup.rotation.z = elapsedTime * 0.9;
      hudArc1.rotation.z = -elapsedTime * 0.65;
      hudArc2.rotation.z = elapsedTime * 0.85;

      pupilMesh.position.x = mouse.x * 0.06;
      pupilMesh.position.y = mouse.y * 0.06;

      // Buoyant Floating Physics
      characterGroup.position.y = -0.15 + Math.sin(elapsedTime * 1.7) * 0.14;

      // Organic Hand Hover Gestures
      leftHand.position.y = -0.36 + Math.sin(elapsedTime * 1.9 + 0.4) * 0.06;
      rightHand.position.y = -0.32 + Math.sin(elapsedTime * 1.9 + 1.2) * 0.06;

      // High-Performance Skirt Waves (Loops ONLY over pre-filtered skirt vertices)
      const currentPos = bodyGeometry.attributes.position;
      const count = skirtIndices.length;
      for (let s = 0; s < count; s++) {
        const i = skirtIndices[s];
        const angle = skirtAngles[i];
        const weight = skirtWeights[i];
        const baseX = baseBodyVertices[i * 3];
        const baseZ = baseBodyVertices[i * 3 + 2];

        const ripple = Math.sin(elapsedTime * 2.4 + angle * 5) * 0.04 * weight;
        currentPos.setX(i, baseX + Math.cos(angle) * ripple);
        currentPos.setZ(i, baseZ + Math.sin(angle) * ripple);
      }
      currentPos.needsUpdate = true;

      // Subtle Particle Drifting
      particles.rotation.y = elapsedTime * 0.025;

      renderer.render(scene, camera);
    };

    // 8. IntersectionObserver to completely halt rendering when offscreen
    const observer = new IntersectionObserver(
      ([entry]) => {
        const wasVisible = isVisible;
        isVisible = entry.isIntersecting && !document.hidden;
        if (isVisible && !wasVisible) {
          clock.start();
          animate();
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isVisible = false;
      } else {
        isVisible = true;
        clock.start();
        animate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      pmremGenerator.dispose();
      envTexture.dispose();
      bodyGeometry.dispose();
      bodyMaterial.dispose();
      handMat.dispose();
      hatMat.dispose();
      brimGeo.dispose();
      crownGeo.dispose();
      bandGeo.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      container.innerHTML = '';
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 pointer-events-none w-full h-full [&>canvas]:w-full [&>canvas]:h-full"
      aria-hidden="true"
    />
  );
}
