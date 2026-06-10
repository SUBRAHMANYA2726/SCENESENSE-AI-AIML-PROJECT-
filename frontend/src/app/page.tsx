import ChatInterface from "@/components/chat/ChatInterface";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col bg-background/90">
      <div className="animated-bg"></div>
      <ChatInterface />
    </main>
  );
}
