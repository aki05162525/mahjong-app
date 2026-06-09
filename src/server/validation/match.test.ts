import { describe, it, expect } from "vitest";
import { parseCreateMatch } from "./match";

const validInput = {
  tournamentId: "00000000-0000-4000-8000-000000000001",
  ruleId: "00000000-0000-4000-8000-000000000002",
  roundNumber: 1,
  inputs: [
    { playerId: "00000000-0000-4000-8000-000000000011", score: 40000 },
    { playerId: "00000000-0000-4000-8000-000000000012", score: 30000 },
    { playerId: "00000000-0000-4000-8000-000000000013", score: 20000 },
    { playerId: "00000000-0000-4000-8000-000000000014", score: 10000 },
  ],
};

describe("parseCreateMatch", () => {
  it("正常な入力はそのまま返す", () => {
    const result = parseCreateMatch(validInput);
    expect(result.tournamentId).toBe(validInput.tournamentId);
    expect(result.inputs).toHaveLength(4);
  });

  it("tableId が省略されても通る", () => {
    expect(() => parseCreateMatch(validInput)).not.toThrow();
  });

  it("tableId が null でも通る", () => {
    expect(() => parseCreateMatch({ ...validInput, tableId: null })).not.toThrow();
  });

  it("tableId が UUID でも通る", () => {
    expect(() =>
      parseCreateMatch({ ...validInput, tableId: "00000000-0000-4000-8000-000000000099" })
    ).not.toThrow();
  });

  it("tournamentId が空文字なら badRequest を throw する", () => {
    expect(() => parseCreateMatch({ ...validInput, tournamentId: "" })).toThrow();
  });

  it("roundNumber が 0 なら badRequest を throw する", () => {
    expect(() => parseCreateMatch({ ...validInput, roundNumber: 0 })).toThrow();
  });

  it("roundNumber が小数なら badRequest を throw する", () => {
    expect(() => parseCreateMatch({ ...validInput, roundNumber: 1.5 })).toThrow();
  });

  it("inputs が 3 件なら badRequest を throw する", () => {
    expect(() =>
      parseCreateMatch({ ...validInput, inputs: validInput.inputs.slice(0, 3) })
    ).toThrow();
  });

  it("inputs が 5 件なら badRequest を throw する", () => {
    const extraInput = { playerId: "00000000-0000-4000-8000-000000000015", score: 0 };
    expect(() =>
      parseCreateMatch({ ...validInput, inputs: [...validInput.inputs, extraInput] })
    ).toThrow();
  });

  it("playerId が UUID でなければ badRequest を throw する", () => {
    const badInputs = [{ playerId: "not-a-uuid", score: 40000 }, ...validInput.inputs.slice(1)];
    expect(() => parseCreateMatch({ ...validInput, inputs: badInputs })).toThrow();
  });

  it("score が小数なら badRequest を throw する", () => {
    const badInputs = [{ ...validInput.inputs[0], score: 1.5 }, ...validInput.inputs.slice(1)];
    expect(() => parseCreateMatch({ ...validInput, inputs: badInputs })).toThrow();
  });

  it("throw したエラーは status 400 を持つ", () => {
    expect.assertions(1);
    try {
      parseCreateMatch({});
    } catch (e: unknown) {
      expect((e as { status: number }).status).toBe(400);
    }
  });
});
