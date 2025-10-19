/// <reference types="cypress" />

describe('GlobeTalk - Find a Pen Pal Page (HTML structure only)', () => {
  beforeEach(() => {
    // Handle uncaught exceptions to prevent test failures from script errors
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes('Failed to resolve module specifier') || err.message.includes('Script error')) {
        return false;
      }
    });

    // Visit the findPal page
    cy.visit('/findPal.html', {
      onBeforeLoad(win) {
        // Remove all scripts to prevent errors
        const scripts = win.document.querySelectorAll('script');
        scripts.forEach(s => s.remove());
      }
    });
  });

  it('renders the correct page title', () => {
    cy.title().should('eq', 'GlobeTalk - Find a Pen Pal');
  });

  it('renders the header with logo, title, and description', () => {
    cy.get('div.overlap header.header').within(() => {
      cy.get('h1').contains('GlobeTalk').should('exist');
      cy.get('div.title-container').contains('Find a Pen Pal').should('exist');
      cy.get('div.description').within(() => {
        cy.get('p.p').contains('Match with like-minded friends across the globe by language and timezone').should('exist');
        cy.get('img.globe-earth').should('have.attr', 'src', './images/globe.webp');
      });
    });
  });

  /*it('renders the navigation bar with links', () => {
    cy.get('div.overlap nav').within(() => {
      cy.get('a.Link1').contains('Home').should('have.attr', 'href', 'index.html');
      cy.get('a.Link2').contains('About').should('have.attr', 'href', '#');
      cy.get('a.Link3').contains('Find Pen Pal').should('have.attr', 'href', 'findPal.html');
      cy.get('a.Link4').contains('Settings & Safety').should('have.attr', 'href', '#');
    });
  });*/

  it('renders the cloud images', () => {
    cy.get('img.cloud.left').should('have.attr', 'src', './images/cloud1.png').should('have.attr', 'alt', 'Cloud');
    cy.get('img.cloud.right').should('have.attr', 'src', './images/cloud2.png').should('have.attr', 'alt', 'Cloud');
  });

  it('renders the form box with fields', () => {
    cy.get('div.overlap2 div.form-box').within(() => {
      cy.get('form#penpalForm').within(() => {
        // Language field
        cy.get('label[for="language"]').contains('Language preference').should('exist');
        cy.get('select#language').should('exist').find('option').should('have.length.at.least', 4);
        cy.get('select#language option[value=""]').contains('-- Select Language --').should('exist');
        cy.get('select#language option[value="English"]').contains('English').should('exist');

        // Region field
        cy.get('label[for="region"]').contains('Region/Timezone').should('exist');
        cy.get('select#region').should('exist').find('option').should('have.length.at.least', 4);
        cy.get('select#region option[value=""]').contains('-- Select Region --').should('exist');
        cy.get('select#region option[value="southafrica"]').contains('South Africa (GMT+2)').should('exist');

        // Interest field
        cy.get('label[for="interest"]').contains('Interests').should('exist');
        cy.get('select#interest').should('exist').find('option').should('have.length.at.least', 6);
        cy.get('select#interest option[value=""]').contains('-- Select Region --').should('exist');
        cy.get('select#interest option[value="reading"]').contains('Reading').should('exist');
      });
    });
  });

  it('renders the submit button', () => {
    cy.get('div.overlap2 div.form-box form#penpalForm').within(() => {
      cy.get('button.submit-btn').contains('Find Pen Pal').should('exist').should('have.attr', 'type', 'submit');
    });
  });
});