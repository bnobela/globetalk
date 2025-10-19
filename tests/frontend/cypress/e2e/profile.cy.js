/// <reference types="cypress" />

describe('GlobeTalk - Profile Page', () => {
  beforeEach(() => {
    // Handle uncaught exceptions to prevent test failures from module imports
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes('Failed to resolve module specifier')) {
        return false;
      }
    });

    // Visit the profile page
    cy.visit('/profile.html', {
      onBeforeLoad(win) {
        // Remove all module scripts to prevent import errors
        const scripts = win.document.querySelectorAll('script[type="module"]');
        scripts.forEach(s => s.remove());
      }
    });
  });

  it('renders the correct page title', () => {
    cy.title().should('eq', 'GlobeTalk - Profile');
  });

  it('renders the navigation bar with links', () => {
    cy.get('header').within(() => {
      cy.get('.logo').contains('GlobeTalk').should('exist');
      cy.get('nav').within(() => {
        cy.get('a').contains('Home').should('have.attr', 'href', 'userdashboard.html');
        cy.get('a').contains('About').should('have.attr', 'href', 'about.html');
        cy.get('a').contains('Find Pen Pal').should('have.attr', 'href', 'findPal.html');
        cy.get('a').contains('Settings & Safety').should('have.attr', 'href', 'settings.html');
      });
    });
  });

  it('renders the profile title', () => {
    cy.get('div.main-container h2.profile-title').contains('Profile').should('exist');
  });

  it('renders the profile card structure', () => {
    cy.get('div.profile-card').within(() => {
      // User info section
      cy.get('div.user-info').within(() => {
        cy.get('div.user-header').within(() => {
          cy.get('div.profile-pic#profilePic').should('exist');
          cy.get('h3.username#username').should('exist');
        });
        cy.get('p.user-description#userDescription').should('exist');
      });

      // Personal details section
      cy.get('div.personal-details').within(() => {
        cy.get('div.detail-item#ageDetail').should('exist');
        cy.get('div.detail-item#genderDetail').should('exist');
      });

      // Hobbies section
      cy.get('div.hobbies-section').within(() => {
        cy.get('h4.hobbies-title').contains('Hobbies and Interests').should('exist');
        cy.get('div.hobbies-list#hobbiesList').should('exist');
      });

      // Location and languages section
      cy.get('div.location-languages').within(() => {
        cy.get('div.location-item#regionDetail').should('exist');
        cy.get('div.location-item#languagesDetail').should('exist');
      });
    });
  });

  it('renders the action buttons', () => {
    cy.get('div.profile-card div.action-buttons').within(() => {
      cy.get('button.start-chat-btn').contains('Start a Chat').should('exist');
      cy.get('div.learn-more-link').within(() => {
        cy.get('a').should('have.attr', 'href', 'dashboard.html');
        cy.get('span.learn-more-purple').contains('Learn more').should('exist');
        cy.get('span.learn-more-black').contains('about my country').should('exist');
      });
    });
  });

  it('renders the disclaimer', () => {
    cy.get('div.main-container div.disclaimer')
      .contains('Remember: Never share personal information')
      .should('exist');
  });
});