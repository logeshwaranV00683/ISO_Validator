# ISO 8583 Validator — Backend Sprint Plan

**Team:** 4 Developers (Dev A, Dev B, Dev C, Dev D)
**Duration:** 10 Days | 2 Sprints × 5 Days
**Stack:** Spring Boot 3.2 · Spring Cloud · MySQL · jPOS · RabbitMQ · Redis · Ollama

---

## Laptop Setup — Mandatory Tools

| Tool | Version | Purpose |
|---|---|---|
| Java (JDK) | 21 LTS | Spring Boot 3.2 requires min 17, 21 preferred |
| Maven | 3.9.x | Multi-module monorepo build |
| IntelliJ IDEA | Latest | IDE (Community free, Ultimate better) |
| Docker Desktop | Latest | Run MySQL, Redis, RabbitMQ via containers |
| MySQL | 8.0+ | Database (run via Docker) |
| Redis | 7.x | Rate limiting + run_reference counter |
| RabbitMQ | 3.12+ | Async messaging (management UI at :15672) |
| Ollama | Latest | Local AI LLM — `ollama pull mistral:7b` |
| Git | Latest | Version control |
| Postman | Latest | API testing + collection sharing |

### One-Shot Docker Compose

```yaml
# docker-compose.yml — run: docker-compose up -d
services:
  mysql:
    image: mysql:8.0
    ports: ["3306:3306"]
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: iso8583_db

  redis:
    image: redis:7
    ports: ["6379:6379"]

  rabbitmq:
    image: rabbitmq:3-management
    ports: ["5672:5672", "15672:15672"]
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
```

---

## Schema Correction — 5 Schemas → 1 Schema (`iso8583_db`)

All 16 tables go into a single schema. Each service still has its own Spring Data repositories — only the DB URL changes. Service boundary is enforced in code, not at the DB level.

### All 16 Tables in `iso8583_db`

| # | Table | Belongs To |
|---|---|---|
| 1 | `users` | Auth Service |
| 2 | `user_sessions` | Auth Service |
| 3 | `system_config` | Auth Service |
| 4 | `switch_profiles` | Profile Service |
| 5 | `message_formats` | Profile Service |
| 6 | `message_format_versions` | Profile Service |
| 7 | `validation_rules` | Rules Service |
| 8 | `rule_allowed_values` | Rules Service |
| 9 | `field_definitions` | Rules Service |
| 10 | `ai_prompt_templates` | AI Service |
| 11 | `ai_prompt_template_versions` | AI Service |
| 12 | `ai_run_logs` | AI Service |
| 13 | `ollama_config` | AI Service |
| 14 | `validation_runs` | History Service |
| 15 | `validation_run_fields` | History Service |
| 16 | `validation_run_errors` | History Service |
| 17 | `audit_logs` | History Service |

> Each service's `application.yml` points to `jdbc:mysql://localhost:3306/iso8583_db`. No cross-service direct DB reads — service boundary enforced via code only.

---

## Developer Role Split (Permanent)

| Developer | Owns |
|---|---|
| Dev A | Auth Service + Validation Engine (core parse + rule evaluation) |
| Dev B | DB Schema + Profile Service + Validation Engine (integrations) |
| Dev C | Infra (Eureka, Config) + Rules Service + AI Service |
| Dev D | API Gateway + RabbitMQ + History Service |

---

## Sprint 1 — Days 1–5 : Foundation + Core Services

**Goal:** Auth ✅ · Profile ✅ · Rules ✅ · Gateway ✅ · Eureka + Config ✅ · DB ✅ · common-lib ✅

---

### Day 1 — Project Skeleton + DB + Infra Base

**Bala — Maven Multi-Module + common-lib**
- Create parent `pom.xml` with all service modules declared
- Create `common-lib` module — implement:
  - `ApiResponse<T>` — standard response envelope (success, error, data, message)
  - `PanMaskingUtil` — mask PAN before any log/DB write
  - `JwtUtil` — RS256 key load, token parse, claims extract
  - `BaseEntity` — `created_at`, `updated_at`, `created_by`, `updated_by`
- Run `mvn install` on common-lib **first** — all other services depend on this

**Logeshwaran — Database Schema + Docker Compose**
- Write `docker-compose.yml` (MySQL 8, Redis 7, RabbitMQ 3-mgmt)
- Write `schema.sql` — all 16 tables with FKs, indexes, constraints
- Run seed data:
  - `ollama_config` INSERT (9 config rows)
  - `system_config` INSERT (default system settings)
