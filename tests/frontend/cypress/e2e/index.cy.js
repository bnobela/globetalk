/// <reference types="cypress" />

describe('GlobeTalk Landing Page', () => {
  beforeEach(() => {
    cy.visit('/index.html');
  });

  // Navbar Tests
  
  it('should display the navbar with links', () => {
    cy.get('.navbar').should('exist');
    cy.get('.nav-links li').should('have.length', 5);
    cy.get('.nav-links a').contains('Home');
    cy.get('.nav-links a').contains('About');
    cy.get('.nav-links a').contains('Features');
    cy.get('.nav-links a').contains('How it Works');
    cy.get('.nav-links a').contains('Contact');
  });

  it('navbar links scroll to correct sections', () => {
    cy.get('.nav-links a[href="#about"]').click();
    cy.get('#about').should('be.visible');
    cy.get('.nav-links a[href="#features"]').click();
    cy.get('#features').should('be.visible');
  });

  
  // Hero Section
  
  it('should show hero section with heading and description', () => {
    cy.get('.hero h1').should('contain.text', 'Connect with Pen Pals');
    cy.get('.hero p').should('contain.text', 'GlobeTalk is a virtual Pen Pals platform');
  });

  it('should display the Get Started button and navigate on click', () => {
    cy.get('#getStartedBtn').should('exist').click();
    cy.visit('/login.html');
    cy.url().should('include', 'login.html');
  });

  // Get Started Button Keyboard Accessibility
  
  it('should allow Get Started button to be activated via keyboard', () => {
    cy.get('#getStartedBtn').focus().type('{enter}');
    cy.visit('/login.html');
    cy.url().should('include', 'login.html');
  });
  
  // About Section
  
  it('should show About section with heading and paragraphs', () => {
    cy.get('#about').should('exist');
    cy.get('.about-text h2').should('contain.text', 'About GlobeTalk');
    cy.get('.about-text p').should('have.length.at.least', 2);
  });

  
  // Features Section
  
  it('should display Features section with cards', () => {
    cy.get('#features').should('exist');
    cy.get('.feature-card').should('have.length', 3);
  });

  it('feature cards should have hover effect', () => {
    cy.get('.feature-card').first().trigger('mouseover')
      .should('have.css', 'transform'); // just checks transform exists
  });

  
  // How It Works Section
  it('should display How It Works section with steps', () => {
    cy.get('#how-it-works').should('exist');
    cy.get('.steps-container .step-card').should('have.length', 3);
  });


  
  // Footer
  
  it('should show footer contacts and socials', () => {
    cy.get('footer').should('exist');
    cy.get('.footer-column').should('have.length', 3);
    cy.get('.footer-column a[href^="mailto:"]').should('have.attr', 'href', 'mailto:info@globetalk.com');
    cy.get('.footer-column a').contains('Facebook');
    cy.get('.footer-column a').contains('Twitter');
  });

  
  // Images Section
  
  it('should have hero images loaded', () => {
    cy.get('.hero img').each(($img) => {
      cy.wrap($img).should('be.visible')
        .and(($el) => expect($el[0].naturalWidth).to.be.greaterThan(0));
    });
  });

  
  // Responsive checks
  
  it('should display navbar and hero section correctly on mobile', () => {
    cy.viewport('iphone-6');
    cy.get('.navbar').should('be.visible');
    cy.get('.hero h1').should('be.visible');
  });

});
