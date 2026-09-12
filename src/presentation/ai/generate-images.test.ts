import { describe, expect, it } from "vitest";
import { dataUriFromImagePayload, imageRefFromPayload } from "./generate-images";

describe("image payload parsing", () => {
  it("reads Image API b64_json", () => {
    const asset = dataUriFromImagePayload({
      data: [{ b64_json: "abc123", media_type: "image/jpeg" }],
    });
    expect(asset).toEqual({
      mimeType: "image/jpeg",
      dataUri: "data:image/jpeg;base64,abc123",
    });
  });

  it("reads chat completion image data URIs", () => {
    const asset = dataUriFromImagePayload({
      choices: [
        {
          message: {
            images: [{ image_url: { url: "data:image/png;base64,xyz" } }],
          },
        },
      ],
    });
    expect(asset?.dataUri).toBe("data:image/png;base64,xyz");
  });

  it("extracts remote image URLs for later hydration", () => {
    const ref = imageRefFromPayload({
      data: [{ url: "https://cdn.example.com/scene.jpg" }],
    });
    expect(ref).toEqual({ url: "https://cdn.example.com/scene.jpg" });
    expect(dataUriFromImagePayload({ data: [{ url: "https://cdn.example.com/scene.jpg" }] })).toBeNull();
  });
});
