
import React, { useMemo, useEffect, useRef, useState } from 'react';

interface MagneticCageProps {
  isSpinning: boolean;
  ballCount: number;
}

interface Ball {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: { light: string; main: string; dark: string };
}

const MagneticCage: React.FC<MagneticCageProps> = ({ isSpinning, ballCount }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  const requestRef = useRef<number>(null);
  const ballsRef = useRef<Ball[]>([]);

  const cageRadius = 145; // Bán kính lồng (pixels)
  const colors = [
    { light: '#fecaca', main: '#ef4444', dark: '#991b1b' }, 
    { light: '#fef3c7', main: '#f59e0b', dark: '#92400e' }, 
    { light: '#ffedd5', main: '#f97316', dark: '#9a3412' }, 
    { light: '#fef08a', main: '#eab308', dark: '#854d0e' }, 
    { light: '#fff1f2', main: '#fb7185', dark: '#be123c' }, 
  ];

  // Khởi tạo bóng
  useEffect(() => {
    const initialBalls: Ball[] = Array.from({ length: Math.min(ballCount, 25) }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 100,
      y: (Math.random() - 0.5) * 100,
      z: (Math.random() - 0.5) * 100,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      vz: (Math.random() - 0.5) * 4,
      size: 24 + Math.random() * 8,
      color: colors[i % colors.length],
    }));
    ballsRef.current = initialBalls;
    setBalls(initialBalls);
  }, [ballCount]);

  // Vòng lặp vật lý
  const updatePhysics = () => {
    const nextBalls = ballsRef.current.map(ball => {
      let { x, y, z, vx, vy, vz, size } = ball;

      // Khi lồng đang quay, tăng tốc độ hỗn loạn
      if (isSpinning) {
        vx += (Math.random() - 0.5) * 3;
        vy += (Math.random() - 0.5) * 3;
        vz += (Math.random() - 0.5) * 3;
        
        const speedLimit = 15;
        const currentSpeed = Math.sqrt(vx*vx + vy*vy + vz*vz);
        if (currentSpeed > speedLimit) {
          vx = (vx / currentSpeed) * speedLimit;
          vy = (vy / currentSpeed) * speedLimit;
          vz = (vz / currentSpeed) * speedLimit;
        }
      } else {
        vx *= 0.98;
        vy *= 0.98;
        vz *= 0.98;
        vy += 0.2; // Trọng lực
      }

      x += vx;
      y += vy;
      z += vz;

      const dist = Math.sqrt(x * x + y * y + z * z);
      const limit = cageRadius - size / 2;

      if (dist > limit) {
        const nx = x / dist;
        const ny = y / dist;
        const nz = z / dist;

        const dot = vx * nx + vy * ny + vz * nz;
        vx = (vx - 2 * dot * nx) * 0.8;
        vy = (vy - 2 * dot * ny) * 0.8;
        vz = (vz - 2 * dot * nz) * 0.8;

        x = nx * limit;
        y = ny * limit;
        z = nz * limit;
      }

      return { ...ball, x, y, z, vx, vy, vz };
    });

    ballsRef.current = nextBalls;
    setBalls([...nextBalls]);
    requestRef.current = requestAnimationFrame(updatePhysics);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isSpinning]);

  return (
    <div className="relative w-80 h-[480px] mx-auto perspective-2000 flex flex-col items-center select-none">
      
      {/* CÀNG ĐỠ - CỐ ĐỊNH */}
      <div className="absolute top-[35%] left-[-15%] w-[130%] h-[10%] z-0 pointer-events-none preserve-3d">
         <div className="absolute left-0 top-0 w-12 h-24 bg-gradient-to-r from-yellow-800 to-yellow-600 rounded-full border-2 border-black -rotate-12 shadow-xl"></div>
         <div className="absolute right-0 top-0 w-12 h-24 bg-gradient-to-l from-yellow-800 to-yellow-600 rounded-full border-2 border-black rotate-12 shadow-xl"></div>
      </div>

      <div className="relative w-80 h-80 preserve-3d mt-10">
        
        {/* LỚP NAN LỒNG PHÍA SAU (Back Wires) */}
        <div className={`absolute inset-0 preserve-3d ${isSpinning ? 'animate-cage-spin' : ''}`}>
          {[...Array(12)].map((_, i) => (
            <div 
              key={`v-back-${i}`}
              className="absolute inset-0 rounded-full border-[1.5px] border-yellow-700/30 pointer-events-none preserve-3d"
              style={{ transform: `rotateY(${i * 15}deg) translateZ(-1px)` }}
            />
          ))}
        </div>

        {/* CONTAINER CHỨA BÓNG */}
        <div className="absolute inset-0 preserve-3d z-10 flex items-center justify-center">
           {balls.map((ball) => (
             <div
               key={ball.id}
               className="absolute rounded-full shadow-2xl flex items-center justify-center transition-opacity duration-300"
               style={{
                 width: `${ball.size}px`,
                 height: `${ball.size}px`,
                 background: `radial-gradient(circle at 30% 30%, ${ball.color.light} 0%, ${ball.color.main} 60%, ${ball.color.dark} 100%)`,
                 boxShadow: `inset -2px -2px 4px ${ball.color.dark}, 0 5px 15px rgba(0, 0, 0, 0.4)`,
                 transform: `translate3d(${ball.x}px, ${ball.y}px, ${ball.z}px)`,
                 zIndex: Math.round(ball.z + 500)
               }}
             >
               <div className="absolute top-[20%] left-[20%] w-[20%] h-[20%] bg-white/50 rounded-full blur-[1px]"></div>
               <span className="text-white font-black text-[9px] drop-shadow-md opacity-80">
                 {ball.id + 1}
               </span>
             </div>
           ))}
        </div>

        {/* LỚP NAN LỒNG PHÍA TRƯỚC (Front Wires) */}
        <div className={`absolute inset-0 preserve-3d z-20 ${isSpinning ? 'animate-cage-spin' : ''}`}>
          {[...Array(12)].map((_, i) => (
            <div 
              key={`v-front-${i}`}
              className="absolute inset-0 rounded-full border-[2.5px] border-yellow-400/50 pointer-events-none preserve-3d"
              style={{ transform: `rotateY(${i * 15}deg) translateZ(1px)` }}
            />
          ))}
          {[...Array(5)].map((_, i) => (
            <div 
              key={`h-${i}`}
              className="absolute rounded-full border-[2px] border-yellow-500/40 pointer-events-none"
              style={{ 
                width: `${Math.sin((i + 1) * Math.PI / 6) * 100}%`,
                height: `${Math.sin((i + 1) * Math.PI / 6) * 100}%`,
                left: `${(100 - Math.sin((i + 1) * Math.PI / 6) * 100) / 2}%`,
                top: `${(100 - Math.sin((i + 1) * Math.PI / 6) * 100) / 2}%`,
                transform: `rotateX(90deg) translateZ(${(i - 2) * 50}px)`,
              }}
            />
          ))}
        </div>

        {/* HIỆU ỨNG ÁNH SÁNG THỦY TINH */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/5 to-black/10 border-[6px] border-yellow-600/80 shadow-[inset_0_0_80px_rgba(0,0,0,0.5)] pointer-events-none z-30"></div>
      </div>

      {/* CHÂN ĐẾ KIM LOẠI */}
      <div className="mt-[-10px] w-80 h-32 z-0 relative preserve-3d">
        <div className="w-full h-full bg-gradient-to-b from-yellow-700 via-yellow-500 to-yellow-950 rounded-t-[60px] border-x-[6px] border-t-[6px] border-black shadow-[0_25px_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center opacity-30 select-none">
               <div className="text-5xl font-black text-red-950 tracking-tighter -rotate-2 uppercase">XUÂN 2026</div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full -skew-x-[20deg] animate-shimmer"></div>
        </div>
        <div className="w-[110%] h-6 bg-red-950 -ml-[5%] rounded-b-2xl border-b-4 border-black shadow-2xl"></div>
      </div>
      
      <style>{`
        .preserve-3d { transform-style: preserve-3d; }
        @keyframes cage-spin {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
        .animate-cage-spin { animation: cage-spin 0.4s linear infinite; }
        @keyframes shimmer {
          0% { transform: translateX(-150%) skewX(-20deg); }
          100% { transform: translateX(250%) skewX(-20deg); }
        }
        .animate-shimmer { animation: shimmer 3s infinite linear; }
      `}</style>
    </div>
  );
};

export default MagneticCage;
