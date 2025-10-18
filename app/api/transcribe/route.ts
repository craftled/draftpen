import { createOpenAI } from "@ai-sdk/openai";
import { experimental_transcribe as transcribe } from "ai";
import { type NextRequest, NextResponse } from "next/server";

const openai = createOpenAI();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
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

    console.log(result);

    return NextResponse.json({ text: result.text });
  } catch (error) {
    console.error("Error processing transcription request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
