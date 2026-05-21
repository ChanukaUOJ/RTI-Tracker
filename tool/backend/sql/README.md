# Database SQL Scripts

This directory contains the SQL scripts used to initialize and seed the RTI-Tracker database.

## Directory Structure

- **`schema.sql`**: The core database structure (tables, extensions, constraints).
- **`seed.sql`**: Mock data for development and testing.

#### DB Schema

```mermaid
    erDiagram
    SENDERS ||--o{ RTI_REQUESTS : initiates
    RECEIVERS ||--o{ RTI_REQUESTS : targets
    RTI_REQUESTS ||--|{ RTI_STATUS_HISTORIES : tracks
    RECEIVERS }o--|| INSTITUTIONS : has
    RECEIVERS }o--|| POSITIONS : has
    RTI_STATUS_HISTORIES }o--|| RTI_STATUSES : has
    RTI_REQUESTS }o--o| RTI_TEMPLATES : has

    SENDERS {
        uuid id PK
        string name
        string email
        string address
        string contact_no
        datetime created_at
        datetime updated_at
    }

    POSITIONS {
        uuid id PK
        string name
        datetime created_at
        datetime updated_at
    }

    INSTITUTIONS {
        uuid id PK
        string name
        datetime created_at
        datetime updated_at
    }

    RECEIVERS {
        uuid id PK
        uuid position_id FK
        uuid institution_id FK
        list[string] emails
        string address
        list[string] contact_nos
        datetime created_at
        datetime updated_at
    }

    RTI_TEMPLATES {
        uuid id PK
        string title
        string description
        string file
        datetime created_at
        datetime updated_at
    }

    RTI_REQUESTS {
        uuid id PK
        string title
        string description
        uuid sender_id FK
        uuid receiver_id FK
        uuid rti_template_id FK
        datetime created_at
        datetime updated_at
    }

    RTI_STATUS_HISTORIES {
        uuid id PK
        uuid rti_request_id FK
        uuid status_id FK
        string direction
        string description
        datetime entry_time
        datetime exit_time
        list[string] files
        datetime created_at
        datetime updated_at
    }

    RTI_STATUSES {
        uuid id PK
        string name
        datetime created_at
        datetime updated_at
    }
```

## Local Development

To reset your local database and apply fresh schema/seed data, run:

#### Environment setup

**macOS / Linux**

```bash
cp .env.example .env
```

**Windows (PowerShell)**

```powershell
Copy-Item .env.example .env
```

**Windows (Command Prompt)**

```cmd
copy .env.example .env
```

- Edit `.env` and fill in your values before running Docker Compose.
- Docker Compose reads `.env` automatically — no need to `source` it.

```bash
docker compose down -v && docker compose up --build
```

_Note: The `-v` flag is required to clear the named volume and trigger re-initialization._

## Production

For production environments (like Neon):

1. Execute **`schema.sql`** to set up the tables.
2. **Do not** run `seed.sql` unless you specifically need mock data in a staging environment.
