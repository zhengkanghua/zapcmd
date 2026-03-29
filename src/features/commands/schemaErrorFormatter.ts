import type { ErrorObject } from "ajv";

function decodeJsonPointerSegment(value: string): string {
  return value.replace(/~1/gu, "/").replace(/~0/gu, "~");
}

function formatInstancePath(instancePath: string): string {
  if (instancePath.length === 0) {
    return "";
  }

  return instancePath
    .split("/")
    .slice(1)
    .map((segment) => decodeJsonPointerSegment(segment))
    .reduce((path, segment) => {
      if (/^\d+$/u.test(segment)) {
        return `${path}[${segment}]`;
      }
      return path.length === 0 ? segment : `${path}.${segment}`;
    }, "");
}

function appendChildPath(basePath: string, child: string): string {
  return basePath.length === 0 ? child : `${basePath}.${child}`;
}

function normalizeErrorPath(error: ErrorObject): string {
  const basePath = formatInstancePath(error.instancePath);

  if (error.keyword === "required") {
    const missingProperty = String((error.params as { missingProperty?: unknown }).missingProperty ?? "");
    return appendChildPath(basePath, missingProperty);
  }

  if (error.keyword === "additionalProperties") {
    const property = String(
      (error.params as { additionalProperty?: unknown }).additionalProperty ?? ""
    );
    return appendChildPath(basePath, property);
  }

  return basePath;
}

function normalizeMessage(error: ErrorObject): string {
  if (error.keyword === "additionalProperties") {
    return "contains an unknown key.";
  }

  return error.message ?? "is invalid.";
}

export function formatSchemaValidationError(
  errors: ErrorObject[] | null | undefined
): string {
  const firstError = errors?.[0];
  if (!firstError) {
    return "Runtime command file is invalid.";
  }

  const path = normalizeErrorPath(firstError);
  const message = normalizeMessage(firstError);
  return path.length === 0 ? message : `${path} ${message}`;
}
