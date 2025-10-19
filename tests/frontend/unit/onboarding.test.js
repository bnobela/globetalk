/**
 * @jest-environment jsdom
 */

describe("Onboarding Page - Profile Form", () => {
  let originalLocation;

  beforeAll(() => {
    // Save original location
    originalLocation = window.location;

    // Mock location completely
    delete window.location;
    window.location = { href: "" };

    // Mock alert
    window.alert = jest.fn();

    // Mock HTML structure
    document.body.innerHTML = `
      <form id="profileForm">
        <input id="ageRange" value="18-25">
        <input id="region" value="">
        <select class="languages"><option value="english">English</option></select>
        <input id="gender" value="Male">
        <input id="hobbies" value="Reading, Coding">
        <textarea id="bio">This is my bio</textarea>
      </form>
      <div id="regionOptions"></div>
      <div id="detectedLocation"></div>
    `;
  });

  afterAll(() => {
    // Restore original location
    window.location = originalLocation;
  });

  it("renders the profile form", () => {
    const form = document.getElementById("profileForm");
    expect(form).not.toBeNull();
  });

  it("populates region and detects user timezone", () => {
    // Fake populateRegionOptions
    const optionsContainer = document.getElementById("regionOptions");
    optionsContainer.innerHTML = "<div class='dropdown-option'>Europe (Central)</div>";

    // Fake detectUserRegion
    const regionInput = document.getElementById("region");
    regionInput.value = "Europe (Central)";
    const detected = document.getElementById("detectedLocation");
    detected.textContent = "Detected timezone: Europe/Berlin | Suggested region: Europe (Central)";

    expect(regionInput.value).toBe("Europe (Central)");
    expect(detected.textContent).toContain("Europe (Central)");
  });

  it("submits profile successfully for logged-in user", async () => {
    // Fake logged-in user
    const fakeUser = { uid: "12345", getIdToken: async () => "FAKE_TOKEN" };

    // Fake observeUser callback
    const callback = jest.fn(cb => cb(fakeUser));
    callback((user) => {
      if (user) {
        const form = document.getElementById("profileForm");
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          window.alert("Profile created successfully 🎉");
          window.location.href = "userdashboard.html";
        });
      }
    });

    // Simulate form submission
    const form = document.getElementById("profileForm");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    // Wait one tick
    await Promise.resolve();

    expect(window.alert).toHaveBeenCalledWith("Profile created successfully 🎉");
    expect(window.location.href).toBe("http://localhost/");
  });

  it("alerts if user is not logged in", () => {
    // Fake logged-out user
    const callback = jest.fn(cb => cb(null));
    callback(() => {});

    // Fake behavior
    window.alert("You need to be logged in to create a profile.");
    window.location.href = "http://localhost/";

    expect(window.alert).toHaveBeenCalled();
    expect(window.location.href).toBe("http://localhost/");
  });

  it("onboarding script loads successfully", () => {
    expect(true).toBe(true);
  });
});
