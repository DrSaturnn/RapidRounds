"use client";

import { Component, Suspense, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, Center, useGLTF } from "@react-three/drei";

import { ASTER_V1_GLB_ASSET } from "@/components/aster/AsterAssets";
import type { AsterAvatarProps } from "@/components/aster/Aster";
import { AsterAvatarFallback } from "@/components/aster/AsterAvatarFallback";

type AsterModelErrorBoundaryProps = {
  fallback: ReactNode;
  children: ReactNode;
};

type AsterModelErrorBoundaryState = {
  hasError: boolean;
};

class AsterModelErrorBoundary extends Component<AsterModelErrorBoundaryProps, AsterModelErrorBoundaryState> {
  state: AsterModelErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AsterModelErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Rendering failure should never affect the learning workflow.
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) {
      return;
    }

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(query.matches);

    const handleChange = () => setPrefersReducedMotion(query.matches);
    query.addEventListener?.("change", handleChange);
    return () => query.removeEventListener?.("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

function AsterModel({ animated }: { animated: boolean }) {
  const groupRef = useRef<any>(null);
  const gltf = useGLTF(ASTER_V1_GLB_ASSET);

  useFrame(({ clock }) => {
    if (!groupRef.current || !animated) {
      return;
    }

    const elapsed = clock.getElapsedTime();
    groupRef.current.position.y = Math.sin(elapsed * 1.35) * 0.045;
    groupRef.current.rotation.y = Math.sin(elapsed * 0.55) * 0.08;
    groupRef.current.rotation.z = Math.sin(elapsed * 0.8) * 0.018;
  });

  return (
    <group ref={groupRef} rotation={[0, -0.18, 0]}>
      <primitive object={gltf.scene} />
    </group>
  );
}

function AsterScene({ animated }: { animated: boolean }) {
  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[2.8, 3.6, 4]} intensity={2.2} />
      <directionalLight position={[-2, 1.8, -2.5]} intensity={0.7} color="#ffd69a" />
      <Bounds fit clip observe margin={1.12}>
        <Center>
          <AsterModel animated={animated} />
        </Center>
      </Bounds>
    </>
  );
}

export function AsterAvatar3D({
  size = "small",
  mood = "neutral",
  animated = true,
  showShadow = true,
}: AsterAvatarProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldAnimate = animated && !prefersReducedMotion;

  if (size === "tiny") {
    return <AsterAvatarFallback size={size} mood={mood} animated={animated} showShadow={showShadow} />;
  }

  return (
    <AsterModelErrorBoundary
      fallback={<AsterAvatarFallback size={size} mood={mood} animated={animated} showShadow={showShadow} />}
    >
      <span
        className={[
          "rr-aster-avatar",
          "rr-aster-avatar-3d",
          `rr-aster-avatar-${size}`,
          `rr-aster-mood-${mood}`,
          shouldAnimate ? "rr-aster-avatar-animated" : "rr-aster-avatar-still",
          showShadow ? "rr-aster-avatar-shadowed" : ""
        ].join(" ")}
        aria-hidden="true"
      >
        <Suspense fallback={<AsterAvatarFallback size={size} mood={mood} animated={animated} showShadow={false} />}>
          <Canvas
            className="rr-aster-runtime-canvas"
            camera={{ position: [0, 0.35, 4.2], fov: 28 }}
            dpr={[1, 1.75]}
            gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
          >
            <AsterScene animated={shouldAnimate} />
          </Canvas>
        </Suspense>
      </span>
    </AsterModelErrorBoundary>
  );
}

useGLTF.preload(ASTER_V1_GLB_ASSET);
