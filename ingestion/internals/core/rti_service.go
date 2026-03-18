package core

import (
	"fmt"
	"log"
	"sort"
	"strings"
	"time"

	"github.com/LDFLK/RTI-Tracker/ingestion/internals/models"
	"github.com/LDFLK/RTI-Tracker/ingestion/internals/ports"
	"github.com/LDFLK/RTI-Tracker/ingestion/internals/utils"
	"github.com/google/uuid"
)

// RTIService contains the business logic for RTI operations.
type RTIService struct {
	ingestionClient *ports.IngestionService
	readClient      *ports.ReadService
}

// NewRTIService creates a new RTIService.
func NewRTIService(ingestionClient *ports.IngestionService, readClient *ports.ReadService) *RTIService {
	return &RTIService{
		ingestionClient: ingestionClient,
		readClient:      readClient,
	}
}

// AddTRIEntity calls the ingestion service to create an entity.
func (s *RTIService) ProcessRTIEntity(entity *models.RTIRequest) (*models.Entity, error) {

	// 1. Insert the RTI Entity to Graph
	id := uuid.New()
	rtiId := "rti_" + id.String()

	entityCreatedISO, err := utils.DateToISO(entity.Created)
	if err != nil {
		fmt.Println("failed time conversion")
	}

	// TRI payload
	rtiEntity := &models.Entity{
		ID:      rtiId,
		Created: entityCreatedISO,
		Kind: models.Kind{
			Major: "Document",
			Minor: "RTI",
		},
		Name: models.TimeBasedValue{
			StartTime: entityCreatedISO,
			Value:     entity.Title,
		},
	}

	// Call the generic interface's method
	createdEntity, err := s.ingestionClient.CreateEntity(rtiEntity)
	if err != nil {
		return nil, fmt.Errorf("failed to create RTI: %w", err)
	}

	// 2. Make the relation to the receiver
	// find the receiver
	searchCriteria := &models.SearchCriteria{
		Name: entity.Receiver,
		Kind: &models.Kind{
			Major: "Organisation",
		},
	}
	searchEntities, err := s.readClient.SearchEntities(searchCriteria)
	if err != nil {
		log.Print("Error fetching entity for the given search criteria")
	}

	var parentID string
	if len(searchEntities) > 0 {
		sort.Slice(searchEntities, func(i, j int) bool {
			// Sort in descending order by created date
			timeI, errI := time.Parse(time.RFC3339, searchEntities[i].Created)
			timeJ, errJ := time.Parse(time.RFC3339, searchEntities[j].Created)
			if errI != nil || errJ != nil {
				return searchEntities[i].Created > searchEntities[j].Created
			}
			return timeI.After(timeJ)
		})

		entityCreatedTime, err := time.Parse(time.RFC3339, entityCreatedISO)
		if err != nil {
			fmt.Println("failed time parsing")
		}

		for _, result := range searchEntities {
			resultTime, err := time.Parse(time.RFC3339, result.Created)
			if err == nil && !resultTime.After(entityCreatedTime) {
				fmt.Println("skipping the date")
				parentID = result.ID
				break
			}
		}

		// Fallback: if no floor date is found or parse failed, pick the first one
		if parentID == "" {
			return nil, fmt.Errorf("Skipping relation update (reciever not found for the given date): %w", err)
		}
	}

	// make a unique relation ID
	currentTimestamp := strings.ReplaceAll(time.Now().Format(time.RFC3339), ":", "-")
	uniqueRelationshipID := fmt.Sprintf("%s_%s_%s", parentID, createdEntity.ID, currentTimestamp)

	// payload for the parent
	parentEntity := &models.Entity{
		ID:         parentID,
		Kind:       models.Kind{},
		Created:    "",
		Terminated: "",
		Name:       models.TimeBasedValue{},
		Metadata:   []models.MetadataEntry{},
		Attributes: []models.AttributeEntry{},
		Relationships: []models.RelationshipEntry{
			{
				Key: uniqueRelationshipID,
				Value: models.Relationship{
					RelatedEntityID: createdEntity.ID,
					StartTime:       entityCreatedISO,
					EndTime:         "",
					ID:              uniqueRelationshipID,
					Name:            "AS_RTI",
				},
			},
		},
	}

	_, err = s.ingestionClient.UpdateEntity(parentID, parentEntity)
	if err != nil {
		return nil, fmt.Errorf("failed to update parent entity: %w", err)
	}

	return nil, nil
}
