import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { DetectedClaim } from "../contract-types";
import { filterClaimsByQuery } from "../term-order";

interface ClaimSelectorProps {
  claims: DetectedClaim[];
  selectedClaimNumber: number | null;
  analyzedClaimNumbers: Set<number>;
  onSelectClaim: (claimNumber: number) => void;
}

export function describeDependency(claim: DetectedClaim): string {
  if (claim.dependsOn.length === 0) return "Independent";
  return "Depends on " + claim.dependsOn.map((parentNumber) => "claim " + parentNumber).join(", ");
}

/** Compact searchable claim picker with previous / next navigation. */
export function ClaimSelector({ claims, selectedClaimNumber, analyzedClaimNumbers, onSelectClaim }: ClaimSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listboxId = useId();

  const selectedPosition = claims.findIndex((claim) => claim.number === selectedClaimNumber);
  const selectedClaim = selectedPosition >= 0 ? claims[selectedPosition] : null;
  const previousClaim = selectedPosition > 0 ? claims[selectedPosition - 1] : null;
  const nextClaim = selectedPosition >= 0 && selectedPosition < claims.length - 1 ? claims[selectedPosition + 1] : null;
  const filteredClaims = filterClaimsByQuery(claims, searchQuery);

  useEffect(() => {
    if (!isOpen) return;
    const activeOption = wrapperRef.current?.querySelector<HTMLElement>('[role="option"].is-active');
    if (!activeOption) return;
    const optionList = activeOption.parentElement;
    if (!optionList) return;
    // Scroll only the menu, never the page, when keyboard navigation passes its visible edge.
    const optionTop = activeOption.getBoundingClientRect().top - optionList.getBoundingClientRect().top + optionList.scrollTop;
    if (optionTop < optionList.scrollTop) optionList.scrollTop = optionTop;
    else if (optionTop + activeOption.offsetHeight > optionList.scrollTop + optionList.clientHeight) {
      optionList.scrollTop = optionTop + activeOption.offsetHeight - optionList.clientHeight;
    }
  }, [activeOptionIndex, isOpen, searchQuery]);

  useEffect(() => {
    if (!isOpen) return;
    searchRef.current?.focus();
    function closeOnOutsidePointer(pointerEvent: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(pointerEvent.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [isOpen]);

  function openPicker() {
    setSearchQuery("");
    setActiveOptionIndex(Math.max(0, selectedPosition));
    setIsOpen(true);
  }

  function closePicker() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function chooseClaim(claimNumber: number) {
    onSelectClaim(claimNumber);
    closePicker();
  }

  function handleSearchKeys(keyboardEvent: KeyboardEvent<HTMLInputElement>) {
    if (keyboardEvent.key === "ArrowDown") {
      keyboardEvent.preventDefault();
      setActiveOptionIndex((current) => Math.max(0, Math.min(filteredClaims.length - 1, current + 1)));
    } else if (keyboardEvent.key === "ArrowUp") {
      keyboardEvent.preventDefault();
      setActiveOptionIndex((current) => Math.max(0, current - 1));
    } else if (keyboardEvent.key === "Enter") {
      keyboardEvent.preventDefault();
      const activeClaim = filteredClaims[activeOptionIndex];
      if (activeClaim) chooseClaim(activeClaim.number);
    } else if (keyboardEvent.key === "Escape") {
      keyboardEvent.preventDefault();
      closePicker();
    } else if (keyboardEvent.key === "Tab") {
      setIsOpen(false);
    }
  }

  if (claims.length === 0) {
    return (
      <div className="ncc-empty">
        <p className="ncc-empty-title">No numbered claims were detected.</p>
        <p className="ncc-muted">
          Claims are found after a standalone "Claims" or "What is claimed is:" heading, with each claim starting on a new line as "1.", "2." and so on.
        </p>
      </div>
    );
  }

  const activeOptionClaim = filteredClaims[activeOptionIndex];

  return (
    <div className="ncc-claim-selector" ref={wrapperRef}>
      <button
        type="button"
        className="ncc-icon-button ncc-step-button"
        disabled={!previousClaim}
        onClick={() => previousClaim && onSelectClaim(previousClaim.number)}
        aria-label={previousClaim ? "Previous claim, claim " + previousClaim.number : "No previous claim"}
        data-testid="button-previous-claim"
      >
        <span aria-hidden="true">&lsaquo;</span>
      </button>

      <div className="ncc-picker">
        <button
          type="button"
          ref={triggerRef}
          className="ncc-picker-trigger"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={() => (isOpen ? setIsOpen(false) : openPicker())}
          data-testid="button-claim-picker"
        >
          <span className="ncc-picker-number">{selectedClaim ? "Claim " + selectedClaim.number : "Choose a claim"}</span>
          {selectedClaim && <span className="ncc-picker-meta">{describeDependency(selectedClaim)}</span>}
          {selectedClaim && analyzedClaimNumbers.has(selectedClaim.number) && <span className="ncc-status-pill">Analyzed</span>}
          <span className="ncc-picker-count">{selectedPosition + 1} of {claims.length}</span>
          <span className="ncc-picker-caret" aria-hidden="true" />
        </button>

        {isOpen && (
          <div className="ncc-picker-popover">
            <label className="ncc-sr-only" htmlFor={listboxId + "-search"}>Search claims by number or text</label>
            <input
              id={listboxId + "-search"}
              ref={searchRef}
              className="ncc-input ncc-picker-search"
              placeholder="Search by number or wording"
              value={searchQuery}
              role="combobox"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-activedescendant={activeOptionClaim ? listboxId + "-option-" + activeOptionClaim.number : undefined}
              onChange={(changeEvent) => { setSearchQuery(changeEvent.target.value); setActiveOptionIndex(0); }}
              onKeyDown={handleSearchKeys}
              data-testid="input-claim-search"
            />
            <ul id={listboxId} role="listbox" aria-label="Claims" className="ncc-picker-list">
              {filteredClaims.length === 0 && <li className="ncc-picker-empty">No claims match.</li>}
              {filteredClaims.map((claim, optionIndex) => {
                const isSelected = claim.number === selectedClaimNumber;
                return (
                  <li
                    key={claim.number}
                    id={listboxId + "-option-" + claim.number}
                    role="option"
                    aria-selected={isSelected}
                    className={"ncc-picker-option" + (optionIndex === activeOptionIndex ? " is-active" : "") + (isSelected ? " is-selected" : "")}
                    onPointerEnter={() => setActiveOptionIndex(optionIndex)}
                    onClick={() => chooseClaim(claim.number)}
                    data-testid={"button-claim-" + claim.number}
                  >
                    <span className="ncc-picker-option-number">{claim.number}</span>
                    <span className="ncc-picker-option-body">
                      <span className="ncc-picker-option-meta">
                        {describeDependency(claim)}
                        {analyzedClaimNumbers.has(claim.number) && <span className="ncc-status-pill">Analyzed</span>}
                      </span>
                      <span className="ncc-picker-option-text">{claim.text}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <button
        type="button"
        className="ncc-icon-button ncc-step-button"
        disabled={!nextClaim}
        onClick={() => nextClaim && onSelectClaim(nextClaim.number)}
        aria-label={nextClaim ? "Next claim, claim " + nextClaim.number : "No next claim"}
        data-testid="button-next-claim"
      >
        <span aria-hidden="true">&rsaquo;</span>
      </button>
    </div>
  );
}
