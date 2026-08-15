package storage

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type StorageService interface {
	UploadFile(ctx context.Context, key string, body io.Reader) error
	DeleteFile(ctx context.Context, key string) error
	GetSignedURL(ctx context.Context, key string, expiration time.Duration) (string, error)
}

// R2Storage implements StorageService using Cloudflare R2 / AWS S3 API
type R2Storage struct {
	S3Client      *s3.Client
	PresignClient *s3.PresignClient
	BucketName    string
}

func NewR2Storage(accountID, accessKeyID, secretAccessKey, bucketName, endpoint string) (*R2Storage, error) {
	// Create custom credentials provider
	creds := credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, "")

	// Load configuration with custom endpoint for R2
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithCredentialsProvider(creds),
		config.WithRegion("auto"), // R2 uses "auto" for region
	)
	if err != nil {
		return nil, fmt.Errorf("unable to load SDK config: %v", err)
	}

	// Create S3 client
	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
	})

	presignClient := s3.NewPresignClient(s3Client)

	log.Printf("Initialized Cloudflare R2 Storage Service targeting bucket: %s", bucketName)
	return &R2Storage{
		S3Client:      s3Client,
		PresignClient: presignClient,
		BucketName:    bucketName,
	}, nil
}

func (r *R2Storage) UploadFile(ctx context.Context, key string, body io.Reader) error {
	// We read body into a temporary file or buffer to support S3 SDK upload if needed,
	// or we can stream directly if size is known. Since s3.PutObject needs a Seeker or we can pass reader,
	// using s3.PutObject with body is supported in Go v2 SDK.
	_, err := r.S3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(r.BucketName),
		Key:    aws.String(key),
		Body:   body,
	})
	if err != nil {
		return fmt.Errorf("R2 upload error for key %s: %v", key, err)
	}
	return nil
}

func (r *R2Storage) DeleteFile(ctx context.Context, key string) error {
	_, err := r.S3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(r.BucketName),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("R2 delete error for key %s: %v", key, err)
	}
	return nil
}

func (r *R2Storage) GetSignedURL(ctx context.Context, key string, expiration time.Duration) (string, error) {
	req, err := r.PresignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(r.BucketName),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(expiration))
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL for %s: %v", key, err)
	}
	return req.URL, nil
}

// LocalStorage implements StorageService using local file system
type LocalStorage struct {
	BaseDir    string
	BackendURL string // Used to construct public URLs
}

func NewLocalStorage(baseDir, backendURL string) (*LocalStorage, error) {
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return nil, err
	}
	log.Printf("Initialized Local File Storage at path: %s", baseDir)
	return &LocalStorage{
		BaseDir:    baseDir,
		BackendURL: backendURL,
	}, nil
}

func (l *LocalStorage) UploadFile(ctx context.Context, key string, body io.Reader) error {
	fullPath := filepath.Join(l.BaseDir, key)

	// Ensure subdirectories exist (e.g. covers/ or books/)
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory %s: %v", dir, err)
	}

	out, err := os.Create(fullPath)
	if err != nil {
		return fmt.Errorf("failed to create file %s: %v", fullPath, err)
	}
	defer out.Close()

	_, err = io.Copy(out, body)
	if err != nil {
		return fmt.Errorf("failed to write data to file %s: %v", fullPath, err)
	}

	return nil
}

func (l *LocalStorage) DeleteFile(ctx context.Context, key string) error {
	fullPath := filepath.Join(l.BaseDir, key)
	err := os.Remove(fullPath)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete file %s: %v", fullPath, err)
	}
	return nil
}

func (l *LocalStorage) GetSignedURL(ctx context.Context, key string, expiration time.Duration) (string, error) {
	// For local development, we direct requests to a local serve handler (e.g. /api/files/{key})
	// Since there is no actual cryptographic signature needed for simple local testing, we return a local URL.
	// In production, R2 will generate authentic signed URLs.
	url := fmt.Sprintf("%s/api/files/%s", l.BackendURL, key)
	return url, nil
}
