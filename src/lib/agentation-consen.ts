import type { Annotation } from 'agentation';

export type ConsenAgentationContext = {
  workspace_id: string;
  project_id: string;
  task_id: string;
  chat_id: string;
  site_id?: string;
};

type RawPayload = Record<string, unknown>;

type NormalizedAnnotation = {
  id: string;
  comment: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeAnnotation(value: unknown): NormalizedAnnotation | null {
  if (!isRecord(value)) {
    return null;
  }

  const rawId = value.id;
  const rawComment = value.comment;

  if (typeof rawId !== 'string' || rawId.length === 0) {
    return null;
  }

  return {
    id: rawId,
    comment: typeof rawComment === 'string' ? rawComment : '',
  };
}

function normalizeAnnotations(value: unknown): NormalizedAnnotation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((annotation) => normalizeAnnotation(annotation))
    .filter((annotation): annotation is NormalizedAnnotation => annotation !== null);
}

function normalizeTimestamp(value: unknown): string {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return String(Date.now());
}

function normalizeUrl(value: unknown, currentUrl: string): string {
  return typeof value === 'string' && value.length > 0 ? value : currentUrl;
}

export function createConsenAgentationContext(currentUrl: string): ConsenAgentationContext {
  return {
    workspace_id: import.meta.env.VITE_AGENTATION_WORKSPACE_ID ?? 'ws_01kf0b8vzse7rb8tf8s2r1sgxj',
    project_id: import.meta.env.VITE_AGENTATION_PROJECT_ID ?? 'prj_01kp7njnewfm6bbzdaew554ydd',
    task_id: import.meta.env.VITE_AGENTATION_TASK_ID ?? 'tsk_01kp7nmabtfyb93dshv7zwahmx',
    chat_id: import.meta.env.VITE_AGENTATION_CHAT_ID ?? 'chat_01kp7nentvedfr6q52d1p00f1h',
    site_id: import.meta.env.VITE_AGENTATION_SITE_ID ?? new URL(currentUrl).origin,
  };
}

export function buildConsenAgentationPayload(
  rawValue: unknown,
  context: ConsenAgentationContext,
  currentUrl: string,
): Record<string, unknown> {
  const payload: RawPayload = isRecord(rawValue) ? rawValue : {};
  const event = typeof payload.event === 'string' && payload.event.length > 0 ? payload.event : 'submit';

  const basePayload: Record<string, unknown> = {
    event,
    timestamp: normalizeTimestamp(payload.timestamp),
    url: normalizeUrl(payload.url, currentUrl),
    workspace_id: context.workspace_id,
    project_id: context.project_id,
    task_id: context.task_id,
    chat_id: context.chat_id,
    site_id: context.site_id,
  };

  if (event === 'submit') {
    return {
      ...basePayload,
      output: typeof payload.output === 'string' ? payload.output : '',
      annotations: normalizeAnnotations(payload.annotations),
    };
  }

  if (event.startsWith('annotation.')) {
    const annotation = normalizeAnnotation(payload.annotation);
    if (annotation) {
      return {
        ...basePayload,
        annotation,
      };
    }
  }

  if (event === 'annotations.clear') {
    return {
      ...basePayload,
      annotations: normalizeAnnotations(payload.annotations),
    };
  }

  return basePayload;
}

export async function extractRequestBodyText(input: RequestInfo | URL, init?: RequestInit): Promise<string | undefined> {
  if (typeof init?.body === 'string') {
    return init.body;
  }

  if (init?.body instanceof URLSearchParams) {
    return init.body.toString();
  }

  if (input instanceof Request) {
    return input.clone().text();
  }

  return undefined;
}

export function parseRequestJson(bodyText?: string): unknown {
  if (!bodyText) {
    return {};
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    return {};
  }
}

export type { Annotation };
