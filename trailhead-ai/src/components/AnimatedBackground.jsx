import { useEffect, useRef } from 'react';
import './AnimatedBackground.css';

// One orchestrated ambient effect per theme — never both at once, never
// scattered motion. Dark = quiet star field. Light = soft drifting clouds
// with a gentle sun glow, matching the "Blue Sky" name literally.
export default function AnimatedBackground({ themeName }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;
    let width, height;
    let particles = [];

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const isLight = themeName === 'light';

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    // --- Dark theme: star field ---
    function initStars() {
      const colors = ['#EDEAE0', '#4FA8E0', '#D7A34E'];
      const colorWeights = [0.82, 0.13, 0.05];
      function pickColor() {
        const r = Math.random();
        let acc = 0;
        for (let i = 0; i < colorWeights.length; i++) {
          acc += colorWeights[i];
          if (r <= acc) return colors[i];
        }
        return colors[0];
      }
      particles = Array.from({ length: 140 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.2 + 0.3,
        baseAlpha: Math.random() * 0.5 + 0.25,
        twinkleSpeed: Math.random() * 0.015 + 0.004,
        twinklePhase: Math.random() * Math.PI * 2,
        driftSpeed: Math.random() * 0.008 + 0.002,
        color: pickColor(),
      }));
    }

    function drawStars(time) {
      ctx.clearRect(0, 0, width, height);

      const g1 = ctx.createRadialGradient(width * 0.2, height * 0.15, 0, width * 0.2, height * 0.15, width * 0.6);
      g1.addColorStop(0, 'rgba(79, 168, 224, 0.05)');
      g1.addColorStop(1, 'rgba(79, 168, 224, 0)');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, width, height);

      const g2 = ctx.createRadialGradient(width * 0.85, height * 0.8, 0, width * 0.85, height * 0.8, width * 0.5);
      g2.addColorStop(0, 'rgba(215, 163, 78, 0.035)');
      g2.addColorStop(1, 'rgba(215, 163, 78, 0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, width, height);

      particles.forEach((s) => {
        const twinkle = prefersReducedMotion
          ? s.baseAlpha
          : s.baseAlpha + Math.sin(time * s.twinkleSpeed + s.twinklePhase) * 0.2;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, twinkle));
        ctx.fill();
        ctx.globalAlpha = 1;

        if (!prefersReducedMotion) {
          s.y += s.driftSpeed;
          if (s.y > height) {
            s.y = 0;
            s.x = Math.random() * width;
          }
        }
      });
    }

    // --- Light theme: drifting clouds + sun glow ---
    function initClouds() {
      particles = Array.from({ length: 6 }, (_, i) => ({
        x: Math.random() * width,
        y: height * (0.08 + Math.random() * 0.5),
        widthPx: 160 + Math.random() * 180,
        heightPx: 40 + Math.random() * 30,
        alpha: 0.12 + Math.random() * 0.1,
        driftSpeed: 0.06 + Math.random() * 0.08,
        z: i % 2, // simple parallax layer
      }));
    }

    function drawClouds() {
      ctx.clearRect(0, 0, width, height);

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, '#DCEEFC');
      sky.addColorStop(1, '#F5FAFF');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      // Soft sun glow, top-right
      const sun = ctx.createRadialGradient(
        width * 0.82, height * 0.12, 0,
        width * 0.82, height * 0.12, width * 0.35
      );
      sun.addColorStop(0, 'rgba(255, 244, 214, 0.55)');
      sun.addColorStop(1, 'rgba(255, 244, 214, 0)');
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, width, height);

      particles.forEach((c) => {
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.widthPx, c.heightPx, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${c.alpha})`;
        ctx.filter = 'blur(1px)';
        ctx.fill();
        ctx.filter = 'none';

        if (!prefersReducedMotion) {
          c.x += c.driftSpeed * (c.z === 0 ? 1 : 1.6);
          if (c.x - c.widthPx > width) {
            c.x = -c.widthPx;
            c.y = height * (0.08 + Math.random() * 0.5);
          }
        }
      });
    }

    function loop(time) {
      if (isLight) {
        drawClouds();
      } else {
        drawStars(time);
      }
      animationId = requestAnimationFrame(loop);
    }

    resize();
    if (isLight) {
      initClouds();
    } else {
      initStars();
    }
    animationId = requestAnimationFrame(loop);

    function handleResize() {
      resize();
      if (isLight) initClouds();
      else initStars();
    }
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [themeName]);

  return <canvas ref={canvasRef} className="ai-hub-bg-canvas" aria-hidden="true" />;
}
