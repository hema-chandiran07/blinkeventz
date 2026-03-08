"use client";

/**
 * ULTRA PREMIUM Animated Background Component
 * Bold, Dramatic, Industrial-Level Glassmorphism
 * Black & Premium Silver Color Scheme
 * Applied to ALL 64 pages globally
 */
export default function GlobalBackground() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      zIndex: -9999,
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2d2d2d 100%)',
    }}>
      {/* Bold Animated Gradient Orbs - Much More Visible */}
      <div 
        style={{
          position: 'absolute',
          top: '-30%',
          left: '-20%',
          width: '70vw',
          height: '70vw',
          background: 'radial-gradient(circle, rgba(192, 192, 192, 0.4) 0%, rgba(192, 192, 192, 0.1) 40%, transparent 70%)',
          borderRadius: '50%',
          animation: 'floatOrb1 15s ease-in-out infinite',
          filter: 'blur(40px)',
        }}
      />

      <div 
        style={{
          position: 'absolute',
          bottom: '-30%',
          right: '-20%',
          width: '80vw',
          height: '80vw',
          background: 'radial-gradient(circle, rgba(229, 229, 229, 0.5) 0%, rgba(163, 163, 163, 0.2) 50%, transparent 80%)',
          borderRadius: '50%',
          animation: 'floatOrb2 18s ease-in-out infinite',
          filter: 'blur(50px)',
        }}
      />

      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '60vw',
          height: '60vw',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, rgba(192, 192, 192, 0.1) 50%, transparent 70%)',
          borderRadius: '50%',
          animation: 'floatOrb3 20s ease-in-out infinite',
          filter: 'blur(60px)',
        }}
      />

      {/* Dramatic Flowing Mesh - Bold Silver Streams */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(120deg, 
              rgba(192, 192, 192, 0.15) 0%, 
              transparent 25%, 
              rgba(229, 229, 229, 0.2) 50%, 
              transparent 75%, 
              rgba(163, 163, 163, 0.15) 100%
            )
          `,
          backgroundSize: '300% 300%',
          animation: 'dramaticFlow 12s ease-in-out infinite',
          opacity: 0.8,
        }}
      />

      {/* Horizontal Silver Waves - Very Visible */}
      <div 
        style={{
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          height: '100%',
          background: `repeating-linear-gradient(
            90deg,
            transparent 0%,
            rgba(192, 192, 192, 0.08) 10%,
            transparent 20%,
            rgba(229, 229, 229, 0.1) 30%,
            transparent 40%,
            rgba(163, 163, 163, 0.08) 50%,
            transparent 60%,
            rgba(192, 192, 192, 0.1) 70%,
            transparent 80%,
            rgba(229, 229, 229, 0.08) 90%,
            transparent 100%
          )`,
          backgroundSize: '200% 100%',
          animation: 'waveFlow 10s linear infinite',
          opacity: 0.6,
        }}
      />

      {/* Floating Geometric Shapes - Industrial Look */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: `${100 + i * 50}px`,
            height: `${100 + i * 50}px`,
            background: `linear-gradient(135deg, 
              rgba(192, 192, 192, ${0.2 + i * 0.05}) 0%, 
              rgba(163, 163, 163, ${0.1 + i * 0.03}) 50%, 
              transparent 100%
            )`,
            borderRadius: i % 2 === 0 ? '50%' : '0',
            top: `${5 + i * 12}%`,
            left: `${5 + i * 12}%`,
            animation: `geometricFloat ${15 + i * 3}s ease-in-out infinite`,
            animationDelay: `-${i * 2}s`,
            filter: 'blur(20px)',
            transform: `rotate(${i * 45}deg)`,
          }}
        />
      ))}

      {/* Dramatic Shimmer Lines - Bold & Visible */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(
            45deg,
            transparent 0%,
            rgba(255, 255, 255, 0.15) 20%,
            transparent 40%,
            rgba(192, 192, 192, 0.15) 60%,
            transparent 80%,
            rgba(229, 229, 229, 0.15) 100%
          )`,
          backgroundSize: '300% 300%',
          animation: 'dramaticShimmer 6s ease-in-out infinite',
          opacity: 0.7,
        }}
      />

      {/* Pulsing Glow Effects */}
      <div 
        style={{
          position: 'absolute',
          top: '25%',
          left: '25%',
          width: '50vw',
          height: '50vw',
          background: 'radial-gradient(circle, rgba(192, 192, 192, 0.3) 0%, transparent 60%)',
          borderRadius: '50%',
          animation: 'pulseGlow 8s ease-in-out infinite',
          filter: 'blur(30px)',
        }}
      />

      <div 
        style={{
          position: 'absolute',
          bottom: '25%',
          right: '25%',
          width: '60vw',
          height: '60vw',
          background: 'radial-gradient(circle, rgba(229, 229, 229, 0.35) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'pulseGlow2 10s ease-in-out infinite',
          filter: 'blur(40px)',
        }}
      />

      {/* Rotating Gradient Overlay - Dramatic Effect */}
      <div 
        style={{
          position: 'absolute',
          inset: '-50%',
          background: `conic-gradient(
            from 0deg,
            rgba(192, 192, 192, 0.1) 0deg,
            rgba(229, 229, 229, 0.2) 60deg,
            rgba(163, 163, 163, 0.1) 120deg,
            rgba(255, 255, 255, 0.15) 180deg,
            rgba(192, 192, 192, 0.1) 240deg,
            rgba(229, 229, 229, 0.2) 300deg,
            rgba(192, 192, 192, 0.1) 360deg
          )`,
          animation: 'rotateGradient 30s linear infinite',
          opacity: 0.5,
        }}
      />
    </div>
  );
}
