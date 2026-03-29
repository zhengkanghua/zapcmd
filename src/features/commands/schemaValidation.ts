import type { RuntimeCommandFile } from "./runtimeTypes";
import { validateCommandSchema } from "./generated/commandSchemaValidator";
import { findRuntimeCommandFileBusinessRuleViolation } from "./schemaBusinessRules";
import { formatSchemaValidationError } from "./schemaErrorFormatter";

export type RuntimeCommandFileValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

export function validateRuntimeCommandFile(
  value: unknown
): RuntimeCommandFileValidationResult {
  if (!validateCommandSchema(value)) {
    return {
      valid: false,
      reason: formatSchemaValidationError(validateCommandSchema.errors)
    };
  }

  const runtimeCommandFile = value as RuntimeCommandFile;
  const businessRuleViolation = findRuntimeCommandFileBusinessRuleViolation(
    runtimeCommandFile
  );
  if (businessRuleViolation) {
    return {
      valid: false,
      reason: businessRuleViolation
    };
  }

  return { valid: true };
}

export function isRuntimeCommandFile(value: unknown): value is RuntimeCommandFile {
  return validateRuntimeCommandFile(value).valid;
}
