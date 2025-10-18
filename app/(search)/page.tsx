import dynamic from "next/dynamic";
import React from "react";

const ChatInterface = dynamic(
  () => import("@/components/chat-interface").then((m) => m.ChatInterface),
  {
    ssr: true,
    loading: () => <div style={{ minHeight: 240 }} />,
  }
);

import { InstallPrompt } from "@/components/InstallPrompt";

const Home = () => (
  <React.Fragment>
    <ChatInterface />
    <InstallPrompt />
  </React.Fragment>
);

export default Home;
