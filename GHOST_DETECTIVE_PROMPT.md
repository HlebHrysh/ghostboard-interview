# PROMPT: GHOSTBOARD 3D DETECTIVE INTERACTIVE LANDING PAGE

Copy everything below this line and provide it to any AI model, coding agent, or generator (v0, Claude, Cursor, Lovable, Bolt, Antigravity):

---

Recreate this exact single-page Ghostboard stealth AI copilot landing page featuring an interactive 3D Detective Ghost mascot. This is a fidelity task, not a redesign. Implement the supplied content, 3D WebGL assets, CSS, and interactions exactly. Build only this page. Keep it local; do not publish or deploy it. Do not add unnecessary headers, complex forms, extra buttons, or unrelated sections.

The source snapshots and specifications appended below are the authoritative guide. Copy them exactly, adapting only import paths or framework plumbing if necessary.

---

### 1. Overall appearance

The whole page is a high-impact, minimalist cyber-stealth showcase containing:
- A left intelligence/navigation column,
- A centered Ghost Detective script logo,
- A right stealth-offer action column with social icons,
- An interactive real-time 3D Detective Ghost floating in the viewport.

At desktop widths, the 3D WebGL scene fills the viewport behind all content. The Detective Ghost floats with gentle levitation physics, his fedora hat cocked to the side, his glowing cybernetic monocle pulsing with a tactical HUD crosshair, and his eyes/head smoothly rotating in full 3D space to track the visitor's cursor across the entire screen.

On mobile, the content stacks and the 3D Ghost Canvas appears directly in normal document flow below the copy. The palette is deep obsidian noir (`#09090b`) with razor-sharp neon lime (`#C8F135`) and cyber cyan (`#00F0FF`) accents, with zero distracting gradients or blurry scrims blocking the character.

There are no disruptive popups. Navigation-style labels, status copy, and social icons are clean interactive anchors.

---

### 2. Exact visible copy

Preserve spelling, capitalization, punctuation, and explicit line breaks:

- **Left badge**: “stealth ai copilot” (17 characters)
- **Left headline, first line**: “undetectable” (12)
- **Left headline, second line**: “pure intelligence” (17)
- **Four navigation-style labels, in order**:
  1. “Live Copilot”
  2. “Mock Arena”
  3. “Teleprompter”
  4. “Pricing”

- **Right badge**: “stealth mode” (12)
- **Right headline, first line**: “land the dream offer!” (21)
- **Right headline, second line**: “your secret sleuth*” (18)
- **Small note**: “*sub-1.5s real-time AI copilot. undetectable in any call.” (57)
- **Social icons in order**: GitHub, Discord, X (Twitter). Use the exact SVG files provided below.

The central logo is the Ghostboard Detective SVG logo with the custom logotype. It inherits the brand accent color `#C8F135` and crisp white `#F4F4F5`.

---

### 3. Exact typography and colors

- **Headlines**: 'Inter', 'Epilogue', or sans-serif, weight 900, letter-spacing -0.03em.
- **Code & Badges**: 'JetBrains Mono', monospace, weight 600.
- **Navigation & Body**: 'Inter', system-ui, weight 500 & 400.

**Colors**:
- Background: `#09090b` (Deep obsidian)
- Foreground / Text: `#f4f4f5` (High-contrast bright zinc white)
- Accent Primary: `#C8F135` (Electric Ghostboard Lime)
- Accent Secondary: `#00F0FF` (Cyber Sleuth Cyan)
- Border / Line: `rgba(255, 255, 255, 0.08)`
- Badge background: `rgba(200, 241, 53, 0.06)` with border `rgba(200, 241, 53, 0.25)`
- Mobile background: `#09090b`

---

### 4. Exact desktop layout (viewport width > 700px)

Apply border-box sizing globally. Body has zero margin, min-height: 100vh, background: `#09090b`, color: `#f4f4f5`.
The container is `position: relative`, `min-height: 100vh`, `padding-top: 6.54vw`, `isolation: isolate`, `overflow: hidden`.

**Left block**:
- `margin-left: 8.65vw`, `width: 25vw`.
- Badge: `inline-flex`, items-center, pill radius `100px`, border `1px solid rgba(200,241,53,0.3)`, background: `rgba(200,241,53,0.06)`, padding: `.39vw .75vw`, font-size: `.8vw`, font-family: monospace, color: `#C8F135`, text-transform: uppercase, letter-spacing: `0.08em`.
- Headline: block, `margin-top: 1.45vw`, `font-size: 1.75vw`, `font-weight: 900`, `line-height: 1.15`, `letter-spacing: -0.03em`.
- Navigation labels: vertical flex column, items-start, `gap: .93vw`, `margin-top: 1.5vw`, `font-size: 1.05vw`, `line-height: 1.35`, color: `#a1a1aa`. Hover color: `#ffffff`.

