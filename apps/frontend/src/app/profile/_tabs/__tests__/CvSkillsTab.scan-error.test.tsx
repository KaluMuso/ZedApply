import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const uploadMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => {
  class ApiError extends Error {
    status: number;
    detail: string;
    code?: string;
    constructor(status: number, detail: string, code?: string) {
      super(detail);
      this.name = "ApiError";
      this.status = status;
      this.detail = detail;
      this.code = code;
    }
  }
  return {
    ApiError,
    cv: { upload: uploadMock },
  };
});

import { ApiError } from "@/lib/api";
import { CvSkillsTab } from "../CvSkillsTab";

describe("CvSkillsTab image-scanned PDF error", () => {
  it("shows friendly message and How to fix guidance", async () => {
    uploadMock.mockRejectedValueOnce(
      new ApiError(
        422,
        "We couldn't read text from this PDF — it looks like a scanned image. Please re-upload an OCR'd or text-based PDF.",
        "image_scanned_pdf"
      )
    );

    render(
      <CvSkillsTab
        token="test-token"
        profileData={{
          cv_uploaded: false,
          skills: [],
          cv_sections: null,
        }}
        onUploaded={() => {}}
      />
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "scan.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/couldn't read text from this PDF/i)).toBeInTheDocument();
    });

    const fixBtn = screen.getByRole("button", { name: /how to fix/i });
    fireEvent.click(fixBtn);
    expect(screen.getByText(/Re-export your CV from Word/i)).toBeInTheDocument();
  });
});
