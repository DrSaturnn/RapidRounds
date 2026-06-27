import { getOpenAIClient } from "@/lib/openai";

export async function compareAnswerWithAI({
  stem,
  correctAnswer,
  acceptedAnswers,
  userAnswer
}: {
  stem: string;
  correctAnswer: string;
  acceptedAnswers: string[];
  userAnswer: string;
}) {
  const client = getOpenAIClient();

  if (!client) {
    return null;
  }

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You grade USMLE free-response answers. Return JSON only: {\"isCorrect\": boolean}. Mark correct only when the answer is clinically equivalent to the expected diagnosis or management."
      },
      {
        role: "user",
        content: JSON.stringify({
          stem,
          correctAnswer,
          acceptedAnswers,
          userAnswer
        })
      }
    ]
  });

  const content = response.choices[0]?.message.content;
  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content) as { isCorrect?: boolean };
    return typeof parsed.isCorrect === "boolean" ? parsed.isCorrect : null;
  } catch {
    return null;
  }
}
