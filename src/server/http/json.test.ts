import { describe, expect, it } from "vitest";
import { parseJson } from "./json";

describe("parseJson", () => {
  it("正しいJSONを返す", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ name: "test" }),
    });
    await expect(parseJson(request)).resolves.toEqual({ name: "test" });
  });

  it("不正なJSONをbad_requestへ変換する", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: "{invalid",
    });
    await expect(parseJson(request)).rejects.toMatchObject({
      code: "bad_request",
      status: 400,
    });
  });
});
