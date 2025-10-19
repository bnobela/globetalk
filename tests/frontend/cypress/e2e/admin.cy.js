/// <reference types="cypress" />

describe('GlobeTalk - Admin Dashboard Page (HTML structure only)', () => {
  beforeEach(() => {
    // Handle uncaught exceptions to prevent test failures from module imports
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes('Failed to resolve module specifier')) {
        return false;
      }
    });

    // Visit the admin page
    cy.visit('/admin.html', {
      onBeforeLoad(win) {
        // Remove all module scripts to prevent import errors
        const scripts = win.document.querySelectorAll('script[type="module"]');
        scripts.forEach(s => s.remove());
      }
    });
  });

  it('renders the correct page title', () => {
    cy.title().should('eq', 'GlobeTalk Admin Dashboard');
  });

  it('renders the navigation header with logo and links', () => {
    cy.get('header').within(() => {
      cy.get('div h1').contains('GlobeTalk').should('exist');
      cy.get('nav').within(() => {
        cy.get('a').contains('Home').should('have.attr', 'href', 'admin.html');
        cy.get('a').contains('Settings & Safety').should('have.attr', 'href', '#');
      });
    });
  });

  it('renders the dashboard title', () => {
    cy.get('main .dashboard-title h2').contains('Admin Dashboard').should('exist');
  });

  it('renders the stats cards', () => {
    cy.get('main .stats-grid').within(() => {
      cy.get('.stat-card').should('have.length', 3);
      cy.get('.stat-card').eq(0).within(() => {
        cy.get('div#activeUsersCount').contains('...').should('exist');
        cy.get('div').contains('Active users').should('exist');
      });
      cy.get('.stat-card').eq(1).within(() => {
        cy.get('div#reportedUsersCount').contains('...').should('exist');
        cy.get('div').contains('Reported users').should('exist');
      });
      cy.get('.stat-card').eq(2).within(() => {
        cy.get('div#bannedUsersCount').contains('...').should('exist');
        cy.get('div').contains('Banned accounts').should('exist');
      });
    });
  });

  it('renders the reported content section', () => {
    cy.get('main .reported-content').within(() => {
      cy.get('h3').contains('Reports').should('exist');
      cy.get('div#toggleContainer').should('exist');
      cy.get('div#reportedUsersList').should('exist');
    });
  });
});