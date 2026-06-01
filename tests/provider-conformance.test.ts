import { describe, it, expect } from "vitest";
import { MockProvider } from "@/lib/providers/mock-provider";
import { ApiProvider } from "@/lib/providers/api-provider";
import { IngestionProvider } from "@/lib/providers/ingestion-provider";
import { NotImplementedError, type DataProvider } from "@/lib/providers/types";
import { EMPTY_FILTERS } from "@/lib/search/filters";

const METHODS: (keyof DataProvider)[] = [
  "searchCreators",
  "getCreator",
  "getAudienceReport",
  "getContent",
  "refreshAccount",
  "lookalikeByCreators",
  "lookalikeByBrands",
];

describe("DataProvider interface conformance", () => {
  const providers: DataProvider[] = [new MockProvider(), new ApiProvider(), new IngestionProvider()];

  for (const p of providers) {
    it(`${p.name} implements every DataProvider method`, () => {
      for (const m of METHODS) {
        expect(typeof p[m]).toBe("function");
      }
      expect(typeof p.name).toBe("string");
    });
  }

  it("ApiProvider stubs reject with NotImplementedError", async () => {
    const api = new ApiProvider();
    await expect(api.searchCreators(EMPTY_FILTERS)).rejects.toBeInstanceOf(NotImplementedError);
    await expect(api.getCreator("x")).rejects.toBeInstanceOf(NotImplementedError);
    await expect(api.lookalikeByCreators(["x"], 5)).rejects.toBeInstanceOf(NotImplementedError);
  });
});
