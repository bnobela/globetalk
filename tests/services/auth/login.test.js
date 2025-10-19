import request from "supertest";
import express from "express";
import authRouter from "../../../src/services/auth/index.js";

// 🔹 Mock firebase-admin BEFORE importing our app logic
jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  auth: () => ({
    verifyIdToken: jest.fn(async (token) => {
      if (token === "valid-token") {
        return { uid: "123", email: "test@example.com" };
      }
      throw new Error("Invalid token");
    }),
  }),
  firestore: () => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(async () => ({ exists: false })), // Pretend user not found
        set: jest.fn(async () => {}),                 // Pretend write works
      })),
    })),
  }),
}));

// 🔹 Create a lightweight Express app for testing
const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);

describe("POST /api/auth/login", () => {
  it("creates a new user and returns firstTime=true when user does not exist", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ idToken: "valid-token" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      uid: "123",
      email: "test@example.com",
      firstTime: true,
    });
  });

  it("returns 400 when token is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });

  it("returns 401 for invalid token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ idToken: "bad-token" });
    expect(res.status).toBe(401);
  });
});
