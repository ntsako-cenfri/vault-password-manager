# User Profile for AI Agent Collaboration
# This file serves as a source of truth for the agent regarding technical capabilities, workflow, and standards.

user_profile:
  name: "[Your Name]"
  role: "Lead Product Engineer & Aesthetic Architect"
  last_updated: "2024-04-13"
  
  unique_identity_markers:
    - "Resilience & Growth: Grew from nothing to something; values hard-earned excellence and high-stakes reliability."
    - "Zero Disappointments: Has no tolerance for avoidable failures; demands bulletproof logic and execution."
    - "The 'Dress to Impress' Standard: Every deliverable must be polished, professional, and ready for the executive boardroom."
    - "The Gatekeeper: AI is an advisor; only the user has the authority to 'Push', 'Deploy', or 'Commit'."
    - "Confirmation-Driven: Every significant architectural shift or non-routine operation is executed ONLY after explicit user confirmation."
    - "Test-Obsessed: No code moves forward without 100% pass rate. Tests are the absolute source of truth for stability."
    - "Distributed Pioneer: Architecture designed for horizontal growth; 1-node local dev, multi-node prod flexibility."
    - "Security Sentinel: Zero tolerance for supply chain leaks or dependency vulnerabilities (NPM/Python)."
    - "Minimalist Explainer: Prefers subtle comments that explain 'Why', not 'What'."
    - "Visual Maverick: Obsessed with aesthetics that 'ordinary people have never seen before'."

  core_motivation: 
    - "High-impact, high-end aesthetics that transcend standard UI kits."
    - "Human-Centered Design: Applying 'The Design of Everyday Things' (Norman) to digital interfaces."
    - "Elastic Scalability: Systems that thrive under pressure through distributed processing."
    - "Extreme reliability: Demos must be bulletproof; deployments must be idempotent."
    - "Continuous Evolution: Always using the bleeding edge of technology; no legacy shortcuts."

  architectural_philosophy: 
    - "Terraform-First: All infrastructure must be defined as code (IaC) before service implementation."
    - "DRY Principle: Strict enforcement of 'Don't Repeat Yourself'; zero tolerance for code duplication. Logic must be abstracted into reusable modules."
    - "Distributed-First Architecture: Logic must be decoupled to allow horizontal scaling across nodes."
    - "Microservices Architecture (Docker-first isolation)"
    - "PostgreSQL Mastery: Primary database for all builds. Emphasis on performance and data integrity."
    - "Performance Optimization: Zero tolerance for slow queries. Use Materialized Views (MV) for complex data retrieval."
    - "Vertical Slice Architecture: Grouping by feature to prevent cross-feature 'bombing'."
    - "Strict Separation of Concerns (SoC): No SQL/DB logic in the View layer."
    - "Idempotency: All deployment and system operations must be repeatable without side effects."

  technical_proficiency:
    languages_and_tools:
      primary: "Python (Subtle, professional commenting style)"
      web_stack: "Modern JavaScript/TypeScript (React/Node.js) with strict NPM security audits."
      distributed_systems: "Redis / RabbitMQ (Brokers), Celery / Dramatiq (Task Queues), Docker Swarm / K8s"
      database: "PostgreSQL (Expert-level queries, indexing, and Materialized Views)"
      infrastructure_as_code: "Terraform / HCL"
      environment: "Linux / macOS (Local) / Docker (Containerization)"
      infrastructure: "Microservices / Docker Compose"
    
    security_standards:
      philosophy: "Zero Trust / Data Hardening / Least Privilege"
      supply_chain_security: "Mandatory scanning of third-party packages (npm audit, pip-audit, Snyk) to prevent dependency leaks and malicious injections."
      data_security: "Strict encryption; data must be unreadable even in a breach scenario."
      access_control: "Service accounts must have strictly limited, scope-specific access (PoLP)."
      secrets_management:
        strategy: "Automated Environment-Aware Injection"
        priority_1: "GitHub Actions Secrets (Scoped to 'development' and 'production' environments)"
        priority_2: "Managed Secret Manager (if available via specific service provider)"
        priority_3: "Local Host Export (for local development ONLY, via ~/.secrets)"
        docker_implementation: "Interpolated .env files in Docker Compose (KEY=${ENV_VAR}) populated by CI/CD context."
        rule: "Automated rotation and injection via GitHub Actions based on branch target (main/dev)."
      pii_protection: "Mandatory PII scanning in CI/CD pipelines."

    workflow_and_cicd:
      platform: "GitHub (Local -> Dev -> Main)"
      sync_strategy: "Environment Parity (Local == Dev Branch == Server State)"
      node_scaling: "Dynamic Node Provisioning: Single-node local dev to N-node production scaling via Docker/Terraform."
      gitignore_protocol: "Aggressive .gitignore for OS metadata, secrets, and local environment files."
      pre_deployment_gate: "Zero-Failure Policy: 100% Pytest pass rate required locally before push, and in CI before deployment."
      ci_checks:
        - "Linting & Formatting"
        - "Terraform Security & Compliance (tfsec, checkov, or plan-scan)"
        - "Dependency Vulnerability Audit (npm audit / pip-audit / Snyk)"
        - "PII & Hardcoded Secret Scanning (Fail-fast)"
        - "DB Safety: Hard block on destructive ops (DROP/DELETE) in production."
      automation:
        - "AI Summary: Every PR must summarize 'The Person's Intent' and impact."
        - "Contextual Secret Injection: Automated mapping of secrets based on branch merge (Main=Prod, Dev=Dev)."
        - "State Drift Detection: Verify that server runtime matches GitHub HEAD after deploy."
      approvals_gatekeeping:
        - "Dev Branch: 1 Approval (User supercedes all/can bypass)."
        - "Main/Prod: 2 Approvals (User is final authority)."
      deployment: "Local Push -> GitHub Actions (Env Injection) -> SSH to Server -> Git Pull -> Idempotent Redeploy."

  design_standard:
    vibe: "Extraordinary aesthetics; fluid motion; high-end typography; unique UX metaphors."
    philosophy: "The Design of Everyday Things (Norman Principles)."
    key_tenets:
      - "Affordances & Signifiers: Interactions must be intuitive and discoverable."
      - "Feedback: Every action must have an immediate, clear response."
      - "Mapping: Controls should logically correspond to their effects."
      - "Constraints: System design should prevent errors before they happen."
      - "Mental Models: Design must leverage existing user familiarity to ensure zero struggle in navigation."
      - "Discoverability: Users must never struggle to find information or tools within the build."
    principle: "Unordinary look, familiar feel. Every interaction must feel expensive yet inherently logical and easy to locate."

  testing_and_stability:
    frameworks: "Pytest / Unittest / Playwright"
    methodologies:
      - "Atomic Module-Test Pairs: A module does not exist without its corresponding test file."
      - "Synthetic Data Generation: Mandatory Positive, Negative, and Edge-Case dummy data."
      - "Regression Mitigation: AI must perform 'Dependency Impact Analysis' before proposing fixes."
      - "Parity Testing: Validate that local Docker environment accurately simulates production constraints."
      - "Hard Gate: No code is 'done' or 'ready' until all associated tests pass with 0 errors."

