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

5. **Multi-Stage Dockerfiles:**
   - *Why?* Separating the build stage from the production stage produces significantly smaller final images. The builder stage includes all `devDependencies` for compilation, while the production stage only contains `node_modules` with production dependencies.
   - *Security:* The production container runs as the non-root `node` user, following the principle of least privilege.

6. **ECS Fargate over EC2:**
   - *Why?* Fargate is serverless — no OS patching, no SSH key management, no capacity planning. AWS manages the underlying infrastructure, letting us focus on the application code.
   - *Cost:* For a university project with low traffic, Fargate's per-second billing is more cost-effective than a dedicated EC2 instance running 24/7.

7. **SSM Parameter Store for Secrets (Not Hardcoded):**
   - *Why?* Secrets like `MONGO_URI` and `JWT_SECRET` must never be baked into Docker images or committed to Git. SSM Parameter Store provides encrypted-at-rest secrets that ECS injects as environment variables at container startup.
   - *Benefit:* Changing a secret doesn't require a new Docker image build — just restart the ECS task.

8. **Dual Image Tagging (SHA + Latest):**
   - *Why?* The commit SHA tag provides exact traceability (which code is running?), while the `latest` tag provides convenience for manual testing and rollback reference.

9. **CI Gate Before Deployment:**
   - *Why?* The `deploy` job depends on the `ci` job passing. This ensures broken code is never deployed to production — linting, tests, and the frontend build must all succeed first.

10. **CloudWatch Logging with `awslogs` Driver:**
    - *Why?* ECS Fargate containers don't have SSH access, so `console.log()` output must be routed to CloudWatch for debugging. The `awslogs-stream-prefix: ecs` setting organizes logs by task ID.

## Challenges Faced

- **Testing State Management:** Passing Authentication tokens accurately across multiple isolated integration tests required creating an intelligent global setup script (`__tests__/setup.js`).
- **File Uploads Handling:** Managing `multipart/form-data` strictly for image types while rejecting other files to ensure security. Addressed utilizing Multer validation middleware.
- **Docker Build Context:** Careful `.dockerignore` configuration was needed to prevent `.env` files, `node_modules`, and test fixtures from leaking into the Docker image.
- **ARN Format Precision:** AWS IAM ARNs use `arn:aws:iam::<ACCOUNT_ID>:role/...` (double colon for the empty region field). This subtle syntax caused initial task registration failures until corrected.
- **Health Check Timing:** The `startPeriod` in the ECS health check had to be tuned to allow enough time for the Node.js server to connect to MongoDB Atlas before the first health probe.
