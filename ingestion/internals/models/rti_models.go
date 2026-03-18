package models

type RTIRequest struct {
	Title    string `json:"title"`
	Content  string `json:"content"`
	Sender   string `json:"sender"`
	Receiver string `json:"receiver"`
	Created  string `json:"created"`
}
