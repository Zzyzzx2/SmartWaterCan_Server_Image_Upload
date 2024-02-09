import express from "express";
import fileUpload from "express-fileupload";
import fs from "fs";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Now you can use __dirname in the same way as in CommonJS modules

const app = express();
// Use the port provided by Render or fallback to 80 for local development
const port = process.env.PORT || 8080;
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

// GET request handler to serve the uploaded image
app.get("/", (req, res) => {
  console.log("Received GET request to /");
  // Check if the image exists, if not return a default response
  if (!fs.existsSync("./images")) {
    return res.send("No image uploaded yet.");
  }
  // Read the image file and send it as a response
  const files = fs.readdirSync("./images");
  if (files.length > 0) {
    const imagePath = path.join(__dirname, "images", files[0]); // Construct absolute path
    return res.sendFile(imagePath);
  } else {
    return res.send("No image uploaded yet.");
  }
});

// POST request handler to upload the image
app.post("/upload", (req, res) => {
  console.log("Received POST request to /upload");

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

  // Add the timestamp to the image name
  const imageName = Date.now() + "_" + image.name;

  // Check if the folder exists, if not create it
  const imagesDirectory = path.join(__dirname, "images");
  if (!fs.existsSync(imagesDirectory)) {
    fs.mkdirSync(imagesDirectory);
  }

  // Move the uploaded image to our upload folder
  image.mv(path.join(imagesDirectory, imageName), (err) => {
    if (err) {
      console.error("Error uploading image:", err);
      return res.sendStatus(500);
    }
    console.log("Image uploaded successfully:", imageName);

    // Delete all other images in the directory
    fs.readdir(imagesDirectory, (err, files) => {
      if (err) {
        console.error("Error reading directory:", err);
        return res.sendStatus(500);
      }

      files.forEach((file) => {
        if (file !== imageName) {
          fs.unlink(path.join(imagesDirectory, file), (err) => {
            if (err) {
              console.error("Error deleting file:", err);
            } else {
              console.log("Deleted file:", file);
            }
          });
        }
      });

      // All good
      res.sendStatus(200);
    });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
