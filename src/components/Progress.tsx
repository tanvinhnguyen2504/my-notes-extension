export function Progress({ percent }: { percent: number }): React.JSX.Element {
  return (
    <div className="h-[3px] bg-track">
      <div
        id="progress"
        className="h-[3px] w-0 bg-teal transition-[width] duration-[220ms] ease-[ease]"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
