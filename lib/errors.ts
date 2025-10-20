export type ErrorType =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limit"
  | "upgrade_required"
  | "subscription_required"
  | "model_restricted"
  | "offline";

export type Surface =
  | "chat"
  | "auth"
  | "api"
  | "stream"
  | "database"
  | "history"
  | "model";

export type ErrorCode = `${ErrorType}:${Surface}`;

export type ErrorVisibility = "response" | "log" | "none";

export const visibilityBySurface: Record<Surface, ErrorVisibility> = {
  database: "log",
  chat: "response",
  auth: "response",
  stream: "response",
  api: "response",
  history: "response",
  model: "response",
};

export class ChatSDKError extends Error {
  public type: ErrorType;
  public surface: Surface;
  public statusCode: number;

  constructor(errorCode: ErrorCode, cause?: string) {
    super();

    const [type, surface] = errorCode.split(":");

    this.type = type as ErrorType;
    this.cause = cause;
    this.surface = surface as Surface;
    this.message = getMessageByErrorCode(errorCode);
    this.statusCode = getStatusCodeByType(this.type);
  }

  public toResponse() {
    const code: ErrorCode = `${this.type}:${this.surface}`;
    const visibility = visibilityBySurface[this.surface];

    const { message, cause, statusCode } = this;

    if (visibility === "log") {
      return Response.json(
        { code: "", message: "Something went wrong. Please try again later." },
        { status: statusCode }
      );
    }

    return Response.json({ code, message, cause }, { status: statusCode });
  }
}

export function getMessageByErrorCode(errorCode: ErrorCode): string {
  if (errorCode.includes("database")) {
    return "An error occurred while executing a database query.";
  }

  switch (errorCode) {
    case "bad_request:api":
      return "The request couldn't be processed. Please check your input and try again.";
    case "rate_limit:api":
      return "You have reached your daily limit for this feature. Upgrade to Pro for unlimited access.";

    case "unauthorized:auth":
      return "You need to sign in before continuing.";
    case "forbidden:auth":
      return "Your account does not have access to this feature.";
    case "upgrade_required:auth":
      return "An active subscription is required. Start your 7-day free trial to continue.";
    case "subscription_required:auth":
      return "An active subscription is required. Start your 7-day free trial to access all features.";

    case "rate_limit:chat":
      return "You have exceeded your maximum number of messages for the day. Please try again later.";
    case "upgrade_required:chat":
      return "Start your 7-day free trial for unlimited searches.";
    case "not_found:chat":
      return "The requested chat was not found. Please check the chat ID and try again.";
    case "forbidden:chat":
      return "This chat belongs to another user. Please check the chat ID and try again.";
    case "unauthorized:chat":
      return "You need to sign in to view this chat. Please sign in and try again.";
    case "offline:chat":
      return "We're having trouble sending your message. Please check your internet connection and try again.";

    case "unauthorized:model":
      return "Sign in and start your 7-day free trial to access AI models.";
    case "forbidden:model":
      return "An active subscription is required to use this AI model.";
    case "model_restricted:model":
      return "Start your 7-day free trial to access this AI model.";
    case "upgrade_required:model":
      return "Start your 7-day free trial to access premium AI models.";
    case "rate_limit:model":
      return "Start your 7-day free trial for unlimited access.";

    case "forbidden:api":
      return "Access denied";

    default:
      return "Something went wrong. Please try again later.";
  }
}

function getStatusCodeByType(type: ErrorType) {
  switch (type) {
    case "bad_request":
      return 400;
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    case "rate_limit":
      return 429;
    case "upgrade_required":
      return 402; // Payment Required
    case "model_restricted":
      return 403;
    case "offline":
      return 503;
    default:
      return 500;
  }
}

// Utility functions for error handling
export function isAuthError(error: ChatSDKError): boolean {
  return error.surface === "auth";
}

export function isUpgradeRequiredError(error: ChatSDKError): boolean {
  return error.type === "upgrade_required";
}

export function isModelError(error: ChatSDKError): boolean {
  return error.surface === "model";
}

export function isSignInRequired(error: ChatSDKError): boolean {
  return (
    error.type === "unauthorized" &&
    (error.surface === "auth" ||
      error.surface === "chat" ||
      error.surface === "model")
  );
}

export function isProRequired(error: ChatSDKError): boolean {
  return (
    error.type === "upgrade_required" ||
    error.type === "forbidden" ||
    error.type === "model_restricted"
  );
}

export function isRateLimited(error: ChatSDKError): boolean {
  return error.type === "rate_limit";
}

// Helper function to get error action suggestions
export function getErrorActions(error: ChatSDKError): {
  primary?: { label: string; action: string };
  secondary?: { label: string; action: string };
} {
  if (isSignInRequired(error)) {
    return {
      primary: { label: "Sign In", action: "signin" },
      secondary: { label: "Try Again", action: "retry" },
    };
  }

  if (isProRequired(error)) {
    return {
      primary: { label: "Upgrade to Pro", action: "upgrade" },
      secondary: { label: "Check Again", action: "refresh" },
    };
  }

  if (isRateLimited(error)) {
    return {
      primary: { label: "Upgrade to Pro", action: "upgrade" },
      secondary: { label: "Try Again Later", action: "retry" },
    };
  }

  return {
    primary: { label: "Try Again", action: "retry" },
  };
}

// Helper function to get error icon type
export function getErrorIcon(
  error: ChatSDKError
): "warning" | "error" | "upgrade" | "auth" {
  if (isSignInRequired(error)) {
    return "auth";
  }
  if (isProRequired(error) || isRateLimited(error)) {
    return "upgrade";
  }
  if (error.type === "offline") {
    return "warning";
  }
  return "error";
}
