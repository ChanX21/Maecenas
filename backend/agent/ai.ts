import OpenAI from "openai";

export class AgentError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export async function generateStructured<T>(
  name: string,
  schema: Record<string, unknown>,
  system: string,
  input: unknown
): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AgentError("AI_NOT_CONFIGURED", "OPENAI_API_KEY is required for research", 503);

  try {
    const client = new OpenAI({ apiKey, timeout: 60_000 });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
      store: false,
      input: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(input) }
      ],
      text: {
        verbosity: "low",
        format: { type: "json_schema", name, strict: true, schema }
      }
    });
    if (!response.output_text) throw new Error("Model returned no structured output");
    return JSON.parse(response.output_text) as T;
  } catch (error) {
    if (error instanceof AgentError) throw error;
    throw new AgentError("AI_PROVIDER_ERROR", "The research model could not complete this request", 502);
  }
}