# AI Guidance:
# 1. Prioritize the 'Wow' Factor: Aim for 'unordinary' design and high-end polish. Everything should be 'presentation-ready'.
# 2. Human-Centered Logic: Use Norman's principles (signifiers, feedback, mapping) to ensure 'unordinary' designs remain usable.
# 3. Discoverability First: Ensure critical actions and data are easily locatable. Leverage familiar icons, placements, and workflows.
# 4. Consultative Growth & Proactive Advice: 
#    - If the user suggests an outdated method, AI MUST advise on the latest modern alternative.
#    - If a logic path leads to failure or 'disappointment', AI MUST flag it and ask for confirmation before proceeding.
# 5. Command Authority & Confirmation: 
#    - The user is the gatekeeper. NEVER push, deploy, or commit without explicit user confirmation.
#    - For any non-obvious change, provide the rationale first and wait for confirmation.
# 6. Terraform-First: Propose IaC configuration and scoped service accounts before service logic.
# 7. PostgreSQL Optimization: AI must proactively audit query performance. If a query is slow, AI must propose indexing or Materialized Views (MV) with a robust refresh strategy.
# 8. Distributed Design: For task-heavy modules, propose a worker-node pattern (Redis/Celery) to allow horizontal scaling. Ensure the local dev setup remains simple (1-node) but production-ready.
# 9. Supply Chain Guardrails: Proactively audit all proposed NPM or Pip packages. NEVER suggest a package with known vulnerabilities or a low "reputation" score. Ensure `npm audit` is part of the core project scaffolding.
# 10. DRY Enforcement: Proactively identify and refactor duplicated logic. AI must ensure every function and service is lean and single-purpose.
# 11. Atomic Verification: No module is complete without a passing test.
# 12. Test Hard-Gate: AI must NEVER suggest a deployment step unless all tests are confirmed passed. If tests fail, fixing the tests is the ONLY priority.
# 13. Separation of Concerns: Hard enforcement. Business logic belongs in services/repositories, not views.
# 14. Documentation: Focus on the 'Why'.
# 15. Security: Assume breach capability; design data to be unreadable.
# 16. Environment Awareness: Assume automated secret injection via GitHub environments.
# 17. State Sync: Ensure changes work consistently across Local, Dev, and Prod. Flag discrepancies immediately.
# 18. The Reveal: Summarize work as an executive presentation—highlighting stability, security, and Norman-aligned UX.