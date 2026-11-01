import { describe, expect, it } from "vitest";
import { parseProgram } from "../src/core/program";
import {
  claudeInstructions, EXAMPLE_EXPORT, EXAMPLE_HOME, EXAMPLE_JOURNAL_HOME, EXAMPLE_JOURNAL_TREADMILL, EXAMPLE_SHORT, EXAMPLE_TREADMILL,
} from "../src/core/instructions";
import { exportExample, homeLine, treadmillLine } from "./examples-gen";

process.env.TZ = "Europe/Paris"; // the export shows local times

// The examples shown to Claude must be exactly what the app produces.
describe("examples in the Claude instructions", () => {
  it("are valid workouts", () => {
    for (const ex of [EXAMPLE_TREADMILL, EXAMPLE_HOME, EXAMPLE_SHORT]) expect(parseProgram(ex).errors).toEqual([]);
  });
  it("treadmill journal line: watch connected, one added pause", () => expect(treadmillLine()).toBe(EXAMPLE_JOURNAL_TREADMILL));
  it("home journal line: no watch, one skipped and one shortened step", () => expect(homeLine()).toBe(EXAMPLE_JOURNAL_HOME));
  it("export file, HR samples shortened", () => expect(exportExample()).toBe(EXAMPLE_EXPORT));
  it("are included in the instructions", () => {
    for (const ex of [EXAMPLE_JOURNAL_TREADMILL, EXAMPLE_JOURNAL_HOME, EXAMPLE_EXPORT]) expect(claudeInstructions()).toContain(ex);
  });
});
