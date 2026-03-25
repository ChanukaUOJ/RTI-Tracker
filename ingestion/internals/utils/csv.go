package utils

import (
	"encoding/csv"
	"fmt"
	"io"
	"os"
	"strconv"
	"time"
)

type TabularData struct {
	Columns []string        `json:"columns"`
	Rows    [][]interface{} `json:"rows"`
}

func CsvToTabular(path string) (*TabularData, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer f.Close()

	r := csv.NewReader(f)

	// read header
	header, err := r.Read()
	if err != nil {
		return nil, fmt.Errorf("failed to read header: %w", err)
	}

	var rows [][]interface{}
	for {
		row, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error reading row: %w", err)
		}

		var rowData []interface{}
		for _, v := range row {

			// convert YYYY-MM-DD to YYYY/MM/DD if it matches the format
			if t, err := time.Parse("2006-01-02", v); err == nil {
				v = t.Format("2006/01/02")
			}

			// try to parse numbers as int
			if n, err := strconv.Atoi(v); err == nil {
				rowData = append(rowData, n)
			} else {
				rowData = append(rowData, v)
			}
		}
		rows = append(rows, rowData)
	}

	return &TabularData{
		Columns: header,
		Rows:    rows,
	}, nil
}
