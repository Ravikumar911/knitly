"use client";

export default function Home() {
  const handleClick = () => {
    console.log("Button clicked");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div>
        <h1>Hello Knitly</h1>
        <button onClick={handleClick}>Click me</button>
      </div>
    </main>
  );
}
