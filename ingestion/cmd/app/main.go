package main

import (
	"encoding/csv"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/LDFLK/RTI-Tracker/ingestion/internals/client"
	"github.com/LDFLK/RTI-Tracker/ingestion/internals/core"
	"github.com/LDFLK/RTI-Tracker/ingestion/internals/models"
	"github.com/LDFLK/RTI-Tracker/ingestion/internals/ports"
	"github.com/LDFLK/RTI-Tracker/ingestion/internals/utils"
)

func main() {

	dataDir := flag.String("data", "", "Path to data directory containing csv files")

	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage of %s:\n\n", os.Args[0])
	}

	flag.Parse()

	// access environment variables
	ingestionUrl := os.Getenv("INGESTION_URL")
	if ingestionUrl == "" {
		log.Fatal("Ingestion Service URL Required")
	}

	readUrl := os.Getenv("READ_URL")
	if readUrl == "" {
		log.Fatal("Read Service URL Required")
	}

	// Initialize services
	apiClient := client.ApiClient(ingestionUrl, readUrl)
	ingestionService := ports.NewIngestionService(*apiClient)
	readService := ports.NewReadService(*apiClient)
	s := core.NewRTIService(ingestionService, readService)

	// validate flags
	if *dataDir == "" {
		fmt.Fprintf(os.Stderr, "Error: Data directory path is required\n\n")
		os.Exit(1)
	}

	var requestErrors []string
	var rtiRequestCount int

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
			splittedDir := strings.Split(fileDir, string(filepath.Separator))

			// access the date from the folder structure
			date := splittedDir[len(splittedDir)-2]
			index := splittedDir[len(splittedDir)-1]
			dateISO, err := utils.DateToISO(date)

			if err != nil {
				log.Printf("failed to parse date %v", err)
				return nil
			}

			var createdRTIEntity *models.Entity

			// 1. RTIEntity creation
			if fileName == "request.csv" {
				// node creation process and attribute insertion for request
				// open the file
				f, err := os.Open(path)
				if err != nil {
					log.Printf("Failed to open file: %s , %v", path, err)
					return nil
				}

				defer f.Close()

				r := csv.NewReader(f)

				// read the first line of the csv first to skip the first line
				if _, err := r.Read(); err != nil {
					fmt.Printf("Error accessing fields in csv: %s", err)
				}

				// access data starting from the second row in the csv
				for {
					record, err := r.Read()

					if err == io.EOF {
						break
					}

					if err != nil {
						log.Println("Err reading records in the file")
					}

					title := record[0]
					description := record[1]
					source := record[2]
					sender := record[3]
					receiverInstitution := record[4]
					receiverPosition := record[5]

					// field data to the RTIRequest
					entity := &models.RTIRequest{
						Title:               title,
						Description:         description,
						Source:              source,
						Sender:              sender,
						ReceiverInstitution: receiverInstitution,
						ReceiverPosition:    receiverPosition,
						Created:             dateISO,
						Index:               index,
					}

					createdRTIEntity, err = s.InsertRTIRequest(entity)

					if err != nil {
						log.Printf("[main] RTI Insertion failed %s", err)
						requestErrors = append(requestErrors, err.Error())
						continue
					}

					rtiRequestCount++

				}

				// 2. Update RTIEntity with request and status attributes
				if createdRTIEntity != nil {

					requestFilePath := filepath.Join(fileDir, "request.csv")
					statusFilePath := filepath.Join(fileDir, "status.csv")
					fmt.Printf("\n request file path")
					fmt.Println(requestFilePath)
					// fmt.Printf("\n status file path")
					// fmt.Println(statusFilePath)
					requestTabularData, err := utils.CsvToTabular(requestFilePath)
					if err != nil {
						log.Fatal(err)
					}

					statusTabularData, err := utils.CsvToTabular(statusFilePath)
					if err != nil {
						log.Fatal(err)
					}

					requestContent := map[string]interface{}{
						"columns": requestTabularData.Columns,
						"rows":    requestTabularData.Rows,
					}

					statusContent := map[string]interface{}{
						"columns": statusTabularData.Columns,
						"rows":    statusTabularData.Rows,
					}

					fmt.Printf("\ntabular request data : %s \n", requestContent)
					fmt.Printf("\ntabular status data : %s \n", statusContent)

					updatedEntityRequest, errRequest := s.ProcessRTIAttributes(createdRTIEntity.ID, requestContent, "request", createdRTIEntity.Created)
					if errRequest != nil {
						log.Printf("[main] RTI request attribute insertion failed: %v", errRequest)
					} else {
						fmt.Printf("update success request %+v\n", updatedEntityRequest)
					}

					updatedEntityStatus, errStatus := s.ProcessRTIAttributes(createdRTIEntity.ID, statusContent, "status", createdRTIEntity.Created)
					if errStatus != nil {
						log.Printf("[main] RTI status attribute insertion failed: %v", errStatus)
					} else {
						fmt.Printf("update success status %+v\n", updatedEntityStatus)
					}

				}

			}

		}

		return nil
	})

	if err != nil {
		log.Fatal(err)
		os.Exit(0)
	}

	log.Printf("Processed %d RTI requests successfully (noted %d errors).", rtiRequestCount, len(requestErrors))

}
