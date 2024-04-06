import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      return null;
    }
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("File is uploaded on cloudinary", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove locally saved temp files as the upload operation fails
    return null;
  }
};

const deleteFromCloudinary = async (cloudinaryUrl, resourceType = "image") => {
  try {
    if (!cloudinaryUrl) {
      return null;
    }

    //Obtaining the Image public Id from the Cloudinary URL

    //split the URL by slashes
    const parts = cloudinaryUrl.split("/");
    //find index of the upload segement
    const uploadIndex = parts.indexOf("upload");
    //get part after upload segement
    const afterUpload = parts.slice(uploadIndex + 1);
    //Remove file extension from the last part
    const fileName = afterUpload.pop();
    const publicId = fileName.split(".")[0];
    const response = await cloudinary.uploader.destroy(publicId.trim(), {
      resource_type: resourceType,
    });
    console.log("File is successfully deleted from the Cloudinary", response);
    return response;
  } catch (error) {
    console.log("Error while deleting the file from cloudinary", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