**Logo**:
- `position: absolute`, `left: 41.5vw`, `top: 7.7vw`, `width: 17vw`.
- SVG display block, `width: 100%`, `height: auto`.

**Right block**:
- `position: absolute`, `left: 74.3vw`, `top: 6.54vw`, `width: 20vw`.
- Same badge styling with glowing dot indicator.
- Headline lines: flex column, items-start, `margin-top: 1.45vw`, `font-size: 1.75vw`, `font-weight: 900`, `line-height: 1.15`.
- Note: `margin: 1.05vw 0 0`, `font-size: .75vw`, `line-height: 1.45`, color: `#71717a`.
- Social row: horizontal flex, items-center, `gap: 1.2vw`, `margin-top: 1.61vw`.
- Icon wrappers: `2.2vw` flex container with smooth hover glow (`#C8F135`).

**3D WebGL Canvas Layer**:
- `position: absolute`, `inset: 0`, `z-index: -1`, `pointer-events: none`.
- Renders the interactive 3D Detective Ghost at centered position with smooth ambient floating and responsive mouse look.

---

### 5. Exact mobile layout (viewport width <= 700px)

Apply mobile overrides within `@media(max-width:700px)`:
- Container: flex column, `gap: 32px`, `min-height: 100svh`, `padding: 36px 20px 24px`, background: `#09090b`.
- Visual order: logo (`order: 0`); left block (`order: 1`); right block (`order: 2`); 3D Ghost Canvas (`order: 3`).
- Logo: `position: static`, `width: 220px`, `max-width: 80%`, `margin-bottom: 8px`.
- Left content: `width: 100%`, `margin: 0`.
- Navigation labels: two-column grid, `column-gap: 20px`, `row-gap: 12px`, `margin-top: 18px`.
- Right content: `position: static`, `width: 100%`.
- 3D Ghost Canvas: relative, `order: 3`, `width: calc(100% + 40px)`, `aspect-ratio: 4/3`, `margin: 0 -20px`. Handles touch and auto-drift gazing.

---

### 6. Exact 3D Detective Ghost Model Specification

The 3D character is built procedurally in WebGL (via Three.js) without requiring external heavy GLTF downloads:
- **Ethereal Ghost Body**: A smooth, pearlescent organic capsule/dome mesh with soft transparency (opacity: 0.92, roughness: 0.15, rim Fresnel glow in `#00F0FF`). The lower hem flares outward with soft curves.
- **Detective Fedora Hat**: Dark noir matte graphite felt (`#18181B`) with an indented crown, curved brim tilted forward with swagger, and an electric glowing neon hatband ribbon (`#C8F135`) with emissive luminescence.
- **Trenchcoat Lapels**: Stylized geometric lapels wrapped around the collar area (`#27272A`) with subtle rim lighting.
- **Left Eye**: Sleek, squinted detective slit tracking the gaze with slight investigative tilt.
- **Right Cyber Monocle**: Glowing cyan (`#00F0FF`) lens frame with rotating interior tactical HUD crosshair reticle (`#C8F135`), glowing center targeting iris, and a hanging micro-link chain draping downward.
- **Atmospheric Cyber Motes**: 70 gentle floating dust particles drifting around the ghost with soft sine oscillations.

---

### 7. Exact mouse and gaze interaction

- Normalize window pointer coordinates: `nx = ((e.clientX - rect.left) / rect.width) * 2 - 1`, `ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1)`.
- Head and Hat Euler rotation: smoothly lerp target yaw (`nx * 0.45` rad) and pitch (`-ny * 0.32` rad) with damping factor `0.06`.
- Body coordinates: slight responsive lean (`-nx * 0.12` rad tilt).
- Eye & Monocle Iris tracking: the pupils translate up to `±0.08` units directly in the direction of the cursor.
- Floating physics: continuous vertical floating oscillation `y = Math.sin(time * 1.8) * 0.14`.
- Tactical reticle rotation: monocle crosshairs rotate slowly over time (`time * 0.75`).

---

### 8. Implementation

Use React 19 / Next.js 16 App Router with TypeScript and Three.js (`npm install three @types/three`).
Below is the complete, self-contained single-file implementation ready to replace `app/page.tsx`:

