import { createOpenAI } from "@ai-sdk/openai";
import { experimental_transcribe as transcribe } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/env/server";

const openai = createOpenAI({
  apiKey: serverEnv.AI_GATEWAY_API_KEY,
  baseURL: "https://ai-gateway.vercel.sh/v1",
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 }
      );
    }

    const audio = formData.get("audio");

    if (!(audio && audio instanceof Blob)) {
      return NextResponse.json(
        { error: "No audio file found in form data." },
        { status: 400 }
      );
    }

    const result = await transcribe({
      model: openai.transcription("whisper-1"),
      audio: await audio.arrayBuffer(),
    });

    return NextResponse.json({ text: result.text });
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
