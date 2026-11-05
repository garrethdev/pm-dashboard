import { describe, expect, it } from "vitest";
import { encodeKey, signV4 } from "./r2";

describe("signV4", () => {
  it("matches Amazon's published GET Object example", () => {
    // docs.aws.amazon.com, "Authenticating Requests: Using the Authorization Header", Example: GET Object.
    const auth = signV4({
      method: "GET",
      host: "examplebucket.s3.amazonaws.com",
      path: "/test.txt",
      headers: { range: "bytes=0-9", "x-amz-content-sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "x-amz-date": "20130524T000000Z" },
      region: "us-east-1",
      service: "s3",
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    });
    expect(auth).toBe("AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41");
  });
});

describe("encodeKey", () => {
  it("encodes each part and keeps the slashes", () => {
    expect(encodeKey("character-6/a b(1).jpg")).toBe("character-6/a%20b%281%29.jpg");
  });
});
