# TestHub Glossary

> Plain English definitions for testing terms. No jargon, no confusion.

---

## A

### Accessibility (a11y)
Making software usable by people with disabilities. Like wheelchair ramps for buildings—ensuring everyone can use your product regardless of ability. TestHub checks for screen reader compatibility, keyboard navigation, and color contrast.

### API (Application Programming Interface)
How different parts of software talk to each other. Think of a waiter taking your order to the kitchen—the waiter is the API between you and the chef. TestHub tests these behind-the-scenes communications.

### Assertion
A check that something is true. "This button should be blue" is an assertion. If the button is actually red, the assertion fails and the test fails.

### Automated Testing
Using software to test software, instead of humans clicking around manually. TestHub does this—a robot browser clicks through your app checking everything works.

---

## B

### Browser
The app you use to visit websites—Chrome, Firefox, Safari, Edge. TestHub controls browsers automatically to run tests.

### Bug
A problem or error in software. Like a typo in a book, but for code. Bugs cause features to not work correctly.

### Build
The process of preparing software for use. Like assembling ingredients into a meal. A "broken build" means the software won't compile or start.

---

## C

### CI/CD (Continuous Integration / Continuous Deployment)
Automatic testing and releasing of software. When you push code, robots automatically test it (CI) and deploy it if tests pass (CD). No manual steps needed.

### CLS (Cumulative Layout Shift)
How much the page jumps around while loading. You've experienced bad CLS when you try to click something and it moves, causing you to click the wrong thing. Good CLS is under 0.1.

### Component
A reusable piece of the user interface. A button is a component. A dropdown menu is a component. TestHub can test components in isolation.

### Contract Test
A test that verifies API responses have the expected format. Like checking both parties follow a handshake agreement—"You promised to send data in this format."

### Coverage
How much of the software is tested. "80% coverage" means 80% of the code has tests checking it. Higher is better, but 100% isn't always necessary.

---

## D

### Debug
Finding and fixing bugs. Like being a detective, following clues to find what went wrong.

### Deployment
Putting software live for users to access. Moving code from development to the real server.

---

## E

### E2E (End-to-End)
Testing the whole user journey, not just individual parts. From logging in, to creating content, to logging out—the complete experience.

### Element
A single item on a webpage—a button, a link, an image, a text field. Tests interact with elements.

---

## F

### Failed
A test result meaning something went wrong. The test expected one thing but got another. Needs investigation.

### FCP (First Contentful Paint)
When the first content appears on screen after you navigate to a page. Users want to see something quickly, even if the page isn't fully loaded yet. Good FCP is under 1.8 seconds.

### Fixture
Pre-set test conditions. Like setting the table before dinner—everything is ready before the main event. Test fixtures might include logged-in users or pre-created data.

### Flaky Test
A test that sometimes passes, sometimes fails, without any code changes. Unreliable and frustrating. Flaky tests need fixing because you can't trust their results.

---

## G

### Green
Tests passed. All good! Safe to proceed.

---

## H

### Headed Mode
Running tests with a visible browser window. You can watch the robot click around. Good for debugging but slower.

### Headless Mode
Running tests without a visible browser. Faster and used for CI/CD. The browser runs invisibly in the background.

---

## I

### Integration Test
Testing how different parts work together. Not just "does the button work?" but "when I click the button, does the right data save?"

---

## L

### LCP (Largest Contentful Paint)
When the main content appears on screen. The biggest visible thing (usually an image or text block). Users judge loading speed by LCP. Good LCP is under 2.5 seconds.

### Locator
How tests find elements on a page. Like an address for a button. "Find the Submit button" or "Find the email input field."

---

## M

### Mock
Fake data or services used in testing. Like a practice dummy. If testing email sending, you might mock the email service so you don't send real emails.

---

## P

### Page Object
A pattern for organizing test code. Instead of writing "click button X, fill field Y" repeatedly, you create a reusable "LoginPage" object that knows how to interact with the login page.

### Passed
A test result meaning everything worked as expected. No problems found.

### Performance Testing
Measuring how fast the app loads and responds. Are pages loading quickly enough? TestHub checks against performance budgets.

### Pipeline
A series of automated steps. Like an assembly line. Code goes in one end, and if it passes all quality checks, it comes out the other end ready to deploy.

### Playwright
The testing tool TestHub uses. Made by Microsoft. It controls browsers and checks that websites work correctly.

---

## R

### Red
Tests failed. Problems found. Stop and fix before proceeding.

### Regression
Something that used to work but now doesn't. You "regressed"—went backwards. Regression testing catches these by re-running old tests on new code.

### Report
A summary of test results with details. Shows what passed, what failed, and includes screenshots and videos as evidence.

### Retry
Running a failed test again automatically. Sometimes tests fail due to timing issues, and retrying helps confirm if it's a real problem or just a fluke.

---

## S

### Screenshot
A picture of the screen when a test runs. Like evidence. When tests fail, screenshots show exactly what was on screen.

### Selector
Code that identifies an element. Like a name tag for a button. "The button with text 'Submit'" or "The input with id 'email'."

### Skipped
A test that wasn't run. Intentional—maybe the feature isn't ready, or the test is temporarily disabled.

### Smoke Test
Quick basic tests that check if the app is alive. Like checking if your car starts before a road trip. You're not testing everything, just the essentials.

### Snapshot
A saved state for comparison. Take a snapshot of how something looks, then later compare to see if anything changed. Used in visual testing.

---

## T

### Test
An automated check that something works correctly. Code that exercises your application and verifies the results.

### Test Data
Fake data used during testing. Fake users, fake content, fake transactions. Never real user data.

### Test Suite
A collection of related tests. "The authentication test suite" contains all tests related to logging in, signing up, etc.

### Timeout
When something takes too long and gives up. If a page doesn't load within 30 seconds, the test times out and fails.

### TTFB (Time to First Byte)
How fast the server responds when you request a page. Before any content appears, the server needs to respond. Good TTFB is under 0.8 seconds.

### TTI (Time to Interactive)
When you can actually click things on the page. The page might appear, but you can't click buttons until it's fully loaded. Good TTI is under 3.8 seconds.

---

## U

### UI (User Interface)
What users see and interact with. Buttons, forms, images, text—everything visual.

### Unit Test
Testing a single small piece of code in isolation. Like testing one Lego piece before building. Very fast and focused.

---

## V

### Visual Testing
Comparing screenshots to detect visual changes. Take a picture now, compare to the picture from last week. Highlights any differences.

---

## W

### WCAG (Web Content Accessibility Guidelines)
The rules for making websites accessible to people with disabilities. WCAG 2.1 Level AA is the common target. TestHub checks many WCAG rules automatically.

### Webhook
An automatic notification sender. When tests finish, a webhook sends a message to Slack/Discord. Like a doorbell that rings automatically.

### Worker
A process that runs tests. More workers = more tests running in parallel = faster results. TestHub uses multiple workers by default.

---

## Numbers & Symbols

### 200 (HTTP Status Code)
Success! The server processed your request correctly.

### 404 (HTTP Status Code)
Not found. The page or resource doesn't exist.

### 500 (HTTP Status Code)
Server error. Something went wrong on the server side.

---

*Can't find a term? Check the [full documentation](GUIDE.md) or ask the team.*
