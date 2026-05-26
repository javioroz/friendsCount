import { Group, Favor, Member } from '../types';
import { buildUserPrompt } from '../contexts/aiPrompt';

export interface LLMResponse {
  groupId: string;
  favorId: string;
  comment: string;
  score: Record<string, number>;
  nicknames: Record<string, string>;
}

/**
 * Call LLM API to evaluate a favor
 * Supports OpenAI-compatible APIs and custom endpoints
 */
export const callLLMForFavorEvaluation = async (
  group: Group,
  favor: Favor,
  member: Member
): Promise<LLMResponse> => {
  const apiKey = group.llmApiKey;
  const model = group.llmModel || 'gpt-4';
  const endpoint = group.llmEndpoint || 'https://api.openai.com/v1/chat/completions';

  if (!apiKey) {
    throw new Error('No API key configured for this group');
  }

  const systemPrompt = `Eres el juez sarcástico e ingenioso de un grupo de amigos que usa FriendsCount para gestionar gastos y favores.
Tu trabajo es:
1. Comentar con humor y sarcasmo cada favor que alguien hace para el grupo
2. Otorgarle una puntuación desde -10 hasta +10 puntos a cada favor según su importancia e impacto en el grupo
3. Asignar motes creativos y cambiantes a cada miembro basándote en su historial de favores

REGLAS DE PUNTUACION:
- La puntuación de un favor debe ser proporcional al impacto real del favor
- Un favor enorme que afecte a todo el grupo puede dar de +9 a +10 puntos al que lo hizo
- Un favor grande que afecte a todos o uno enorme que afecte a unos pocos miembros: de +6 a +8
- Un favor mediocre: de +1 a +5
- Un favor minúsculo hecho sólo para ganar reconocimiento da 0 o -1 puntos
- Un "favor" que en realidad es egoísta o molesto: da puntos negativos de -1 a -4
- Un comportamiento egoísta o pasivo reiterado, da puntos negativos de -5 a -6
- Un acto puntual que perjudica al grupo de forma importante, da puntos negativos de -7 a -8
- Un acto deliberado o reiterado que perjudica al grupo de forma grave, da puntos negativos de -9 a -10
- Los demás miembros pueden recibir pequeños ajustes si el favor les beneficia o perjudica

FORMATO DE RESPUESTA:
Debes responder SIEMPRE con un JSON válido y nada más, con esta estructura exacta:
{
  "groupId": "group_1234567890",
  "favorId": "favor_1234567890",
  "comment": "comentario ingenioso sobre el favor (2-3 frases, en español)",
  "score": {
    "memberId": <número entero de -10 a +10>
  },
  "nicknames": {
    "memberId": "<mote creativo>"
  }
}

No incluyas ningún texto fuera del JSON. No uses markdown. Solo JSON puro.`;

  const userPrompt = buildUserPrompt(group, favor, member.name);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Parse the response - handle different API formats
    let content: string;
    if (data.choices && data.choices[0] && data.choices[0].message) {
      content = data.choices[0].message.content;
    } else if (data.result) {
      content = data.result;
    } else {
      throw new Error('Unexpected response format from LLM API');
    }

    // Parse the JSON response from the LLM
    let llmResponse: LLMResponse;
    try {
      llmResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse LLM response as JSON:', content);
      throw new Error('LLM returned invalid JSON');
    }

    // Validate the response structure
    if (!llmResponse.groupId || !llmResponse.favorId || !llmResponse.comment) {
      throw new Error('LLM response missing required fields');
    }

    return llmResponse;
  } catch (error) {
    console.error('Error calling LLM API:', error);
    throw error;
  }
};

/**
 * Check if a group has LLM configuration
 */
export const hasLLMConfig = (group: Group): boolean => {
  return Boolean(group.llmApiKey);
};