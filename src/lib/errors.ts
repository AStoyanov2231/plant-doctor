import { NextResponse } from "next/server";

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "RATE_LIMITED"
  | "BAD_INPUT"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "UPSTREAM_PLANTNET"
  | "UPSTREAM_FLORA"
  | "UPSTREAM_GEMINI"
  | "INTERNAL";

const HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  RATE_LIMITED: 429,
  BAD_INPUT: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UPSTREAM_PLANTNET: 502,
  UPSTREAM_FLORA: 502,
  UPSTREAM_GEMINI: 502,
  INTERNAL: 500,
};

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toResponse(err: unknown): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message } },
      { status: HTTP_STATUS[err.code] }
    );
  }
  console.error("[plant-doctor] unhandled error", err);
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "An unexpected error occurred" } },
    { status: 500 }
  );
}

type RouteHandler = (
  req: Request,
  ctx: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return toResponse(err);
    }
  };
}
