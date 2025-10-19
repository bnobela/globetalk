/// <reference types="cypress" />

describe('GlobeTalk - Dashboard Page', () => {
  beforeEach(() => {
    // Handle uncaught exceptions to prevent test failures from module imports
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes('Failed to resolve module specifier')) {
        return false;
      }
    });

    // Visit the dashboard page
    cy.visit('/userdashboard.html', {
      onBeforeLoad(win) {
        const scripts = win.document.querySelectorAll('script[type="module"]');
        scripts.forEach(s => s.remove());
      }
    });
  });

  it('renders the navigation links and logout button', () => {
    cy.get('nav').within(() => {
      cy.get('a.nav-link').contains('Home').should('exist');
      cy.get('a.nav-link').contains('Find Pen Pal').should('exist');
      cy.get('a.nav-link').contains('Settings & Safety').should('exist');
      cy.get('button#logoutBtn').contains('Logout').should('exist');
    });
  });

  it('renders the main GlobeTalk title', () => {
    cy.get('h1.globetalk-title').contains('GlobeTalk').should('exist');
  });

  it('renders the dashboard title container and title', () => {
    cy.get('div.dashboard-title-container').within(() => {
      cy.get('h2.dashboard-title').contains('Dashboard').should('exist');
    });
  });

  it('renders the Pen Pal Suggestions section with placeholder', () => {
    cy.get('div.section').contains('Pen Pal Suggestions').should('exist');
    cy.get('#penPalCards').within(() => {
      cy.get('span').contains('Loading...').should('exist');
    });
  });

  it('renders the Active Conversations section with placeholder', () => {
    cy.get('div.section').contains('Active Conversations').should('exist');
    cy.get('#conversationsContainer').within(() => {
      cy.get('span').contains('Loading...').should('exist');
    });
  });

  it('ensures all sections have the "section" class', () => {
    cy.get('div.section').should('have.length', 2);
  });
});