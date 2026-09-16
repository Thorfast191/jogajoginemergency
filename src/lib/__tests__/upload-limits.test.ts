import { describe, it, expect } from "vitest";
import {
  ACTION_BODY_LIMIT_BYTES,
  MAX_IMAGE_BYTES,
  MAX_THEME_ART_BYTES,
  blockOversizeSubmit,
  firstOversize,
  oversizeMessage,
} from "../upload-limits";

const MB = 1024 * 1024;

describe("upload limits", () => {
  it("the action body cap leaves room above the largest upload", () => {
    // Otherwise the framework, not the app, refuses an allowed file.
    expect(ACTION_BODY_LIMIT_BYTES).toBeGreaterThan(MAX_THEME_ART_BYTES);
    expect(ACTION_BODY_LIMIT_BYTES).toBeGreaterThan(MAX_IMAGE_BYTES);
    expect(ACTION_BODY_LIMIT_BYTES - MAX_THEME_ART_BYTES).toBeGreaterThanOrEqual(64 * 1024);
  });

  it("says the limit in megabytes", () => {
    expect(oversizeMessage(MAX_IMAGE_BYTES)).toBe("Image is larger than 5 MB.");
    expect(oversizeMessage(MAX_THEME_ART_BYTES)).toBe("Image is larger than 10 MB.");
  });

  it("accepts files at or under the limit", () => {
    expect(firstOversize([], MAX_IMAGE_BYTES)).toBeNull();
    expect(firstOversize([2.6 * MB, MAX_IMAGE_BYTES], MAX_IMAGE_BYTES)).toBeNull();
  });

  it("flags a file over the limit", () => {
    expect(firstOversize([1, MAX_IMAGE_BYTES + 1], MAX_IMAGE_BYTES)).toBe("Image is larger than 5 MB.");
  });
});

describe("blockOversizeSubmit", () => {
  const formWith = (...sizes: number[]) => {
    let prevented = false;
    const input = { files: sizes.map((size) => ({ size })) };
    const event = {
      currentTarget: { querySelectorAll: () => [input] } as unknown as HTMLFormElement,
      preventDefault: () => {
        prevented = true;
      },
    };
    return { event, prevented: () => prevented };
  };

  it("cancels the submission and explains when a file is too big", () => {
    const f = formWith(6 * MB);
    expect(blockOversizeSubmit(f.event, MAX_IMAGE_BYTES)).toBe("Image is larger than 5 MB.");
    expect(f.prevented()).toBe(true);
  });

  it("lets a normal photo through untouched", () => {
    const f = formWith(2.6 * MB);
    expect(blockOversizeSubmit(f.event, MAX_IMAGE_BYTES)).toBeNull();
    expect(f.prevented()).toBe(false);
  });
});
