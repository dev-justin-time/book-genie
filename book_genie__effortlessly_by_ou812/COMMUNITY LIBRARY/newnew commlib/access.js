function initializeAccessibility() {
    // Toggle high-contrast mode
    document.querySelector(".mode-toggle").addEventListener("click", () => {
      document.body.classList.toggle("high-contrast");
    });
  
    // Add ARIA labels
    document.querySelectorAll(".block").forEach(block => {
      block.setAttribute("aria-label", `Book: ${block.querySelector(".right").dataset.title}`);
    });
  
    // Keyboard navigation
    document.querySelectorAll(".block, button, input").forEach(el => {
      el.setAttribute("tabindex", "0");
      el.addEventListener("keypress", e => {
        if (e.key === "Enter") el.click();
      });
    });
  }
  
  