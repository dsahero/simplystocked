# SimplyStocked: Hackathon Submission for Social Good

### Describe the ways the solution addresses the company's challenge.

SimplyStocked addresses the operational challenges of The Market of Virginia Tech by digitizing a manual workflow that relied on physical media and Excel entry, which leaves room for a lot of human error. Our solution implements an automated inventory pipeline that reduces data entry time by an estimated 80%, transitioning from roughly 10 minutes per invoice to under 2 minutes. We built a multimodal OCR system (with the help of Gemini) that parses dense vendor invoices directly into structured JSON, allowing non-technical volunteers to log incoming stock by simply uploading a photo. Beyond OCR, our advanced analytics suite provides real-time popularity forecasting to predict high-demand items based on distribution history, comprehensive vendor spending analysis for precise budget optimization, and granular stock distribution insights across the Open Market and Grocery Store programs. These insights help eliminate "inventory drift" through periodic checkpoints that set new baselines, ensuring 98% matching accuracy and providing the actionable data necessary to preemptively address food waste and maximize community social impact.


### Describe the steps you took to test your solution with real users.

Our team prioritized a user-centric design process through direct engagement with food access leadership and volunteers. We conducted the following steps:

1. **Leadership Consultation**: We held a series of phone interviews and meetings with Isabelle Largen, Assistant Director for Food Access Initiatives at VT Engage. These sessions provided critical insights into the logistical overhead of managing two distinct distribution models.
2. **Volunteer Shadowing**: We observed a volunteer at the market to identify the specific repetitive tasks that lead to data entry fatigue. This helped us refine the UX of the Review and Commit workflow.
3. **Community Outreach**: We collaborated with the Blacksburg Interfaith Food Pantry to validate our architecture for scalability beyond the campus environment.

Three specific feedback points received:
* "We need to see exactly where our money is going each month because our grants depend on cost reporting."
* "The volunteers find Excel intimidating; a simple button-based interface would be much better."
* "We often have to shuffle produce between the pantry and the store depending on who walks in first."

### What did you learn and how did it help improve your solution?

Learning from Isabelle Largen and the market staff revealed that technical sophistication must never compromise volunteer accessibility. We implemented the following three specific improvements based on this feedback:

1. **Role-Based Access Control (RBAC)**: Developed a secure permission system that allows volunteers to log stock while restricting sensitive cost analysis and rollover functions to administrative staff.
2. **Integrated Program Transfers**: Built a dedicated "Transfer" module that enables one-click movement of inventory between programs, ensuring the "Grocery Store" and "Open Market" tallies remain synchronized.
3. **Smart Pricing Toggles**: Added support for both unit and weight-based pricing models to accommodate FSWV "Agency Order" fees which differ from traditional retail billing.

### How can the solution be implemented with the technology used?

Implementation requires a modern cloud-native environment capable of hosting a containerized backend and a responsive frontend. The following resources are essential:
* **Google Cloud Project**: To manage API credentials and compute resources.
* **Google Cloud SQL (MySQL)**: For persistent, managed storage of inventory, vendors, and invoices.
* **Google Cloud Run**: For serverless deployment of the FastAPI backend.
* **Google Gemini API Key**: To power the multimodal extraction and the SimplyStocked AI Assistant.
* **Node.js and Python Runtimes**: For executing the project codebases.

### Which specific technical products and platforms did you choose and why?

We chose **Google technology** as the backbone of SimplyStocked for its integration and security:
* **Google Gemini 1.5 Flash**: Selected for its multimodal vision capabilities, allowing for high-accuracy OCR on low-quality smartphone photos of invoices. It provides the low latency needed for a smooth volunteer experience.
* **Google Cloud SQL (MySQL)**: Chosen over NoSQL alternatives for its support of complex relational queries required for end-of-year rollovers and trend analysis.
* **Google OAuth 2.0**: Implemented to provide a secure, unified login experienced for university staff.
* **Antigravity**: Used for rapid prototyping and ensuring the robust integrity of our business logic through agentic validation.

### Describe the architecture that your team chose for your solution.

The SimplyStocked architecture follows a decoupled Client-Server model optimized for security and privacy:

* **Frontend (React / Vite)**: Provides a premium, responsive UI utilizing Framer Motion for micro-animations. It handles the "Local-First" invoice ingestion where data is extracted and sanitized before being sent to the database.
* **Backend (FastAPI)**: A high-performance RESTful API that coordinates business logic. It utilizes SQLAlchemy as an ORM to prevent SQL injection and implements Zero-Trust RBAC.
* **Persistence Layer (Google Cloud SQL)**: Maintains the relational data model including FoodProduct, StockSnapshot, and CheckPoint tables.
* **Intelligence Layer (Google Gemini)**: Acts as a multimodal parsing engine for external document data and a context-aware assistant for volunteer guidance.
* **Security Layer**: Uses HS256 JWT signatures for session management and Bcrypt for enterprise-grade password hashing.

### What do you see as the future / next steps for your project?

The next phase of SimplyStocked focuses on regional expansion and predictive logistics. We plan to:
1. **Multi-Pantry Coordination**: Scale the architecture to allow groups like the Blacksburg Interfaith Food Pantry to share demand data while maintaining independent inventories.
2. **Predictive Analytics**: Leverage Gemini to analyze historical checkpoint data and forecast "popular" items, allowing the market to buy correctly and reduce waste.
3. **Enhanced Privacy**: Further refine the local processing of invoices to ensure all sensitive vendor banking information is automatically redacted at the edge before cloud persistence.