- Verify: all tables created, indexes present, foreign keys enforced

**Janani — Eureka Server + Config Server**
- `service-registry` (port 8761):
  - Spring Cloud Eureka, self-preservation OFF for dev mode
  - `/` dashboard accessible
- `config-server` (port 8888):
  - Git-backed or filesystem config
  - Profiles: dev, prod
  - Centralize all `application.yml` configs here

**Nethra — API Gateway skeleton**
- `api-gateway` (port 8080):
  - Spring Cloud Gateway dependency
  - Route config YAML — all 6 service routes declared
  - `CorrelationIdFilter` — inject `X-Correlation-ID` on every request
  - CORS global filter — allow frontend origin
  - Actuator health endpoint working

---

### Day 2 — Auth Service Core + Gateway Security

**Bala — Auth Service: Users CRUD**
- `UserController`, `UserService`, `UserRepository`
- `POST /users` — ADMIN only, create user, BCrypt password hash
- `GET /users`, `GET /users/{id}`, `PUT /users/{id}`, `DELETE /users/{id}` (soft delete)
- `avatar_initials` auto-derive from `full_name` on create
- `role` enum: ADMIN / ANALYST / VIEWER

**Logeshwaran — Auth Service: Login / Logout / Sessions**
- `POST /auth/login` — verify password (BCrypt), issue RS256 JWT, write `user_sessions`
- `POST /auth/logout` — revoke session (`revoked_at`, `revoke_reason=LOGOUT`)
- Failed login counter — 5 failures → set `locked_until = now + 15min`
- JWT payload: `sub`, `username`, `role`, `iat`, `exp`, `jti` (UUID)
- RS256 key pair — generate on Day 1, distribute public key to all services

**Nethra — Profile Service skeleton**
- `profile-service` (port 8082):
  - `POST /profiles` — create switch_profiles
  - `GET /profiles`, `GET /profiles/{id}`
  - `PUT /profiles/{id}` — update, `PATCH /profiles/{id}/activate`
  - `POST /formats` — create message_format linked to profile
  - `GET /formats/{id}` — fetch format with XML content
  - Feign client skeleton (for future internal calls)

**Janani — Gateway: JwtAuthFilter + Rate Limiter**
- `JwtAuthFilter` (custom GlobalFilter):
  1. Extract `Authorization: Bearer <token>`
  2. Verify RS256 signature with public key
  3. Check expiry (`exp` claim)
  4. Inject headers: `X-Auth-User-Id`, `X-Auth-Username`, `X-Auth-Role`
  5. Reject 401 if check fails
  6. Public routes bypass: `/auth/login`, `/auth/logout`, `/actuator/**`
- Redis `RequestRateLimiter` — 20 req/s replenish, 40 burst capacity

---

### Day 3 — Auth Complete + Rules Service + Profile Versioning

**Bala — Auth Service: RBAC + Internal API + Config**
- `@PreAuthorize` role checks on all endpoints:
  - ADMIN: full access
  - ANALYST: read + validate
  - VIEWER: read only
- `/internal/auth/validate-token` — jti lookup in `user_sessions`, check `revoked_at`
- `/config/**` — `system_config` CRUD (ADMIN only)
- `PUT /users/{id}/password` — BCrypt hash new password, revoke existing sessions, set `password_changed_at`

**Nethra — Profile Service: Versioning + XML Reload**
- `message_format_versions` — on every format update, bump `current_version`, insert version row
- `PUT /formats/{id}/rollback` — restore previous version content
- `/internal/profiles/{id}/format` — internal endpoint for validation-engine Feign call
- RabbitMQ publisher setup:
  - On format update → publish `FORMAT_UPDATED` to `cache.invalidation` exchange
  - On rollback → publish `FORMAT_ROLLED_BACK`

**Janani — Rules Service: Full CRUD**
- `rules-service` (port 8083):
  - `POST /rules` — create validation_rule (per profile_id + mti)
  - `GET /rules?profileId=&mti=` — fetch effective rules (active, not deleted)
  - `PUT /rules/{id}`, `DELETE /rules/{id}` (soft delete)
  - `POST /rules/{id}/allowed-values` — add to `rule_allowed_values`
  - `DELETE /rules/{id}/allowed-values/{value}`
- `/internal/rules` — internal endpoint for validation-engine Feign call

