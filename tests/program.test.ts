import { describe, expect, it } from "vitest";
import { parseAmount, parseDur, parseProgram } from "../src/core/program";
import { parseRamp, rampAt } from "../src/core/ramp";
import { claudeInstructions, EXAMPLE_HOME, EXAMPLE_TREADMILL } from "../src/core/instructions";
import { example } from "./helpers";

describe("parseDur / parseAmount", () => {
  it("reads durations", () => {
    expect(parseDur("4:00")).toBe(240);
    expect(parseDur("45s")).toBe(45);
    expect(parseDur("5")).toBe(300);
    expect(parseDur("1,5 min")).toBe(90);
    expect(parseDur("1 min 30")).toBe(90);
  });
  it("reads repetitions", () => {
    expect(parseAmount("10 rép")).toEqual({ kind: "reps", reps: "10", extra: "" });
    expect(parseAmount("8 rép par côté")).toEqual({ kind: "reps", reps: "8", extra: "par côté" });
    expect(parseAmount("12 reps")).toEqual({ kind: "reps", reps: "12", extra: "" });
    expect(parseAmount("10x")).toEqual({ kind: "reps", reps: "10", extra: "" });
    expect(parseAmount("10 x")).toEqual({ kind: "reps", reps: "10", extra: "" });
    expect(parseAmount("10X")).toEqual({ kind: "reps", reps: "10", extra: "" });
    expect(parseAmount("10×")).toEqual({ kind: "reps", reps: "10", extra: "" });
    expect(parseAmount("12x par bras")).toEqual({ kind: "reps", reps: "12", extra: "par bras" });
    expect(parseAmount("10xyz")).toBeNull();
    expect(parseAmount("max")).toEqual({ kind: "reps", reps: "Max", extra: "" });
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("parseProgram", () => {
  it("reads the treadmill example as pasted (with --- and unicode minus)", () => {
    const p = parseProgram("---\n" + example("tapis-incline-35.txt"));
    expect(p.errors).toEqual([]);
    expect(p.title).toBe("Tapis incliné 35 min");
    expect(p.type).toBe("salle");
    expect(p.steps).toHaveLength(12);
    expect(p.est).toBe(35 * 60);
    expect(p.steps[1]).toMatchObject({ name: "Marche", kind: "time", dur: 240, infos: ["5,5 km/h", "7 %"], rep: { r: 1, n: 5 } });
    expect(p.steps[11].infos[0]).toBe("-0,5 km/h / 30 s");
    expect(p.steps[11].ramps[0]).toBeNull();
    expect(p.steps[11].isCooldown).toBe(true);
    expect(p.steps[0].ramps[0]).toMatchObject({ from: 4, to: 5.5, unit: "km/h", levels: 4 });
  });

  it("reads the home example (reps steps, rests, labels)", () => {
    const p = parseProgram(example("maison-pompes-gainage-corde.txt"));
    expect(p.errors).toEqual([]);
    expect(p.type).toBe("maison");
    expect(p.steps).toHaveLength(3 + 3 * 14 + 1);
    const pompes = p.steps[3];
    expect(pompes).toMatchObject({ kind: "reps", reps: "10", note: "garder 2-3 rép en réserve, souffler en poussant", infos: [] });
    expect(p.steps.filter((s) => s.isRest)).toHaveLength(1 + 3 * 7);
    const cordes = p.steps.filter((s) => s.name === "Corde").map((s) => s.label);
    expect(cordes).toEqual(["Corde (tour 1, 1re)", "Corde (tour 1, 2e)", "Corde (tour 2, 1re)", "Corde (tour 2, 2e)", "Corde (tour 3, 1re)", "Corde (tour 3, 2e)"]);
    expect(p.steps[p.steps.length - 1].isCooldown).toBe(true);
  });

  it("ignores code fences and comments, tolerates tabs", () => {
    const p = parseProgram("```\n# test\ntitre: T\n3x {\n\tA | 30s\n}\n```");
    expect(p.errors).toEqual([]);
    expect(p.steps).toHaveLength(3);
  });

  it("reports errors with line numbers", () => {
    const p = parseProgram("A | 30s\nB | ???\n}\nx2 {\nC | 10 rép");
    expect(p.errors).toHaveLength(3);
    expect(p.errors[0]).toMatch(/^Ligne 2/);
    expect(p.errors[1]).toMatch(/^Ligne 3/);
  });

  it("parses the examples embedded in the Claude instructions", () => {
    expect(parseProgram(EXAMPLE_TREADMILL).errors).toEqual([]);
    expect(parseProgram(EXAMPLE_HOME).errors).toEqual([]);
    expect(claudeInstructions()).toContain("Format FitPacer v1");
  });
});

describe("ramps", () => {
  it("parses supported units only", () => {
    expect(parseRamp("5,5 → 3 km/h")).toMatchObject({ from: 5.5, to: 3, levels: 6 });
    expect(parseRamp("2 -> 6 %")).toMatchObject({ from: 2, to: 6, levels: 9 });
    expect(parseRamp("4 km/h → 5 km/h")).toMatchObject({ from: 4, to: 5, unit: "km/h" });
    expect(parseRamp("niv 3 → 6")).toBeNull();
    expect(parseRamp("3 → 6 niv")).toMatchObject({ levels: 4 });
    expect(parseRamp("1 → 2 trucs")).toBeNull();
    expect(parseRamp("5,5 km/h")).toBeNull();
  });
  it("splits the step duration into equal levels", () => {
    const r = parseRamp("4 → 5,5 km/h")!;
    expect(rampAt(r, 0, 300)).toEqual({ level: 0, value: 4, nextAt: 75 });
    expect(rampAt(r, 80, 300)).toEqual({ level: 1, value: 4.5, nextAt: 150 });
    expect(rampAt(r, 299, 300)).toEqual({ level: 3, value: 5.5, nextAt: null });
    const d = parseRamp("5,5 → 3 km/h")!;
    expect(rampAt(d, 50, 300).value).toBe(5);
  });
});
