/**
 * Module: actionStage
 * Purpose: The stages an injection action moves through in the builder,
 *          shared by the network and UART builders.
 * Owner: Injection team
 */

export const ACTION_STAGE = {
  DRAFT: "draft",
  VALIDATING: "validating",
  VALID: "valid",
  INVALID: "invalid",
  EXECUTING: "executing",
  DONE: "done",
} as const;

export type ActionStage = (typeof ACTION_STAGE)[keyof typeof ACTION_STAGE];
