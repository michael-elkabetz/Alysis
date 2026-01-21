const BackgroundEffects = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <div
        className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-effect-primary"
      />

      <div
        className="absolute top-[30%] -right-[10%] w-[40%] h-[40%] rounded-full bg-effect-secondary"
      />

      <div
        className="absolute -bottom-[10%] left-[20%] w-[60%] h-[30%] rounded-full bg-effect-tertiary"
      />

      <div
        className="absolute inset-0 bg-grid-pattern"
      />

      <div
        className="absolute top-0 left-0 right-0 h-px bg-divider-line"
      />

      <div
        className="absolute inset-0 opacity-[0.02] bg-noise-overlay"
      />
    </div>
  );
};

export default BackgroundEffects;
