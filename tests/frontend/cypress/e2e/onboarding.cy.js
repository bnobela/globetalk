describe("GlobeTalk - Create Profile Page", () => {
  beforeEach(() => {
    cy.visit("/onboarding.html"); // adjust path if needed
  });

  it("renders the page with title and subtitle", () => {
    cy.get("h1").should("contain", "🌍 GlobeTalk");
    cy.get(".subtitle").should("contain", "Create your anonymous profile");
  });

  it("shows the profile form", () => {
    cy.get("#profileForm").should("exist");
    cy.get("button[type=submit]").should("contain", "Create My Profile");
  });

  it("validates required fields", () => {
    cy.get("button[type=submit]").click();
    cy.get("#languages:invalid").should("exist");
    cy.get("#region:invalid").should("exist");
    cy.get("#ageRange:invalid").should("exist");
    cy.get("#gender:invalid").should("exist");
    cy.get("#bio:invalid").should("exist");
  });

  it("fills out the form successfully", () => {
    // wait for dynamically populated languages
    //cy.get("#languages").select("English"); 
    cy.get("#region").select("SA(GMT+2)");
    cy.get("#ageRange").select("18-24");
    cy.get("#gender").select("male");
    cy.get("#hobbies").select("music");
    cy.get("#bio").type("Hello! I love coding and sports.");

    cy.get("button[type=submit]").click();

    // Check for expected behavior after submit
    //cy.url().should("include", "profile"); 
  });

  it("prevents submission if bio is missing", () => {
    //cy.get("#languages").select("English");
    cy.get("#region").select("SA(GMT+2)");
    cy.get("#ageRange").select("18-24");
    cy.get("#gender").select("male");
    cy.get("#hobbies").select("sports");

    cy.get("#bio").clear();
    cy.get("button[type=submit]").click();

    cy.get("#bio:invalid").should("exist");
  });
});
