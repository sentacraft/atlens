// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Menu } from "@base-ui/react/menu";
import { MENU_ITEM_CLS } from "@/config/ui-tokens";
import { MenuPopup, MenuSeparator } from "../menu";

afterEach(cleanup);

function renderMenu(className?: string) {
  render(
    <Menu.Root open>
      <Menu.Trigger>Open</Menu.Trigger>
      <MenuPopup className={className}>
        <Menu.Item className={MENU_ITEM_CLS}>First</Menu.Item>
        <Menu.Item className={MENU_ITEM_CLS}>Last</Menu.Item>
      </MenuPopup>
    </Menu.Root>,
  );
  return screen.getByRole("menu");
}

describe("MenuPopup", () => {
  it("keeps the caller's width and other classes", () => {
    expect(renderMenu("w-64").className).toContain("w-64");
  });

  // A row's hover fills the popup edge to edge; vertical padding left a white strip above the
  // first row and below the last one, in the nav menu, the avatar menu and more.
  it("clears any vertical padding the caller passes, so a row's hover reaches the border", () => {
    const popup = renderMenu("w-64 py-1");

    expect(popup.className).not.toMatch(/(^|\s)py-1(\s|$)/);
    expect(popup.className).toMatch(/(^|\s)py-0(\s|$)/);
  });

  it("clears padding passed as top and bottom padding too", () => {
    const popup = renderMenu("pt-2 pb-2");

    expect(popup.className).not.toMatch(/(^|\s)p[tb]-2(\s|$)/);
  });

  // A margin on the divider left a white strip between the line and the next row's hover.
  it("draws a divider with no vertical margin", () => {
    render(
      <Menu.Root open>
        <Menu.Trigger>Open</Menu.Trigger>
        <MenuPopup>
          <Menu.Item className={MENU_ITEM_CLS}>First</Menu.Item>
          <MenuSeparator />
          <Menu.Item className={MENU_ITEM_CLS}>Last</Menu.Item>
        </MenuPopup>
      </Menu.Root>,
    );

    expect(screen.getByRole("separator").className).not.toMatch(/(^|\s)m[ytb]?-/);
  });
});
