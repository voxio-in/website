/** 32px accent ring with a solid 10px accent dot at its centre. */
export default function Logo() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-accent">
      <div className="h-2.5 w-2.5 rounded-full bg-accent" />
    </div>
  );
}
