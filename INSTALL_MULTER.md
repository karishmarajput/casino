# Image Upload Setup

To enable image upload functionality for rewards, you need to install the `multer` package.

## Installation

Run the following command in the `server` directory:

```bash
cd server
npm install multer
```

## What's Included

- File upload handling with multer
- Image validation (jpeg, jpg, png, gif, webp)
- 5MB file size limit
- Automatic file naming with timestamps
- Static file serving for uploaded images
- Image preview in the frontend
- Support for both file upload and URL input

## Upload Directory

Uploaded images are stored in: `server/uploads/rewards/`

This directory is automatically created when the server starts.

