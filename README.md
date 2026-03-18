# RTI Tracker

``` mermaid
flowchart LR
    %% Left pipeline
    A(Sheet) -->|convert_to| B(CSV)
    B -->|raw data| C(RTI CLI)

    %% OpenGIN stacked vertically
    subgraph OpenGIN
        style OpenGIN stroke-dasharray: 5 5
        D(Ingestion API)
        E(Read API)
    end

    %% RTI App stacked vertically
    subgraph RTIApp
        style RTIApp stroke-dasharray: 5 5
        C
        F(React APP)
    end

    %% Flows with slight offset to avoid crossing
    C -->|data| D
    E -->|data| F
```