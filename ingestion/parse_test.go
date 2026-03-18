package main

import (
"fmt"
"time"
)

func main() {
	timeI, _ := time.Parse(time.RFC3339, "2026-03-18T22:03:13+05:30")
	fmt.Println(timeI)
}
