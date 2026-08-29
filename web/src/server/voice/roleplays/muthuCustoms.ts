// PORTED, not written here. This is tempp's
// src/lib/voice/roleplays\muthuCustoms.ts — the graph the running deployment
// sends — copied with two edits and no others:

import { buildVoiceCustoms, roleplayWebhook, STT_SONIOX_EN } from "./shared";
import {
  MUTHU_DEBRIEF_PROMPT,
  MUTHU_OPENING_FRAME,
  MUTHU_PROMPT,
  type MuthuFrame,
} from "./muthuPrompt";

export const MUTHU_FACES: { uuid: string; label: MuthuFrame; usage: string }[] =
  [
    {
      uuid: "11f6dbe7-797c-4a1b-8da1-12164c5dfeae",
      label: "main",
      usage:
        "default and idle — agitated, hostile, shouting. The session opens here.",
    },
    {
      uuid: "de60e205-5aff-49e4-809d-bd51679ed65c",
      label: "normal",
      usage:
        "guarded but no longer shouting — only once the officer has de-escalated him, and revertible.",
    },
  ];

/** Who the user is talking to, for every label the room puts on screen. */
export const MUTHU_NAME = "Mr Muthu";

export function buildMuthuCustoms(userName: string) {
  const systemPrompt = `${MUTHU_PROMPT}

— — —
THE PERSON IN FRONT OF YOU:
You are speaking out loud, on a live call, to an officer named ${userName}. They are the one refusing you more money. Use their name the way an angry man uses a name — to press them — never as small talk.`;

  return {
    "warmup-agent": true,
    "process-type": "stt-native",
    faces: MUTHU_FACES,
    agent_id: {
      workflow: {
        nodes: {
          ask_for_input: {
            type: "input",
            parameters: { input_variables: { user_input: "str" } },
            next: "transcription",
          },
          transcription: {
            type: "out",
            parameters: {
              variables: ["user_input"],
              interruption_type: "no",
              interruption_metadata: {},
            },
            next: "llm",
          },
          llm: {
            type: "llm",
            parameters: {
              input_variables: {
                user_input: {
                  type: "str",
                  description: "What the officer just said to Mr Muthu.",
                },
              },
              prompt_template: "base_llm",
              system_prompt: systemPrompt,
              service: "openrouter",
              model: "google/gemini-3.1-flash-lite-preview",
              history_key: "conversation_history",
              llm_return_type: {
                speak: {
                  type: "str",
                  description:
                    "Mr Muthu's next spoken line — abrupt, aggrieved, in character. Plain text, numbers written as words.",
                },
                frame: {
                  type: "str",
                  description:
                    "Which face Mr Muthu is wearing for this line. EXACTLY one of: \"main\" (the name of his ANGRY face — agitated, hostile, the default, and where the conversation starts) or \"normal\" (guarded but no longer shouting; use ONLY once the officer has genuinely de-escalated him, and switch straight back to \"main\" the moment they deflect, refuse, or read from a script). Required on every reply. Never any other word.",
                },
                end_session: {
                  type: "str",
                  description:
                    "Whether the meeting is now over. EXACTLY the lowercase word \"yes\" or the lowercase word \"no\" — never capitalised, never \"true\", never a sentence. \"no\" on almost every turn. \"yes\" ONLY once Mr Muthu is genuinely leaving, either because the officer got somewhere concrete with him or because he has given up on them and is walking out. Required on every reply.",
                },
              },
            },
            next: ["response", "judge_session_end"],
          },
          response: {
            type: "out",
            parameters: {
              variables: ["speak", "frame", "end_session"],
              interruption_type: "no",
              interruption_metadata: {},
            },
            next: "hold_frame",
          },
          hold_frame: {
            type: "out",
            parameters: {
              variables: ["frame"],
              interruption_type: "no",
              interruption_metadata: {},
            },
          },
          judge_session_end: {
            type: "conditional",
            parameters: {
              input_variables: { end_session: {} },
              mappings: {
                yes: "debrief",
                no: "ask_for_input",
              },
            },
          },
          debrief: {
            type: "llm",
            parameters: {
              input_variables: {
                conversation_history: {
                  type: "list",
                  description:
                    "The full transcript of the meeting between the officer and Mr Muthu.",
                },
              },
              prompt_template: "base_llm",
              system_prompt: MUTHU_DEBRIEF_PROMPT,
              service: "openrouter",
              model: "google/gemini-3.1-flash-lite-preview",
              history_key: "debrief_conversation_history",
              llm_return_type: {
                score: {
                  type: "str",
                  description:
                    "The officer's overall handling, zero to ten, as digits with at most one decimal place. The bare number only — no words, no \"/10\", no percent sign.",
                },
                feedback: {
                  type: "str",
                  description:
                    "A markdown table and nothing else, with the header row: | Criteria | Rating (1-10) | Brief justification | — one row per criterion, in the order given.",
                },
                summary: {
                  type: "str",
                  description:
                    "Markdown prose: a **What went well:** bulleted section followed by an **Areas for improvement:** bulleted section.",
                },
              },
            },
            next: "debrief_out",
          },
          debrief_out: {
            type: "out",
            parameters: {
              variables: ["score", "feedback", "summary"],
              interruption_type: "no",
              interruption_metadata: {},
            },
          },
        },
        variables: {
          user_input: { type: "str" },
          conversation_history: { type: "list", default: [] },
          speak: { type: "str" },
          frame: { type: "str", default: MUTHU_OPENING_FRAME },
          end_session: { type: "str", default: "no" },
          debrief_conversation_history: { type: "list", default: [] },
          score: { type: "str" },
          feedback: { type: "str" },
          summary: { type: "str" },
          node_type: { type: "str" },
        },
        start_node: "ask_for_input",
      },
      "webhook-url": roleplayWebhook(),
    },
    ...buildVoiceCustoms({
      ttsModel: "aura-2-odysseus-en",
      preFire: false,
      inactivityMessage:
        "Hello? You are still there or not? I'm sitting here waiting, you know!",
    }),
    stt_id: STT_SONIOX_EN,
  };
}
