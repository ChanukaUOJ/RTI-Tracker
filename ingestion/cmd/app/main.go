package main

import (
	"encoding/csv"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/LDFLK/RTI-Tracker/ingestion/internals/client"
	"github.com/LDFLK/RTI-Tracker/ingestion/internals/core"
	"github.com/LDFLK/RTI-Tracker/ingestion/internals/models"
	"github.com/LDFLK/RTI-Tracker/ingestion/internals/ports"
)

func main() {

	dataDir := flag.String("data", "", "Path to data directory containing csv files")

	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage of %s:\n\n", os.Args[0])
	}

	flag.Parse()

	// access environment variables
	ingesUrl := os.Getenv("INGESTION_URL")
	if ingesUrl == "" {
		log.Fatal("Ingestion Service URL Required")
	}

	reUrl := os.Getenv("READ_URL")
	if reUrl == "" {
		log.Fatal("Read Service URL Required")
	}

	// Initialize services
	apiClient := client.ApiClient(ingesUrl, reUrl)
	ingestionService := ports.NewIngestionService(*apiClient)
	readService := ports.NewReadService(*apiClient)
	s := core.NewRTIService(ingestionService, readService)

	// validate flags
	if *dataDir == "" {
		fmt.Fprintf(os.Stderr, "Error: Data directory path is required\n\n")
	}

	err := filepath.WalkDir(*dataDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			fmt.Printf("Error: %s\n\n", err)
			return err
		}

		if d.IsDir() {
			fmt.Printf("Directory: %s\n", path)
		} else {
			fmt.Printf("File: %s\n", path)
			log.Println("Processing file...")

			fileName := filepath.Base(path)
			fileDir := filepath.Dir(path)
			splittedDir := strings.Split(fileDir, "/")

			parentDir := splittedDir[len(splittedDir)-1]

			if fileName == "status.csv" {

			} else {
				// open the file
				f, err := os.Open(path)
				if err != nil {
					log.Print("Failed to open file: %s", err)
				}

				r := csv.NewReader(f)

				// read the first line of the csv first to skip the first line
				if _, err := r.Read(); err != nil {
					log.Println("Error accessing fields in csv: %s", err)
				}

				// read the second line of the csv
				first_row, err := r.Read()
				if err != nil {
					log.Println("Error accessing fields in csv: %s", err)
				}

				// access data from first row of the csv
				title := first_row[0]
				content := first_row[1]
				sender := first_row[2]
				receiver := first_row[3]

				// field data to the RTIRequest
				entity := &models.RTIRequest{
					Title:    title,
					Content:  content,
					Sender:   sender,
					Receiver: receiver,
					Created:  parentDir,
				}

				_, err = s.ProcessRTIEntity(entity)

				if err != nil {
					log.Printf("Entity creation failed %s", title)
				}

			}

		}

		return nil
	})

	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Successfully processed all arguments")

}
