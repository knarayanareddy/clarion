import OpenAI from 'openai';
import { UserProfile } from './profiles';

// API keys: OPENROUTER_API_KEYS (comma-separated, rotated on quota/auth
// exhaustion) takes precedence over the single OPENAI_API_KEY.
function getApiKeys(): string[] {
  const multi = (process.env.OPENROUTER_API_KEYS || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);
  if (multi.length > 0) return multi;
  return process.env.OPENAI_API_KEY ? [process.env.OPENAI_API_KEY] : [];
}

let keyIndex = 0;
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    const keys = getApiKeys();
    if (keys.length === 0) {
      throw new Error('OPENROUTER_API_KEYS or OPENAI_API_KEY missing — app must fail closed');
    }
    _openai = new OpenAI({
      apiKey: keys[keyIndex % keys.length],
      ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
    });
  }
  return _openai;
}

function isKeyExhaustedError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === 401 || status === 402 || status === 403) return true;
  const msg = (err as Error)?.message?.toLowerCase() || '';
  return msg.includes('quota') || msg.includes('credit') || msg.includes('payment');
}

type ChatParams = Omit<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming, 'model'>;

// Runs a chat completion, rotating to the next API key when the current one
// is exhausted (auth/quota/credit errors). Tries each key at most once.
async function createChatCompletion(params: ChatParams): Promise<OpenAI.Chat.ChatCompletion> {
  const keys = getApiKeys();
  let lastErr: unknown;
  for (let attempt = 0; attempt < Math.max(keys.length, 1); attempt++) {
    try {
      return await getOpenAI().chat.completions.create({ model: MODEL, ...params });
    } catch (err) {
      lastErr = err;
      if (!isKeyExhaustedError(err) || keys.length < 2) throw err;
      keyIndex = (keyIndex + 1) % keys.length;
      _openai = null;
      console.warn(`LLM key exhausted; rotating to key ${keyIndex + 1}/${keys.length}`);
    }
  }
  throw lastErr;
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

export interface SimplifyResult {
  tldr: string;
  plainVersion: string;
  actions: string[];
  jargon: string[];
}

export interface DescribeResult {
  altText: string;
  detailedDescription: string;
}

export interface AcronymResult {
  definition: string;
  isWorkspaceSpecific: boolean;
  sourcePermalink?: string;
}

// Centralized prompts — parameterized by profile
function getSystemPrompt(profile: UserProfile): string {
  const style = profile.readingPreference;
  let styleInstruction = '';
  if (style === 'plain language') {
    styleInstruction = 'Use simple, clear, everyday language. Avoid jargon. Short sentences.';
  } else if (style === 'bullet summaries') {
    styleInstruction = 'Use concise bullet points. Maximum 5 bullets. Focus on key points only.';
  } else {
    styleInstruction = 'Preserve original style and tone as much as possible while making it accessible.';
  }

  const acronymInstr = profile.expandAcronyms
    ? 'Identify and list all acronyms, jargon, or domain terms.'
    : '';

  return `You are Clarion, an accessibility assistant. Your job is to make Slack content accessible for people who are deaf/HoH, low-vision, dyslexic, ESL, or neurodivergent.

User profile preferences:
- Reading style: ${styleInstruction}
- Expand acronyms: ${profile.expandAcronyms ? 'Yes' : 'No'}

Rules:
- Be empathetic and precise.
- Never invent facts.
- For any image descriptions (if vision): describe ONLY what is visible in the image. State uncertainty explicitly. Include legible text, numbers, and labels exactly as shown.
- ${acronymInstr}
`;
}

export async function simplifyText(
  threadText: string,
  profile: UserProfile
): Promise<SimplifyResult> {
  if (getApiKeys().length === 0) {
    throw new Error('OPENROUTER_API_KEYS or OPENAI_API_KEY missing — app must fail closed');
  }

  const system = getSystemPrompt(profile);

  const userPrompt = `Here is a Slack message thread (most recent last):

${threadText}

Return ONLY valid JSON:
{
  "tldr": "≤2 sentence plain summary",
  "plainVersion": "full accessible rewrite",
  "actions": ["action 1", "action 2"],
  "jargon": ["NRR", "EOD"]
}`;

  const completion = await createChatCompletion({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1200,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('No LLM response');

  try {
    const parsed = JSON.parse(content);
    return {
      tldr: parsed.tldr || 'Summary unavailable.',
      plainVersion: parsed.plainVersion || threadText,
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      jargon: Array.isArray(parsed.jargon) ? parsed.jargon : [],
    };
  } catch {
    return {
      tldr: 'Summary: ' + threadText.slice(0, 140),
      plainVersion: threadText,
      actions: [],
      jargon: [],
    };
  }
}

export async function describeImage(
  imageUrl: string,
  profile: UserProfile
): Promise<DescribeResult> {
  if (getApiKeys().length === 0) throw new Error('OPENROUTER_API_KEYS or OPENAI_API_KEY required');

  // Vision call
  const response = await createChatCompletion({
    messages: [
      {
        role: 'system',
        content: `You are Clarion's vision accessibility assistant.
Describe ONLY what is visible in the image.
- Provide a concise alt text (≤1 sentence)
- Provide a detailed description
- Include every legible number, label, text, chart value exactly.
- State uncertainty if anything is unclear.
- Never guess or hallucinate content outside the image.`
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Describe this image for accessibility.'
          },
          {
            type: 'image_url',
            image_url: { url: imageUrl }
          }
        ]
      }
    ],
    max_tokens: 800,
    temperature: 0.2
  });

  const text = response.choices[0]?.message?.content || 'Image description unavailable.';
  
  // Split heuristically
  const lines = text.split('\n').filter(Boolean);
  const altText = lines[0] || 'Chart or image posted.';
  const detailed = lines.slice(1).join('\n') || text;

  return {
    altText: altText.slice(0, 200),
    detailedDescription: detailed
  };
}

export async function answerWithContext(
  question: string,
  contextSnippets: string[],
  profile: UserProfile
): Promise<string> {
  const system = getSystemPrompt(profile) + '\nUse the provided workspace context snippets. Cite them explicitly if used.\nAnswer in plain Slack-formatted text (mrkdwn). Do NOT return JSON or code blocks.';

  const prompt = `Question: ${question}

Workspace context:
${contextSnippets.join('\n\n---\n\n') || '(no relevant workspace results)'}

Answer at the user's preferred reading level.`;

  const completion = await createChatCompletion({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt }
    ],
    max_tokens: 700,
    temperature: 0.4
  });

  return completion.choices[0]?.message?.content || 'Sorry, I could not generate an answer right now.';
}

export async function generalDefine(term: string): Promise<string> {
  const completion = await createChatCompletion({
    messages: [
      { role: 'system', content: 'You are a helpful glossary assistant. Give a short definition. If ambiguous, note that.' },
      { role: 'user', content: `What does "${term}" mean?` }
    ],
    max_tokens: 120
  });
  return completion.choices[0]?.message?.content || `General meaning of ${term} not available.`;
}
