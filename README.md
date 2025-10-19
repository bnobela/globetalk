# GlobeTalk 🌍✉️
A virtual pen pal platform connecting people worldwide through text, audio, and video messages. Designed to foster cultural exchange, language learning, and global friendships in a safe and moderated environment.

---
## Codecov
[![codecov](https://codecov.io/gh/GlobeTalk/globetalk/graph/badge.svg?token=HK5GTNDVSR)](https://codecov.io/gh/GlobeTalk/globetalk)

---

## 📌 Table of Contents
- [About the Project](#about-the-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## 📖 About the Project
GlobeTalk is an online platform that connects people from different countries to exchange messages, learn languages, and share cultures. The system matches users based on interests, language preferences, and availability.

**Target Users:**
- Language learners
- Cultural exchange enthusiasts
- Students and educators
- Travelers seeking connections

---

## ✨ Features 
- **Smart Matchmaking** – Find pen pals with shared interests or complementary languages.
- **Text** - Text based only platfrom
- **Cultural Exchange Prompts** – Conversation starters to encourage sharing.
- **Moderation & Safety** – Report/block system, content filters, and verified profiles.
- **Language Tools** – Inline translation, dictionary lookups, and pronunciation guides.
- **Profile Customization** – Add bio, interests, and location (optional).
- **Gamification** – Badges and streaks for active participation.

---

## 🛠 Tech Stack
**Frontend:**
- HTML
- CSS
- Javascript(Vanilla)  

**Backend:**
- Clerk
- Firebase Auth  
- Firebase Functions

**Other Tools:**   
- ESLint for code style

---

## 📁 Folder Structure
**docs**
- Storage for each Sprint Documents

**scripts**
- Store the orgranizations's script files

**src**
- **backend** - backend content
- **frontend** - frontend content

**tests**
- Code testing environment files
---

## 📲 Installation
- **Initialize npm**
```bash
npm init -y
```
- **Install ESlint**
```bash
npm install eslint --save-dev
npx eslint --init
```
- **Install Jest**
```bash
npm install jest --save-dev
```
---

## Usage
---

## 📜Contribution Guidelines

## 1. Branching Strategy
- **Main Branch (`main`)**: Always stable, production-ready code.
- **Testing Branch (`testing`)**: For integrating and validating features before merging into `main`.
- **Feature Branches (`feature/xyz`)**: Created for each new feature or bug fix.

## 2. Workflow Steps
1. **Create a Feature Branch**
   - Name: `feature/<short-description>`
   - Based on: `testing` branch

2. **Implement and Commit**
   - Follow clear commit messages: `type(scope): message`
     - Example: `feat(auth): add login functionality`

3. **Push to GitHub**
   - Push only the feature branch, not directly to `testing` or `main`.

4. **Create Pull Request (PR)**
   - Base branch: `testing`
   - Compare branch: your feature branch
   - Title: Short and descriptive
   - Description: Include purpose, changes made, and testing notes.
## 3. Code Review
- At least **one reviewer** must approve.
- Reviewers check:
  - Code quality
  - Functionality correctness
  - No breaking changes
## 4. Testing & Code Coverage
- Run tests locally before PR.
- CI pipeline should run:
  - Unit tests
  - Integration tests
  - Code coverage (minimum threshold: e.g., **80%**)
- Fail the PR if coverage drops below the set threshold.
## 5. Merging Rules
- **From `feature` → `testing`**: Allowed after approval and passing CI checks.
- **From `testing` → `main`**: Only after all features are validated and tested.
## 6. Post-Merge
- Delete merged feature branch.
- Update local branches with:
  ```bash
  git checkout testing
  git pull origin testing
  ```
---

## License
---

## Contact
