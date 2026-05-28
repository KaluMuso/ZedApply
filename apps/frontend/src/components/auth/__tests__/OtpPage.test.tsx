import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OtpPage } from "../OtpPage";

function OtpPageHarness(
  props: Omit<React.ComponentProps<typeof OtpPage>, "otpCode" | "onOtpChange">,
) {
  const [otpCode, setOtpCode] = useState("");
  return <OtpPage {...props} otpCode={otpCode} onOtpChange={setOtpCode} />;
}

describe("OtpPage", () => {
  const baseProps = {
    phoneDigits: "971234567",
    email: "user@example.com",
    otpCode: "",
    otpChannel: "email" as const,
    loading: false,
    error: "",
    resendIn: 0,
    rememberDevice: true,
    onOtpChange: vi.fn(),
    onRememberChange: vi.fn(),
    onBack: vi.fn(),
    onResend: vi.fn(),
  };

  it("accepts a 6-digit OTP across boxes", () => {
    render(<OtpPageHarness {...baseProps} />);
    const boxes = screen.getAllByRole("textbox");
    expect(boxes).toHaveLength(6);
    fireEvent.change(boxes[0], { target: { value: "1" } });
    fireEvent.change(boxes[1], { target: { value: "2" } });
    fireEvent.change(boxes[2], { target: { value: "3" } });
    fireEvent.change(boxes[3], { target: { value: "4" } });
    fireEvent.change(boxes[4], { target: { value: "5" } });
    fireEvent.change(boxes[5], { target: { value: "6" } });
    expect(boxes[5]).toHaveValue("6");
  });

  it("strips non-numeric characters from OTP input", () => {
    render(<OtpPageHarness {...baseProps} />);
    const boxes = screen.getAllByRole("textbox");
    fireEvent.change(boxes[0], { target: { value: "a" } });
    expect(boxes[0]).toHaveValue("");
    fireEvent.change(boxes[0], { target: { value: "9" } });
    expect(boxes[0]).toHaveValue("9");
  });

  it("shows resend countdown when resendIn > 0", () => {
    render(<OtpPage {...baseProps} resendIn={15} />);
    expect(screen.getByText(/resend in 15s/i)).toBeInTheDocument();
  });

  it("calls onResend when resend is clicked and cooldown is zero", async () => {
    const user = userEvent.setup();
    const onResend = vi.fn();
    render(<OtpPage {...baseProps} resendIn={0} onResend={onResend} />);
    await user.click(screen.getByRole("button", { name: /resend code/i }));
    expect(onResend).toHaveBeenCalledTimes(1);
  });

  it("does not call onResend while cooldown is active", async () => {
    const user = userEvent.setup();
    const onResend = vi.fn();
    render(<OtpPage {...baseProps} resendIn={10} onResend={onResend} />);
    const resendBtn = screen.getByRole("button", { name: /resend in/i });
    expect(resendBtn).toBeDisabled();
    await user.click(resendBtn);
    expect(onResend).not.toHaveBeenCalled();
  });

  it("pastes a 6-digit code into all boxes", () => {
    render(<OtpPageHarness {...baseProps} />);
    const boxes = screen.getAllByRole("textbox");
    fireEvent.paste(boxes[0], {
      clipboardData: { getData: () => "654321" },
    });
    expect(boxes.map((b) => (b as HTMLInputElement).value).join("")).toBe("654321");
  });

  it("shows WhatsApp delivery copy when channel is whatsapp", () => {
    render(<OtpPage {...baseProps} otpChannel="whatsapp" />);
    expect(screen.getByText(/on whatsapp/i)).toBeInTheDocument();
    expect(screen.getByText(/\+260 971234567/)).toBeInTheDocument();
  });

  it("calls onRememberChange when trust-device checkbox toggles", async () => {
    const user = userEvent.setup();
    const onRememberChange = vi.fn();
    render(
      <OtpPage {...baseProps} rememberDevice={false} onRememberChange={onRememberChange} />,
    );
    await user.click(screen.getByRole("checkbox"));
    expect(onRememberChange).toHaveBeenCalledWith(true);
  });

  it("calls onBack when change number is clicked", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<OtpPage {...baseProps} onBack={onBack} />);
    await user.click(screen.getByRole("button", { name: /change number/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("shows verification error from parent", () => {
    render(<OtpPage {...baseProps} error="Invalid or expired code" />);
    expect(screen.getByText(/invalid or expired code/i)).toBeInTheDocument();
  });
});
