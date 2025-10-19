import dynamic from "next/dynamic";

const ChatInterface = dynamic(
  () => import("@/components/chat-interface").then((m) => m.ChatInterface),
  {
    ssr: true,
    loading: () => <div style={{ minHeight: 240 }} />,
  }
);

import { InstallPrompt } from "@/components/InstallPrompt";

const Home = () => (
  <>
    <ChatInterface />
    <InstallPrompt />
  </>
);

export default Home;
