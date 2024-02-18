import express from "express";
import fileUpload from "express-fileupload";
import fs from "fs";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";

dotenv.config();
// Get the current file name and directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const port = process.env.PORT || 8080;

// Enable CORS
app.use(cors());

// Middleware to handle file uploads
app.use(
  fileUpload({
    limits: {
      fileSize: 10000000, // Limit file size to 10MB
    },
    abortOnLimit: true,
  })
);

// GET request handler to serve a specific image based on ID
app.get("/image/:id", (req, res) => {
  console.log("Received GET request to /image/:id");

  // Extract ID from the request params
  const id = req.params.id;

  // Check if the folder exists
  const imagesDirectory = path.join(__dirname, "images");
  if (!fs.existsSync(imagesDirectory)) {
    return res.send("No images uploaded yet.");
  }

  // Read the images directory
  const files = fs.readdirSync(imagesDirectory);

  // Find the image with the matching ID prefix
  const matchingImage = files.find((file) => file.startsWith(`${id}_`));
  console.log("Matching image:", matchingImage);

  if (!matchingImage) {
    return res.send("No image found for the specified ID.");
  }

  // Construct the full path to the image
  const imagePath = path.join(imagesDirectory, matchingImage);

  // Send the matched image
  console.log("Sending image:", imagePath);
  return res.sendFile(imagePath);
});

// GET request handler to display all images and their names
app.get("/", (req, res) => {
  console.log("Received GET request to /");

  // Check if the folder exists
  const imagesDirectory = path.join(__dirname, "images");
  if (!fs.existsSync(imagesDirectory)) {
    return res.send("No images uploaded yet.");
  }

  // Read the images directory
  const files = fs.readdirSync(imagesDirectory);

  // Construct HTML to display images and their names
  let html = "<h1>All Bubble Top Status</h1>";
  files.forEach((file) => {
    // Extract the ID from the file name
    const id = file.split("_")[0];
    html += `<div><img src="/image/${id}" width="200"><br>${file}</div>`;
  });

  // Send the HTML response
  res.send(html);
});

// POST request handler to upload the image
app.post("/upload/:id", (req, res) => {
  console.log("Received POST request to /upload");

  // Extract ID from the request params
  const id = req.params.id;
  console.log("ID:", id);
  console.log("Request query:", req.query);
  console.log("Request file Name:", req.query.fileName);
  console.log("Request file:", req.files.image);
  console.log("Request file Name:", req.files.image.name);
  console.log("Request file Size:", req.files.image.size);
  console.log("Files available:", req.files);
  // If no files were uploaded, exit
  if (!req.files || !req.files.image) {
    console.log("No files uploaded");
    return res.sendStatus(400);
  }

  // The name of the input field (i.e. "image") is used to retrieve the uploaded file
  let image = req.files.image;

  // If does not have image mime type prevent from uploading
  if (!/^image/.test(image.mimetype)) {
    console.log("Invalid image mimetype:", image.mimetype);
    return res.sendStatus(400);
  }

  // Add the ID prefix to the image name
  const imageName = `${id}_${Date.now()}_${req.query.fileName}`;

  // Check if the folder exists, if not create it
  const imagesDirectory = path.join(__dirname, "images");
  if (!fs.existsSync(imagesDirectory)) {
    fs.mkdirSync(imagesDirectory);
  }

  // Delete all other images with the same ID prefix in the directory
  fs.readdir(imagesDirectory, (err, files) => {
    if (err) {
      console.error("Error reading directory:", err);
      return res.sendStatus(500);
    }

    files.forEach((file) => {
      if (file.startsWith(`${id}_`)) {
        fs.unlink(path.join(imagesDirectory, file), (err) => {
          if (err) {
            console.error("Error deleting file:", err);
          } else {
            console.log("Deleted file:", file);
          }
        });
      }
    });

    // Move the uploaded image to our upload folder
    image.mv(path.join(imagesDirectory, imageName), (err) => {
      if (err) {
        console.error("Error uploading image:", err);
        return res.sendStatus(500);
      }
      console.log("Image uploaded successfully:", imageName);

      // All good
      res.sendStatus(200);
    });
  });
});

app.delete("/delete-all-images", (req, res) => {
  const password = req.query.password;

  // Check if the provided password matches the one in the environment variables
  if (password !== process.env.PASSWORD) {
    return res.status(401).send("Unauthorized");
  }

  const imagesDirectory = path.join(__dirname, "images");

  // Check if the folder exists
  if (!fs.existsSync(imagesDirectory)) {
    return res.send("No images to delete.");
  }

  // Delete all images in the directory
  fs.readdir(imagesDirectory, (err, files) => {
    if (err) {
      console.error("Error reading directory:", err);
      return res.sendStatus(500);
    }

    files.forEach((file) => {
      fs.unlink(path.join(imagesDirectory, file), (err) => {
        if (err) {
          console.error("Error deleting file:", err);
        } else {
          console.log("Deleted file:", file);
        }
      });
    });

    // Send response after deleting all images
    res.send("All images deleted successfully.");
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// Be in the Folder u want the image to be in
// To Send an Image to the Server:
// curl -X POST -F "image=@land1.png" http://localhost:8080/upload/3

// To Get an Image from the Server:
// curl -o received_image.jpg http://localhost:8080/image/3

//To Delete all Images from the Server:
// curl -X DELETE "http://localhost:8080/delete-all-images?password=your_password_here"
