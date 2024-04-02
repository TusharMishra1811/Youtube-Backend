import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  let {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = 1,
    userId,
  } = req.query;

  page = Number(page);
  limit = Number(limit);

  if (!page) {
    throw new ApiError(400, "page number is not defined");
  }

  if (!limit) {
    throw new ApiError(400, "limit is not defined");
  }

  if (!userId) {
    throw new ApiError(404, "user ID is not defined");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "user is not found");
  }

  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(user._id),
        title: {
          $regex: query.trim(),
          $options: "i", //This option specifies case-insensitive matching for the regex pattern. It ensures that the search is case-insensitive, so uppercase and lowercase letters are treated as equivalent.
        },
      },
    },
    {
      $sort: {
        [sortBy]: sortType, //This is the field by which the documents will be sorted. It's enclosed in square brackets, indicating that it's a dynamic field name. The actual field name will be determined by the value of the sortBy variable.
      },
    },
  ]);

  const paginatedVideos = await Video.aggregatePaginate(videos, {
    page,
    limit,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        paginatedVideos,
      },
      "Fetched all the videos"
    )
  );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "Title and description is required");
  }

  const videoLocalPath = req.files?.videoFile[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  if (!videoLocalPath) {
    throw new ApiError(400, "video file local path is not found");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnail file local path is not found");
  }

  const videoFile = await uploadOnCloudinary(videoLocalPath);

  const thumbnailFile = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile) {
    throw new ApiError(404, "The video file is not found");
  }

  if (!thumbnailFile) {
    throw new ApiError(404, "The thumbnail file is not found");
  }

  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnailFile.url,
    title,
    description,
    duration: videoFile?.duration,
    owner: req.user?._id,
  });

  if (!video) {
    throw new ApiError(400, "The video is not uploaded on mongo DB");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, video, "The video file is uploaded successfully")
    );
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "the video id is not valid");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video is not found");
  }

  await Video.findByIdAndUpdate(
    req.user?._id,
    {
      $addToSet: {
        watchHistory: video._id,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, video, "The video is fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const videoToBeUpdated = await Video.findById({ _id: videoId });

  if (videoToBeUpdated.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "You are not authorized to update this video");
  }

  const { title, description } = req.body;

  const thumbnailLocalPath = req.file?.path;

  if (!title || !description || !thumbnailLocalPath) {
    throw new ApiError(400, "Please provide title,description or thumbnail");
  }

  let updateQuery = {};

  if (title) {
    updateQuery.$set = { title: title };
  }

  if (description) {
    updateQuery.$set = { description: description };
  }

  if (thumbnailLocalPath) {
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail.url) {
      throw new ApiError(
        404,
        "The thumbnail file is not uploaded on the cloudinary"
      );
    } else {
      const oldThumbnailUrl = videoToBeUpdated.thumbnail;

      console.log(req.user);
      if (!oldThumbnailUrl) {
        throw new ApiError(400, "Old thumbnail file is not found");
      } else {
        const isFileDeleted = await deleteFromCloudinary(oldThumbnailUrl);

        if (!isFileDeleted) {
          throw new ApiError(400, "Old file is not deleted successfully");
        }
      }
      updateQuery.$set = { thumbnail: thumbnail.url };
    }
  }

  const video = await Video.updateOne(
    {
      _id: videoId,
    },
    updateQuery
  );

  if (!video) {
    throw new ApiError(400, "video is not updated successfully");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "The video is updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById({ _id: videoId });

  if (!video) {
    throw new ApiError("404", "The video is not found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "You are not authorized to edit this video");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video.isPublished,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedVideo) {
    throw new ApiError(400, "The publish status is not changed");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedVideo,
        "The publish status is changed successfully"
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
