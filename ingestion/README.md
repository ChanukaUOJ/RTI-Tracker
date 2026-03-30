## How to run the service

#### source env
```
    source .env
```

#### run the tests
```
    go test ./tests/ -v
```

#### run the scripts
```
    go run ./cmd/app/main.go --data "../data/RTI"
```

-------- or --------

#### run the test run file
```
    source .env
    chmod +X test_run.sh
    ./test_run.sh
```