**Logeshwaran — Rules Service: field_definitions + MQ Publish**
- `POST /field-definitions` — create DE catalog entry
- `GET /field-definitions?profileId=&mti=` — fetch for message builder
- `PUT /field-definitions/{id}`, soft delete
- RabbitMQ publish on rule save/delete:
  - `RULE_UPDATED` — `{ profileId, mti }` payload
  - `RULE_DELETED` — same payload
- Bulk rules import — `POST /rules/bulk` (JSON array upload)

---

### Day 4 — Service Testing + RabbitMQ Exchanges

**Bala — Auth Service Testing**
- Postman collection: Login → get JWT → create user → logout → retry with revoked token (expect 401)
- Edge cases: wrong password, locked account, expired JWT, missing Authorization header
- Verify `user_sessions` rows written correctly, `revoked_at` set on logout
- Fix any bugs found

**Nethra — Profile Service Testing**
- Full flow: create profile → add format → activate → update format → verify version bump → rollback
- Verify `FORMAT_UPDATED` message appears in RabbitMQ Management UI (localhost:15672)
- Internal endpoint test: GET /internal/profiles/{id}/format returns XML content

**Janani — Rules Service Testing**
- Add rules for profile+MTI → GET effective rules → delete rule → verify `RULE_DELETED` event fired
- field_definitions CRUD test — verify `is_builder_visible` filter works
- Bulk import test — JSON array of 10 rules, verify all created
- Internal endpoint test: GET /internal/rules returns correct rules

**Logeshwaran — RabbitMQ Full Exchange Setup**
- Declare all exchanges:
  - `validation.events` — type: direct, durable: true
    - Binding: `run.completed` → queue `history.validation-runs`
  - `audit.events` — type: topic, durable: true
    - Binding: `audit.#` → queue `history.audit-logs`
  - `cache.invalidation` — type: fanout, durable: true
    - Binding: → queue `validation-engine.cache-invalidation`
- Configure dead letter queues for each
- Verify all bindings via Management UI
- Declare all queues as durable

---

### Day 5 — E2E Integration + Sprint 1 Stabilize

**Bala — Auth E2E via Gateway**
- `POST /auth/login` through Gateway (port 8080) → Auth Service (8081)
- Verify JWT in response, `X-Correlation-ID` in response headers
- Attach JWT → `GET /users` → verify passes JwtAuthFilter
- Attach invalid JWT → verify 401 returned at Gateway level

**Nethra — Profile E2E via Gateway**
- JWT attach → `POST /profiles` → `POST /formats` → `GET /profiles`
- Verify JwtAuthFilter blocks requests without JWT
- AuditFilter log verify — check service logs for correlation ID
- Eureka dashboard: confirm profile-service registered

**janani — Rules E2E via Gateway**
- Full CRUD through Gateway with valid JWT
- Role test: VIEWER role JWT → try `POST /rules` → expect 403
- `RULE_UPDATED` event verify — end-to-end from API call to RabbitMQ queue

**Logeshwaran — Bug Fixes + DB Verify + Demo Prep**
- All 16 tables: verify indexes, FKs, seed data
- Docker Compose one-command startup test from scratch (`docker-compose down -v && docker-compose up`)
- All services register in Eureka dashboard
- Sprint 1 demo prep — working Auth + Profile + Rules via Gateway

---

## Sprint 2 — Days 6–10 : Engine + AI + History + Integration

**Goal:** Validation Engine ✅ · AI Service ✅ · History Service ✅ · Full E2E ✅ · Demo Ready ✅

---

### Day 6 — Validation Engine Skeleton + AI Base + History Base

**Bala — Validation Engine: jPOS Setup**
- `validation-engine` (port 8084):
  - jPOS `2.1.x` dependency
  - `GenericPackager` XML config — ISO87, ISO93 packager files
  - `IsoParserUtil` — stateless: hex string → `Map<Integer, String>` (DE number → value)
  - Unit test: sample 0200 message parse → verify DE2 (PAN), DE3 (processing code), DE4 (amount), DE11 (STAN)
  - PAN masking applied immediately after parse — never log raw PAN

**Logeshwaran — Validation Engine: Feign Clients + Cache**
- `ProfileClient` — `GET /internal/profiles/{id}/format`
  - Caffeine cache: key = `formatId`, TTL = 30s
  - Resilience4j CB: `profile-cb` config (sliding 10, 50% threshold, 10s wait, 3s timeout)
