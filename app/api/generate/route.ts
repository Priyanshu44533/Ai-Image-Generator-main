// app/api/generate/route.ts
import { NextResponse } from "next/server";
import axios from "axios";
import FormData from "form-data";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "A prompt is required." }, { status: 400 });
    }

    const payload = {
      prompt: prompt,
      output_format: "webp",
    };

    const formData = new FormData();
    formData.append("prompt", payload.prompt);
    formData.append("output_format", payload.output_format);

    const response = await axios.post(
      "https://api.stability.ai/v2beta/stable-image/generate/core",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
          Accept: "image/*",
        },
        responseType: "arraybuffer",
      }
    );

    const base64Image = Buffer.from(response.data).toString("base64");
    return NextResponse.json({ image: `data:image/webp;base64,${base64Image}` });
  } catch (error: any) {
    console.error("Stability API Error:", error.response?.data || error.message);
    return NextResponse.json(
      { error: error.response?.data?.message || "Failed to generate image" },
      { status: 500 }
    );
  }
}