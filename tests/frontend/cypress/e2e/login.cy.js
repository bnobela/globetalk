/// <reference types="cypress" />

describe('GlobeTalk Login Page', () => {
  beforeEach(() => {
    // Clear localStorage to simulate first-time visit
    cy.clearLocalStorage();
    cy.visit('/login.html');
  });

  it('should display the Google login button', () => {
    cy.get('#loginBtn').should('exist').and('be.visible');
  });

  it('should display privacy and consent checkboxes', () => {
    cy.get('#privacy').should('exist').and('not.be.checked');
    cy.get('#consent').should('exist').and('not.be.checked');
  });

  /*it('enables login button only when both checkboxes are checked', () => {
    cy.get('#loginBtn').as('loginBtn');
    cy.get('#privacy').as('privacy');
    cy.get('#consent').as('consent');

    // Step 1: Button should start disabled
    cy.get('@loginBtn').should('be.disabled');

    // Step 2: Check only privacy → still disabled
    cy.get('@privacy').check().should('be.checked');
    cy.get('@loginBtn').should('be.disabled');

    // Step 3: Check consent → now enabled
    cy.get('@consent').check().should('be.checked');
    cy.get('@loginBtn').should('not.be.disabled');
  });*/

  it('should allow activating login button with the keyboard', () => {
    cy.get('#privacy').check();
    cy.get('#consent').check();
    cy.get('#loginBtn').focus().type('{enter}');
    
    // Assert the alert fired
    cy.on('window:alert', (txt) => {
      expect(txt).to.contain('Google login flow starting');
    });
  });

  it('should trigger Google login flow when clicked', () => {
    cy.get('#privacy').check();
    cy.get('#consent').check();
    cy.get('#loginBtn').click();

    // Assert the alert fired
    cy.on('window:alert', (txt) => {
      expect(txt).to.contain('Google login flow starting');
    });
  });

  it('should automatically enable login button for returning users', () => {
    // Simulate returning user
    localStorage.setItem('policiesAccepted', 'true');
    cy.visit('/login.html');
    cy.get('#loginBtn').should('not.be.disabled');
  });
});
