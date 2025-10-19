/// <reference types="cypress" />

describe('GlobeTalk - Settings & Safety Page (HTML structure only)', () => {
  beforeEach(() => {
    // Visit the settings page
    cy.visit('/settings.html');
  });

  it('renders the correct page title', () => {
    cy.title().should('eq', 'GlobeTalk - Settings & Safety');
  });

  it('renders the navigation bar with links', () => {
    cy.get('header').within(() => {
      cy.get('.logo').contains('GlobeTalk').should('exist');
      cy.get('nav ul').within(() => {
        cy.get('li a').contains('Home').should('have.attr', 'href', 'index.html');
        cy.get('li a').contains('About').should('have.attr', 'href', 'about.html');
        cy.get('li a').contains('Find Pen Pal').should('have.attr', 'href', 'findPal.html');
        cy.get('li a.active').contains('Settings & Safety').should('have.attr', 'href', 'settings.html');
      });
    });
  });

  it('renders the settings header', () => {
    cy.get('section.settings .settings-header').within(() => {
      cy.get('h1').contains('Settings and Safety').should('exist');
    });
  });

  it('renders the user info section', () => {
    cy.get('div.settings-box .user-info').within(() => {
      cy.get('p strong#username').contains('User123').should('exist');
    });
  });

  it('renders the profile information section with form fields', () => {
    cy.get('div.settings-box').within(() => {
      cy.get('h3').contains('Profile Information').should('exist');
      cy.get('form#settingsForm').within(() => {
        // Language select
        cy.get('label').contains('Language Preferences:').should('exist');
        cy.get('select#language').should('exist').find('option').should('have.length.at.least', 10);
        cy.get('select#language option[value=""]').contains('Select your language').should('exist');
        cy.get('select#language option[value="English"]').contains('English').should('exist');

        // Timezone select
        cy.get('label').contains('Region/Time Zone:').should('exist');
        cy.get('select#timezone').should('exist').find('option').should('have.length.at.least', 4);
        cy.get('select#timezone option[value=""]').contains('Select your Region/Time Zone').should('exist');
        cy.get('select#timezone option[value="SA(GMT+2)"]').contains('SA(GMT+2)').should('exist');
      });
    });
  });

  it('renders the personal info section with form fields', () => {
    cy.get('div.settings-box').within(() => {
      cy.get('h3').contains('Personal Info').should('exist');
      cy.get('form#settingsForm').within(() => {
        // Age range select
        cy.get('label').contains('Age Range:').should('exist');
        cy.get('select#ageRange').should('exist').find('option').should('have.length.at.least', 4);
        cy.get('select#ageRange option[value=""]').contains('Select your age range').should('exist');
        cy.get('select#ageRange option[value="18-24"]').contains('18-24').should('exist');

        // Gender select
        cy.get('label').contains('Gender:').should('exist');
        cy.get('select#gender').should('exist').find('option').should('have.length.at.least', 3);
        cy.get('select#gender option[value=""]').contains('Select your gender').should('exist');
        cy.get('select#gender option[value="male"]').contains('Male').should('exist');

        // Interests select
        cy.get('label').contains('Interests:').should('exist');
        cy.get('select#interests').should('exist').find('option').should('have.length.at.least', 6);
        cy.get('select#interests option[value=""]').contains('Select your interests').should('exist');
        cy.get('select#interests option[value="reading"]').contains('Reading').should('exist');

        // Bio textarea
        cy.get('label').contains('Short Bio:').should('exist');
        cy.get('textarea#bio').should('exist').should('have.attr', 'placeholder', 'Write something about yourself...');
      });
    });
  });

  it('renders the save changes button', () => {
    cy.get('div.settings-box form#settingsForm button[type="submit"]')
      .contains('Save Changes')
      .should('exist')
      .should('not.be.disabled');
  });
});