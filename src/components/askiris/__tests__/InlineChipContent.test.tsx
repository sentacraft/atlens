// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { InlineChipContent } from "../InlineChipContent";

afterEach(cleanup);

describe("InlineChipContent", () => {
  it("binds the icon to the final word when there is whitespace", () => {
    const { container } = render(<InlineChipContent icon={<svg data-icon />}>About Atlens</InlineChipContent>);
    expect(container.textContent).toBe("About Atlens");
    const tail = container.querySelector(".whitespace-nowrap");
    expect(tail?.textContent).toBe("Atlens");
    expect(tail?.querySelector("[data-icon]")).not.toBeNull();
  });

  it("binds only the last two codepoints when there is no whitespace and keeps surrogate pairs intact", () => {
    const { container } = render(<InlineChipContent icon={<svg data-icon />}>查看全部镜头📷</InlineChipContent>);
    expect(container.textContent).toBe("查看全部镜头📷");
    const tail = container.querySelector(".whitespace-nowrap");
    expect(tail?.textContent).toBe("头📷");
    expect(tail?.querySelector("[data-icon]")).not.toBeNull();
  });

  it("does not lock a long unspaced tail after a space in whitespace-nowrap", () => {
    const label = "X 超长的一段不带空格的中文名称需要允许折行";
    const { container } = render(<InlineChipContent icon={<svg data-icon />}>{label}</InlineChipContent>);
    expect(container.textContent).toBe(label);
    const tail = container.querySelector(".whitespace-nowrap");
    expect(tail?.textContent).toBe("折行");
  });

  it("keeps formatted ReactNode children wrappable while binding only the trailing icon", () => {
    const { container } = render(
      <InlineChipContent icon={<svg data-icon />}>
        <strong>Very long formatted lens label</strong>
      </InlineChipContent>,
    );
    const tail = container.querySelector(".whitespace-nowrap");
    expect(tail?.querySelector("strong")).toBeNull();
    expect(tail?.querySelector("[data-icon]")).not.toBeNull();
    expect(container.querySelector("strong")?.textContent).toBe("Very long formatted lens label");
  });
});