- `RulesClient` — `GET /internal/rules?profileId=&mti=`
  - Caffeine cache: key = `profileId:mti`, TTL = 30s
  - Resilience4j CB: `rules-cb` config
- `AiClient` — `POST /internal/ai/explain` (Feign to AI Service)
  - Resilience4j CB: `ai-cb` (sliding 5, 60% threshold, 30s wait, 20s timeout)

**Janani — AI Service**
- `ai-service` (port 8085):
  - `POST /ai/templates` — create ai_prompt_templates (GLOBAL or PROFILE scope)
  - `GET /ai/templates`, `PUT /ai/templates/{id}`, soft delete
  - GLOBAL vs PROFILE scope resolution: if PROFILE template exists for profileId → use it; else use GLOBAL
  - Template variable substitution: `{mti}`, `{profile}`, `{errors}`, `{fields}`
  - `/internal/ai/explain` — internal endpoint for validation-engine call

**Nethra — History Service: Consumer Base**
- `history-service` (port 8086):
  - RabbitMQ consumer: `history.validation-runs` queue
  - `ValidationRunEvent` deserialize from JSON
  - Save to: `validation_runs` + `validation_run_fields` + `validation_run_errors`
  - `run_reference` (VLD-xxx) as the lookup key — never use auto-increment `run_id` cross-service
  - Handle duplicate events: check if `run_reference` already exists before insert

---

### Day 7 — Rule Evaluation Engine + AI Logs + Cache Invalidation

**Bala — Validation Engine: RulesEngine Class**
- `RulesEngine` — pure stateless class, no Spring bean, no DB, no I/O
- Input: `List<ValidationRule>` + `Map<Integer, String>` parsedFields
- Output: `List<ValidationError>` (fieldId, errorCode, errorMessage)
- Implement all rule checks:
  - `MANDATORY` — field present in parsed message?
  - `REGEX` — field value matches `rule_pattern`?
  - `ALLOWED_VALUES` — value in `rule_allowed_values` list?
  - `MAX_LENGTH` — value length ≤ `max_length`?
  - `MIN_LENGTH` — value length ≥ `min_length`?
- Unit test: 10+ test cases covering all rule types, including edge cases

**Logeshwaran — Validation Engine: Cache Invalidation + Run Reference**
- RabbitMQ consumer: `validation-engine.cache-invalidation` (fanout queue)
- On `RULE_UPDATED` / `RULE_DELETED`:
  - Evict Caffeine rules cache entry for `profileId:mti`
- On `FORMAT_UPDATED` / `FORMAT_ROLLED_BACK`:
  - Evict Caffeine packager cache for `formatId`
  - Re-fetch format from profile-service on next request
- Redis `INCR` for `run_reference`:
  - Key: `run:ref:counter:YYYYMMDD`
  - Pattern: `VLD-YYYYMMDD-00001`
  - TTL: 2 days

**Janani — AI Service: Ollama Client + ai_run_logs**
- `OllamaClient` — RestTemplate call to `ollama.endpoint` (from `ollama_config` table)
- Every call → log to `ai_run_logs`:
  - `prompt_sent`, `response_received`, `duration_ms`, `status`, `retry_count`, `http_status_code`
- Resilience4j CB (`ai-cb`): on CB open → return `null` explanation (SKIP_AI fallback)
- `ollama.enabled = false` in `ollama_config` → skip AI entirely, return null
- `/ai/health` — test Ollama connectivity, return status + active model name

**Nethra — History Service: Audit Consumer**
- RabbitMQ consumer: `history.audit-logs` queue (topic — `audit.#`)
- `AuditLog` entity save — immutable: **no UPDATE, no DELETE ever**
- Store: `action`, `entity_type`, `entity_id`, `user_id`, `username_snapshot`, `correlation_id`, `ip_address`, `old_value`, `new_value` (JSON), `created_at`
- Test: manually publish an `audit.auth.login` message → verify row in `audit_logs`

---

### Day 8 — Full Validation Flow + Message Builder + History APIs

**Bala — Validation Engine: /validate endpoint**

Full pipeline on every request:
1. Parse ISO8583 hex string using jPOS `IsoParserUtil`
2. Extract MTI from parsed message
3. Fetch profile format via `ProfileClient` (Feign + Caffeine cache)
4. Fetch rules via `RulesClient` (Feign + Caffeine cache)
5. Call `RulesEngine.evaluate()` — get list of ValidationErrors
6. Call AI service via `AiClient` — get explanation string (nullable)
7. Generate `run_reference` via Redis INCR
8. Publish `ValidationRunCompletedEvent` to `validation.events` exchange (async)
9. **Return response immediately** — do not wait for history save

