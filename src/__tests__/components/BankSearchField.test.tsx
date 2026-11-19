import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import BankSearchField from "../../components/account/payout/BankSearchField";

// The bank picker on its own: picking by keyboard, by typing a full name, and
// what happens to a pick when the seller types again.

// jsdom doesn't lay pages out, so it has no scrollIntoView.
Element.prototype.scrollIntoView = vi.fn();

const banks = [
  { code: "044", name: "Access Bank" },
  { code: "058", name: "GTBank" },
  { code: "035", name: "Wema Bank" },
];

function Harness({ onChange }: { onChange: (code: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <>
      <label htmlFor="bank">Bank</label>
      <BankSearchField
        id="bank"
        invalid={false}
        surface="page"
        banks={banks}
        loading={false}
        value={value}
        onChange={(code) => {
          setValue(code);
          onChange(code);
        }}
      />
      <button type="button">Elsewhere</button>
    </>
  );
}

const setup = () => {
  const onChange = vi.fn();
  render(<Harness onChange={onChange} />);
  return { onChange, box: screen.getByRole("combobox", { name: "Bank" }) };
};

describe("BankSearchField", () => {
  it("picks the highlighted bank with the arrow keys and Enter", () => {
    const { onChange, box } = setup();
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: "bank" } });
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "Enter" });

    expect(onChange).toHaveBeenLastCalledWith("035");
    expect(box).toHaveValue("Wema Bank");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("counts a bank name typed out in full as picked", () => {
    const { onChange, box } = setup();
    fireEvent.change(box, { target: { value: "gtbank" } });
    fireEvent.blur(box);

    expect(onChange).toHaveBeenLastCalledWith("058");
    expect(box).toHaveValue("GTBank");
  });

  it("drops the pick as soon as the seller types again", () => {
    const { onChange, box } = setup();
    fireEvent.change(box, { target: { value: "acc" } });
    fireEvent.mouseDown(screen.getByRole("option", { name: "Access Bank" }));
    expect(onChange).toHaveBeenLastCalledWith("044");

    fireEvent.change(box, { target: { value: "Access Ban" } });
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("says so when no bank matches", () => {
    const { box } = setup();
    fireEvent.change(box, { target: { value: "barclays" } });
    expect(screen.getByText(/No bank matches “barclays”/)).toBeTruthy();
  });
});
