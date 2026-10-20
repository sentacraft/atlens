// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ExampleQuestion from "../ExampleQuestion";

describe("ExampleQuestion", () => {
  it("keeps a focal length range on one line", () => {
    const { container } = render(
      <ExampleQuestion disabled={false} onClick={() => {}}>
        How different are the XF 18-55mm and the XF 16-50mm?
      </ExampleQuestion>,
    );
    expect(container.querySelector("button")?.textContent).toBe(
      "How different are the XF 18-\u206055mm and the XF 16-\u206050mm?",
    );
  });

  it("leaves other hyphens free to break", () => {
    const { container } = render(
      <ExampleQuestion disabled={false} onClick={() => {}}>
        A weather-sealed lens
      </ExampleQuestion>,
    );
    expect(container.querySelector("button")?.textContent).toBe("A weather-sealed lens");
  });
});
