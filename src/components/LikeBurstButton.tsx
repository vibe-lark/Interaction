import React, { useEffect, useMemo, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  r: number;
  vr: number;
  g: number;
  life: number;
  c: string;
};

export const LikeBurstButton: React.FC<{
  active?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  onClick?: () => void | Promise<void>;
  className?: string;
}> = ({ active, disabled, ariaLabel = 'like', onClick, className }) => {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const loopRunningRef = useRef(false);

  const colors = useMemo(() => ['#3370ff', '#6f42ff', '#00b2ff', '#ffd84f', '#ff6b6b', '#7ddc82'], []);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;
    const DPR = window.devicePixelRatio || 1;
    const size = 160;
    cv.width = size * DPR;
    cv.height = size * DPR;
    cv.style.width = `${size}px`;
    cv.style.height = `${size}px`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      loopRunningRef.current = false;
    };
  }, []);

  const startLoop = () => {
    if (loopRunningRef.current) return;
    loopRunningRef.current = true;
    const size = 160;
    const draw = () => {
      const ctx2 = ctxRef.current;
      if (!ctx2) {
        loopRunningRef.current = false;
        rafRef.current = null;
        return;
      }
      const current = particlesRef.current;
      if (!current.length) {
        ctx2.clearRect(0, 0, size, size);
        loopRunningRef.current = false;
        rafRef.current = null;
        return;
      }

      ctx2.clearRect(0, 0, size, size);
      const next: Particle[] = [];
      for (const p of current) {
        const life = p.life - 1;
        if (life <= 0) continue;
        const np: Particle = {
          ...p,
          life,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + p.g,
          vx: p.vx * 0.992,
          r: p.r + p.vr
        };
        if (np.y < 200) next.push(np);
      }
      particlesRef.current = next;

      for (const p of particlesRef.current) {
        ctx2.save();
        ctx2.translate(p.x, p.y);
        ctx2.rotate(p.r);
        ctx2.globalAlpha = Math.max(0.12, p.life / 80);
        ctx2.fillStyle = p.c;
        ctx2.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx2.restore();
      }
      ctx2.globalAlpha = 1;
      rafRef.current = window.requestAnimationFrame(draw);
    };

    rafRef.current = window.requestAnimationFrame(draw);
  };

  const fire = () => {
    const baseX = 80;
    const baseY = 52;
    const pcs: Particle[] = [];
    for (let i = 0; i < 34; i++) {
      const a = (-Math.PI / 2) + (Math.random() - 0.5) * 1.7;
      const sp = 1.7 + Math.random() * 2.7;
      pcs.push({
        x: baseX,
        y: baseY,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        w: 3 + Math.random() * 4,
        h: 5 + Math.random() * 7,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.22,
        g: 0.065,
        life: 58 + Math.random() * 26,
        c: colors[(Math.random() * colors.length) | 0]
      });
    }
    particlesRef.current = particlesRef.current.concat(pcs);
    startLoop();
  };

  const play = () => {
    const btn = btnRef.current;
    if (!btn) return;
    btn.classList.remove('lk-on');
    void btn.offsetWidth;
    btn.classList.add('lk-on');
    fire();
    window.setTimeout(() => {
      btn.classList.remove('lk-on');
    }, 1450);
  };

  return (
    <div className={`lk-wrap ${className || ''}`}>
      <button
        ref={btnRef}
        className={`lk-btn ${active ? 'lk-active' : ''}`}
        aria-label={ariaLabel}
        type="button"
        disabled={disabled}
        onClick={async () => {
          if (disabled) return;
          play();
          await onClick?.();
        }}
      >
        <span className="lk-core">
          <svg className="lk-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
            <path className="hand-outline" stroke="currentColor" strokeWidth="2" fill="none" d="M24.315 38.004H35.63c.438 0 .831-.272.982-.684l3.142-8.487a2.137 2.137 0 00-2.005-2.88h-6.064a.094.094 0 01-.083-.14c.282-.508 1.277-2.263 1.537-3.105.422-1.366-.04-2.951-2.341-3.754a.094.094 0 00-.064 0 .068.068 0 00-.031.025l-2.093 2.97-2.738 3.886a.28.28 0 01-.231.118h-1.327a.082.082 0 00-.082.082v11.886c0 .046.037.083.083.083z"/>
            <path className="thumb-fill" fill="currentColor" d="M21.071 39.051h-1.004a.502.502 0 01-.502-.502v-13.05c0-.277.225-.502.502-.502h1.004c.277 0 .502.225.502.502v13.05a.502.502 0 01-.502.502z"/>
          </svg>
        </span>
        <span className="lk-orbit o1" />
        <span className="lk-orbit o2" />
        <span className="lk-orbit o3" />
        <span className="lk-orbit o4" />
        <span className="lk-orbit o5" />
        <canvas ref={cvRef} className="lk-cv" width={160} height={160} />
      </button>
    </div>
  );
};
