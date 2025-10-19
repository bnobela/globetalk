/**
 * @jest-environment node
 */
import { jest } from "@jest/globals";

// Mock the Firebase modules used in authService
jest.mock("firebase/auth", () => {
  return {
    getAuth: jest.fn(() => ({})), // dummy auth object
    GoogleAuthProvider: jest.fn(),
    signInWithPopup: jest.fn().mockResolvedValue({
      user: { uid: "123", email: "test@example.com" },
    }),
  };
});

jest.mock("firebase/firestore", () => {
  return {
    getFirestore: jest.fn(() => ({})), // dummy firestore object
    doc: jest.fn(),
    getDoc: jest.fn(),
    setDoc: jest.fn().mockResolvedValue(true),
    serverTimestamp: jest.fn(() => new Date()),
  };
});

// Import the service after mocking
import { signInWithGoogle } from "../../../src/services/auth/authService.js";
import { getAuth, signInWithPopup } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// ... (mocks and imports remain the same) ...

describe("authService.signInWithGoogle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("creates a new user doc if user does not exist", async () => {
    // 1. Setup Mocks
    getDoc.mockResolvedValue({ exists: () => false });
    const mockUser = { uid: "123", email: "test@example.com" };
    signInWithPopup.mockResolvedValue({ user: mockUser }); // Ensure signInWithPopup returns our mock

    // 2. Call the Function
    await signInWithGoogle();

    // 3. Make Assertions
    expect(signInWithPopup).toHaveBeenCalled();
    expect(getDoc).toHaveBeenCalled();
    // The test now correctly expects the object WITHOUT the uid field
    // and uses expect.anything() for serverTimestamp()
    expect(setDoc).toHaveBeenCalledWith(expect.any(Object), {
      email: mockUser.email,
      acceptedPolicy: false,
      createdAt: expect.anything(), // serverTimestamp() is not a Date!
    });
  });

  test("does not create a new doc if user already exists", async () => {
    // Setup for existing user
    getDoc.mockResolvedValue({ exists: () => true });
    signInWithPopup.mockResolvedValue({ user: { uid: "123", email: "test@example.com" } });

    await signInWithGoogle();

    expect(signInWithPopup).toHaveBeenCalled();
    expect(getDoc).toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
  });
});