PAN masking: apply `PanMaskingUtil` before any log statement or DB write.

**Logeshwaran — Validation Engine: /validate/build endpoint**
- `POST /validate/build` — message builder
- Fetch `field_definitions` from rules-service (all DEs for profile+MTI)
- Filter `is_builder_visible = true` (hide DE1 bitmap etc.)
- Pre-select `is_mandatory = true` fields in response
- Accept builder payload (Map of DE→value)
- Validate against field_definitions (data_type, max_length, is_llvar)
- Build ISO8583 hex using jPOS `ISOMsg` builder
- Return: built hex string + field summary

**Janani — AI Service: Template Versioning + Ollama Config**
- On every template update → insert into `ai_prompt_template_versions` (bump `version_number`, set `is_current = true` on new, `false` on old)
- `PUT /ai/templates/{id}/rollback` — restore previous version content
- `GET /ai/config` — read `ollama_config` key-value pairs
- `PUT /ai/config/{key}` — update config value (ADMIN only)
- Publish `audit.ai.config-change` event on config update

**Nethra — History Service: Query APIs**
- `GET /history/runs` — paginated list:
  - Filters: `profileId`, `userId`, `status` (VALID/INVALID/ERROR), `dateFrom`, `dateTo`, `mti`
  - Sort: `created_at DESC` by default
  - Page size: 20 (configurable)
- `GET /history/runs/{runReference}` — full run detail (fields + errors + AI explanation)
- `GET /audit/logs` — paginated:
  - Filters: `action`, `entityType`, `userId`, `dateFrom`, `dateTo`
- `run_reference` is the primary lookup key — never expose internal `run_id`

---

### Day 9 — E2E Test + Performance + Bug Fixes

**Bala — Full E2E Flow Test**

Complete happy path:
1. `POST /auth/login` → get JWT
2. `POST /profiles` + `POST /formats` + `POST /rules` (add rules for profile+MTI)
3. `POST /validate` — send real 0200 ISO8583 hex → verify:
   - Parsed fields returned
   - Rule errors for invalid fields
   - AI explanation (if Ollama running)
   - `run_reference` (VLD-xxx) in response
4. `GET /history/runs/{runReference}` → verify run saved with fields + errors
5. Test with VALID message → verify no errors
6. Test with INVALID message → verify correct errors returned

**logeshwaran — Performance Test + Cache Verify**
- jPOS parse time: measure 1000 parses, verify < 5ms per parse
- Caffeine cache hit rate: call same profile twice, second call must NOT call profile-service (verify via service logs)
- Redis INCR collision test: 50 concurrent `/validate` calls → verify 50 unique `run_reference` values, no duplicates
- Circuit breaker test: stop rules-service → verify CB opens after 5 failures, fallback returns error within timeout

**Janani — Ollama Integration Test**
- Real `mistral:7b` call end-to-end via `/validate` endpoint
- SKIP_AI fallback test: stop Ollama → send validate request → verify validation still succeeds, `ai_explanation = null`
- Prompt template switch test: create PROFILE-scope template → validate with that profile → verify profile template used over GLOBAL
- `ai_run_logs` verify: every call logged with `duration_ms`, `status`, `retry_count`

**Nethra — Bug Fixes + Error Standardization**
- All services return `ApiResponse<T>` envelope — verify shapes:
  - `400` — validation error with field-level details
  - `401` — unauthorized (invalid/expired JWT)
  - `403` — forbidden (role check failed)
  - `404` — entity not found
  - `500` — internal error (no stack trace in response)
- PAN masking audit: grep all service logs for raw PANs — fix any leaks
- `X-Correlation-ID` end-to-end trace: one request ID must appear in all 4–5 service logs

---

### Day 10 — Demo-Ready Build + Docs + Final Handoff

**Logeshwaran — Final Integration Pass**
- All 9 services up via `docker-compose up` (including Eureka, Config, Gateway)
- Smoke test every endpoint group: auth, profile, rules, validate, ai, history
- `/actuator/health` on all ports (8081–8086, 8080, 8761, 8888) — all `UP`
- Fix any last-minute issues found

