// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import type { ChoiceRequestInput } from "@/lib/ai/choice-request";
import ChoiceCard from "../ChoiceCard";

afterEach(cleanup);

function renderCard(input: ChoiceRequestInput, props: { active?: boolean; output?: Parameters<typeof ChoiceCard>[0]["output"] } = {}) {
  const onAnswer = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ChoiceCard input={input} active={props.active ?? true} output={props.output} onAnswer={onAnswer} />
    </NextIntlClientProvider>,
  );
  return onAnswer;
}

const GROUPS: ChoiceRequestInput = {
  questions: [
    { question: "Shoot most?", options: ["Street", "Temples", "Night"], multiple: true },
    { question: "Carry?", options: ["One lens", "Two lenses"] },
  ],
};

describe("ChoiceCard", () => {
  it("collects picks across groups and sends them on Done, leaving an untouched group empty", () => {
    const onAnswer = renderCard(GROUPS);
    fireEvent.click(screen.getByRole("button", { name: "Street" }));
    fireEvent.click(screen.getByRole("button", { name: "Temples" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onAnswer).toHaveBeenCalledWith({
      outcome: "answered",
      answers: [
        { question: "Shoot most?", picked: ["Street", "Temples"] },
        { question: "Carry?", picked: [] },
      ],
    });
  });

  it("keeps one pick in a single-choice group", () => {
    const onAnswer = renderCard(GROUPS);
    fireEvent.click(screen.getByRole("button", { name: "One lens" }));
    fireEvent.click(screen.getByRole("button", { name: "Two lenses" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onAnswer.mock.calls[0][0].answers[1].picked).toEqual(["Two lenses"]);
  });

  it("holds Done back until something is picked", () => {
    renderCard(GROUPS);
    expect(screen.getByRole("button", { name: "Done" })).toBeDisabled();
  });

  it("adds typed text as a pick in its group", () => {
    const onAnswer = renderCard(GROUPS);
    fireEvent.click(screen.getAllByRole("button", { name: "Something else" })[1]);
    fireEvent.change(screen.getByRole("textbox", { name: "Something else" }), { target: { value: "Just a prime" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onAnswer.mock.calls[0][0].answers[1].picked).toEqual(["Just a prime"]);
  });

  it("answers at once when there is one single-choice question", () => {
    const onAnswer = renderCard({ questions: [{ question: "Budget?", options: ["Low", "High"] }] });
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Low" }));
    expect(onAnswer).toHaveBeenCalledWith({ outcome: "answered", answers: [{ question: "Budget?", picked: ["Low"] }] });
  });

  it("skips", () => {
    const onAnswer = renderCard(GROUPS);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onAnswer).toHaveBeenCalledWith({ outcome: "skipped" });
  });

  it("shows the answer as the user's words, with 'not said' for an empty group", () => {
    renderCard(GROUPS, {
      active: false,
      output: {
        outcome: "answered",
        answers: [
          { question: "Shoot most?", picked: ["Street"] },
          { question: "Carry?", picked: [] },
        ],
      },
    });
    expect(screen.getByText("Shoot most?: Street")).toBeTruthy();
    expect(screen.getByText("Carry?: not said")).toBeTruthy();
  });

  it("marks a card the conversation moved past", () => {
    renderCard(GROUPS, { active: false });
    expect(screen.getByText("Questions not answered")).toBeTruthy();
  });
});
