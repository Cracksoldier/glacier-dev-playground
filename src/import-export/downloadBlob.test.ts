import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { triggerBlobDownload } from "./downloadBlob";

describe("triggerBlobDownload", () => {
  let createObjectURL: ReturnType<typeof vi.fn<(obj: Blob) => string>>;
  let revokeObjectURL: ReturnType<typeof vi.fn<(url: string) => void>>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => "blob:mock-url");
    revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an object URL for the blob and sets it as the anchor's href/download, then clicks it", () => {
    const blob = new Blob(["content"], { type: "application/json" });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    triggerBlobDownload(blob, "my-file.json");

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    clickSpy.mockRestore();
  });

  it("revokes the object URL after triggering the download", () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    triggerBlobDownload(new Blob(["x"]), "file.txt");

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("does not leave the anchor element attached to the document", () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    triggerBlobDownload(new Blob(["x"]), "file.txt");

    expect(document.querySelector("a[download]")).toBeNull();
  });
});
