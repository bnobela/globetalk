// tests/frontend/unit/login.test.js
import * as LoginModule from "../../../src/frontend/scripts/login.js";
import { signInWithGoogle, observeUser } from "../../../src/services/firebase.js";
import { isBannedUser, isAdmin } from "../../../src/services/admin.js";

jest.mock("../../../src/services/firebase.js");
jest.mock("../../../src/services/admin.js");

describe("login.js DOM interactions", () => {
  let loginBtn, privacyCheckbox, consentCheckbox;

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="loginBtn">Login</button>
      <input type="checkbox" id="privacy" />
      <input type="checkbox" id="consent" />
    `;
    loginBtn = document.getElementById("loginBtn");
    privacyCheckbox = document.getElementById("privacy");
    consentCheckbox = document.getElementById("consent");

    localStorage.clear();
    jest.clearAllMocks();

    // Mock Firebase sign-in
    signInWithGoogle.mockResolvedValue({ user: { uid: "uid123", displayName: "Test User", getIdToken: async () => "token123" } });
    isBannedUser.mockResolvedValue(false);
    isAdmin.mockResolvedValue(false);
  });

  test("login button disabled until checkboxes checked", () => {
    // Initially disabled
    expect(loginBtn.disabled).toBe(true);

    privacyCheckbox.checked = true;
    consentCheckbox.checked = true;
    privacyCheckbox.dispatchEvent(new Event("change"));
    consentCheckbox.dispatchEvent(new Event("change"));

    expect(loginBtn.disabled).toBe(false);
  });

  test("clicking login triggers Google sign-in and sets token", async () => {
    privacyCheckbox.checked = true;
    consentCheckbox.checked = true;
    privacyCheckbox.dispatchEvent(new Event("change"));
    consentCheckbox.dispatchEvent(new Event("change"));

    await loginBtn.click();

    expect(signInWithGoogle).toHaveBeenCalled();
    expect(localStorage.getItem("idToken")).toBeTruthy();
    expect(localStorage.getItem("policiesAccepted")).toBe("true");
  });

  test("keydown Enter or Space triggers login click", async () => {
    privacyCheckbox.checked = true;
    consentCheckbox.checked = true;
    privacyCheckbox.dispatchEvent(new Event("change"));
    consentCheckbox.dispatchEvent(new Event("change"));

    const clickSpy = jest.spyOn(loginBtn, "click");

    loginBtn.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(clickSpy).toHaveBeenCalled();

    loginBtn.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    expect(clickSpy).toHaveBeenCalledTimes(2);
  });

  test("banned user shows error and redirects", async () => {
    isBannedUser.mockResolvedValue(true);
    privacyCheckbox.checked = true;
    consentCheckbox.checked = true;
    privacyCheckbox.dispatchEvent(new Event("change"));
    consentCheckbox.dispatchEvent(new Event("change"));

    const safeNavigateSpy = jest.spyOn(LoginModule.utils, "safeNavigate").mockImplementation(async () => {});

    await loginBtn.click();
    expect(isBannedUser).toHaveBeenCalled();
    expect(safeNavigateSpy).toHaveBeenCalled(); // redirected
  });

  test("admin user redirects to admin dashboard", async () => {
    isAdmin.mockResolvedValue(true);
    privacyCheckbox.checked = true;
    consentCheckbox.checked = true;
    privacyCheckbox.dispatchEvent(new Event("change"));
    consentCheckbox.dispatchEvent(new Event("change"));

    const safeNavigateSpy = jest.spyOn(LoginModule.utils, "safeNavigate").mockImplementation(async () => {});

    await loginBtn.click();
    expect(isAdmin).toHaveBeenCalled();
    expect(safeNavigateSpy).toHaveBeenCalledWith(LoginModule.CONFIG.PAGES.ADMIN_DASHBOARD);
  });
});
