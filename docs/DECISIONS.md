# Design Decisions & Challenges

During the development of peer2peer, several critical architectural and design decisions were made to fulfill the requirements of a student-oriented marketplace.

## Key Design Decisions

1. **Light & Minimalist UI:**
   - *Why?* College students value speed and clarity. A minimalist design focuses the user entirely on the product images and details rather than UI clutter.
   - *Implementation:* Custom CSS using a strict color palette, standardized spacing components (design tokens), and intuitive empty states.

2. **JWT for Authentication (Stateless):**
   - *Why?* Allows for horizontal scalability if the backend needs to expand. No server-side session memory is required.

3. **In-Memory MongoDB for Testing:**
   - *Why?* Utilizing `mongodb-memory-server` allows integration tests to run entirely isolated from the actual development/production database, preventing accidental data pollution and permitting tests to run cleanly in CI pipelines.

4. **Idempotent Bash Scripts:**
   - *Why?* Setup and deployment scripts must be safe to execute multiple times without causing side effects or failures (e.g., using `mkdir -p` or checking `if [ ! -f .env ]`).

## Challenges Faced

- **Testing State Management:** Passing Authentication tokens accurately across multiple isolated integration tests required creating an intelligent global setup script (`__tests__/setup.js`).
- **File Uploads Handling:** Managing `multipart/form-data` strictly for image types while rejecting other files to ensure security. Addressed utilizing Multer validation middleware.
