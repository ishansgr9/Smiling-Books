package database

import (
	"context"
	"errors"
	"log"

	"backend/internal/models"
	"backend/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

func RunMigrations(ctx context.Context, db *Database) error {
	log.Println("Running schema migrations...")
	_, err := db.Pool.Exec(ctx, InitSQL)
	if err != nil {
		return err
	}
	log.Println("Migrations executed successfully")
	return nil
}

func SeedData(ctx context.Context, repo repository.BookRepository) error {
	log.Println("Seeding database records...")

	// 1. Create Default Admin User
	adminEmail := "admin@smilingbooks.org"
	existingAdmin, err := repo.GetUserByEmail(ctx, adminEmail)
	if err != nil {
		return err
	}

	if existingAdmin == nil {
		log.Println("Creating default admin account: admin@smilingbooks.org")
		passHash, err := bcrypt.GenerateFromPassword([]byte("AdminSmilingBooks2026!"), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		_, err = repo.CreateUser(ctx, "Akshar Paaul Admin", adminEmail, string(passHash), "ADMIN")
		if err != nil {
			return err
		}
		log.Println("Admin account created successfully")
	} else {
		log.Println("Admin account already exists, skipping user creation")
	}

	// Check if we already have books to avoid duplicates
	books, _, err := repo.GetBooks(ctx, "", 0, 0, "", "", false, 1, 0)
	if err != nil {
		return err
	}
	if len(books) > 0 {
		log.Println("Database already contains books, skipping seed data insertion")
		return nil
	}

	// 2. Define Public Domain Seed Books
	pubYear1865 := 1865
	pubYear1900 := 1900
	pubYear1911 := 1911
	pubYear1902 := 1902
	pubYear1812 := 1812
	pubYear1876 := 1876
	pubYear1894 := 1894
	pubYear1883 := 1883

	seedBooks := []models.BookRequest{
		{
			Title:           "Alice's Adventures in Wonderland",
			AuthorName:      "Lewis Carroll",
			Description:     "A classic novel written by English author Lewis Carroll. It tells of a young girl named Alice falling through a rabbit hole into a fantasy world filled with peculiar creatures.",
			LanguageName:    "English",
			CategoryName:    "Children's Literature",
			AgeGroup:        "9-12",
			PublicationYear: &pubYear1865,
			RightsStatus:    "PUBLIC_DOMAIN",
			Published:       true,
		},
		{
			Title:           "The Wonderful Wizard of Oz",
			AuthorName:      "L. Frank Baum",
			Description:     "An American children's novel illustrating the adventures of a young farm girl named Dorothy in the magical Land of Oz, after being swept away from her Kansas home by a cyclone.",
			LanguageName:    "English",
			CategoryName:    "Fantasy",
			AgeGroup:        "5-8",
			PublicationYear: &pubYear1900,
			RightsStatus:    "PUBLIC_DOMAIN",
			Published:       true,
		},
		{
			Title:           "The Secret Garden",
			AuthorName:      "Frances Hodgson Burnett",
			Description:     "A heartwarming story of Mary Lennox, an unloved girl sent to live at her uncle's estate, who discovers a locked, hidden garden that changes her life and those around her.",
			LanguageName:    "English",
			CategoryName:    "Fiction",
			AgeGroup:        "9-12",
			PublicationYear: &pubYear1911,
			RightsStatus:    "PUBLIC_DOMAIN",
			Published:       true,
		},
		{
			Title:           "The Tale of Peter Rabbit",
			AuthorName:      "Beatrix Potter",
			Description:     "A mischievous and disobedient young Peter Rabbit is chased about the garden of Mr. McGregor after eating his vegetables.",
			LanguageName:    "English",
			CategoryName:    "Children's Literature",
			AgeGroup:        "5-8",
			PublicationYear: &pubYear1902,
			RightsStatus:    "PUBLIC_DOMAIN",
			Published:       true,
		},
		{
			Title:           "Aesop's Fables",
			AuthorName:      "Aesop",
			Description:     "A collection of timeless fables credited to Aesop, a storyteller of ancient Greece, imparting valuable moral lessons through anthropomorphic characters.",
			LanguageName:    "English",
			CategoryName:    "Fables",
			AgeGroup:        "All Ages",
			PublicationYear: nil,
			RightsStatus:    "PUBLIC_DOMAIN",
			Published:       true,
		},
		{
			Title:           "Grimms' Fairy Tales",
			AuthorName:      "Jacob Grimm & Wilhelm Grimm",
			Description:     "A collection of German fairy tales first published by the Grimm brothers, featuring famous classics like Cinderella, Hansel and Gretel, and Rapunzel.",
			LanguageName:    "English",
			CategoryName:    "Fairy Tales",
			AgeGroup:        "5-8",
			PublicationYear: &pubYear1812,
			RightsStatus:    "PUBLIC_DOMAIN",
			Published:       true,
		},
		{
			Title:           "The Adventures of Tom Sawyer",
			AuthorName:      "Mark Twain",
			Description:     "An 1876 novel about a young boy named Tom Sawyer growing up along the Mississippi River, experiencing fun adventures and mystery with his friend Huckleberry Finn.",
			LanguageName:    "English",
			CategoryName:    "Adventure",
			AgeGroup:        "13+",
			PublicationYear: &pubYear1876,
			RightsStatus:    "PUBLIC_DOMAIN",
			Published:       true,
		},
		{
			Title:           "The Jungle Book",
			AuthorName:      "Rudyard Kipling",
			Description:     "A collection of classic stories containing the adventures of Mowgli, a boy raised by wolves in the Indian jungle, alongside Baloo the bear and Bagheera the panther.",
			LanguageName:    "English",
			CategoryName:    "Adventure",
			AgeGroup:        "9-12",
			PublicationYear: &pubYear1894,
			RightsStatus:    "PUBLIC_DOMAIN",
			Published:       true,
		},
		{
			Title:           "Treasure Island",
			AuthorName:      "Robert Louis Stevenson",
			Description:     "A thrilling adventure novel narrating a tale of buccaneers, maps, and buried pirate gold, featuring the legendary character Long John Silver.",
			LanguageName:    "English",
			CategoryName:    "Adventure",
			AgeGroup:        "13+",
			PublicationYear: &pubYear1883,
			RightsStatus:    "PUBLIC_DOMAIN",
			Published:       true,
		},
		{
			Title:           "Peter Pan",
			AuthorName:      "J. M. Barrie",
			Description:     "The magical story of Peter Pan, a mischievous boy who refuses to grow up, who takes Wendy and her brothers to the fantastical island of Neverland.",
			LanguageName:    "English",
			CategoryName:    "Fantasy",
			AgeGroup:        "9-12",
			PublicationYear: &pubYear1911,
			RightsStatus:    "PUBLIC_DOMAIN",
			Published:       true,
		},
	}

	for _, bookReq := range seedBooks {
		_, err := repo.CreateBook(ctx, &bookReq)
		if err != nil {
			return errors.New("failed to seed book " + bookReq.Title + ": " + err.Error())
		}
	}

	log.Println("Successfully seeded 10 public-domain books")
	return nil
}