**Bala — API Documentation + README**
- Postman collection export — all services, all endpoints, sample request bodies
- Postman environment variables: `base_url`, `jwt_token` (auto-set via login test script)
- `README.md`:
  - Prerequisites
  - `docker-compose up` to start infrastructure
  - `mvn spring-boot:run` per service (or Docker)
  - How to get JWT and test first request

**Nethra — Postman Full Coverage**
- Auth: login, logout, create user, change password, list users
- Profile: create profile, add format, activate, update, rollback, version list
- Rules: create rule, add allowed value, bulk import, get effective rules, delete
- Validate: validate message (valid), validate message (invalid — multiple errors), build message
- AI: list templates, create global template, create profile template, update config
- History: list runs (with filters), get run by reference, list audit logs

**Janani — Final Demo Prep + Retrospective**
- Docker Compose fresh start from absolute zero — `docker-compose down -v && docker-compose up`
- Demo script (15 min):
  1. Login as ADMIN
  2. Create a switch profile
  3. Add message format (0200 — Financial Transaction)
  4. Add validation rules (mandatory DE2, DE4, DE11; regex on DE12)
  5. Validate a correct message → show all fields parsed, no errors
  6. Validate an incorrect message → show rule errors + AI explanation
  7. View history → find the run by VLD reference
  8. View audit logs → show the audit trail
- Known issues list document
- Sprint 2 retrospective notes

---

## Architecture Quick Reference

### Service Ports

| Service | Port |
|---|---|
| Service Registry (Eureka) | 8761 |
| Config Server | 8888 |
| API Gateway | 8080 |
| Auth Service | 8081 |
| Profile Service | 8082 |
| Rules Service | 8083 |
| Validation Engine | 8084 |
| AI Service | 8085 |
| History Service | 8086 |
| RabbitMQ Management UI | 15672 |
| Redis | 6379 |
| Ollama | 11434 |

### RabbitMQ Exchanges

| Exchange | Type | Producer | Consumer |
|---|---|---|---|
| `validation.events` | direct | validation-engine | history-service |
| `audit.events` | topic | all services | history-service |
| `cache.invalidation` | fanout | profile-service, rules-service | validation-engine |

### Validation Engine — Full Flow

```
POST /validate
    │
    ├─ 1. jPOS parse hex → Map<DE, value>
    ├─ 2. Extract MTI
    ├─ 3. ProfileClient.getFormat(profileId)  [Caffeine cache, 30s TTL]
    ├─ 4. RulesClient.getRules(profileId,mti) [Caffeine cache, 30s TTL]
    ├─ 5. RulesEngine.evaluate(rules, fields) [stateless — no I/O]
    ├─ 6. AiClient.explain(...)               [nullable — CB + fallback]
    ├─ 7. Redis INCR → run_reference
    ├─ 8. Publish ValidationRunCompletedEvent [async — MQ]
    └─ 9. Return ApiResponse immediately
```

### Service Boundary Rules (Never Violate)

- Each service reads **only its own tables** in `iso8583_db` — no cross-service DB joins in code
- Cross-service references stored as ID + **snapshot** (name at time of action)
- Sync Feign calls only for data needed **in the same request-response cycle**
- Async MQ for: audit logs, history save, cache invalidation
- `/internal/**` endpoints **not exposed** at the API Gateway
- `RulesEngine` is stateless — no Spring beans, no DB, no I/O. Takes a List, returns a List
- PAN **never logged raw** — `PanMaskingUtil` applied before any log or DB write in ALL services
- `audit_logs` are **immutable** — no UPDATE, no DELETE ever
- `run_reference` (VLD-xxx) is the stable cross-service identifier — **never use auto-increment `run_id` across service boundary**

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| jPOS learning curve | Dev A — Day 1 itself write a unit test to parse a sample 0200 hex before anything else |
| Ollama slow on CPU laptops | One team member with GPU laptop runs Ollama, expose via Docker and point others to it |
| common-lib not installed | Day 1 first task — `mvn install` on common-lib before any other service is built |
| Docker network issues | All services in same Docker Compose bridge network; Eureka URL must use service name not localhost |
| RabbitMQ consumer idempotency | Check `run_reference` exists before insert in history-service to avoid duplicate entries |
| Circuit breaker fires too early | Dev mode: increase `slidingWindowSize` to 20 and `failureRateThreshold` to 80% |
| 10 days is tight | History Service advanced query filters (analytics) can be de-scoped — basic CRUD first |

---

*Sprint plan generated for ISO 8583 Validator Microservices — Spring Boot 3.2 · 4 Developers · 10 Days*