```tsx
'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ── 3D Detective Ghost Canvas Component ──
function GhostDetective3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 8.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Cyberpunk Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const cyanRim = new THREE.PointLight(0x00f0ff, 3.5, 20);
    cyanRim.position.set(-5, 4, 3);
    scene.add(cyanRim);

    const limeKey = new THREE.PointLight(0xc8f135, 3.8, 20);
    limeKey.position.set(5, 3, 4);
    scene.add(limeKey);

    const bottomGlow = new THREE.PointLight(0x00f0ff, 2.0, 15);
    bottomGlow.position.set(0, -5, -2);
    scene.add(bottomGlow);

    // 3. Main Rig Group
    const characterGroup = new THREE.Group();
    scene.add(characterGroup);

    // 3A. Ghost Body Mesh (Procedurally shaped sphere)
    const bodyGeometry = new THREE.SphereGeometry(1.6, 48, 48);
    const pos = bodyGeometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i);
      let x = pos.getX(i);
      let z = pos.getZ(i);
      if (y < 0) {
        const flare = 1.0 + Math.abs(y) * 0.45;
        x *= flare;
        z *= flare;
      } else {
        y *= 1.15;
      }
      pos.setXYZ(i, x, y, z);
    }
    bodyGeometry.computeVertexNormals();

    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xeeeeee,
      emissive: 0x0a141a,
      roughness: 0.15,
      metalness: 0.1,
      transmission: 0.45,
      transparent: true,
      opacity: 0.92,
      ior: 1.3,
    });
    const ghostBodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    ghostBodyMesh.position.y = 0.1;
    characterGroup.add(ghostBodyMesh);

    // 3B. Detective Fedora Hat
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 1.45, 0.1);
    hatGroup.rotation.z = -0.06;
    hatGroup.rotation.x = -0.05;

    const hatMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85, metalness: 0.2 });

    const brimGeo = new THREE.CylinderGeometry(1.9, 2.05, 0.08, 48);
    brimGeo.scale(1, 1, 0.9);
    const brimMesh = new THREE.Mesh(brimGeo, hatMat);
    hatGroup.add(brimMesh);

    const crownGeo = new THREE.CylinderGeometry(1.15, 1.35, 1.1, 48);
    const crownMesh = new THREE.Mesh(crownGeo, hatMat);
    crownMesh.position.y = 0.55;
    hatGroup.add(crownMesh);

    const bandGeo = new THREE.CylinderGeometry(1.36, 1.38, 0.22, 48);
    const bandMat = new THREE.MeshStandardMaterial({
      color: 0xc8f135,
      emissive: 0xc8f135,
      emissiveIntensity: 1.2,
      roughness: 0.3,
    });
    const bandMesh = new THREE.Mesh(bandGeo, bandMat);
    bandMesh.position.y = 0.22;
    hatGroup.add(bandMesh);

    characterGroup.add(hatGroup);

    // 3C. Trenchcoat Collar
    const collarGeo = new THREE.TorusGeometry(1.4, 0.14, 16, 32, Math.PI);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.7 });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.position.set(0, -0.65, 0.8);
    collarMesh.rotation.x = Math.PI * 0.45;
    characterGroup.add(collarMesh);

    // 3D. Eyes & Cyber Monocle
    const eyesGroup = new THREE.Group();
    eyesGroup.position.set(0, 0.45, 1.48);

    // Left Eye: Squint slit
    const leftEyeGeo = new THREE.BoxGeometry(0.36, 0.08, 0.05);
    const darkEyeMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
    const leftEyeMesh = new THREE.Mesh(leftEyeGeo, darkEyeMat);
    leftEyeMesh.position.set(-0.55, 0.02, 0);
    leftEyeMesh.rotation.z = 0.08;
    eyesGroup.add(leftEyeMesh);

    // Right Eye: Monocle Group
    const monocleGroup = new THREE.Group();
    monocleGroup.position.set(0.55, 0, 0);

    const monocleRingGeo = new THREE.TorusGeometry(0.28, 0.045, 16, 32);
    const monocleRingMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 1.5,
    });
    const monocleRing = new THREE.Mesh(monocleRingGeo, monocleRingMat);
    monocleGroup.add(monocleRing);

    const lensGeo = new THREE.CircleGeometry(0.26, 32);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.35 });
    const lensMesh = new THREE.Mesh(lensGeo, lensMat);
    monocleGroup.add(lensMesh);

    // Crosshair Reticle
    const reticleGroup = new THREE.Group();
    const reticleMat = new THREE.MeshBasicMaterial({ color: 0xc8f135 });
    const crossH = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.025), reticleMat);
    const crossV = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 0.24), reticleMat);
    const pupilDot = new THREE.Mesh(new THREE.CircleGeometry(0.065, 16), reticleMat);
    reticleGroup.add(crossH, crossV, pupilDot);
    reticleGroup.position.z = 0.02;
    monocleGroup.add(reticleGroup);

    // Monocle Chain
    const chainCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0.28, -0.05, 0),
      new THREE.Vector3(0.48, -0.45, 0.1),
      new THREE.Vector3(0.3, -0.9, -0.2)
    );
    const chainGeo = new THREE.TubeGeometry(chainCurve, 20, 0.015, 8, false);
    const chainMesh = new THREE.Mesh(chainGeo, bandMat);
    monocleGroup.add(chainMesh);

    eyesGroup.add(monocleGroup);
    characterGroup.add(eyesGroup);

    // 4. Ambient Cyber Motes
    const particlesCount = 70;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 12;
      particlePositions[i + 1] = (Math.random() - 0.5) * 8;
      particlePositions[i + 2] = (Math.random() - 0.5) * 6;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.065,
      color: 0xc8f135,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 5. Mouse Gaze Tracking
    let mouse = { x: 0, y: 0 };
    let targetRotation = { x: 0, y: 0 };
    let currentRotation = { x: 0, y: 0 };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.x = Math.max(-1, Math.min(1, nx));
      mouse.y = Math.max(-1, Math.min(1, ny));
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // 6. 60 FPS Render Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Kinematic Gaze Lerp
      targetRotation.y = mouse.x * 0.45;
      targetRotation.x = -mouse.y * 0.32;
      currentRotation.y += (targetRotation.y - currentRotation.y) * 0.06;
      currentRotation.x += (targetRotation.x - currentRotation.x) * 0.06;

      characterGroup.rotation.y = currentRotation.y;
      characterGroup.rotation.x = currentRotation.x;
      characterGroup.rotation.z = -mouse.x * 0.12;

      // Monocle Reticle Tracking
      reticleGroup.position.x = mouse.x * 0.08;
      reticleGroup.position.y = mouse.y * 0.08;
      reticleGroup.rotation.z = elapsedTime * 0.75;

      // Organic Hover Float
      characterGroup.position.y = Math.sin(elapsedTime * 1.8) * 0.14;
      ghostBodyMesh.rotation.y = Math.sin(elapsedTime * 1.2) * 0.04;
      particles.rotation.y = elapsedTime * 0.03;

      renderer.render(scene, camera);
    };

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
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      bodyGeometry.dispose();
      bodyMaterial.dispose();
      container.innerHTML = '';
    };
  }, []);

  return <div ref={containerRef} className="ghost-3d-scene" aria-hidden="true" />;
}

// ── Ghostboard Brand Logo Component ──
function BrandLogo() {
  return (
    <svg viewBox="0 0 240 54" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
      <text x="56" y="34" fill="#f4f4f5" fontSize="24" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="-0.04em">
        GHOST<tspan fill="#c8f135">BOARD</tspan>
      </text>
      <text x="58" y="47" fill="#71717a" fontSize="9.5" fontWeight="600" fontFamily="ui-monospace, monospace" letterSpacing="0.14em">
        STEALTH INTERVIEW COPILOT
      </text>
    </svg>
  );
}

// ── Complete Page Component with Scoped Styles ──
export default function Home() {
  return (
    <>
      <style>{`
        :root {
          --background: #09090b;
          --foreground: #f4f4f5;
          --accent-lime: #c8f135;
          --accent-cyan: #00f0ff;
          --text-muted: #71717a;
          --tag-bg: rgba(200, 241, 53, 0.06);
          --tag-border: rgba(200, 241, 53, 0.25);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: var(--foreground);
          background: var(--background);
          font-synthesis: none;
        }
        * { box-sizing: border-box; }
        body { margin: 0; min-height: 100vh; background: var(--background); color: var(--foreground); overflow-x: hidden; }
        a { color: inherit; text-decoration: none; transition: color 0.2s ease, transform 0.2s ease; }
        a:hover { color: var(--accent-lime); }
        .ghost-main { position: relative; min-height: 100vh; padding-top: 6.54vw; isolation: isolate; overflow: hidden; }
        .ghost-3d-scene { position: absolute; inset: 0; z-index: -1; pointer-events: none; width: 100%; height: 100%; }
        .ghost-3d-scene canvas { display: block; width: 100% !important; height: 100% !important; }
        .intel-col { margin-left: 8.65vw; width: 25vw; }
        .tag { display: inline-flex; align-items: center; gap: 0.5vw; border-radius: 100px; background: var(--tag-bg); border: 1px solid var(--tag-border); padding: 0.39vw 0.75vw; font-family: ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace; font-size: 0.8vw; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent-lime); line-height: 1.2; height: 1.9vw; white-space: nowrap; }
        .pulse-dot { width: 0.45vw; height: 0.45vw; border-radius: 50%; background: var(--accent-lime); box-shadow: 0 0 10px var(--accent-lime); animation: pulseGlow 1.8s infinite ease-in-out; }
        @keyframes pulseGlow { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
        .headline { font-weight: 900; font-size: 1.75vw; line-height: 1.15; letter-spacing: -0.03em; }
        .title { margin-top: 1.45vw; }
        .text-lime { color: var(--accent-lime); text-shadow: 0 0 25px rgba(200, 241, 53, 0.25); }
        .text-muted { color: var(--text-muted); }
        .nav-links { display: flex; flex-direction: column; align-items: flex-start; gap: 0.93vw; margin-top: 1.5vw; font-size: 1.05vw; line-height: 1.35; color: #a1a1aa; }
        .logo-box { position: absolute; left: 41.5vw; top: 7.7vw; width: 17vw; }
        .logo-box svg { display: block; width: 100%; height: auto; }
        .action-col { position: absolute; left: 74.3vw; top: 6.54vw; width: 20vw; }
        .cta-stack { display: flex; flex-direction: column; align-items: flex-start; margin-top: 1.45vw; white-space: nowrap; }
        .note { margin: 1.05vw 0 0; font-size: 0.75vw; line-height: 1.45; color: var(--text-muted); white-space: nowrap; }
        .socials { display: flex; align-items: center; gap: 1.2vw; margin-top: 1.61vw; }
        .socials a { display: flex; align-items: center; justify-content: center; width: 2.2vw; height: 2.2vw; border-radius: 8px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); color: #a1a1aa; transition: all 0.2s ease; }
        .socials a:hover { color: var(--accent-lime); border-color: var(--accent-lime); background: rgba(200, 241, 53, 0.08); transform: translateY(-2px); }
        @media (max-width: 700px) {
          .ghost-main { display: flex; flex-direction: column; gap: 32px; min-height: 100svh; padding: 36px 20px 24px; }
          .logo-box { position: static; order: 0; width: 220px; max-width: 80%; margin-bottom: 8px; }
          .intel-col { order: 1; margin: 0; width: 100%; }
          .tag { height: 32px; padding: 6px 14px; font-size: 13px; gap: 8px; }
          .pulse-dot { width: 7px; height: 7px; }
          .headline { font-size: clamp(24px, 6.8vw, 32px); line-height: 1.2; }
          .title, .cta-stack { margin-top: 18px; }
          .nav-links { display: grid; grid-template-columns: 1fr 1fr; column-gap: 20px; row-gap: 12px; margin-top: 18px; font-size: 16px; }
          .action-col { position: static; order: 2; width: 100%; }
          .cta-stack { white-space: normal; gap: 4px; }
          .note { font-size: 14px; line-height: 1.5; margin-top: 14px; white-space: normal; }
          .socials { gap: 16px; margin-top: 20px; }
          .socials a { width: 44px; height: 44px; }
          .ghost-3d-scene { position: relative; inset: auto; order: 3; width: calc(100% + 40px); aspect-ratio: 4/3; margin: 0 -20px; }
        }
      `}</style>

      <main className="ghost-main" aria-label="Ghostboard Detective">
        <GhostDetective3D />

        <div className="intel-col">
          <span className="tag">
            <span className="pulse-dot" />
            stealth ai copilot
          </span>
          <h1 className="headline title">
            undetectable<br />
            <span className="text-lime">pure intelligence</span>
          </h1>
          <nav className="nav-links">
            <a href="/interview">Live Copilot</a>
            <a href="/mock-interview">Mock Arena</a>
            <a href="/guide">Teleprompter</a>
            <a href="/pricing">Pricing</a>
          </nav>
        </div>

        <div className="logo-box" role="img" aria-label="Ghostboard Detective Logo">
          <BrandLogo />
        </div>

        <div className="action-col">
          <span className="tag">stealth mode</span>
          <div className="headline cta-stack">
            <span>land the dream offer!</span>
            <span className="text-muted">your secret sleuth*</span>
          </div>
          <p className="note">*sub-1.5s real-time AI copilot. undetectable in any call.</p>
          <div className="socials">
            <a href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>
            <a href="https://discord.com" target="_blank" rel="noreferrer" aria-label="Discord">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.894.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </a>
            <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X (Twitter)">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
```
