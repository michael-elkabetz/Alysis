const BackgroundEffects = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <div
        className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full"
        style={{
          background:
            "radial-gradient(circle, hsl(35 50% 80% / 0.4) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <div
        className="absolute top-[30%] -right-[10%] w-[40%] h-[40%] rounded-full"
        style={{
          background:
            "radial-gradient(circle, hsl(353 53% 31% / 0.06) 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />

      <div
        className="absolute -bottom-[10%] left-[20%] w-[60%] h-[30%] rounded-full"
        style={{
          background:
            "radial-gradient(circle, hsl(30 27% 66% / 0.15) 0%, transparent 70%)",
          filter: "blur(120px)",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to right, hsl(30 27% 66% / 0.08) 1px, transparent 1px),
                           linear-gradient(to bottom, hsl(30 27% 66% / 0.08) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, hsl(30 27% 66% / 0.4), transparent)",
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default BackgroundEffects;
