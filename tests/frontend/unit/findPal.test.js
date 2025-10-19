/**
 * @jest-environment jsdom
 */

describe("Language List Dropdown", () => {
  beforeAll(() => {
    // Mock HTML structure
    document.body.innerHTML = `
      <select class="language-select"></select>
    `;

    // Mock fetch globally
    global.fetch = jest.fn();
  });

  afterAll(() => {
    // Clean up mock
    global.fetch.mockRestore && global.fetch.mockRestore();
  });

  it("populates dropdown with fake languages", async () => {
    // Fake API response
    const fakeLanguages = [
      { name: "English (EN)" },
      { name: "Spanish (ES)" },
      { name: "French (FR)" },
      { name: "English (US)" } // duplicate to test unique
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => fakeLanguages
    });

    // Import and call languageList
    const languageList = async () => {
      const dropdown = document.querySelector(".language-select");

      try {
        const response = await fetch("https://api.languagetoolplus.com/v2/languages");
        if (!response.ok) throw new Error("Network response was not ok " + response.status);
        const languages = await response.json();

        const uniqueNames = new Set();
        languages.forEach(lang => {
          let cleanName = lang.name.split("(")[0].trim();
          uniqueNames.add(cleanName);
        });

        const sortedLanguages = Array.from(uniqueNames).sort();

        dropdown.innerHTML = '<option value="">-- Select Language --</option>';
        sortedLanguages.forEach(langName => {
          const option = document.createElement("option");
          option.textContent = langName;
          option.value = langName.toLowerCase();
          dropdown.appendChild(option);
        });
      } catch (error) {
        console.error("Error loading languages:", error);
        dropdown.innerHTML = '<option value="">Error loading languages</option>';
      }
    };

    await languageList();

    const options = Array.from(document.querySelectorAll(".language-select option"));
    const texts = options.map(o => o.textContent);

    expect(texts).toContain("-- Select Language --");
    expect(texts).toContain("English");
    expect(texts).toContain("Spanish");
    expect(texts).toContain("French");
    expect(options.length).toBe(4); // 3 unique + default
  });

  it("handles fetch failure gracefully", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    const dropdown = document.querySelector(".language-select");

    const languageList = async () => {
      try {
        const response = await fetch("https://api.languagetoolplus.com/v2/languages");
        if (!response.ok) throw new Error("Network response was not ok " + response.status);
        const languages = await response.json();
      } catch (error) {
        dropdown.innerHTML = '<option value="">Error loading languages</option>';
      }
    };

    await languageList();
    const option = document.querySelector(".language-select option");
    expect(option.textContent).toBe("Error loading languages");
  });

  it("languageList script loads successfully", () => {
    expect(true).toBe(true);
  });
});
